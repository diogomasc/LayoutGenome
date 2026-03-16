document.addEventListener("DOMContentLoaded", () => {
  const ring = document.getElementById("cursor-ring");
  const dot = document.getElementById("cursor-dot");
  if (!ring || !dot) return;

  const config = {
    segments: 14,
    leadFollowFactor: 0.22,
    trailFollowFactor: 0.28,
    ringEnlargedSize: 36,
    ringDefaultSize: 24,
    hoverTargets:
      "a, button, input, label, .btn, .btn-lumina, .btn-outline, .faq-question, .capture-btn, .logo, .nav-links a, .control",
  };

  let rafId;
  let targetX = globalThis.innerWidth / 2;
  let targetY = globalThis.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let sizeBoost = 0;

  const segEls = [];
  const segX = new Array(config.segments);
  const segY = new Array(config.segments);

  const getBaseSegmentSize = (index) => Math.max(3, 10 - index * 0.5);
  const getSegmentOpacity = (index) => Math.max(0.1, 0.6 - index * 0.04);

  const createSegment = (index) => {
    const element = document.createElement("div");
    const baseSize = getBaseSegmentSize(index);
    const opacity = getSegmentOpacity(index);
    element.className = "pointer-events-none cursor-segment hidden md:block";
    element.style.cssText = [
      "z-index:9998;",
      `width:${baseSize}px;`,
      `height:${baseSize}px;`,
      "border-radius:9999px;",
      "transform:translate(-50%,-50%);",
      `background: rgba(59, 130, 246, ${Math.min(0.8, 0.4 + 0.02 * (config.segments - index))});`,
      "box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.05), 0 0 12px rgba(37, 99, 235, 0.15);",
      `opacity:${opacity};`,
      "transition: opacity .2s;",
      "will-change: left, top;",
      "position: fixed;",
      "top: 0;",
      "left: 0;",
      "pointer-events: none !important;",
    ].join("");

    document.body.appendChild(element);
    return element;
  };

  for (let i = 0; i < config.segments; i += 1) {
    segEls[i] = createSegment(i);
    segX[i] = targetX;
    segY[i] = targetY;
  }

  const updateSegmentSizes = () => {
    for (let i = 0; i < config.segments; i += 1) {
      const size = getBaseSegmentSize(i) + sizeBoost;
      segEls[i].style.width = `${size}px`;
      segEls[i].style.height = `${size}px`;
    }
  };

  const setImmediatePosition = (x, y) => {
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;

    for (let i = 0; i < config.segments; i += 1) {
      segX[i] = x;
      segY[i] = y;
      segEls[i].style.left = `${x}px`;
      segEls[i].style.top = `${y}px`;
    }
  };

  const animate = () => {
    currentX += (targetX - currentX) * config.leadFollowFactor;
    currentY += (targetY - currentY) * config.leadFollowFactor;
    ring.style.left = `${currentX}px`;
    ring.style.top = `${currentY}px`;

    dot.style.left = `${targetX}px`;
    dot.style.top = `${targetY}px`;

    segX[0] += (targetX - segX[0]) * config.trailFollowFactor;
    segY[0] += (targetY - segY[0]) * config.trailFollowFactor;

    for (let i = 1; i < config.segments; i += 1) {
      segX[i] += (segX[i - 1] - segX[i]) * config.trailFollowFactor;
      segY[i] += (segY[i - 1] - segY[i]) * config.trailFollowFactor;
    }

    for (let i = 0; i < config.segments; i += 1) {
      segEls[i].style.left = `${segX[i]}px`;
      segEls[i].style.top = `${segY[i]}px`;
    }

    rafId = requestAnimationFrame(animate);
  };

  const onMove = (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
  };

  const enlarge = () => {
    ring.style.width = `${config.ringEnlargedSize}px`;
    ring.style.height = `${config.ringEnlargedSize}px`;
    ring.style.borderColor = "rgba(59, 130, 246, 0.8)";
    ring.style.boxShadow =
      "0 0 0 2px rgba(59, 130, 246, 0.1), 0 0 40px rgba(37, 99, 235, 0.3)";
    sizeBoost = 1.5;
    updateSegmentSizes();
  };

  const reset = () => {
    ring.style.width = `${config.ringDefaultSize}px`;
    ring.style.height = `${config.ringDefaultSize}px`;
    ring.style.borderColor = "rgba(59, 130, 246, 0.5)";
    ring.style.boxShadow =
      "0 0 0 1px rgba(59, 130, 246, 0.1), 0 0 20px rgba(37, 99, 235, 0.15)";
    sizeBoost = 0;
    updateSegmentSizes();
  };

  const hide = () => {
    ring.style.opacity = "0";
    dot.style.opacity = "0";
    segEls.forEach((element) => {
      element.style.opacity = "0";
    });
  };

  const show = () => {
    ring.style.opacity = ".7";
    dot.style.opacity = ".8";
    for (let i = 0; i < config.segments; i += 1) {
      segEls[i].style.opacity = getSegmentOpacity(i);
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      return;
    }
    rafId = requestAnimationFrame(animate);
  };

  setImmediatePosition(globalThis.innerWidth / 2, globalThis.innerHeight / 2);
  show();
  updateSegmentSizes();
  rafId = requestAnimationFrame(animate);

  globalThis.addEventListener("mousemove", onMove, { passive: true });
  globalThis.addEventListener("mouseenter", show);
  globalThis.addEventListener("mouseleave", hide);

  const hoverTargets = document.querySelectorAll(config.hoverTargets);
  hoverTargets.forEach((element) => {
    element.addEventListener("mouseenter", enlarge);
    element.addEventListener("mouseleave", reset);
  });

  globalThis.addEventListener("mousedown", () => {
    ring.style.transform = "translate(-50%, -50%) scale(0.85)";
  });

  globalThis.addEventListener("mouseup", () => {
    ring.style.transform = "translate(-50%, -50%) scale(1)";
  });

  document.addEventListener("visibilitychange", handleVisibilityChange);
});
