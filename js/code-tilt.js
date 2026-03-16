document.addEventListener("DOMContentLoaded", () => {
  const codeWindow = document.querySelector(".code-window");
  if (!codeWindow) return;

  const config = {
    perspective: 1000,
    maxTiltDeg: 10,
    scale: 1.02,
    moveTransition: "transform 0.1s ease-out",
    leaveTransition: "transform 0.5s ease",
    restingTransform: "perspective(1000px) rotateY(-5deg) rotateX(5deg)",
  };

  const applyTransform = (rotateX, rotateY) => {
    codeWindow.style.transform = `perspective(${config.perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${config.scale}, ${config.scale}, ${config.scale})`;
  };

  codeWindow.addEventListener("mousemove", (event) => {
    const rect = codeWindow.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const rotateX = ((y - centerY) / centerY) * -config.maxTiltDeg;
    const rotateY = ((x - centerX) / centerX) * config.maxTiltDeg;

    applyTransform(rotateX, rotateY);
    codeWindow.style.transition = config.moveTransition;
  });

  codeWindow.addEventListener("mouseleave", () => {
    codeWindow.style.transform = config.restingTransform;
    codeWindow.style.transition = config.leaveTransition;
  });
});
