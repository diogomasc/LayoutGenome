// ===========================
// EXTRACTOR — Integração com backend de download + DNA
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.extract-form');
    const urlInput = document.querySelector('.url-input');
    const submitButton = form?.querySelector('button[type="submit"]');
    const buttonTextSpan = submitButton?.querySelector('.btn-text');

    if (!form || !urlInput || !submitButton || !buttonTextSpan) {
        return;
    }

    let isProcessing = false;

    const statusMeta = document.getElementById('status-meta');
    const logTerminal = document.getElementById('log-terminal');

    const setLoading = (loading) => {
        isProcessing = loading;
        submitButton.disabled = loading;
        if (loading) {
            buttonTextSpan.textContent = 'Processando DNA...';
            if (statusMeta) statusMeta.style.display = 'none';
            if (logTerminal) {
                logTerminal.classList.add('active');
                logTerminal.innerHTML = ''; // Limpa logs anteriores
            }
            addLog('Iniciando análise do genoma...');
        } else {
            buttonTextSpan.textContent = 'Extrair DNA Agora';
            // Opcional: manter o terminal aberto por alguns segundos antes de voltar ao status-meta
            setTimeout(() => {
                if (!isProcessing) {
                    if (statusMeta) statusMeta.style.display = 'block';
                    if (logTerminal) logTerminal.classList.remove('active');
                }
            }, 8000);
        }
    };

    const addLog = (message, type = '') => {
        if (!logTerminal) return;
        
        // Evita repetir exatamente a mesma mensagem seguida
        const lastEntry = logTerminal.lastElementChild;
        if (lastEntry && lastEntry.textContent === message && !message.includes('<a')) {
            return;
        }

        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        
        // Se for um link de download, inserir como HTML
        if (message.includes('<a')) {
            entry.innerHTML = message;
        } else {
            entry.textContent = message;
        }
        
        logTerminal.appendChild(entry);
        logTerminal.scrollTop = logTerminal.scrollHeight;
    };

    const BACKEND_BASE = 'http://localhost:5001';

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (isProcessing) return;

        const url = urlInput.value.trim();
        if (!url) {
            addLog('Erro: Por favor, cole uma URL válida.', 'error');
            return;
        }

        setLoading(true);

        fetch(`${BACKEND_BASE}/start-download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.error || !data.session_id) {
                    throw new Error(data.error || 'Erro ao iniciar extração.');
                }
                const sessionId = data.session_id;
                addLog(`Conexão estabelecida. Analisando genoma...`);
                listenToStream(sessionId);
            })
            .catch((err) => {
                console.error(err);
                addLog(`Erro: ${err.message}`, 'error');
                setLoading(false);
            });
    });

    function listenToStream(sessionId) {
        const es = new EventSource(`${BACKEND_BASE}/stream/${sessionId}`);

        es.onmessage = (event) => {
            if (event.data && !event.data.includes('keepalive')) {
                addLog(event.data);
            }
        };

        es.addEventListener('done', (event) => {
            es.close();
            if (event.data === 'complete') {
                addLog('✨ Extração Completa!', 'success');
                addLog(`<a href="${BACKEND_BASE}/download-file/${sessionId}" style="color: #4ade80; text-decoration: underline; font-weight: bold;">Clique aqui para baixar seu Genoma (.zip)</a>`);
                
                // Tenta download automático
                triggerZipDownload(sessionId);
                
                // Finaliza o carregamento
                setTimeout(() => setLoading(false), 2000);
            } else {
                addLog('Falha detectada durante o processamento do site.', 'error');
                setLoading(false);
            }
        });

        es.onerror = (err) => {
            console.error('SSE Error:', err);
            es.close();
        };
    }

    function triggerZipDownload(sessionId) {
        const link = document.createElement('a');
        link.href = `${BACKEND_BASE}/download-file/${sessionId}`;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});

