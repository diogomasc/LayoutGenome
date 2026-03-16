document.addEventListener("DOMContentLoaded", () => {
  const anchorSelector = 'a[href^="#"]';
  const anchors = document.querySelectorAll(anchorSelector);

  anchors.forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const targetId = anchor.getAttribute("href");
      if (!targetId || targetId === "#") return;

      const targetElement = document.querySelector(targetId);
      if (!targetElement) return;

      event.preventDefault();
      targetElement.scrollIntoView({ behavior: "smooth" });
    });
  });
});
