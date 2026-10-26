// Base class of every store: notify() hands getState() to all listeners; with
// `emitOnSubscribe` (the default) a new listener also gets the current state at once.
export class Store {
  constructor({ emitOnSubscribe = true } = {}) {
    this.listeners = new Set();
    this.emitOnSubscribe = emitOnSubscribe;
    this.generation = 0;
  }

  // Called when a store is cleared at logout: an answer that started before then
  // fails `isCurrent(generation)`, as it belongs to the previous account.
  nextGeneration() {
    this.generation += 1;
    this.loading = null;
  }

  isCurrent(generation) {
    return generation === this.generation;
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
    // One failing listener must not keep the others from hearing it.
    for (const listener of [...this.listeners]) {
      try {
        listener(state);
      } catch (error) {
        console.error('[Store listener]', error);
      }
    }
  }
}
