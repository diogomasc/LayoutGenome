// ===========================
// CUSTOM CURSOR — Snake-style trail with blue theme
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    const ring = document.getElementById('cursor-ring');
    const dot = document.getElementById('cursor-dot');
    if (ring && dot) {
        let rafId;
        let targetX = window.innerWidth / 2, targetY = window.innerHeight / 2;
        let currentX = targetX, currentY = targetY;

        // Snake segments
        const SEGMENTS = 14; // Slightly shorter for more subtlety
        const segEls = [];
        const segX = new Array(SEGMENTS);
        const segY = new Array(SEGMENTS);
        let sizeBoost = 0;

        const createSegment = (i) => {
            const el = document.createElement('div');
            const z = 9998; // under ring/dot
            const baseSize = Math.max(3, 10 - i * 0.5);
            const opacity = Math.max(0.1, 0.6 - i * 0.04);
            el.className = 'pointer-events-none cursor-segment hidden md:block';
            el.style.cssText = [
                `z-index:${z};`,
                `width:${baseSize}px;`,
                `height:${baseSize}px;`,
                'border-radius:9999px;',
                'transform:translate(-50%,-50%);',
                // using blue: rgba(59, 130, 246)
                `background: rgba(59, 130, 246, ${Math.min(0.8, 0.4 + (0.02 * (SEGMENTS - i)))});`,
                `box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.05), 0 0 12px rgba(37, 99, 235, 0.15);`,
                `opacity:${opacity};`,
                'transition: opacity .2s;',
                'will-change: left, top;',
                'position: fixed;',
                'top: 0;',
                'left: 0;',
                'pointer-events: none !important;'
            ].join('');
            document.body.appendChild(el);
            return el;
        };

        for (let i = 0; i < SEGMENTS; i++) {
            segEls[i] = createSegment(i);
            segX[i] = targetX;
            segY[i] = targetY;
        }

        const updateSegmentSizes = () => {
            for (let i = 0; i < SEGMENTS; i++) {
                const base = Math.max(3, 10 - i * 0.5);
                const size = base + sizeBoost;
                segEls[i].style.width = size + 'px';
                segEls[i].style.height = size + 'px';
            }
        };

        const setImmediate = (x, y) => {
            ring.style.left = x + 'px';
            ring.style.top = y + 'px';
            dot.style.left = x + 'px';
            dot.style.top = y + 'px';
            for (let i = 0; i < SEGMENTS; i++) {
                segX[i] = x; segY[i] = y;
                segEls[i].style.left = x + 'px';
                segEls[i].style.top  = y + 'px';
            }
        };

        const animate = () => {
            // Lead ring follows smoothly
            currentX += (targetX - currentX) * 0.22;
            currentY += (targetY - currentY) * 0.22;
            ring.style.left = currentX + 'px';
            ring.style.top = currentY + 'px';

            // Dot snaps to target
            dot.style.left = targetX + 'px';
            dot.style.top = targetY + 'px';

            // Snake: head follows target, rest follow the previous segment
            segX[0] += (targetX - segX[0]) * 0.28;
            segY[0] += (targetY - segY[0]) * 0.28;

            for (let i = 1; i < SEGMENTS; i++) {
                segX[i] += (segX[i - 1] - segX[i]) * 0.28;
                segY[i] += (segY[i - 1] - segY[i]) * 0.28;
            }

            for (let i = 0; i < SEGMENTS; i++) {
                segEls[i].style.left = segX[i] + 'px';
                segEls[i].style.top  = segY[i] + 'px';
            }

            rafId = requestAnimationFrame(animate);
        };

        const onMove = (e) => {
            targetX = e.clientX;
            targetY = e.clientY;
        };

        const enlarge = () => {
            ring.style.width = '36px';
            ring.style.height = '36px';
            ring.style.borderColor = 'rgba(59, 130, 246, 0.8)';
            ring.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1), 0 0 40px rgba(37, 99, 235, 0.3)';
            sizeBoost = 1.5;
            updateSegmentSizes();
        };

        const reset = () => {
            ring.style.width = '24px';
            ring.style.height = '24px';
            ring.style.borderColor = 'rgba(59, 130, 246, 0.5)';
            ring.style.boxShadow = '0 0 0 1px rgba(59, 130, 246, 0.1), 0 0 20px rgba(37, 99, 235, 0.15)';
            sizeBoost = 0;
            updateSegmentSizes();
        };

        const hide = () => {
            ring.style.opacity = '0';
            dot.style.opacity = '0';
            for (const el of segEls) el.style.opacity = '0';
        };

        const show = () => {
            ring.style.opacity = '.7';
            dot.style.opacity = '.8';
            for (let i = 0; i < SEGMENTS; i++) {
                const opacity = Math.max(0.1, 0.6 - i * 0.04);
                segEls[i].style.opacity = opacity;
            }
        };

        // Start animation
        setImmediate(window.innerWidth / 2, window.innerHeight / 2);
        show();
        updateSegmentSizes();
        rafId = requestAnimationFrame(animate);
        window.addEventListener('mousemove', onMove, { passive: true });
        window.addEventListener('mouseenter', show);
        window.addEventListener('mouseleave', hide);

        // Hover targets enlarge effect
        const hoverTargets = document.querySelectorAll(
            'a, button, input, label, .btn, .btn-lumina, .btn-outline, .faq-question, .capture-btn, .logo, .nav-links a, .control'
        );
        hoverTargets.forEach((el) => {
            el.addEventListener('mouseenter', enlarge);
            el.addEventListener('mouseleave', reset);
        });

        // Click feedback
        window.addEventListener('mousedown', () => {
            ring.style.transform = 'translate(-50%, -50%) scale(0.85)';
        });
        window.addEventListener('mouseup', () => {
            ring.style.transform = 'translate(-50%, -50%) scale(1)';
        });

        // Cleanup on page hide
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cancelAnimationFrame(rafId);
            } else {
                rafId = requestAnimationFrame(animate);
            }
        });
    }
});
