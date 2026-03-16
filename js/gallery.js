document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".gallery-card");

  cards.forEach((card) => {
    const video = card.querySelector("video");
    if (!video || video.classList.contains("always-video")) return;

    card.addEventListener("mouseenter", () => {
      video.play();
    });

    card.addEventListener("mouseleave", () => {
      video.pause();
      video.currentTime = 0;
    });
  });
});
