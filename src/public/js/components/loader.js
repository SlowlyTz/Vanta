export class Loader {
  static show() {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.classList.remove('hidden');
    }
  }

  static hide() {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.classList.add('hidden');
    }
  }
}
