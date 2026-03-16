document.addEventListener("DOMContentLoaded", () => {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const input = item.querySelector(".faq-toggle");
    const label = item.querySelector(".faq-question");
    if (!label || !input) return;

    label.addEventListener("click", (event) => {
      event.preventDefault();
      input.checked = !input.checked;
    });
  });
});
