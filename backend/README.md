# 🌐 Website Downloader (Backend do LayoutGenome)

Este diretório contém o **backend em Flask** responsável por:

- Baixar uma réplica completa de um site de referência (HTML, CSS, JS, assets).
- Empacotar tudo em um `.zip` para o usuário.
- Guardar o `index.html` em memória.
- Usar um modelo de IA (via API compatível com OpenAI) e o `PROMPT.md` para gerar um `design-system.html` a partir desse `index.html`.

Ele foi pensado para ser usado em conjunto com a landing page na raiz do projeto (`index.html`), que faz as chamadas HTTP para este serviço.

## ✨ Funcionalidades

- 📥 Download completo de sites (HTML, CSS, JS, imagens, fontes).
- 🎭 Renderização de JavaScript usando Playwright/Chromium.
- 🖼️ Captura de imagens lazy-loaded.
- 📦 Exportação em arquivo ZIP.
- 🧹 Limpeza automática de arquivos temporários e sessões antigas.
- 🛡️ Correção automática de problemas de scroll para visualização offline.
- ⚡ Suporte para sites modernos (Next.js, Gatsby, Nuxt, etc.).
- 🧬 Geração do `design-system.html` usando o `PROMPT.md` + IA.

## 🛠️ Desenvolvimento Local (sem Docker)

### Requisitos

- Python 3.11+
- Playwright (browsers instalados)

### Instalação

Na pasta `script-website-downloader`:

```bash
pip install -r requirements.txt
playwright install chromium
```

### Variáveis de ambiente (IA)

As variáveis de ambiente são lidas automaticamente de um arquivo `.env`.

Você pode criar um `.env` **na raiz do projeto** (ao lado do `index.html`) copiando o arquivo `.env.example` e ajustando os valores:

```env
DESIGN_SYSTEM_API_KEY=SUA_CHAVE_AQUI
DESIGN_SYSTEM_API_BASE=https://seu-endpoint-openai-like.com
DESIGN_SYSTEM_MODEL=seu-modelo
```

Ou, se preferir, um `.env` dentro de `script-website-downloader/`.  

Depois basta rodar:

```bash
python app.py
```

O servidor sobe por padrão em: `http://localhost:5001`.

## 🐳 Rodando o Backend com Docker

Este diretório já vem com um `Dockerfile` preparado para rodar o backend em produção ou desenvolvimento.

Na raiz do projeto:

```bash
cp .env.example .env  # ajuste os valores da sua API de IA
cd script-website-downloader
docker build -t layoutgenome-backend .
```

Depois, execute o container:

```bash
docker run --env-file ../.env -p 5001:8080 layoutgenome-backend
```

- Dentro do container, o app expõe a porta `8080` (variável `PORT` padrão).  
- Fora do container, você o acessa em `http://localhost:5001`, que é o endereço esperado pelo frontend (`index.html` + `js/extractor.js`).

#### Onde conseguir chaves e testar gratuitamente

Você precisa de um endpoint **compatível com a API de chat da OpenAI**:

- **OpenAI**: requer cartão, mas costuma dar crédito inicial para novos usuários.  
- **OpenRouter** (`https://openrouter.ai`)  
  - Oferece acesso a vários modelos (Llama, DeepSeek, etc.), alguns com camada gratuita/limitada.  
  - Depois de criar conta, gere uma API key e use:
    - `DESIGN_SYSTEM_API_BASE=https://openrouter.ai/api`
    - `DESIGN_SYSTEM_MODEL` para o modelo escolhido (por ex. `meta-llama/llama-3.1-70b-instruct`).  
- **Proxies próprios / gateways**: se você tiver um proxy que exponha Gemini, DeepSeek ou outro modelo com a rota `/v1/chat/completions`, basta apontar `DESIGN_SYSTEM_API_BASE` para esse endpoint e `DESIGN_SYSTEM_MODEL` para o nome esperado pelo gateway.

> Para testar rápido em desenvolvimento: comece com um modelo menor/barato (ou gratuito) e só depois troque para um modelo mais caro para ter um design-system mais sofisticado.

## 📁 Estrutura do Projeto

```text
script-website-downloader/
├── app.py              # Aplicação Flask (API + SSE + geração de design-system)
├── downloader.py       # Lógica de download e processamento do site
├── PROMPT.md           # Prompt usado para transformar index.html em design-system.html
├── downloads/          # Arquivos temporários (auto-limpa)
├── requirements.txt    # Dependências Python
├── Dockerfile          # Deploy containerizado (opcional)
├── Procfile            # Configuração para plataformas tipo Render/Railway
├── render.yaml         # Exemplo de configuração de deploy
└── README.md           # Este arquivo
```

> A antiga interface HTML (`templates/index.html`) foi removida. A UI principal agora é a landing page na raiz do repositório (`/index.html`), que consome esta API.

## 🔧 Fluxo Interno

1. **Captura**: Usa Playwright para renderizar a página e capturar recursos de rede.  
2. **Processamento**: BeautifulSoup processa HTML e reescreve URLs para assets locais.  
3. **Otimização**: Remove scripts de framework que não funcionam offline.  
4. **Correção**: Injeta CSS para corrigir problemas de scroll e visibilidade.  
5. **Empacotamento**: Cria um arquivo ZIP com tudo.  
6. **DNA do Design**: Lê o `index.html`, injeta no `PROMPT.md` em `$ARGUMENTS` e envia para a IA gerar o `design-system.html`.  

## Endpoints principais

- `POST /start-download`  
  Corpo: `{ "url": "https://site-referencia.com" }`  
  Retorno: `{ "session_id": "..." }`

- `GET /stream/<session_id>` (SSE)  
  Stream de logs de progresso + evento `done` (`complete` ou `error`).

- `GET /download-file/<session_id>`  
  Retorna o `.zip` com o site baixado.

- `POST /generate-design-system/<session_id>`  
  Gera e devolve o conteúdo do `design-system.html`:
  ```json
  {
    "ok": true,
    "filename": "design-system.html",
    "html": "<!DOCTYPE html>..."
  }
  ```

## 📄 Licença

Uso pessoal e educacional.

## 🤝 Contribuições

Sugestões e melhorias são bem-vindas!
