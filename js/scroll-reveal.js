document.addEventListener("DOMContentLoaded", () => {
  const revealSelector =
    ".card, .step-card, .section-header, .testimonial-card, .pricing-box";
  const revealElements = document.querySelectorAll(revealSelector);
  if (!revealElements.length) return;

  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
  };

  const applyInitialRevealState = (element) => {
    element.style.opacity = "0";
    element.style.transform = "translateY(30px)";
    element.style.transition = "opacity 0.6s ease-out, transform 0.6s ease-out";
  };

  revealElements.forEach(applyInitialRevealState);

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
      currentObserver.unobserve(entry.target);
    });
  }, observerOptions);

  revealElements.forEach((element) => {
    observer.observe(element);
  });
});
