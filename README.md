# LayoutGenome

Landing page + backend que juntos extraem o **DNA de um site de referência** e geram:

- Um `.zip` com o site baixado (HTML + assets).
- Um `design-system.html` navegável, que documenta o design system/motion do site para ser usado como contexto em outras IAs (Cursor, Antigravity, Lovable, etc.).

---

## Visão Geral da Arquitetura

- **`index.html` (raiz)**: landing page de marketing + formulário para o usuário colar a URL do site de referência e clicar em **“Extrair DNA Agora”**.
- **`js/extractor.js`**: script da landing que conversa com o backend via HTTP (SSE + REST).
- **`backend/`**: backend Flask responsável por baixar o site, empacotar em `.zip` e gerar o `design-system.html` via IA usando `PROMPT.md`.

Fluxo resumido quando o usuário clica em **“Extrair DNA Agora”**:

1. O front (`js/extractor.js`) chama `POST /start-download` no backend com a URL do site.
2. O backend baixa o site completo, gera um `.zip` e guarda o `index.html` em memória.
3. Quando o backend termina, a landing:
   - Baixa automaticamente o `.zip` com o site.
   - Chama `POST /generate-design-system/<session_id>`.
4. O backend aplica o `PROMPT.md` ao `index.html` e chama a IA (API compatível com OpenAI) para gerar o `design-system.html`.
5. O front baixa o `design-system.html` pronto para o usuário.

---

## Rodando o Backend (local)

Entre na pasta `backend`:

```bash
cd backend
pip install -r requirements.txt
playwright install chromium
```

Na raiz do projeto (ao lado do `index.html`), copie o arquivo `.env.example` para `.env` e ajuste os valores:

```env
DESIGN_SYSTEM_API_KEY=SUA_CHAVE_AQUI
DESIGN_SYSTEM_API_BASE=https://seu-endpoint-openai-like.com  # opcional (default: https://api.openai.com)
DESIGN_SYSTEM_MODEL=seu-modelo                               # opcional (default: gpt-4.1-mini)
```

Depois, ainda dentro de `backend`, rode:

```bash
python app.py
```

O backend ficará ouvindo em `http://localhost:5001`.

## Rodando o Backend com Docker

Se preferir, você pode rodar somente o backend em um container Docker.

Na raiz do projeto:

```bash
cp .env.example .env
cd backend
docker build -t layoutgenome-backend .
```

Depois, suba o container mapeando a porta interna (`8080`) para `5001` na sua máquina:

```bash
docker run --env-file ../.env -p 5001:8080 layoutgenome-backend
```

Assim, o backend continuará acessível em `http://localhost:5001`, exatamente como nas instruções de execução local.

### Como conseguir uma chave e testar gratuitamente

Você precisa de um provedor de IA que ofereça uma API compatível com o formato da OpenAI (`/v1/chat/completions`):

- **OpenAI**: boa opção se você já tem conta; usualmente exige cartão, mas costuma dar créditos iniciais.
- **OpenRouter** (`https://openrouter.ai`): agrega vários modelos (Llama, DeepSeek, etc.) e oferece camadas gratuitas/limitadas em alguns modelos.
  - Crie uma conta, gere uma API key e configure no `.env`:
    - `DESIGN_SYSTEM_API_BASE=https://openrouter.ai/api`
    - `DESIGN_SYSTEM_MODEL` para o modelo escolhido (ex.: `meta-llama/llama-3.1-70b-instruct`).
- **Proxy próprio para Gemini / DeepSeek / outros**: se você tiver um gateway que exponha esses modelos numa rota compatível com `/v1/chat/completions`, basta apontar `DESIGN_SYSTEM_API_BASE` para ele e usar o nome de modelo correto em `DESIGN_SYSTEM_MODEL`.

Para experimentar sem gastar muito, comece com um modelo menor/gratuito e só depois troque para um modelo maior para gerar um `design-system.html` mais rico.

Mais detalhes no `script-website-downloader/README.md`.

---

## Rodando a Landing Page

A landing é um arquivo estático (`index.html`) que consome o backend em `http://localhost:5001`.

Você pode:

- Abrir o `index.html` direto no navegador **OU**
- Servir com um servidor estático simples, por exemplo (Node):

```bash
npx serve .
```

Depois acesse no navegador (por exemplo `http://localhost:3000` se estiver usando `serve`) e:

1. Cole uma URL real no campo de URL do Hero.
2. Clique em **“Extrair DNA Agora”**.
3. Aguarde:
   - Um download de `.zip` com o site.
   - Um download de `design-system.html` com o DNA do design.

---

## Ponto de Integração com Outras IAs

O arquivo final `design-system.html` é pensado para ser colocado no **contexto** de outras IAs de código:

- Abra o arquivo na sua IDE/IA favorita.
- Cole o conteúdo no contexto ou faça upload, dependendo da ferramenta.
- Peça para a IA: “Construa uma nova landing usando exatamente as regras deste design-system.html”.

Assim, o LayoutGenome atua como o “extrator de DNA” de designs premium para qualquer agente de código.
