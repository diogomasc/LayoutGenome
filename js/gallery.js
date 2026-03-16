// ===========================
// GALLERY — Video hover play/pause
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.gallery-card').forEach(card => {
        const video = card.querySelector('video');
        if (video && !video.classList.contains('always-video')) {
            card.addEventListener('mouseenter', () => video.play());
            card.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0;
            });
        }
    });
});
