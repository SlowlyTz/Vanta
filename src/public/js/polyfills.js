// The few platform APIs VANTA uses that TV browsers from about 2020 (webOS 5,
// Tizen 5.5: Chromium 68-69) lack. The build lowers the syntax (vite.config.js
// target); these fill in the rest. Each one only steps in where the API is missing.

if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

const define = (target, name, value) => {
  if (name in target) return;
  Object.defineProperty(target, name, { value, writable: true, configurable: true });
};

const replaceChildren = function replaceChildren(...nodes) {
  while (this.lastChild) this.removeChild(this.lastChild);
  this.append(...nodes);
};
define(Element.prototype, 'replaceChildren', replaceChildren);
define(DocumentFragment.prototype, 'replaceChildren', replaceChildren);
define(Document.prototype, 'replaceChildren', replaceChildren);

define(String.prototype, 'replaceAll', function replaceAll(search, replacement) {
  if (search instanceof RegExp) return this.replace(search, replacement);
  return this.split(String(search)).join(typeof replacement === 'function' ? replacement(search) : replacement);
});

const at = function at(index) {
  const length = this.length;
  const relative = Math.trunc(index) || 0;
  const position = relative < 0 ? length + relative : relative;
  return position < 0 || position >= length ? undefined : this[position];
};
define(Array.prototype, 'at', at);
define(String.prototype, 'at', at);

define(Array.prototype, 'flat', function flat(depth = 1) {
  return depth < 1
    ? Array.prototype.slice.call(this)
    : Array.prototype.reduce.call(this, (out, value) => out.concat(Array.isArray(value) ? value.flat(depth - 1) : [value]), []);
});
define(Array.prototype, 'flatMap', function flatMap(callback, thisArg) {
  return Array.prototype.map.call(this, callback, thisArg).flat(1);
});

define(Object, 'hasOwn', (object, key) => Object.prototype.hasOwnProperty.call(object, key));
define(Object, 'fromEntries', entries => {
  const object = {};
  for (const [key, value] of entries) object[key] = value;
  return object;
});

define(Promise, 'allSettled', promises => Promise.all(Array.from(promises, promise => Promise.resolve(promise).then(
  value => ({ status: 'fulfilled', value }),
  reason => ({ status: 'rejected', reason })
))));

if (typeof window.queueMicrotask !== 'function') {
  window.queueMicrotask = callback => Promise.resolve().then(callback);
}
