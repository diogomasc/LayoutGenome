from flask import Flask, render_template, request, send_file, Response, jsonify
from flask_cors import CORS
import os
import shutil
import uuid
import queue
import threading
import time
import glob
import requests
from dotenv import load_dotenv
from downloader import WebsiteDownloader, zip_directory, get_site_name


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, os.pardir))
PROMPT_PATH = os.path.join(BASE_DIR, "PROMPT.md")

# Load environment variables from .env (root do projeto ou pasta atual)
load_dotenv(os.path.join(ROOT_DIR, ".env"))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Basic LLM config via environment variables
LLM_API_KEY = os.getenv("DESIGN_SYSTEM_API_KEY")
LLM_API_BASE = os.getenv("DESIGN_SYSTEM_API_BASE", "https://api.openai.com")
LLM_MODEL = os.getenv("DESIGN_SYSTEM_MODEL", "gpt-4o-mini")  # Mudado de gpt-4.1-mini para gpt-4o-mini

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) # Garantir CORS amplo para desenvolvimento

# Base config
DOWNLOAD_FOLDER = 'downloads'
if not os.path.exists(DOWNLOAD_FOLDER):
    os.makedirs(DOWNLOAD_FOLDER)

def cleanup_downloads_folder():
    """Remove all files and folders from downloads directory"""
    try:
        for item in os.listdir(DOWNLOAD_FOLDER):
            item_path = os.path.join(DOWNLOAD_FOLDER, item)
            if os.path.isfile(item_path):
                os.remove(item_path)
            elif os.path.isdir(item_path):
                shutil.rmtree(item_path)
        print(f"🧹 Pasta downloads limpa com sucesso")
    except Exception as e:
        print(f"⚠️ Erro ao limpar pasta downloads: {e}")

# Cleanup downloads folder on startup
cleanup_downloads_folder()

# Store for SSE messages per session
message_queues = {}
download_results = {}

def cleanup_abandoned_sessions():
    """Clean up sessions that were never downloaded after 30 minutes"""
    while True:
        time.sleep(300)  # Check every 5 minutes
        current_time = time.time()
        
        sessions_to_remove = []
        for session_id, result in list(download_results.items()):
            if result.get('status') == 'complete' and result.get('created_at'):
                age = current_time - result['created_at']
                # Remove if older than 30 minutes
                if age > 1800:
                    zip_path = result.get('zip_path')
                    if zip_path and os.path.exists(zip_path):
                        try:
                            os.remove(zip_path)
                            print(f"🗑️ Removido arquivo abandonado: {os.path.basename(zip_path)}")
                        except:
                            pass
                    sessions_to_remove.append(session_id)
        
        # Clean up memory
        for session_id in sessions_to_remove:
            if session_id in message_queues:
                del message_queues[session_id]
            if session_id in download_results:
                del download_results[session_id]

# Start cleanup thread
cleanup_thread = threading.Thread(target=cleanup_abandoned_sessions, daemon=True)
cleanup_thread.start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start-download', methods=['POST'])
def start_download():
    """Start download process and return session ID for SSE"""
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    # Create session
    session_id = str(uuid.uuid4())
    message_queues[session_id] = queue.Queue()
    download_results[session_id] = {'status': 'processing', 'zip_path': None, 'filename': None}
    
    # Start download in background thread
    thread = threading.Thread(target=process_download, args=(session_id, url))
    thread.daemon = True
    thread.start()
    
    return jsonify({'session_id': session_id})

