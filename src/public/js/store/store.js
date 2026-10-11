// The subscribe/notify part every store shares. A store extends it and
// implements getState(); notify() hands the current state to every listener.
// `emitOnSubscribe` gives a new listener the current state at once (the
// notification and invitation stores), the auth store only reports changes.
export class Store {
  constructor({ emitOnSubscribe = true } = {}) {
    this.listeners = new Set();
    this.emitOnSubscribe = emitOnSubscribe;
  }

  getState() {
    return {};
  }

  subscribe(listener) {
    this.listeners.add(listener);
    if (this.emitOnSubscribe) listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const state = this.getState();
    for (const listener of [...this.listeners]) listener(state);
  }
}
