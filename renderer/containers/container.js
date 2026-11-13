// Keeps state outside React, like the `unstated` package this replaces.
// `setState` merges the update and changes `state` at once, so code can read
// the new state right after the call. Components read containers through
// `connect` (in ./index.js), which renders them again after every change.
export class Container {
  state = {};
  listeners = new Set();

  setState(update) {
    this.state = {...this.state, ...update};

    for (const listener of this.listeners) {
      listener();
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}
