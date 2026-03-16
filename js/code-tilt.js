// ===========================
// CODE TILT — 3D tilt effect on hero code window
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    const codeWindow = document.querySelector('.code-window');
    if (codeWindow) {
        codeWindow.addEventListener('mousemove', (e) => {
            const rect = codeWindow.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the element
            const y = e.clientY - rect.top;  // y position within the element
            
            // Calculate rotation depending on mouse position
            // Center is 0, edges are max degrees
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -10; // Max 10 deg
            const rotateY = ((x - centerX) / centerX) * 10;  // Max 10 deg
            
            // Apply exact transformations
            codeWindow.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            codeWindow.style.transition = 'transform 0.1s ease-out'; // Fast response while moving
        });

        codeWindow.addEventListener('mouseleave', () => {
            // Reset to default css state (this CSS handles the perspective too)
            codeWindow.style.transform = 'perspective(1000px) rotateY(-5deg) rotateX(5deg)';
            codeWindow.style.transition = 'transform 0.5s ease'; // Smooth return
        });
    }
});