def process_download(session_id, url):
    """Background download process"""
    q = message_queues[session_id]
    request_id = session_id
    download_dir = os.path.join(DOWNLOAD_FOLDER, request_id)
    zip_path = os.path.join(DOWNLOAD_FOLDER, f"{request_id}.zip")
    
    def log_callback(message):
        q.put(message)
    
    try:
        # Initialize downloader with log callback
        downloader = WebsiteDownloader(url, download_dir, log_callback=log_callback)
        
        # Process the site
        success = downloader.process()
        
        if not success:
            q.put("❌ Falha no download")
            download_results[session_id] = {'status': 'error', 'error': 'Failed to download site'}
            return

        # Read generated index.html into memory for later DNA extraction
        index_html_path = os.path.join(download_dir, "index.html")
        index_html_content = None
        if os.path.exists(index_html_path):
            try:
                with open(index_html_path, "r", encoding="utf-8") as f:
                    index_html_content = f.read()
            except Exception as e:
                q.put(f"⚠️ Não foi possível ler o index.html: {e}")
        else:
            q.put("⚠️ index.html não encontrado na pasta baixada")
        # Generate filename from site name
        site_name = get_site_name(url)
        zip_filename = f"{site_name}.zip"

        # NEW: Generate Design System BEFORE zipping
        design_system_html = None
        if index_html_content:
            q.put("🧬 Iniciando geração do Design System via IA...")
            
            # Heartbeat thread to keep user informed during long LLM calls
            llm_done = threading.Event()
            def heartbeat():
                phrases = [
                    "Analisando estruturas de componentes...",
                    "Mapeando variáveis de design...",
                    "Extraindo regras de tipografia...",
                    "Capturando padrões de cores...",
                    "Sintetizando o genoma do layout...",
                    "Quase lá! Finalizando o Design System..."
                ]
                idx = 0
                while not llm_done.is_set():
                    time.sleep(10) # Envia pulso a cada 10s
                    if not llm_done.is_set():
                        q.put(f"🧬 {phrases[idx % len(phrases)]}")
                        idx += 1
            
            hb_thread = threading.Thread(target=heartbeat, daemon=True)
            hb_thread.start()

            try:
                template = _load_prompt_template()
                # Limitar o tamanho do HTML se for muito grande para evitar erros de context window
                truncated_html = index_html_content[:50000] # Aproximadamente 50kb de texto base
                prompt = template.replace("$ARGUMENTS", truncated_html)
                
                design_system_html = _call_llm(prompt)
                llm_done.set() # Parar o heartbeat
                
                # Save it into the download directory so it gets included in the ZIP
                ds_path = os.path.join(download_dir, "design-system.html")
                with open(ds_path, "w", encoding="utf-8") as f:
                    f.write(design_system_html)
                q.put("✅ Design System incluído no pacote!")
            except Exception as e:
                llm_done.set()
                error_msg = str(e)
                q.put(f"⚠️ Erro na IA: {error_msg}")
                q.put("💡 O download continuará apenas com os arquivos do site.")
        
        q.put("📦 Criando arquivo ZIP final...")
        zip_directory(download_dir, zip_path)
        
        q.put("🎉 Tudo pronto para o download!")
        download_results[session_id] = {
            'status': 'complete',
            'zip_path': zip_path,
            'filename': zip_filename,
            'created_at': time.time(),
            'index_html': index_html_content,
            'design_system_html': design_system_html,
            'source_url': url
        }
        
        # Opcional: manter os arquivos por um tempo se quiser debugar, 
        # mas por padrão limpamos depois de gerar o zip
        try:
            if os.path.exists(download_dir):
                shutil.rmtree(download_dir)
                q.put("🧹 Arquivos temporários limpos.")
        except Exception as e:
            print(f"Erro ao limpar download_dir: {e}")
        
    except Exception as e:
        q.put(f"❌ Erro: {str(e)}")
        download_results[session_id] = {'status': 'error', 'error': str(e)}
        
        # Clean up any leftover files
        try:
            if os.path.exists(download_dir):
                shutil.rmtree(download_dir)
            if os.path.exists(zip_path):
                os.remove(zip_path)
        except:
            pass

@app.route('/stream/<session_id>')
def stream(session_id):
    """SSE endpoint for log streaming"""
    def generate():
        if session_id not in message_queues:
            yield f"data: ❌ Sessão não encontrada\n\n"
            return
        
        q = message_queues[session_id]
        
        while True:
            try:
                # Wait for message with timeout
                message = q.get(timeout=60)
                yield f"data: {message}\n\n"
                
                # Check if download is complete
                result = download_results.get(session_id, {})
                if result.get('status') in ['complete', 'error']:
                    # Send final status
                    yield f"event: done\ndata: {result['status']}\n\n"
                    break
                    
            except queue.Empty:
                # Send keepalive
                yield f": keepalive\n\n"
    
    return Response(generate(), mimetype='text/event-stream')

