// App-wide UI helper: shows toasts (the component loads on first use).
class AppStore {
  // `options.action` ({ label, onClick }) adds a button, e.g. "Rückgängig".
  async showToast(message, type = 'info', options = {}) {
    const { Toast } = await import('../components/toast.js');
    return Toast.show(message, type, undefined, options);
  }
}

export const appStore = new AppStore();
