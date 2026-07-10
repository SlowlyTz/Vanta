class AppStore {
  async showToast(message, type = 'info') {
    const { Toast } = await import('../components/toast.js');
    Toast.show(message, type);
  }
}

export const appStore = new AppStore();
