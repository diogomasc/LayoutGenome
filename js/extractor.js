document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".extract-form");
  const urlInput = document.querySelector(".url-input");
  const submitButton = form?.querySelector('button[type="submit"]');
  const buttonTextSpan = submitButton?.querySelector(".btn-text");

  if (!form || !urlInput || !submitButton || !buttonTextSpan) {
    return;
  }

  const state = {
    eventSource: null,
    isProcessing: false,
    modalShown: false,
  };

  const ui = {
    logTerminal: document.getElementById("log-terminal"),
    statusMeta: document.getElementById("status-meta"),
    successModal: document.getElementById("success-modal"),
    modalDownloadBtn: document.getElementById("modal-download-btn"),
    modalCloseBtn: document.getElementById("modal-close-btn"),
  };

  const config = {
    iframeCleanupDelayMs: 15000,
    modalOpenDelayMs: 350,
    modalCloseUiResetDelayMs: 500,
  };

  const resolveBackendBaseUrl = () => {
    if (
      globalThis.location.protocol === "file:" ||
      (globalThis.location.hostname !== "localhost" &&
        globalThis.location.hostname !== "127.0.0.1") ||
      (globalThis.location.port !== "5001" && globalThis.location.port !== "")
    ) {
      return "http://localhost:5001";
    }
    return "";
  };
  const BACKEND_URL = resolveBackendBaseUrl();

  const addLog = (message, type = "") => {
    if (!ui.logTerminal) return;

    const entry = document.createElement("div");
    entry.className = `log-entry ${type}`;
    entry.textContent = message;
    ui.logTerminal.appendChild(entry);
    ui.logTerminal.scrollTop = ui.logTerminal.scrollHeight;
  };

  const clearLogs = () => {
    if (ui.logTerminal) {
      ui.logTerminal.innerHTML = "";
    }
  };

  const triggerDirectDownload = (sessionId) => {
    const downloadUrl = `${BACKEND_URL}/download-file/${sessionId}?t=${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.setAttribute("aria-hidden", "true");
    iframe.src = downloadUrl;
    document.body.appendChild(iframe);

    setTimeout(() => {
      iframe.remove();
    }, config.iframeCleanupDelayMs);

    addLog("📥 Download enviado para o navegador.", "success");
  };

  const setLoading = (loading) => {
    state.isProcessing = loading;
    submitButton.disabled = loading;
    urlInput.disabled = loading;

    if (loading) {
      buttonTextSpan.textContent = "Processando...";
      if (ui.statusMeta) ui.statusMeta.style.display = "none";
      if (ui.logTerminal) {
        ui.logTerminal.classList.add("active");
        clearLogs();
      }
      addLog("🚀 Iniciando extração do site...");
    } else {
      buttonTextSpan.textContent = "Extrair DNA Agora";
    }
  };

  const showModal = (sessionId) => {
    if (!ui.successModal || !ui.modalDownloadBtn || state.modalShown) return;

    state.modalShown = true;
    ui.modalDownloadBtn.href = `${BACKEND_URL}/download-file/${sessionId}`;
    ui.modalDownloadBtn.removeAttribute("download");
    ui.successModal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  const hideModal = () => {
    if (!ui.successModal) return;
    ui.successModal.classList.remove("active");
    document.body.style.overflow = "";
    state.modalShown = false;

    setTimeout(() => {
      if (ui.statusMeta) ui.statusMeta.style.display = "block";
      if (ui.logTerminal) ui.logTerminal.classList.remove("active");
      clearLogs();
    }, config.modalCloseUiResetDelayMs);
  };

  const closeEventStream = () => {
    if (!state.eventSource) return;
    state.eventSource.close();
    state.eventSource = null;
  };

  if (ui.modalCloseBtn) ui.modalCloseBtn.addEventListener("click", hideModal);
  if (ui.successModal) {
    ui.successModal.addEventListener("click", (event) => {
      if (event.target === ui.successModal) hideModal();
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.isProcessing) return;

    const url = urlInput.value.trim();
    if (!url) {
      alert("Por favor, insira uma URL válida");
      return;
    }

    state.modalShown = false;
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/start-download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Erro ${response.status}`);
      }

      const data = await response.json();
      if (data.error || !data.session_id) {
        throw new Error(data.error || "Sessão de download inválida");
      }

      connectSSE(data.session_id);
    } catch (error) {
      addLog(`❌ Erro: ${error.message}`, "error");
      setLoading(false);
    }
  });

  function connectSSE(sessionId) {
    closeEventStream();
    const source = new EventSource(`${BACKEND_URL}/stream/${sessionId}`);
    state.eventSource = source;

    source.onmessage = (event) => {
      addLog(event.data);
    };

    source.addEventListener("done", (event) => {
      closeEventStream();

      if (event.data === "complete") {
        addLog("✅ Extração Completa!", "success");

        try {
          triggerDirectDownload(sessionId);
        } catch (downloadError) {
          addLog(
            `⚠️ Não foi possível iniciar o download automático: ${downloadError.message}`,
            "error",
          );
          addLog("👉 Use o botão da modal para baixar manualmente.", "error");
        }

        setTimeout(() => showModal(sessionId), config.modalOpenDelayMs);
      } else {
        addLog("❌ Falha no processamento.", "error");
      }

      setLoading(false);
    });

    source.onerror = () => {
      closeEventStream();
      setLoading(false);
    };
  }
});
