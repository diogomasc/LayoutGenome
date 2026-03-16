from flask import Flask, request, send_file, Response, jsonify
from flask_cors import CORS
import os
import shutil
import uuid
import queue
import threading
import time
from downloader import WebsiteDownloader, zip_directory, get_site_name

app = Flask(__name__, static_folder='../', static_url_path='')
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    expose_headers=["Content-Disposition"]
) # Garantir CORS amplo para desenvolvimento

DOWNLOAD_FOLDER = 'downloads'
SESSION_CLEANUP_INTERVAL_SECONDS = 300
SESSION_EXPIRATION_SECONDS = 1800
SSE_QUEUE_TIMEOUT_SECONDS = 10

os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

# Store for SSE messages per session
message_queues = {}
download_results = {}

def cleanup_session(session_id):
    message_queues.pop(session_id, None)
    download_results.pop(session_id, None)

def is_session_expired(result, current_time):
    created_at = result.get('created_at')
    if result.get('status') != 'complete' or not created_at:
        return False
    return current_time - created_at > SESSION_EXPIRATION_SECONDS

def remove_zip_if_exists(zip_path):
    if not zip_path or not os.path.exists(zip_path):
        return

    try:
        os.remove(zip_path)
        print(f"🗑️ Removido arquivo abandonado: {os.path.basename(zip_path)}")
    except OSError:
        pass

def collect_expired_sessions(current_time):
    expired_sessions = []

    for session_id, result in tuple(download_results.items()):
        if not is_session_expired(result, current_time):
            continue

        remove_zip_if_exists(result.get('zip_path'))
        expired_sessions.append(session_id)

    return expired_sessions

def cleanup_downloads_folder():
    """Remove all files and folders from downloads directory"""
    try:
        for item in os.listdir(DOWNLOAD_FOLDER):
            item_path = os.path.join(DOWNLOAD_FOLDER, item)
            if os.path.isfile(item_path):
                os.remove(item_path)
            elif os.path.isdir(item_path):
                shutil.rmtree(item_path)
        print("🧹 Pasta downloads limpa com sucesso")
    except OSError as error:
        print(f"⚠️ Erro ao limpar pasta downloads: {error}")

cleanup_downloads_folder()

def cleanup_abandoned_sessions():
    """Clean up sessions that were never downloaded after 30 minutes"""
    while True:
        time.sleep(SESSION_CLEANUP_INTERVAL_SECONDS)
        sessions_to_remove = collect_expired_sessions(time.time())
        
        for session_id in sessions_to_remove:
            cleanup_session(session_id)

cleanup_thread = threading.Thread(target=cleanup_abandoned_sessions, daemon=True)
cleanup_thread.start()

@app.route('/', methods=['GET'])
def index():
    return app.send_static_file('index.html')

@app.route('/start-download', methods=['POST'])
def start_download():
    """Start download process and return session ID for SSE"""
    data = request.get_json(silent=True) or {}
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    session_id = str(uuid.uuid4())
    message_queues[session_id] = queue.Queue()
    download_results[session_id] = {'status': 'processing', 'zip_path': None, 'filename': None}
    
    thread = threading.Thread(target=process_download, args=(session_id, url))
    thread.daemon = True
    thread.start()
    
    return jsonify({'session_id': session_id})

def process_download(session_id, url):
    """Background download process"""
    q = message_queues[session_id]
    download_dir = os.path.join(DOWNLOAD_FOLDER, session_id)
    zip_path = os.path.join(DOWNLOAD_FOLDER, f"{session_id}.zip")
    
    def log_callback(message):
        q.put(message)
    
    try:
        downloader = WebsiteDownloader(url, download_dir, log_callback=log_callback)
        success = downloader.process()
        
        if not success:
            download_results[session_id] = {'status': 'error', 'error': 'Failed to download site'}
            q.put("❌ Falha no download")
            return

        site_name = get_site_name(url)
        zip_filename = f"{site_name}.zip"
        
        q.put("📦 Criando arquivo ZIP...")
        zip_directory(download_dir, zip_path)

        shutil.rmtree(download_dir)

        download_results[session_id] = {
            'status': 'complete',
            'zip_path': zip_path,
            'filename': zip_filename,
            'created_at': time.time()
        }
        q.put("🎉 Download pronto!")
        
    except Exception as e:
        download_results[session_id] = {'status': 'error', 'error': str(e)}
        q.put(f"❌ Erro: {str(e)}")
        
        try:
            if os.path.exists(download_dir):
                shutil.rmtree(download_dir)
            if os.path.exists(zip_path):
                os.remove(zip_path)
        except OSError:
            pass

@app.route('/stream/<session_id>', methods=['GET'])
def stream(session_id):
    """SSE endpoint for log streaming"""
    def generate():
        q = message_queues.get(session_id)
        if q is None:
            yield "data: ❌ Sessão não encontrada\n\n"
            return

        def is_finished_status():
            return download_results.get(session_id, {}).get('status') in ['complete', 'error']

        def emit_done_and_finish():
            status = download_results.get(session_id, {}).get('status', 'error')
            return f"event: done\ndata: {status}\n\n"
        
        while True:
            try:
                message = q.get(timeout=SSE_QUEUE_TIMEOUT_SECONDS)
                yield f"data: {message}\n\n"

                if is_finished_status() and q.empty():
                    yield emit_done_and_finish()
                    break
                    
            except queue.Empty:
                if is_finished_status():
                    yield emit_done_and_finish()
                    break

                yield ": keepalive\n\n"
    
    return Response(generate(), mimetype='text/event-stream')

@app.route('/download-file/<session_id>', methods=['GET'])
def download_file(session_id):
    """Download the generated ZIP file."""
    result = download_results.get(session_id)
    
    if not result or result['status'] != 'complete':
        return "File not ready", 404
    
    zip_path = result['zip_path']
    filename = result['filename']
    
    if not os.path.exists(zip_path):
        return "File not found", 404
    
    try:
        response = send_file(zip_path, as_attachment=True, download_name=filename)
        response.headers['Access-Control-Expose-Headers'] = 'Content-Disposition'
        result['last_download_at'] = time.time()
        
        return response
    except Exception as e:
        print(f"❌ Erro ao enviar arquivo: {e}")
        return "Error sending file", 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001, threaded=True)
