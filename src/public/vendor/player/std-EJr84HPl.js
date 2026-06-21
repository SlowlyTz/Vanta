import { t as e } from "./rolldown-runtime-Dy4uBu1J.js";
//#region node_modules/@maverick-js/signals/dist/prod/symbols.js
var t = Symbol(0), n = !1, r = !1, i = null, a = null, o = null, s = 0, c = [], l = {}, ee = () => {}, u = 0, d = 1, f = 2, p = 3;
function te() {
	n = !0, queueMicrotask(m);
}
function m() {
	if (!c.length) {
		n = !1;
		return;
	}
	r = !0;
	for (let e = 0; e < c.length; e++) c[e].$st !== u && ne(c[e]);
	c = [], n = !1, r = !1;
}
function ne(e) {
	let n = [e];
	for (; e = e[t];) e.$e && e.$st !== u && n.push(e);
	for (let e = n.length - 1; e >= 0; e--) j(n[e]);
}
function re(e) {
	let t = ue();
	return b(t, e.length ? e.bind(null, v.bind(t)) : e, null);
}
function ie(e) {
	return b(i, e, null);
}
function ae(e) {
	return b(null, e, null);
}
function oe() {
	r || m();
}
function h() {
	return i;
}
function se(e, t) {
	try {
		return b(t, e, null);
	} catch (e) {
		x(t, e);
		return;
	}
}
function g(e, t = i) {
	return t?.$cx[e];
}
function ce(e, t, n = i) {
	n && (n.$cx = {
		...n.$cx,
		[e]: t
	});
}
function _(e) {
	if (!e || !i) return e || ee;
	let t = i;
	return t.$d ? Array.isArray(t.$d) ? t.$d.push(e) : t.$d = [t.$d, e] : t.$d = e, function() {
		t.$st !== p && (e.call(null), A(t.$d) ? t.$d = null : Array.isArray(t.$d) && t.$d.splice(t.$d.indexOf(e), 1));
	};
}
function v(e = !0) {
	if (this.$st !== p) {
		if (this.$h) if (Array.isArray(this.$h)) for (let e = this.$h.length - 1; e >= 0; e--) v.call(this.$h[e]);
		else v.call(this.$h);
		if (e) {
			let e = this[t];
			e && (Array.isArray(e.$h) ? e.$h.splice(e.$h.indexOf(this), 1) : e.$h = null), le(this);
		}
	}
}
function le(e) {
	e.$st = p, e.$d && y(e), e.$s && F(e, 0), e[t] = null, e.$s = null, e.$o = null, e.$h = null, e.$cx = l, e.$eh = null;
}
function y(e) {
	try {
		if (Array.isArray(e.$d)) for (let t = e.$d.length - 1; t >= 0; t--) {
			let n = e.$d[t];
			n.call(n);
		}
		else e.$d.call(e.$d);
		e.$d = null;
	} catch (t) {
		x(e, t);
	}
}
function b(e, t, n) {
	let r = i, o = a;
	i = e, a = n;
	try {
		return t.call(e);
	} finally {
		i = r, a = o;
	}
}
function x(e, t) {
	if (!e || !e.$eh) throw t;
	let n = 0, r = e.$eh.length, i = S(t);
	for (n = 0; n < r; n++) try {
		e.$eh[n](i);
		break;
	} catch (e) {
		i = S(e);
	}
	if (n === r) throw i;
}
function S(e) {
	return e instanceof Error ? e : Error(JSON.stringify(e));
}
function C() {
	return this.$st === p ? this.$v : (a && !this.$e && (!o && a.$s && a.$s[s] == this ? s++ : o ? o.push(this) : o = [this]), this.$c && j(this), this.$v);
}
function w(e) {
	let t = A(e) ? e(this.$v) : e;
	if (this.$ch(this.$v, t) && (this.$v = t, this.$o)) for (let e = 0; e < this.$o.length; e++) P(this.$o[e], f);
	return this.$v;
}
var T = function() {
	this[t] = null, this.$h = null, i && i.append(this);
}, E = T.prototype;
E.$cx = l, E.$eh = null, E.$c = null, E.$d = null, E.append = function(e) {
	e[t] = this, this.$h ? Array.isArray(this.$h) ? this.$h.push(e) : this.$h = [this.$h, e] : this.$h = e, e.$cx = e.$cx === l ? this.$cx : {
		...this.$cx,
		...e.$cx
	}, this.$eh && (e.$eh = e.$eh ? [...e.$eh, ...this.$eh] : this.$eh);
}, E.dispose = function() {
	v.call(this);
};
function ue() {
	return new T();
}
var D = function(e, t, n) {
	T.call(this), this.$st = t ? f : u, this.$i = !1, this.$e = !1, this.$s = null, this.$o = null, this.$v = e, t && (this.$c = t), n && n.dirty && (this.$ch = n.dirty);
}, O = D.prototype;
Object.setPrototypeOf(O, E), O.$ch = de, O.call = C;
function k(e, t, n) {
	return new D(e, t, n);
}
function de(e, t) {
	return e !== t;
}
function A(e) {
	return typeof e == "function";
}
function j(e) {
	if (e.$st === d) for (let t = 0; t < e.$s.length && (j(e.$s[t]), e.$st !== f); t++);
	e.$st === f ? N(e) : e.$st = u;
}
function M(e) {
	e.$h && v.call(e, !1), e.$d && y(e), e.$eh = e[t] ? e[t].$eh : null;
}
function N(e) {
	let t = o, n = s;
	o = null, s = 0;
	try {
		M(e);
		let t = b(e, e.$c, e);
		if (o) {
			if (e.$s && F(e, s), e.$s && s > 0) {
				e.$s.length = s + o.length;
				for (let t = 0; t < o.length; t++) e.$s[s + t] = o[t];
			} else e.$s = o;
			let t;
			for (let n = s; n < e.$s.length; n++) t = e.$s[n], t.$o ? t.$o.push(e) : t.$o = [e];
		} else e.$s && s < e.$s.length && (F(e, s), e.$s.length = s);
		!e.$e && e.$i ? w.call(e, t) : (e.$v = t, e.$i = !0);
	} catch (t) {
		x(e, t), e.$st === f && (M(e), e.$s && F(e, 0));
		return;
	}
	o = t, s = n, e.$st = u;
}
function P(e, t) {
	if (!(e.$st >= t) && (e.$e && e.$st === u && (c.push(e), n || te()), e.$st = t, e.$o)) for (let t = 0; t < e.$o.length; t++) P(e.$o[t], d);
}
function F(e, t) {
	let n, r;
	for (let i = t; i < e.$s.length; i++) n = e.$s[i], n.$o && (r = n.$o.indexOf(e), n.$o[r] = n.$o[n.$o.length - 1], n.$o.pop());
}
//#endregion
//#region node_modules/@maverick-js/signals/dist/prod/signals.js
function I(e, n) {
	let r = k(e, null, n), i = C.bind(r);
	return i[t] = !0, i.set = w.bind(r), i;
}
function fe(e) {
	return A(e) && t in e;
}
function L(e, n) {
	let r = k(n?.initial, e, n), i = C.bind(r);
	return i[t] = !0, i;
}
function R(e, t) {
	let n = k(null, function() {
		let t = e();
		return A(t) && _(t), null;
	}, void 0);
	return n.$e = !0, N(n), v.bind(n, !0);
}
function pe(e) {
	return fe(e) && "set" in e;
}
//#endregion
//#region node_modules/maverick.js/dist/prod/chunks/chunk-OJRMMG75.js
function me(...e) {}
function z(e) {
	return e === null;
}
function B(e) {
	return e === void 0;
}
function he(e) {
	return z(e) || B(e);
}
function ge(e) {
	return typeof e == "number" && !Number.isNaN(e);
}
function _e(e) {
	return typeof e == "string";
}
function ve(e) {
	return typeof e == "boolean";
}
function ye(e) {
	return typeof e == "function";
}
function V(e) {
	return Array.isArray(e);
}
function be(e) {
	return {
		id: Symbol(),
		provide: e
	};
}
function xe(e, t, n = h()) {
	let r = !B(t);
	ce(e.id, r ? t : e.provide?.(), n);
}
function H(e) {
	return g(e.id);
}
function Se(e) {
	return !B(g(e.id));
}
var Ce = class {
	constructor(e) {
		this.id = Symbol(0), this.record = e, this.v = Object.getOwnPropertyDescriptors(e);
	}
	create() {
		let e = {}, t = new Proxy(e, { get: (t, n) => e[n]() });
		for (let n of Object.keys(this.record)) {
			let r = this.v[n].get;
			e[n] = r ? L(r.bind(t)) : I(this.record[n]);
		}
		return e;
	}
	reset(e, t) {
		for (let n of Object.keys(e)) !this.v[n].get && (!t || t(n)) && e[n].set(this.record[n]);
	}
};
function we(e) {
	return H(e);
}
var Te = R;
function Ee(e) {
	let t = e;
	for (; typeof t == "function";) t = t();
	return t;
}
//#endregion
//#region node_modules/maverick.js/dist/prod/chunks/chunk-XPDWGPRV.js
var De = Event, U = Symbol("DOM_EVENT"), W, Oe = class extends De {
	constructor(e, ...t) {
		super(e, t[0]), this[W] = !0, this.detail = t[0]?.detail, this.trigger = t[0]?.trigger;
	}
	get originEvent() {
		return G(this) ?? this;
	}
	get isOriginTrusted() {
		return G(this)?.isTrusted ?? !1;
	}
};
W = U;
function ke(e) {
	return !!e?.[U];
}
function G(e) {
	let t = e.trigger;
	for (; t && t.trigger;) t = t.trigger;
	return t;
}
function Ae(e, t) {
	let n = G(e) ?? e;
	if (n === t) throw Error("");
	Object.defineProperty(n, "trigger", {
		configurable: !0,
		enumerable: !0,
		get: () => t
	});
}
var je = class extends EventTarget {
	addEventListener(e, t, n) {
		return super.addEventListener(e, t, n);
	}
	removeEventListener(e, t, n) {
		return super.removeEventListener(e, t, n);
	}
};
function Me(e, t, n, r) {
	return e.addEventListener(t, n, r), _(() => e.removeEventListener(t, n, r));
}
function Ne(e) {
	return !!e?.type.startsWith("pointer");
}
function Pe(e) {
	return !!e?.type.startsWith("touch");
}
function Fe(e) {
	return /^(click|mouse)/.test(e?.type ?? "");
}
function K(e) {
	return !!e?.type.startsWith("key");
}
function Ie(e) {
	return K(e) && (e.key === "Enter" || e.key === " ");
}
function q(e) {
	return e instanceof Node;
}
function Le(e) {
	return q(e) && e.nodeType === 1;
}
function Re() {
	return document.createDocumentFragment();
}
function ze(e) {
	return document.createComment(e);
}
function Be(e, t, n) {
	if (!n && n !== "" && n !== 0) e.removeAttribute(t);
	else {
		let r = n + "";
		e.getAttribute(t) !== r && e.setAttribute(t, r);
	}
}
function Ve(e, t, n) {
	!n && n !== 0 ? e.style.removeProperty(t) : e.style.setProperty(t, n + "");
}
function He(e, t) {
	for (let n of e) n(t);
}
function Ue(e) {
	return e.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
function We(e) {
	return e.replace(/-./g, (e) => e[1].toUpperCase());
}
function Ge(e) {
	return e.charAt(0).toUpperCase() + e.slice(1);
}
function J(e) {
	let t = [];
	for (let n = 0; n < e.length; n++) V(e[n]) ? t.push(...J(e[n])) : (e[n] || e[n] === 0) && t.push(e[n]);
	return t;
}
//#endregion
//#region node_modules/maverick.js/dist/prod/std.js
var Ke = /* @__PURE__ */ e({
	animationFrameThrottle: () => qe,
	ariaBool: () => Y,
	createDisposalBin: () => X,
	deferredPromise: () => Q,
	useDisposalBin: () => Z,
	waitIdlePeriod: () => Ye,
	waitTimeout: () => $
});
function Y(e) {
	return e ? "true" : "false";
}
function X() {
	let e = /* @__PURE__ */ new Set();
	return {
		add(...t) {
			for (let n of t) e.add(n);
		},
		empty() {
			for (let t of e) t();
			e.clear();
		}
	};
}
function Z() {
	let e = X();
	return _(e.empty), e;
}
function Q() {
	let e, t;
	return {
		promise: new Promise((n, r) => {
			e = n, t = r;
		}),
		resolve: e,
		reject: t
	};
}
function $(e) {
	return new Promise((t) => setTimeout(t, e));
}
function qe(e) {
	let t = -1, n;
	function r(...r) {
		n = r, !(t >= 0) && (t = window.requestAnimationFrame(() => {
			e.apply(this, n), t = -1, n = void 0;
		}));
	}
	return r;
}
var Je = "requestIdleCallback" in window ? window.requestIdleCallback : (e) => window.requestAnimationFrame(e);
function Ye(e, t) {
	return new Promise((n) => {
		Je((t) => {
			e?.(t), n();
		}, t);
	});
}
//#endregion
export { ie as $, be as A, B, We as C, Ve as D, Be as E, ye as F, we as G, xe as H, he as I, pe as J, L as K, z as L, Se as M, V as N, Ge as O, ve as P, _ as Q, ge as R, Pe as S, He as T, Ee as U, me as V, H as W, h as X, I as Y, A as Z, q as _, Ke as a, Fe as b, Oe as c, Ue as d, re as et, ze as f, ke as g, Le as h, Q as i, Te as j, Ce as k, je as l, J as m, Y as n, oe as nt, Z as o, Re as p, R as q, X as r, ae as rt, $ as s, qe as t, se as tt, Ae as u, Ie as v, Me as w, Ne as x, K as y, _e as z };
