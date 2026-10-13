export class Toast {
  // `action` ({ label, onClick }) adds a button such as "Rückgängig"; the
  // toast then stays a little longer and closes once it is used.
  static show(message, type = 'info', duration = 4000, { action = null } = {}) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    // The container is a polite live region; an error interrupts.
    if (type === 'error') toast.setAttribute('role', 'alert');

    let icon = '';
    if (type === 'error') {
      icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(0, 85%, 60%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else if (type === 'success') {
      icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(140, 70%, 50%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else {
      icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(240, 5%, 65%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    const iconEl = document.createElement('div');
    iconEl.className = 'toast-icon';
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.innerHTML = icon;
    // Text, never markup: messages can carry server or user text.
    const textEl = document.createElement('div');
    textEl.className = 'toast-text';
    textEl.textContent = String(message ?? '');
    toast.append(iconEl, textEl);

    const dismiss = () => {
      if (toast.classList.contains('fade-out')) return;
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    };

    if (action?.label) {
      const actionButton = document.createElement('button');
      actionButton.type = 'button';
      actionButton.className = 'toast-action';
      actionButton.textContent = action.label;
      actionButton.addEventListener('click', () => {
        dismiss();
        action.onClick?.();
      });
      toast.appendChild(actionButton);
    }

    container.appendChild(toast);

    // Trigger slide out before removing
    setTimeout(dismiss, action?.label ? Math.max(duration, 6000) : duration);
    return { dismiss };
  }
}
