// The subscribe/notify part every store shares. A store extends it and
// implements getState(); notify() hands the current state to every listener.
// `emitOnSubscribe` gives a new listener the current state at once (the
// notification and invitation stores), the auth store only reports changes.
// `generation` changes when a store is cleared at logout; an answer that left
// before (`isCurrent(generation)` false) belongs to the previous account.
export class Store {
  constructor({ emitOnSubscribe = true } = {}) {
    this.listeners = new Set();
    this.emitOnSubscribe = emitOnSubscribe;
    this.generation = 0;
  }

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
