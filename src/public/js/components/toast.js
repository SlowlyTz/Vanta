export class Toast {
  static show(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;

    let icon = '';
    if (type === 'error') {
      icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(0, 85%, 60%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else if (type === 'success') {
      icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(140, 70%, 50%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else {
      icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(240, 5%, 65%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-text">${message}</div>
    `;

    container.appendChild(toast);

    // Trigger slide out before removing
    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, duration);
  }
}
