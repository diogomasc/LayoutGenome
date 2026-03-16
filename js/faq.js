// ===========================
// FAQ — Toggle logic
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const input = item.querySelector('input');
        const label = item.querySelector('label');
        
        if(label && input) {
            label.addEventListener('click', (e) => {
                // Previne o comportamento padrão para não bugar no mobile as vezes
                e.preventDefault();
                
                // Alterna o atual
                input.checked = !input.checked;
            });
        }
    });
});