@app.route('/download-file/<session_id>')
def download_file(session_id):
    """Download the generated ZIP file and clean up immediately"""
    result = download_results.get(session_id)
    
    if not result or result['status'] != 'complete':
        return "File not ready", 404
    
    zip_path = result['zip_path']
    filename = result['filename']
    
    if not os.path.exists(zip_path):
        return "File not found", 404
    
    # Send file and clean up immediately after
    try:
        response = send_file(zip_path, as_attachment=True, download_name=filename)
        
        # Clean up in background thread to avoid blocking the response
        def cleanup():
            time.sleep(1)  # Small delay to ensure file transfer completes
            try:
                if os.path.exists(zip_path):
                    os.remove(zip_path)
                    print(f"🗑️ Arquivo ZIP removido: {filename}")
                if session_id in message_queues:
                    del message_queues[session_id]
                if session_id in download_results:
                    del download_results[session_id]
            except Exception as e:
                print(f"⚠️ Erro ao limpar arquivo: {e}")
        
        cleanup_thread = threading.Thread(target=cleanup)
        cleanup_thread.daemon = True
        cleanup_thread.start()
        
        return response
    except Exception as e:
        print(f"❌ Erro ao enviar arquivo: {e}")
        return "Error sending file", 500


def _load_prompt_template():
    """Load the base prompt template used to turn HTML into a design system."""
    if not os.path.exists(PROMPT_PATH):
        raise FileNotFoundError(f"PROMPT.md não encontrado em {PROMPT_PATH}")
    with open(PROMPT_PATH, "r", encoding="utf-8") as f:
        return f.read()


def _call_llm(prompt: str) -> str:
    """
    Call a generic OpenAI-compatible chat completion API.

    This is intentionally simples and assumes the provider implements:
    POST {LLM_API_BASE}/v1/chat/completions
    with fields: model, messages, temperature.
    """
    if not LLM_API_KEY or LLM_API_KEY == "SUA_CHAVE_AQUI":
        raise RuntimeError(
            "DESIGN_SYSTEM_API_KEY não configurada corretamente no arquivo .env."
        )

    print(f"🤖 Chamando IA via {LLM_API_BASE} com modelo {LLM_MODEL}...")
    
    # Check if using Google Gemini Native API
    if "generativelanguage.googleapis.com" in LLM_API_BASE:
        url = f"{LLM_API_BASE.rstrip('/')}/v1beta/models/{LLM_MODEL}:generateContent?key={LLM_API_KEY}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": "Você é um especialista em Design System e HTML/CSS sênior."}]},
            "generationConfig": {"temperature": 0.2}
        }
        
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=120)
            if resp.status_code != 200:
                error_msg = f"API Gemini retornou erro {resp.status_code}: {resp.text}"
                raise RuntimeError(error_msg)
                
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except requests.exceptions.Timeout:
            raise RuntimeError("A requisição para o Gemini demorou demais (timeout de 120s).")
        except Exception as e:
            raise RuntimeError(f"Erro na comunicação com o Gemini: {str(e)}")
    
    # Otherwise, fallback to OpenAI compatible API (OpenRouter, OpenAI, etc)
    else:
        url = LLM_API_BASE.rstrip("/") + "/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {LLM_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": LLM_MODEL,
            "temperature": 0.2, # Um pouco mais de criativade preservando a estrutura
            "messages": [
                {"role": "system", "content": "Você é um especialista em Design System e HTML/CSS sênior."},
                {"role": "user", "content": prompt},
            ],
        }

        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=120)
            if resp.status_code != 200:
                error_msg = f"API de IA retornou erro {resp.status_code}: {resp.text}"
                raise RuntimeError(error_msg)
                
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.Timeout:
            raise RuntimeError("A requisição para a IA demorou demais (timeout de 120s).")
        except Exception as e:
            raise RuntimeError(f"Erro na comunicação com a IA: {str(e)}")



@app.route('/generate-design-system/<session_id>', methods=['POST'])
def generate_design_system(session_id):
    """
    Retorna o Design System que já foi gerado durante o processo de download.
    """
    result = download_results.get(session_id)

    if not result or result.get("status") != "complete":
        return jsonify({"error": "Sessão inválida ou processamento ainda não concluído."}), 400

    design_system_html = result.get("design_system_html")
    if not design_system_html:
        return jsonify({"error": "O Design System não pôde ser gerado para esta sessão."}), 400

    return jsonify(
        {
            "ok": True,
            "filename": "design-system.html",
            "html": design_system_html,
        }
    )

if __name__ == '__main__':
    # Development server
    app.run(debug=True, host='0.0.0.0', port=5001, threaded=True)
else:
    # Production server (Gunicorn)
    pass
