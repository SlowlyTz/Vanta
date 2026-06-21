export function once(target, eventName, timeoutMs, rejectEvents = []) {
  return new Promise((resolve, reject) => {
    let timeout;
    const cleanups = [];

    const cleanup = () => {
      window.clearTimeout(timeout);
      cleanups.forEach(fn => fn());
    };

    const onSuccess = event => {
      cleanup();
      resolve(event);
    };

    target.addEventListener(eventName, onSuccess, { once: true });
    cleanups.push(() => target.removeEventListener(eventName, onSuccess));

    rejectEvents.forEach(name => {
      const onFailure = event => {
        cleanup();
        const message = event.detail?.message || `Playback failed while waiting for ${eventName}`;
        reject(new Error(message));
      };
      target.addEventListener(name, onFailure, { once: true });
      cleanups.push(() => target.removeEventListener(name, onFailure));
    });

    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Playback timed out while waiting for ${eventName}`));
    }, timeoutMs);
  });
}
