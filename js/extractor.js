// ===========================
// EXTRACTOR — Integração com backend de download + DNA
// ===========================

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".extract-form");
  const urlInput = document.querySelector(".url-input");
  const submitButton = form?.querySelector('button[type="submit"]');
  const buttonTextSpan = submitButton?.querySelector(".btn-text");

  if (!form || !urlInput || !submitButton || !buttonTextSpan) {
    return;
  }

  let currentSessionId = null;
  let eventSource = null;
  let isProcessing = false;
  let modalShown = false;

  // Elements
  const logTerminal = document.getElementById("log-terminal");
  const statusMeta = document.getElementById("status-meta");
  const successModal = document.getElementById("success-modal");
  const modalDownloadBtn = document.getElementById("modal-download-btn");
  const modalCloseBtn = document.getElementById("modal-close-btn");

  // Determine base URL for backend connection
  const getBackendBase = () => {
    // Se estivermos abrindo o arquivo localmente ou via outro servidor dev,
    // forçamos a conexão com o porto standard do Flask (5001)
    if (
      globalThis.location.protocol === "file:" ||
      (globalThis.location.hostname !== "localhost" &&
        globalThis.location.hostname !== "127.0.0.1") ||
      (globalThis.location.port !== "5001" && globalThis.location.port !== "")
    ) {
      return "http://localhost:5001";
    }
    return ""; // Relativo
  };
  const BACKEND_URL = getBackendBase();

  const triggerDirectDownload = (sessionId) => {
    const downloadUrl = `${BACKEND_URL}/download-file/${sessionId}?t=${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.setAttribute("aria-hidden", "true");
    iframe.src = downloadUrl;
    document.body.appendChild(iframe);

    // Limpeza do iframe após disparar o download.
    setTimeout(() => {
      iframe.remove();
    }, 15000);

    addLog("📥 Download enviado para o navegador.", "success");
  };

  const setLoading = (loading) => {
    isProcessing = loading;
    if (submitButton) submitButton.disabled = loading;
    if (urlInput) urlInput.disabled = loading;

    if (loading) {
      buttonTextSpan.textContent = "Processando...";
      if (statusMeta) statusMeta.style.display = "none";
      if (logTerminal) {
        logTerminal.classList.add("active");
        logTerminal.innerHTML = "";
      }
      addLog("🚀 Iniciando extração do site...");
    } else {
      buttonTextSpan.textContent = "Extrair DNA Agora";
    }
  };

  const showModal = (sessionId) => {
    if (!successModal || !modalDownloadBtn || modalShown) return;

    modalShown = true;
    modalDownloadBtn.href = `${BACKEND_URL}/download-file/${sessionId}`;
    modalDownloadBtn.removeAttribute("download");
    successModal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  const hideModal = () => {
    if (!successModal) return;
    successModal.classList.remove("active");
    document.body.style.overflow = "";
    modalShown = false;

    // Reset UI after closing
    setTimeout(() => {
      if (statusMeta) statusMeta.style.display = "block";
      if (logTerminal) logTerminal.classList.remove("active");
      clearLogs();
    }, 500);
  };

  if (modalCloseBtn) modalCloseBtn.addEventListener("click", hideModal);
  if (successModal) {
    successModal.addEventListener("click", (e) => {
      if (e.target === successModal) hideModal();
    });
  }

  if (modalDownloadBtn) {
    modalDownloadBtn.addEventListener("click", () => {
      console.log("Iniciando download via modal...");
    });
  }

  const addLog = (message, type = "") => {
    if (!logTerminal) return;
    const entry = document.createElement("div");
    entry.className = `log-entry ${type}`;
    entry.textContent = message;
    logTerminal.appendChild(entry);
    logTerminal.scrollTop = logTerminal.scrollHeight;
  };

  const clearLogs = () => {
    if (logTerminal) logTerminal.innerHTML = "";
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isProcessing) return;

    const url = urlInput.value.trim();
    if (!url) {
      alert("Por favor, insira uma URL válida");
      return;
    }

    modalShown = false; // Reset flag for new attempt
    setLoading(true);

    fetch(`${BACKEND_URL}/start-download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Erro ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        currentSessionId = data.session_id;
        connectSSE(currentSessionId);
      })
      .catch((err) => {
        addLog(`❌ Erro: ${err.message}`, "error");
        console.error("Fetch error:", err);
        setLoading(false);
      });
  });

  function connectSSE(sessionId) {
    if (eventSource) eventSource.close();
    eventSource = new EventSource(`${BACKEND_URL}/stream/${sessionId}`);

    eventSource.onmessage = (event) => {
      addLog(event.data);
    };

    eventSource.addEventListener("done", (event) => {
      eventSource.close();
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

        setTimeout(() => showModal(sessionId), 350);
      } else {
        addLog("❌ Falha no processamento.", "error");
      }

      setLoading(false);
    });

    eventSource.onerror = () => {
      eventSource.close();
      setLoading(false);
    };
  }
});
