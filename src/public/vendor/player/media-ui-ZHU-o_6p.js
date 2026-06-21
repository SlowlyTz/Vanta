import { $ as e, A as t, B as n, C as r, D as i, E as a, F as o, G as s, H as c, J as l, K as u, L as ee, M as te, N as d, P as ne, Q as f, R as re, S as ie, T as ae, U as oe, V as se, W as p, X as ce, Y as m, Z as le, _ as ue, b as de, c as h, d as fe, et as pe, f as me, g as he, h as ge, i as _e, j as g, k as ve, l as ye, m as be, n as xe, nt as _, p as Se, q as Ce, r as we, rt as Te, s as Ee, t as De, tt as v, u as y, v as Oe, w as b, x as ke, y as x, z as S } from "./std-EJr84HPl.js";
import { d as Ae, f as je, t as Me } from "./prod-BAD6V6LA.js";
//#region node_modules/maverick.js/dist/prod/chunks/chunk-XC5AOFRA.js
var C = class {
	get el() {
		return this.instance.m;
	}
	get $props() {
		return this.instance.e;
	}
	get $store() {
		return this.instance.k;
	}
	constructor(e) {
		this.instance = e, this.onAttach && e.d.push(this.onAttach.bind(this)), this.onConnect && e.p.push(this.onConnect.bind(this)), this.onDisconnect && e.i.push(this.onDisconnect.bind(this)), this.onDestroy && e.x.push(this.onDestroy.bind(this));
	}
	setAttributes(e) {
		this.instance.f && Object.assign(this.instance.f, e);
	}
	setStyles(e) {
		this.instance.q && Object.assign(this.instance.q, e);
	}
	setCSSVars(e) {
		this.setStyles(e);
	}
	createEvent(e, ...t) {
		return new h(e, t[0]);
	}
	dispatch(e, ...t) {
		if (!this.el) return;
		let n = new h(e, t[0]);
		this.el.dispatchEvent(n);
	}
	listen(e, t, n) {
		return this.el ? b(this.el, e, t, n) : se;
	}
}, w = class extends C {
	constructor(e) {
		super(e), this.render && !e.F && !e.h && (e.h = this.render.bind(this));
	}
	destroy() {
		this.instance.y();
	}
}, Ne = (e) => document.createTreeWalker(e, NodeFilter.SHOW_COMMENT, (e) => e.nodeValue === "$"), T = null;
function Pe(e, t) {
	let n = T;
	T = { w: Ne(t.target) };
	let r = e();
	return T = n, r;
}
var Fe = /* @__PURE__ */ Symbol(0), Ie = me("$$"), Le = /* @__PURE__ */ Symbol(0), Re = /* @__PURE__ */ me("/$"), ze = "/[]";
function Be(e, t, n) {
	let r = o(t);
	r && t[it] && (t = t(), r = o(t)), r ? He(e, t, n) : !T && (t || t === 0) && Ve(e, d(t) ? qe(t) : ue(t) ? t : document.createTextNode(t + ""), n);
}
function Ve(e, t, n) {
	t && (n ? e.insertBefore(t, n) : e.appendChild(t));
}
function He(e, t, n) {
	let r = n && n.nodeType === 8 ? n : Ie.cloneNode();
	r !== n && Ve(e, r, n), g(() => void Ue(r, oe(t)));
}
function Ue(e, t) {
	let n = e[Le];
	if (d(t)) if (T) e[Le] = Ge(e);
	else {
		n && Ke(e, n);
		let r = qe(t);
		if (!r) return;
		n || r.appendChild(We(e)), e.after(r);
	}
	else if (ue(t)) n && Ke(e, n), T || e.after(t), n || t.after(We(e));
	else if (S(t) || re(t)) {
		if (e[Fe]) {
			e.nextSibling.data = t + "";
			return;
		}
		n && Ke(e, n);
		let r;
		T ? r = e.nextSibling : (r = document.createTextNode(t + ""), e.after(r)), e[Fe] = !0, n || r.after(We(e));
	} else n && Ke(e, n);
}
function We(e) {
	return e[Le] = Re.cloneNode();
}
function Ge(e) {
	for (; e;) {
		if (e.nodeType === 8 && e.nodeValue === ze) return e;
		e = e.nextSibling;
	}
}
function Ke(e, t) {
	for (; e.nextSibling !== t;) e.nextSibling.remove();
	e[Fe] = !1;
}
function qe(e) {
	let t = be(e);
	if (!t.length) return null;
	let n = Se();
	for (let e = 0; e < t.length; e++) {
		let r = t[e];
		o(r) ? He(n, r) : n.append(r);
	}
	return n;
}
function Je(e) {
	Xe(e, { insert: Be });
}
var Ye = Symbol(0);
function Xe(e, t) {
	let n = e.el.tagName;
	window.customElements.get(n) || (window[Ye] || (window[Ye] = /* @__PURE__ */ new Map()), window[Ye].set(n, e), window.customElements.define(n, vt(e, t)));
}
function E(e) {
	let t = document.createElement("template");
	return t.innerHTML = e, t.content;
}
function D(e, t = T?.w) {
	try {
		return [Qe(t), t];
	} catch {
		return D(e, Ne(document.importNode(e, !0)));
	}
}
function Ze(e) {
	return D(e)[0];
}
function Qe(e) {
	let t = e.nextNode().nextSibling;
	if (t.localName.indexOf("-") > 0 && t.firstChild && t.firstChild.nodeName === "SHADOW-ROOT") {
		let n = t.firstChild.nextSibling || t.nextSibling;
		n && (e.currentNode = n);
	}
	return t;
}
var $e = T;
function et(e, t) {
	let n = window[Ye]?.get(e.localName);
	if (!n) throw Error(e.localName);
	let r = ft(n, { props: t });
	return e.attachComponent(r), r.instance.c;
}
function tt(e) {
	return document.importNode(e, !0).firstElementChild;
}
function nt(e) {
	return document.createElement(e);
}
var rt = Be;
function O(e, t) {
	Be(e.parentElement, t, e);
}
function k(t, n = {}) {
	return e(() => t(n));
}
var it = /* @__PURE__ */ Symbol(0);
function at(e, t) {
	d(t) ? t.filter(o).forEach((t) => t(e)) : o(t) && t(e);
}
var A = a;
function j(e, t, n, r = !1) {
	o(n) && b(e, t, n, { capture: r });
}
var ot = e, st = v, M = g, ct = u, lt = /* @__PURE__ */ Symbol(0), ut = /* @__PURE__ */ Symbol(0), dt = /* @__PURE__ */ Symbol(0);
function ft(e, t) {
	let n = new pt(e, t);
	return v(() => new e(n), n.c);
}
var pt = class {
	constructor(e, t = {}) {
		this.m = null, this.h = null, this.F = !1, this.j = !1, this.f = {}, this.q = {}, this.e = {}, this.z = null, this.k = null, this.d = [], this.p = [], this.i = [], this.x = [], pe((n) => {
			this.c = ce(), this.G = n, t.scope && t.scope.append(this.c);
			let r = e.el.store;
			r && (this.k = r.create(), this.z = new Proxy(this.k, { get: (e, t) => this.k[t]() }), c(r, this.k));
			let i = e.el.props;
			if (i && (this.e = mt(i), t.props)) {
				for (let e of Object.keys(t.props)) if (e in i) {
					let n = t.props[e];
					le(n) ? Ce(() => void this.e[e].set(n())) : this.e[e].set(n);
				}
			}
			t.props?.innerHTML && (this.F = !0), f(this.y.bind(this));
		});
	}
	y() {
		if (!this.j) {
			this.j = !0;
			for (let e of this.x) v(() => e(this.m), this.c);
			this.m?.destroy(), this.d.length = 0, this.p.length = 0, this.i.length = 0, this.x.length = 0, _(), this.G(), this.m = null, this.h = null;
		}
	}
};
function mt(e) {
	let t = {};
	for (let n of Object.keys(e)) {
		let r = e[n];
		t[n] = m(r.value, r);
	}
	return t;
}
async function ht(e) {
	let t = _t(e), n = e.constructor.a;
	t && (await customElements.whenDefined(t.localName), t[lt] === !0 || await new Promise((e) => t[lt].push(e))), e.isConnected && (t?.keepAlive && (e.keepAlive = !0), e.attachComponent(ft(n, { scope: t?.component?.instance.c })));
}
function gt(e) {
	let t = e.constructor, n = t.a, r = {};
	if (!t.f) return r;
	for (let i of e.attributes) {
		let a = t.f.get(i.name), o = a && n.el.props[a].type?.from;
		o && (r[a] = o(e.getAttribute(i.name)));
	}
	return r;
}
function _t(e) {
	let t = e.constructor.a, n = e.parentNode, r = t.el.tagName.split("-", 1)[0] + "-";
	for (; n;) {
		if (n.nodeType === 1 && n.localName.startsWith(r)) return n;
		n = n.parentNode;
	}
	return null;
}
function vt(e, t) {
	let n = e.register;
	if (e.register) {
		let e = d(n) ? n : n?.();
		if (d(e)) for (let n of e) Xe(n, t);
	}
	let r;
	if (e.el.props) {
		r = /* @__PURE__ */ new Map();
		for (let t of Object.keys(e.el.props)) {
			let n = e.el.props[t].attribute;
			if (n !== !1) {
				let e = n ?? fe(t);
				r.set(e, t);
			}
		}
	}
	class i extends xt {
		static get a() {
			return e;
		}
	}
	i.H = t, i.f = r;
	let a = i.prototype, o = e.prototype;
	if (e.el.props) for (let t of Object.keys(e.el.props)) Object.defineProperty(a, t, {
		enumerable: !0,
		configurable: !0,
		get() {
			return this.component ? this.component.instance.e[t]() : e.el.props[t].value;
		},
		set(e) {
			let n = () => this.component.instance.e[t].set(e);
			if (!this.component) {
				this.l.delete(t), this.l.set(t, n);
				return;
			}
			n();
		}
	});
	if (o[ut]) for (let e of o[ut]) Object.defineProperty(a, e, {
		enumerable: !0,
		configurable: !0,
		get() {
			return this.component ? this.component[e] : void 0;
		},
		set(t) {
			if (!this.component) {
				this.l.delete(e), this.l.set(e, () => {
					this.component[e] = t;
				});
				return;
			}
			this.component[e] = t;
		}
	});
	if (o[dt]) for (let e of o[dt]) a[e] = function(...t) {
		return this.component[e](...t);
	};
	return i;
}
var yt = HTMLElement, bt, xt = class extends yt {
	constructor() {
		super(...arguments), this.r = !1, this.j = !1, this.a = null, this.s = null, this.d = /* @__PURE__ */ new Set(), this.i = [], this.l = /* @__PURE__ */ new Map(), this.keepAlive = !1, this[bt] = [], this.B = !1;
	}
	get A() {
		return this.hasAttribute("mk-d");
	}
	get component() {
		return this.a;
	}
	get $store() {
		return this.a?.instance.k;
	}
	get state() {
		return this.a.instance.z;
	}
	static get observedAttributes() {
		return this.f ? Array.from(this.f.keys()) : [];
	}
	attributeChangedCallback(e, t, n) {
		let r = this.constructor;
		if (!this.a || !r.f) return;
		let i = r.f.get(e), a = r.a.el.props[i]?.type?.from;
		a && this.a.instance.e[i].set(a(n));
	}
	connectedCallback() {
		let e = this.a?.instance;
		if (!this.A && !e) return this.N();
		!e || !this.isConnected || this.r || this.j || (this.hasAttribute("keep-alive") && (this.keepAlive = !0), this.r = !0, e.p.length && v(() => {
			pe((t) => {
				this.s = ce();
				for (let t of e.p) v(() => {
					let e = t(this);
					le(e) && this.i.push(e);
				}, this.s);
				this.i.push(t);
			});
		}, e.c), d(this[lt]) && (ae(this[lt], this), this[lt] = !0));
	}
	disconnectedCallback() {
		let e = this.a?.instance;
		if (!(!this.r || this.j)) {
			this.r = !1;
			for (let e of this.i) v(e, this.s);
			if (e?.i.length) for (let t of e.i) v(() => t(this), e.c);
			this.s = null, !this.A && !this.keepAlive && requestAnimationFrame(() => {
				this.isConnected || (e?.y(), this.j = !0);
			});
		}
	}
	attachComponent(e) {
		let t = e.instance, n = this.constructor, r = n.a.el, o = n.H;
		this.a || this.j || v(() => {
			this.o = t.h ? r.shadowRoot ? this.shadowRoot ?? this.attachShadow(ne(r.shadowRoot) ? { mode: "open" } : r.shadowRoot) : St(this) : null, !T && r.shadowRoot && r.css && o?.adoptCSS && o.adoptCSS(this.o, r.css), t.m = this, this.a = e;
			let s = gt(this);
			for (let e of Object.keys(s)) t.e[e].set(s[e]);
			if (this.l?.size) for (let e of this.l.values()) e();
			this.l = null;
			for (let e of [...t.d, ...this.d]) v(() => e(this), t.c);
			t.d.length = 0, this.d = null;
			let c = t.f, l = t.q;
			if (c) for (let e of Object.keys(c)) le(c[e]) ? Ce(() => a(this, e, c[e]())) : a(this, e, c[e]);
			if (l) for (let e of Object.keys(l)) le(l[e]) ? Ce(() => i(this, e, l[e]())) : i(this, e, l[e]);
			if (this.dispatchEvent(new Event("attached")), this.o && o && t.h) {
				let e = () => o.insert(this.o, t.h);
				this.hasAttribute("mk-h") && !n.a.el.nohydrate ? Pe(e, { target: this.o }) : e();
			}
			this.connectedCallback();
		}, t.c);
	}
	subscribe(e) {
		return v(() => Ce(() => e(this.a.instance.z)), this.a.instance.c);
	}
	onAttach(e) {
		return this.a ? (e(this), se) : (this.d.add(e), () => this.d?.delete(e));
	}
	onEventDispatch(e) {
		let t = this.constructor;
		if (t.n) for (let n of t.n) e(n);
		this.I = e;
	}
	destroy() {
		this.disconnectedCallback(), this.a?.destroy(), this.a = null, this.j = !0;
	}
	dispatchEvent(e) {
		if (this.A) {
			let t = this.constructor;
			t.n ||= /* @__PURE__ */ new Set(), t.n.has(e.type) || (this.I?.(e.type), t.n.add(e.type));
		}
		return Te(() => super.dispatchEvent(e));
	}
	async N() {
		this.B ||= (this.B = !0, await ht(this), !1);
	}
	P(e) {}
};
bt = lt;
function St(e) {
	if (e.firstChild && ge(e.firstChild) && e.firstChild.localName === "shadow-root") return e.firstChild;
	{
		let t = nt("shadow-root");
		return e.prepend(t), t;
	}
}
var Ct = Symbol(0);
function N(e) {
	return {
		[Ct]: !0,
		...e
	};
}
function P(e) {
	if ("props" in e) {
		let t = e.props;
		for (let e of Object.keys(t)) {
			let n = t[e]?.[Ct] ? t[e] : {
				[Ct]: !0,
				value: t[e]
			};
			n.attribute !== !1 && !n.type && (n.type = At(n.value)), t[e] = n;
		}
	}
	return e;
}
var wt = { from: (e) => e === null ? "" : e + "" }, Tt = { from: (e) => e === null ? 0 : Number(e) }, Et = {
	from: (e) => e !== null,
	to: (e) => e ? "" : null
}, Dt = {
	from: !1,
	to: () => null
}, Ot = {
	from: (e) => e === null ? [] : JSON.parse(e),
	to: (e) => JSON.stringify(e)
}, kt = {
	from: (e) => e === null ? {} : JSON.parse(e),
	to: (e) => JSON.stringify(e)
};
function At(e) {
	if (e === null) return wt;
	switch (typeof e) {
		case "undefined": return wt;
		case "string": return wt;
		case "boolean": return Et;
		case "number": return Tt;
		case "function": return Dt;
		case "object": return d(e) ? Ot : kt;
		default: return wt;
	}
}
function jt(e, t, n) {
	e[ut] || (e[ut] = /* @__PURE__ */ new Set()), e[ut].add(t);
}
function Mt(e, t, n) {
	e[dt] || (e[dt] = /* @__PURE__ */ new Set()), e[dt].add(t);
}
//#endregion
//#region node_modules/vidstack/dist/prod/providers/type-check.js
function Nt(e) {
	return e?.$$PROVIDER_TYPE === "HLS";
}
function Pt(e) {
	return e instanceof HTMLAudioElement;
}
function Ft(e) {
	return e instanceof HTMLVideoElement;
}
function It(e) {
	return Pt(e) || Ft(e);
}
//#endregion
//#region node_modules/vidstack/dist/prod/providers/audio/loader.js
var Lt = /\.(m4a|m4b|mp4a|mpga|mp2|mp2a|mp3|m2a|m3a|wav|weba|aac|oga|spx)($|\?)/i, Rt = /* @__PURE__ */ new Set([
	"audio/mpeg",
	"audio/ogg",
	"audio/3gp",
	"audio/mp4",
	"audio/webm",
	"audio/flac"
]), zt = /\.(mp4|og[gv]|webm|mov|m4v)(#t=[,\d+]+)?($|\?)/i, Bt = /* @__PURE__ */ new Set([
	"video/mp4",
	"video/webm",
	"video/3gp",
	"video/ogg",
	"video/avi",
	"video/mpeg"
]), Vt = /\.(m3u8)($|\?)/i, Ht = /* @__PURE__ */ new Set([
	"application/vnd.apple.mpegurl",
	"audio/mpegurl",
	"audio/x-mpegurl",
	"application/x-mpegurl",
	"video/x-mpegurl",
	"video/mpegurl",
	"application/mpegurl"
]);
function Ut({ src: e, type: t }) {
	return typeof e == "string" && Vt.test(e) || Ht.has(t);
}
function Wt(e) {
	return window.MediaStream !== void 0 && e instanceof window.MediaStream;
}
var Gt = /* @__PURE__ */ E("<!$><audio preload=\"none\" aria-hidden=\"true\"></audio>"), Kt = class {
	kh;
	canPlay({ src: e, type: t }) {
		return S(e) ? Lt.test(e) || Rt.has(t) || e.startsWith("blob:") && t === "audio/object" : t === "audio/object";
	}
	mediaType() {
		return "audio";
	}
	async load() {
		return new (await (import("./provider-CXZhVXSE.js"))).AudioProvider(this.kh);
	}
	render(e) {
		return (() => {
			let [t, n] = D(Gt);
			return M(() => A(t, "controls", e.controls())), M(() => A(t, "crossorigin", e.crossorigin())), at(t, (e) => void (this.kh = e)), t;
		})();
	}
}, qt = /* @__PURE__ */ E("<!$><video preload=\"none\" aria-hidden=\"true\"></video>"), Jt = class {
	qa;
	canPlay(e) {
		return S(e.src) ? zt.test(e.src) || Bt.has(e.type) || e.src.startsWith("blob:") && e.type === "video/object" || Ut(e) && xn() : e.type === "video/object";
	}
	mediaType() {
		return "video";
	}
	async load(e) {
		return new (await (import("./provider-D2AAyLE4.js"))).VideoProvider(this.qa, e);
	}
	render(e) {
		let t = u(() => e.poster() && e.controls() ? e.poster() : null);
		return (() => {
			let [n, r] = D(qt);
			return M(() => A(n, "controls", e.controls())), M(() => A(n, "crossorigin", e.crossorigin())), M(() => A(n, "poster", t())), at(n, (e) => void (this.qa = e)), n;
		})();
	}
}, Yt = class e extends Jt {
	static supported = Dn();
	preconnect() {
		Sr("https://cdn.jsdelivr.net", "preconnect");
	}
	canPlay({ src: t, type: n }) {
		return e.supported && S(t) && (Vt.test(t) || Ht.has(n));
	}
	async load(e) {
		return new (await (import("./provider-CA5DfhLF.js"))).HLSProvider(this.qa, e);
	}
}, Xt = Symbol(0), Zt = Symbol(0), Qt = Symbol(0), $t = Symbol(0), en = Symbol(0), tn = Symbol(0), nn = Symbol(0), rn = Symbol(0), an = Symbol(0), on = class extends ye {
	a = [];
	[en] = !1;
	get length() {
		return this.a.length;
	}
	get readonly() {
		return this[en];
	}
	toArray() {
		return [...this.a];
	}
	[Symbol.iterator]() {
		return this.a.values();
	}
	[Xt](e, t) {
		let n = this.a.length;
		"" + n in this || Object.defineProperty(this, n, { get() {
			return this.a[n];
		} }), !this.a.includes(e) && (this.a.push(e), this.dispatchEvent(new h("add", {
			detail: e,
			trigger: t
		})));
	}
	[Zt](e, t) {
		let n = this.a.indexOf(e);
		n >= 0 && (this[rn]?.(e, t), this.a.splice(n, 1), this.dispatchEvent(new h("remove", {
			detail: e,
			trigger: t
		})));
	}
	[Qt](e) {
		for (let t of [...this.a]) this[Zt](t, e);
		this.a = [], this[tn](!1, e), this[nn]?.();
	}
	[tn](e, t) {
		this[en] !== e && (this[en] = e, this.dispatchEvent(new h("readonly-change", {
			detail: e,
			trigger: t
		})));
	}
}, F = {
	fullscreenEnabled: 0,
	fullscreenElement: 1,
	requestFullscreen: 2,
	exitFullscreen: 3,
	fullscreenchange: 4,
	fullscreenerror: 5,
	fullscreen: 6
}, sn = [
	"webkitFullscreenEnabled",
	"webkitFullscreenElement",
	"webkitRequestFullscreen",
	"webkitExitFullscreen",
	"webkitfullscreenchange",
	"webkitfullscreenerror",
	"-webkit-full-screen"
], cn = [
	"mozFullScreenEnabled",
	"mozFullScreenElement",
	"mozRequestFullScreen",
	"mozCancelFullScreen",
	"mozfullscreenchange",
	"mozfullscreenerror",
	"-moz-full-screen"
], ln = [
	"msFullscreenEnabled",
	"msFullscreenElement",
	"msRequestFullscreen",
	"msExitFullscreen",
	"MSFullscreenChange",
	"MSFullscreenError",
	"-ms-fullscreen"
], I = typeof window < "u" && window.document !== void 0 ? window.document : {}, L = "fullscreenEnabled" in I && Object.keys(F) || sn[0] in I && sn || cn[0] in I && cn || ln[0] in I && ln || [], R = {
	requestFullscreen: function(e) {
		return e[L[F.requestFullscreen]]();
	},
	requestFullscreenFunction: function(e) {
		return e[L[F.requestFullscreen]];
	},
	get exitFullscreen() {
		return I[L[F.exitFullscreen]].bind(I);
	},
	get fullscreenPseudoClass() {
		return ":" + L[F.fullscreen];
	},
	addEventListener: function(e, t, n) {
		return I.addEventListener(L[F[e]], t, n);
	},
	removeEventListener: function(e, t, n) {
		return I.removeEventListener(L[F[e]], t, n);
	},
	get fullscreenEnabled() {
		return !!I[L[F.fullscreenEnabled]];
	},
	set fullscreenEnabled(e) {},
	get fullscreenElement() {
		return I[L[F.fullscreenElement]];
	},
	set fullscreenElement(e) {},
	get onfullscreenchange() {
		return I[("on" + L[F.fullscreenchange]).toLowerCase()];
	},
	set onfullscreenchange(e) {
		return I[("on" + L[F.fullscreenchange]).toLowerCase()] = e;
	},
	get onfullscreenerror() {
		return I[("on" + L[F.fullscreenerror]).toLowerCase()];
	},
	set onfullscreenerror(e) {
		return I[("on" + L[F.fullscreenerror]).toLowerCase()] = e;
	}
}, un = R.fullscreenEnabled, dn = class extends C {
	b = !1;
	c = !1;
	get active() {
		return this.c;
	}
	get supported() {
		return un;
	}
	onConnect() {
		b(R, "fullscreenchange", this.d.bind(this)), b(R, "fullscreenerror", this.e.bind(this));
	}
	async onDisconnect() {
		un && await this.exit();
	}
	d(e) {
		let t = pn(this.el);
		t !== this.c && (t || (this.b = !1), this.c = t, this.dispatch("fullscreen-change", {
			detail: t,
			trigger: e
		}));
	}
	e(e) {
		this.b &&= (this.dispatch("fullscreen-error", {
			detail: null,
			trigger: e
		}), !1);
	}
	async enter() {
		try {
			return this.b = !0, !this.el || pn(this.el) ? void 0 : (mn(), R.requestFullscreen(this.el));
		} catch (e) {
			throw this.b = !1, e;
		}
	}
	async exit() {
		if (!(!this.el || !pn(this.el))) return mn(), R.exitFullscreen();
	}
};
function fn() {
	return un;
}
function pn(e) {
	if (R.fullscreenElement === e) return !0;
	try {
		return e.matches(R.fullscreenPseudoClass);
	} catch {
		return !1;
	}
}
function mn() {
	if (!un) throw Error("[vidstack] no fullscreen API");
}
var hn = navigator?.userAgent.toLowerCase(), gn = /iphone|ipad|ipod|ios|crios|fxios/i.test(hn), _n = /(iphone|ipod)/gi.test(navigator?.platform), vn = !!window.chrome, yn = !!window.safari || gn;
function bn() {
	return !n(screen.orientation) && o(screen.orientation.lock) && o(screen.orientation.unlock);
}
function xn(e) {
	return e ||= document.createElement("video"), e.canPlayType("application/vnd.apple.mpegurl").length > 0;
}
function Sn(e) {
	return !!document.pictureInPictureEnabled && !e.disablePictureInPicture;
}
function Cn(e) {
	return o(e.webkitSupportsPresentationMode) && o(e.webkitSetPresentationMode);
}
async function wn() {
	let e = document.createElement("video");
	return e.volume = .5, await Ee(0), e.volume === .5;
}
function Tn() {
	return window?.MediaSource ?? window?.WebKitMediaSource;
}
function En() {
	return window?.SourceBuffer ?? window?.WebKitSourceBuffer;
}
function Dn() {
	let e = Tn();
	if (n(e)) return !1;
	let t = e && o(e.isTypeSupported) && e.isTypeSupported("video/mp4; codecs=\"avc1.42E01E,mp4a.40.2\""), r = En(), i = n(r) || !n(r.prototype) && o(r.prototype.appendBuffer) && o(r.prototype.remove);
	return !!t && !!i;
}
var On = bn(), kn = class extends C {
	g = m(jn());
	f = m(!1);
	h;
	get type() {
		return this.g();
	}
	get locked() {
		return this.f();
	}
	get portrait() {
		return this.g().startsWith("portrait");
	}
	get landscape() {
		return this.g().startsWith("landscape");
	}
	get supported() {
		return On;
	}
	onConnect() {
		if (On) b(screen.orientation, "change", this.i.bind(this));
		else {
			let e = window.matchMedia("(orientation: landscape)");
			return e.onchange = this.i.bind(this), () => e.onchange = null;
		}
	}
	async onDisconnect() {
		On && this.f() && await this.unlock();
	}
	i(t) {
		this.g.set(jn()), this.dispatch("orientation-change", {
			detail: {
				orientation: e(this.g),
				lock: this.h
			},
			trigger: t
		});
	}
	async lock(t) {
		e(this.f) || this.h === t || (An(), await screen.orientation.lock(t), this.f.set(!0), this.h = t);
	}
	async unlock() {
		e(this.f) && (An(), this.h = void 0, await screen.orientation.unlock(), this.f.set(!1));
	}
};
function An() {
	if (!On) throw Error("[vidstack] no orientation API");
}
function jn() {
	return On ? window.screen.orientation.type : window.innerWidth >= window.innerHeight ? "landscape-primary" : "portrait-primary";
}
function z(e, t, n) {
	e.hasAttribute(t) || e.setAttribute(t, n);
}
function B(e, t) {
	if (e.hasAttribute("aria-label") || e.hasAttribute("aria-describedby")) return;
	function n() {
		a(e, "aria-label", t());
	}
	g(n);
}
function Mn(e, t, n) {
	for (; t;) if (t === e) return !0;
	else if (t.localName === e.localName || n?.(t)) break;
	else t = t.parentElement;
	return !1;
}
function V(e, t) {
	b(e, "pointerup", (e) => {
		e.button === 0 && t(e);
	}), b(e, "keydown", (e) => {
		Oe(e) && t(e);
	});
}
function Nn(e) {
	let t = ce();
	requestAnimationFrame(() => v(e, t));
}
var Pn = t();
function H() {
	return p(Pn);
}
var Fn = [
	"autoplay",
	"autoplayError",
	"canFullscreen",
	"canPictureInPicture",
	"canLoad",
	"canPlay",
	"canSeek",
	"ended",
	"error",
	"fullscreen",
	"loop",
	"live",
	"liveEdge",
	"mediaType",
	"muted",
	"paused",
	"pictureInPicture",
	"playing",
	"playsinline",
	"seeking",
	"started",
	"streamType",
	"userIdle",
	"viewType",
	"waiting"
], In = {
	togglePaused: "k Space",
	toggleMuted: "m",
	toggleFullscreen: "f",
	togglePictureInPicture: "i",
	toggleCaptions: "c",
	seekBackward: "ArrowLeft",
	seekForward: "ArrowRight",
	volumeUp: "ArrowUp",
	volumeDown: "ArrowDown"
}, Ln = /* @__PURE__ */ new Set([
	"Shift",
	"Alt",
	"Meta",
	"Control"
]), Rn = "button, [role=\"button\"]", zn = "input, textarea, select, [contenteditable], [role^=\"menuitem\"]", Bn = class extends C {
	constructor(e, t) {
		super(e), this.j = t;
	}
	onConnect() {
		g(this.Xa.bind(this));
	}
	Xa() {
		let { keyDisabled: t, keyTarget: n } = this.$props;
		if (t()) return;
		let r = n() === "player" ? this.el : document, i = m(!1);
		r === this.el ? (this.listen("focusin", () => i.set(!0)), this.listen("focusout", (e) => {
			this.el.contains(e.target) || i.set(!1);
		})) : (e(i) || i.set(document.querySelector("media-player") === this.el), b(document, "focusin", (e) => {
			let t = e.composedPath().find((e) => e instanceof Element && e.localName === "media-player");
			t !== void 0 && i.set(this.el === t);
		})), g(() => {
			i() && (b(r, "keyup", this.Ya.bind(this)), b(r, "keydown", this.Za.bind(this)), b(r, "keydown", this._a.bind(this), { capture: !0 }));
		});
	}
	Ya(e) {
		let t = document.activeElement, n = t?.hasAttribute("data-media-slider");
		if (!e.key || !this.$store.canSeek() || n || t?.matches(zn)) return;
		let r = this.Va(e);
		r?.startsWith("seek") && (e.preventDefault(), e.stopPropagation(), this.Ta ? (this.Wa(e), this.Ta = null) : (this.j.remote.seek(this.Ua, e), this.Ua = void 0)), r?.startsWith("volume") && this.el.querySelector("media-volume-slider")?.dispatchEvent(new h("keyup", { trigger: e }));
	}
	Za(e) {
		if (!e.key || Ln.has(e.key)) return;
		let t = document.activeElement;
		if (t?.matches(zn) || Oe(e) && t?.matches(Rn)) return;
		let n = t?.hasAttribute("data-media-slider"), r = this.Va(e);
		if (!r && !e.metaKey && /[0-9]/.test(e.key) && !n) {
			e.preventDefault(), e.stopPropagation(), this.j.remote.seek(this.$store.duration() / 10 * Number(e.key), e);
			return;
		}
		if (!(!r || /volume|seek/.test(r) && n)) switch (e.preventDefault(), e.stopPropagation(), r) {
			case "seekForward":
			case "seekBackward":
				this.$a(e, r);
				break;
			case "volumeUp":
			case "volumeDown":
				let t = this.el.querySelector("media-volume-slider");
				if (t) t.dispatchEvent(new h("keydown", { trigger: e }));
				else {
					let t = e.shiftKey ? .1 : .05;
					this.j.remote.changeVolume(this.$store.volume() + (r === "volumeUp" ? +t : -t), e);
				}
				break;
			case "toggleFullscreen":
				this.j.remote.toggleFullscreen("prefer-media", e);
				break;
			default: this.j.remote[r]?.(e);
		}
	}
	_a(e) {
		It(e.target) && this.Va(e) && e.preventDefault();
	}
	Va(e) {
		let t = {
			...this.$props.keyShortcuts(),
			...this.j.ariaKeys
		};
		return Object.keys(t).find((n) => t[n].split(" ").some((t) => Hn(t).replace(/Control/g, "Ctrl").split("+").every((t) => Ln.has(t) ? e[t.toLowerCase() + "Key"] : e.key === t.replace("Space", " "))));
	}
	Ua;
	ab(e, t) {
		let n = e.shiftKey ? 10 : 5;
		return this.Ua = Math.max(0, Math.min((this.Ua ?? this.$store.currentTime()) + (t === "seekForward" ? +n : -n), this.$store.duration()));
	}
	Ta = null;
	Wa(e) {
		this.Ta?.dispatchEvent(new h(e.type, { trigger: e }));
	}
	$a(e, t) {
		this.$store.canSeek() && (this.Ta ||= this.el.querySelector("media-time-slider"), this.Ta ? this.Wa(e) : this.j.remote.seeking(this.ab(e, t), e));
	}
}, Vn = [
	"!",
	"@",
	"#",
	"$",
	"%",
	"^",
	"&",
	"*",
	"(",
	")"
];
function Hn(e) {
	return e.replace(/Shift\+(\d)/g, (e, t) => Vn[t - 1]);
}
var Un = {
	autoplay: !1,
	aspectRatio: N({
		value: null,
		type: { from(e) {
			if (!e) return null;
			if (!e.includes("/")) return +e;
			let [t, n] = e.split("/").map(Number);
			return +(t / n).toFixed(4);
		} }
	}),
	controls: !1,
	currentTime: 0,
	crossorigin: null,
	fullscreenOrientation: "landscape",
	load: "visible",
	logLevel: "silent",
	loop: !1,
	muted: !1,
	paused: !0,
	playsinline: !1,
	playbackRate: 1,
	poster: "",
	preload: "metadata",
	preferNativeHLS: N({
		value: !1,
		attribute: "prefer-native-hls"
	}),
	src: "",
	userIdleDelay: 2e3,
	viewType: "unknown",
	streamType: "unknown",
	volume: 1,
	liveEdgeTolerance: 10,
	minLiveDVRWindow: 60,
	keyDisabled: !1,
	keyTarget: "player",
	keyShortcuts: In,
	title: "",
	thumbnails: null,
	textTracks: N({
		value: [],
		attribute: !1
	}),
	smallBreakpointX: 600,
	largeBreakpointX: 980,
	smallBreakpointY: 380,
	largeBreakpointY: 600
}, Wn = class {
	W;
	get length() {
		return this.W.length;
	}
	constructor(e, t) {
		d(e) ? this.W = e : !n(e) && !n(t) ? this.W = [[e, t]] : this.W = [];
	}
	start(e) {
		return this.W[e][0] ?? Infinity;
	}
	end(e) {
		return this.W[e][1] ?? Infinity;
	}
};
function Gn(e) {
	if (!e.length) return null;
	let t = e.start(0);
	for (let n = 1; n < e.length; n++) {
		let r = e.start(n);
		r < t && (t = r);
	}
	return t;
}
function Kn(e) {
	if (!e.length) return null;
	let t = e.end(0);
	for (let n = 1; n < e.length; n++) {
		let r = e.end(n);
		r > t && (t = r);
	}
	return t;
}
var qn = new ve({
	audioTracks: [],
	audioTrack: null,
	autoplay: !1,
	autoplayError: void 0,
	buffered: new Wn(),
	duration: 0,
	canLoad: !1,
	canFullscreen: !1,
	canPictureInPicture: !1,
	canPlay: !1,
	controls: !1,
	crossorigin: null,
	poster: "",
	currentTime: 0,
	ended: !1,
	error: void 0,
	fullscreen: !1,
	loop: !1,
	logLevel: "silent",
	mediaType: "unknown",
	muted: !1,
	paused: !0,
	played: new Wn(),
	playing: !1,
	playsinline: !1,
	pictureInPicture: !1,
	preload: "metadata",
	playbackRate: 1,
	qualities: [],
	quality: null,
	autoQuality: !1,
	canSetQuality: !0,
	seekable: new Wn(),
	seeking: !1,
	source: {
		src: "",
		type: ""
	},
	sources: [],
	started: !1,
	title: "",
	textTracks: [],
	textTrack: null,
	thumbnails: null,
	thumbnailCues: [],
	volume: 1,
	waiting: !1,
	get viewType() {
		return this.providedViewType === "unknown" ? this.mediaType : this.providedViewType;
	},
	get streamType() {
		return this.providedStreamType === "unknown" ? this.inferredStreamType : this.providedStreamType;
	},
	get currentSrc() {
		return this.source;
	},
	get bufferedStart() {
		return Gn(this.buffered) ?? 0;
	},
	get bufferedEnd() {
		return Kn(this.buffered) ?? 0;
	},
	get seekableStart() {
		return Gn(this.seekable) ?? 0;
	},
	get seekableEnd() {
		return this.canPlay ? Kn(this.seekable) ?? Infinity : 0;
	},
	get seekableWindow() {
		return Math.max(0, this.seekableEnd - this.seekableStart);
	},
	touchPointer: !1,
	orientation: "landscape",
	mediaWidth: 0,
	mediaHeight: 0,
	breakpointX: "sm",
	breakpointY: "sm",
	userIdle: !1,
	userBehindLiveEdge: !1,
	liveEdgeTolerance: 10,
	minLiveDVRWindow: 60,
	get canSeek() {
		return /unknown|on-demand|:dvr/.test(this.streamType) && Number.isFinite(this.seekableWindow) && (!this.live || /:dvr/.test(this.streamType) && this.seekableWindow >= this.minLiveDVRWindow);
	},
	get live() {
		return this.streamType.includes("live") || !Number.isFinite(this.duration);
	},
	get liveEdgeStart() {
		return this.live && Number.isFinite(this.seekableEnd) ? Math.max(0, (this.liveSyncPosition ?? this.seekableEnd) - this.liveEdgeTolerance) : 0;
	},
	get liveEdge() {
		return this.live && (!this.canSeek || !this.userBehindLiveEdge && this.currentTime >= this.liveEdgeStart);
	},
	get liveEdgeWindow() {
		return this.live && Number.isFinite(this.seekableEnd) ? this.seekableEnd - this.liveEdgeStart : 0;
	},
	autoplaying: !1,
	providedViewType: "unknown",
	providedStreamType: "unknown",
	inferredStreamType: "unknown",
	liveSyncPosition: null
}), Jn = /* @__PURE__ */ new Set(/* @__PURE__ */ "autoplay.breakpointX.breakpointY.canFullscreen.canLoad.canPictureInPicture.controls.fullscreen.logLevel.loop.mediaHeight.mediaWidth.muted.orientation.pictureInPicture.playsinline.poster.preload.providedStreamType.providedViewType.source.sources.textTrack.textTracks.thumbnailCues.thumbnails.title.touchPointer.volume".split("."));
function Yn(e) {
	qn.reset(e, (e) => !Jn.has(e)), _();
}
var Xn = Symbol(0), Zn = class extends on {
	get selected() {
		return this.a.find((e) => e.selected) ?? null;
	}
	get selectedIndex() {
		return this.a.findIndex((e) => e.selected);
	}
	[rn](e, t) {
		this[$t](e, !1, t);
	}
	[Xt](e, t) {
		e[Xn] = !1, Object.defineProperty(e, "selected", {
			get() {
				return this[Xn];
			},
			set: (t) => {
				this.readonly || (this[an]?.(), this[$t](e, t));
			}
		}), super[Xt](e, t);
	}
	[$t](e, t, n) {
		if (t === e[Xn]) return;
		let r = this.selected;
		e[Xn] = t, (t ? r !== e : r === e) && (r && (r[Xn] = !1), this.dispatchEvent(new h("change", {
			detail: {
				prev: r,
				current: this.selected
			},
			trigger: n
		})));
	}
}, Qn = Symbol(0), $n = Symbol(0), er = class extends Zn {
	Sa = !1;
	switch = "current";
	get auto() {
		return this.Sa || this.readonly;
	}
	[$n];
	[an]() {
		this[Qn](!1);
	}
	[nn](e) {
		this[Qn](!1, e);
	}
	autoSelect(e) {
		this.readonly || this.Sa || !this[$n] || (this[$n](), this[Qn](!0, e));
	}
	[Qn](e, t) {
		this.Sa !== e && (this.Sa = e, this.dispatchEvent(new h("auto-change", {
			detail: e,
			trigger: t
		})));
	}
}, tr = class extends C {
	constructor(e, t) {
		super(e), this.jf = t;
	}
	async onAttach(e) {
		let t = this.$props.load();
		if (t === "eager") requestAnimationFrame(this.jf);
		else if (t === "idle") {
			let { waitIdlePeriod: e } = await import("./std-EJr84HPl.js").then((e) => e.a);
			e(this.jf);
		} else if (t === "visible") {
			let t = new IntersectionObserver((e) => {
				e[0].isIntersecting && (t.disconnect(), this.jf());
			});
			return t.observe(e), t.disconnect.bind(t);
		}
	}
}, nr = class {
	constructor(e, t) {
		this.N = e, this.j = t;
	}
	p(e, ...t) {
		this.N(new h(e, t?.[0]));
	}
	async lf(t, n) {
		let { $store: r, logger: i } = this.j;
		e(r.canPlay) || (this.p("can-play", {
			detail: t,
			trigger: n
		}), _(), r.canPlay() && r.autoplay() && !r.started() && await this.kf());
	}
	async kf() {
		let { player: e, $store: t } = this.j;
		t.autoplaying.set(!0);
		try {
			await e.play(), this.p("autoplay", { detail: { muted: t.muted() } });
		} catch (e) {
			this.p("autoplay-fail", { detail: {
				muted: t.muted(),
				error: e
			} });
		} finally {
			t.autoplaying.set(!1);
		}
	}
}, rr = class {
	Ze = /* @__PURE__ */ new Map();
	t(e, t) {
		this.Ze.has(e) || this.Ze.set(e, /* @__PURE__ */ new Set()), this.Ze.get(e).add(t);
	}
	cf(e, t) {
		let n = this.Ze.get(e);
		if (n) for (let e of n) t(e);
		this.Ze.delete(e);
	}
	yf(e) {
		this.Ze.delete(e);
	}
	df(e) {
		return this.Ze.get(e)?.size ?? 0;
	}
	gf() {
		this.Ze.clear();
	}
};
function ir(e) {
	return e instanceof Error ? e : Error(JSON.stringify(e));
}
var ar = class extends C {
	da = -2;
	ba = 2e3;
	ea = !1;
	ca = null;
	get idling() {
		return this.$store.userIdle();
	}
	get idleDelay() {
		return this.ba;
	}
	set idleDelay(e) {
		this.ba = e;
	}
	idle(e, t = this.ba, n) {
		this.fa(), this.ea || this.ga(e, t, n);
	}
	pauseIdleTracking(e, t) {
		this.ea = e, e && (this.fa(), this.ga(!1, 0, t));
	}
	onConnect() {
		g(this.C.bind(this)), b(this.el, "play", this.ia.bind(this)), b(this.el, "pause", this.ja.bind(this));
	}
	C() {
		if (this.$store.paused()) return;
		let e = this.ka.bind(this);
		for (let t of ["pointerup", "keydown"]) b(this.el, t, e);
		g(() => {
			this.$store.touchPointer() || b(this.el, "pointermove", e);
		});
	}
	ia(e) {
		this.idle(!0, this.ba, e);
	}
	ja(e) {
		this.idle(!1, 0, e);
	}
	fa() {
		window.clearTimeout(this.da), this.da = -1;
	}
	ka(e) {
		e.MEDIA_GESTURE || (x(e) && (e.key === "Escape" ? (this.el?.focus(), this.ca = null) : this.ca && (e.preventDefault(), requestAnimationFrame(() => {
			this.ca?.focus(), this.ca = null;
		}))), this.idle(!1, 0, e), this.idle(!0, this.ba, e));
	}
	ga(e, t, n) {
		if (t === 0) {
			this.ha(e, n);
			return;
		}
		this.da = window.setTimeout(() => {
			this.ha(e && !this.ea, n);
		}, t);
	}
	ha(e, t) {
		this.$store.userIdle() !== e && (this.$store.userIdle.set(e), e && document.activeElement && this.el?.contains(document.activeElement) && (this.ca = document.activeElement, requestAnimationFrame(() => this.el?.focus())), this.dispatch("user-idle-change", {
			detail: e,
			trigger: t
		}));
	}
}, or = class {
	$a = !1;
	rf = !1;
	pf = !1;
	Ze = new rr();
}, sr = class extends C {
	constructor(e, t, n, r) {
		super(e), this.u = t, this.mf = n, this.j = r, this.nf = r.$store, this.q = r.$provider, this.Q = new ar(e), this.of = new dn(e), this.nb = new kn(e);
	}
	Q;
	of;
	nb;
	nf;
	q;
	onConnect() {
		g(this.uf.bind(this)), g(this.vf.bind(this)), g(this.wf.bind(this));
		let e = Object.getOwnPropertyNames(Object.getPrototypeOf(this)), t = this.xf.bind(this);
		for (let n of e) n.startsWith("media-") && this.listen(n, t);
		this.listen("fullscreen-change", this.d.bind(this));
	}
	xf(t) {
		t.stopPropagation(), e(this.q) && this[t.type]?.(t);
	}
	async M() {
		let { canPlay: t, paused: n, ended: r, autoplaying: i, seekableStart: a } = this.nf;
		if (e(n)) try {
			let n = e(this.q);
			return cr(n, e(t)), e(r) && (n.currentTime = a() + .1), n.play();
		} catch (e) {
			let t = this.createEvent("play-fail", { detail: ir(e) });
			throw t.autoplay = i(), this.u.N(t), e;
		}
	}
	async L() {
		let { canPlay: t, paused: n } = this.nf;
		if (e(n)) return;
		let r = e(this.q);
		return cr(r, e(t)), r.pause();
	}
	V() {
		let { canPlay: t, live: n, liveEdge: r, canSeek: i, liveSyncPosition: a, seekableEnd: o, userBehindLiveEdge: s } = this.nf;
		if (s.set(!1), e(() => !n() || r() || !i())) return;
		let c = e(this.q);
		cr(c, e(t)), c.currentTime = a() ?? o() - 2;
	}
	qf = !1;
	async R(t = "prefer-media") {
		let n = e(this.q), r = t === "prefer-media" && this.of.supported || t === "media" ? this.of : n?.fullscreen;
		if (lr(t, r), !r.active) return e(this.nf.pictureInPicture) && (this.qf = !0, await this.U()), r.enter();
	}
	async S(t = "prefer-media") {
		let n = e(this.q), r = t === "prefer-media" && this.of.supported || t === "media" ? this.of : n?.fullscreen;
		if (lr(t, r), r.active) {
			this.nb.locked && await this.nb.unlock();
			try {
				let t = await r.exit();
				return this.qf && e(this.nf.canPictureInPicture) && await this.T(), t;
			} finally {
				this.qf = !1;
			}
		}
	}
	async T() {
		if (this.sf(), !this.nf.pictureInPicture()) return await this.q().pictureInPicture.enter();
	}
	async U() {
		if (this.sf(), this.nf.pictureInPicture()) return await this.q().pictureInPicture.exit();
	}
	sf() {
		if (!this.nf.canPictureInPicture()) throw Error("[vidstack] no pip support");
	}
	uf() {
		this.Q.idleDelay = this.$props.userIdleDelay();
	}
	vf() {
		let { canLoad: t, canFullscreen: n } = this.nf, r = this.of.supported || this.q()?.fullscreen?.supported || !1;
		t() && e(n) === r || n.set(r);
	}
	wf() {
		let { canLoad: t, canPictureInPicture: n } = this.nf, r = this.q()?.pictureInPicture?.supported || !1;
		t() && e(n) === r || n.set(r);
	}
	"media-audio-track-change-request"(e) {
		if (this.j.audioTracks.readonly) return;
		let t = e.detail, n = this.j.audioTracks[t];
		n && (this.mf.Ze.t("audioTrack", e), n.selected = !0);
	}
	async "media-enter-fullscreen-request"(e) {
		try {
			this.mf.Ze.t("fullscreen", e), await this.R(e.detail);
		} catch (e) {
			this.e(e);
		}
	}
	async "media-exit-fullscreen-request"(e) {
		try {
			this.mf.Ze.t("fullscreen", e), await this.S(e.detail);
		} catch (e) {
			this.e(e);
		}
	}
	async d(t) {
		if (t.detail) try {
			let t = e(this.$props.fullscreenOrientation);
			this.nb.supported && !n(t) && await this.nb.lock(t);
		} catch {}
	}
	e(e) {
		this.u.N(this.createEvent("fullscreen-error", { detail: ir(e) }));
	}
	async "media-enter-pip-request"(e) {
		try {
			this.mf.Ze.t("pip", e), await this.T();
		} catch (e) {
			this.tf(e);
		}
	}
	async "media-exit-pip-request"(e) {
		try {
			this.mf.Ze.t("pip", e), await this.U();
		} catch (e) {
			this.tf(e);
		}
	}
	tf(e) {
		this.u.N(this.createEvent("picture-in-picture-error", { detail: ir(e) }));
	}
	"media-live-edge-request"(e) {
		let { live: t, liveEdge: n, canSeek: r } = this.nf;
		if (!(!t() || n() || !r())) {
			this.mf.Ze.t("seeked", e);
			try {
				this.V();
			} catch {}
		}
	}
	"media-loop-request"() {
		window.requestAnimationFrame(async () => {
			try {
				this.mf.rf = !0, this.mf.pf = !0, await this.M();
			} catch {
				this.mf.rf = !1, this.mf.pf = !1;
			}
		});
	}
	async "media-pause-request"(e) {
		if (!this.nf.paused()) try {
			this.mf.Ze.t("pause", e), await this.q().pause();
		} catch {
			this.mf.Ze.yf("pause");
		}
	}
	async "media-play-request"(e) {
		if (this.nf.paused()) try {
			this.mf.Ze.t("play", e), await this.q().play();
		} catch (e) {
			let t = this.createEvent("play-fail", { detail: ir(e) });
			this.u.N(t);
		}
	}
	"media-rate-change-request"(e) {
		this.nf.playbackRate() !== e.detail && (this.mf.Ze.t("rate", e), this.q().playbackRate = e.detail);
	}
	"media-quality-change-request"(e) {
		if (this.j.qualities.readonly) return;
		this.mf.Ze.t("quality", e);
		let t = e.detail;
		if (t < 0) this.j.qualities.autoSelect(e);
		else {
			let e = this.j.qualities[t];
			e && (e.selected = !0);
		}
	}
	"media-resume-user-idle-request"(e) {
		this.mf.Ze.t("userIdle", e), this.Q.pauseIdleTracking(!1, e);
	}
	"media-pause-user-idle-request"(e) {
		this.mf.Ze.t("userIdle", e), this.Q.pauseIdleTracking(!0, e);
	}
	"media-seek-request"(e) {
		let { seekableStart: t, seekableEnd: n, ended: r, canSeek: i, live: a, userBehindLiveEdge: o } = this.nf;
		r() && (this.mf.pf = !0), this.mf.$a = !1, this.mf.Ze.yf("seeking");
		let s = Math.min(Math.max(t() + .1, e.detail), n() - .1);
		!Number.isFinite(s) || !i() || (this.mf.Ze.t("seeked", e), this.q().currentTime = s, a() && e.isOriginTrusted && Math.abs(n() - s) >= 2 && o.set(!0));
	}
	"media-seeking-request"(e) {
		this.mf.Ze.t("seeking", e), this.nf.seeking.set(!0), this.mf.$a = !0;
	}
	"media-start-loading"(e) {
		this.nf.canLoad() || (this.mf.Ze.t("load", e), this.u.N(this.createEvent("can-load")));
	}
	"media-text-track-change-request"(e) {
		let { index: t, mode: n } = e.detail, r = this.j.textTracks[t];
		r && (this.mf.Ze.t("textTrack", e), r.setMode(n, e));
	}
	"media-mute-request"(e) {
		this.nf.muted() || (this.mf.Ze.t("volume", e), this.q().muted = !0);
	}
	"media-unmute-request"(e) {
		let { muted: t, volume: n } = this.nf;
		t() && (this.mf.Ze.t("volume", e), this.j.$provider().muted = !1, n() === 0 && (this.mf.Ze.t("volume", e), this.q().volume = .25));
	}
	"media-volume-change-request"(e) {
		let { muted: t, volume: n } = this.nf, r = e.detail;
		n() !== r && (this.mf.Ze.t("volume", e), this.q().volume = r, r > 0 && t() && (this.mf.Ze.t("volume", e), this.q().muted = !1));
	}
};
function cr(e, t) {
	if (!(e && t)) throw Error("[vidstack] media not ready");
}
function lr(e, t) {
	if (!t?.supported) throw Error("[vidstack] no fullscreen support");
}
var ur = dr;
function dr(e, t, n) {
	var r = null, i = null, a = function() {
		r &&= (clearTimeout(r), i = null, null);
	}, o = function() {
		var e = i;
		a(), e && e();
	}, s = function() {
		if (!t) return e.apply(this, arguments);
		var o = this, s = arguments, c = n && !r;
		if (a(), i = function() {
			e.apply(o, s);
		}, r = setTimeout(function() {
			if (r = null, !c) {
				var e = i;
				return i = null, e();
			}
		}, t), c) return i();
	};
	return s.cancel = a, s.flush = o, s;
}
var fr = pr;
function pr(e, t, n) {
	var r = null, i = null, a = n && n.leading, o = n && n.trailing;
	a ??= !0, o ??= !a, a == 1 && (o = !1);
	var s = function() {
		r &&= (clearTimeout(r), null);
	}, c = function() {
		var e = i;
		s(), e && e();
	}, l = function() {
		var n = a && !r, s = this, c = arguments;
		if (i = function() {
			return e.apply(s, c);
		}, r ||= setTimeout(function() {
			if (r = null, o) return i();
		}, t), n) return n = !1, i();
	};
	return l.cancel = s, l.flush = c, l;
}
var mr = Symbol(0), U = Symbol(0), W = Symbol(0), hr = Symbol(0), gr = Symbol(0), _r = Symbol(0), G = Symbol(0), vr = Symbol(0), yr = /* @__PURE__ */ new Set([
	"autoplay",
	"autoplay-fail",
	"can-load",
	"sources-change",
	"source-change",
	"load-start",
	"abort",
	"error",
	"loaded-metadata",
	"loaded-data",
	"can-play",
	"play",
	"play-fail",
	"pause",
	"playing",
	"seeking",
	"seeked",
	"waiting"
]), br = class extends C {
	constructor(e, t, n) {
		super(e), this.mf = t, this.j = n, this.nf = n.$store;
	}
	nf;
	zf = /* @__PURE__ */ new Map();
	Gf = !0;
	Df = !1;
	Bf;
	onAttach(e) {
		e.setAttribute("aria-busy", "true");
	}
	onConnect(e) {
		this.Mf(), this.Nf(), this.Of(), this.listen("fullscreen-change", this["fullscreen-change"].bind(this)), this.listen("fullscreen-error", this["fullscreen-error"].bind(this));
	}
	N(e) {
		let t = e.type;
		this[e.type]?.(e), yr.has(t) && this.zf.set(t, e), this.el?.dispatchEvent(e);
	}
	Cf() {
		this.Hf(), this.mf.pf = !1, this.mf.rf = !1, this.Df = !1, this.Bf = void 0, this.zf.clear();
	}
	Af(e, t) {
		this.mf.Ze.cf(e, (e) => {
			t.request = e, y(t, e);
		});
	}
	Mf() {
		this.Ef(), this.If();
		let e = this.j.textTracks;
		b(e, "add", this.Ef.bind(this)), b(e, "remove", this.Ef.bind(this)), b(e, "mode-change", this.If.bind(this));
	}
	Nf() {
		let e = this.j.qualities;
		b(e, "add", this.Jf.bind(this)), b(e, "remove", this.Jf.bind(this)), b(e, "change", this.Pf.bind(this)), b(e, "auto-change", this.Qf.bind(this)), b(e, "readonly-change", this.Rf.bind(this));
	}
	Of() {
		let e = this.j.audioTracks;
		b(e, "add", this.Kf.bind(this)), b(e, "remove", this.Kf.bind(this)), b(e, "change", this.Sf.bind(this));
	}
	Ef(e) {
		let { textTracks: t } = this.nf;
		t.set(this.j.textTracks.toArray()), this.dispatch("text-tracks-change", {
			detail: t(),
			trigger: e
		});
	}
	If(e) {
		e && this.Af("textTrack", e);
		let t = this.j.textTracks.selected, { textTrack: n } = this.nf;
		n() !== t && (n.set(t), this.dispatch("text-track-change", {
			detail: t,
			trigger: e
		}));
	}
	Kf(e) {
		let { audioTracks: t } = this.nf;
		t.set(this.j.audioTracks.toArray()), this.dispatch("audio-tracks-change", {
			detail: t(),
			trigger: e
		});
	}
	Sf(e) {
		let { audioTrack: t } = this.nf;
		t.set(this.j.audioTracks.selected), this.Af("audioTrack", e), this.dispatch("audio-track-change", {
			detail: t(),
			trigger: e
		});
	}
	Jf(e) {
		let { qualities: t } = this.nf;
		t.set(this.j.qualities.toArray()), this.dispatch("qualities-change", {
			detail: t(),
			trigger: e
		});
	}
	Pf(e) {
		let { quality: t } = this.nf;
		t.set(this.j.qualities.selected), this.Af("quality", e), this.dispatch("quality-change", {
			detail: t(),
			trigger: e
		});
	}
	Qf() {
		this.nf.autoQuality.set(this.j.qualities.auto);
	}
	Rf() {
		this.nf.canSetQuality.set(!this.j.qualities.readonly);
	}
	"provider-change"(e) {
		this.j.$provider.set(e.detail);
	}
	autoplay(e) {
		y(e, this.zf.get("play")), y(e, this.zf.get("can-play")), this.nf.autoplayError.set(void 0);
	}
	"autoplay-fail"(e) {
		y(e, this.zf.get("play-fail")), y(e, this.zf.get("can-play")), this.nf.autoplayError.set(e.detail), this.Cf();
	}
	"can-load"(e) {
		this.nf.canLoad.set(!0), this.zf.set("can-load", e), this.Af("load", e), this.j.textTracks[gr]();
	}
	"media-type-change"(e) {
		y(e, this.zf.get("source-change"));
		let t = this.nf.viewType();
		this.nf.mediaType.set(e.detail), t !== this.nf.viewType() && setTimeout(() => this.dispatch("view-type-change", {
			detail: this.nf.viewType(),
			trigger: e
		}), 0);
	}
	"stream-type-change"(e) {
		let { streamType: t, inferredStreamType: n } = this.nf;
		y(e, this.zf.get("source-change")), n.set(e.detail), e.detail = t();
	}
	"rate-change"(e) {
		this.nf.playbackRate.set(e.detail), this.Af("rate", e);
	}
	"sources-change"(e) {
		this.nf.sources.set(e.detail);
	}
	"source-change"(e) {
		if (y(e, this.zf.get("sources-change")), this.nf.source.set(e.detail), this.el?.setAttribute("aria-busy", "true"), this.Gf) {
			this.Gf = !1;
			return;
		}
		this.j.audioTracks[Qt](e), this.j.qualities[Qt](e), this.Cf(), Yn(this.j.$store), this.zf.set(e.type, e);
	}
	abort(e) {
		y(e, this.zf.get("source-change")), y(e, this.zf.get("can-load"));
	}
	"load-start"(e) {
		y(e, this.zf.get("source-change"));
	}
	error(e) {
		this.nf.error.set(e.detail), y(e, this.zf.get("abort"));
	}
	"loaded-metadata"(e) {
		y(e, this.zf.get("load-start"));
	}
	"loaded-data"(e) {
		y(e, this.zf.get("load-start"));
	}
	"can-play"(e) {
		e.trigger?.type !== "loadedmetadata" && y(e, this.zf.get("loaded-metadata")), this.Lf(e.detail), this.el?.setAttribute("aria-busy", "false");
	}
	"can-play-through"(e) {
		this.Lf(e.detail), y(e, this.zf.get("can-play"));
	}
	Lf(e) {
		let { seekable: t, seekableEnd: n, buffered: r, duration: i, canPlay: a } = this.nf;
		t.set(e.seekable), r.set(e.buffered), i.set(n), a.set(!0);
	}
	"duration-change"(e) {
		let { live: t, duration: n } = this.nf, r = e.detail;
		t() || n.set(Number.isNaN(r) ? 0 : r);
	}
	progress(e) {
		let { buffered: t, seekable: n, live: r, duration: i, seekableEnd: a } = this.nf, o = e.detail;
		t.set(o.buffered), n.set(o.seekable), r() && (i.set(a), this.dispatch("duration-change", {
			detail: a(),
			trigger: e
		}));
	}
	play(e) {
		let { paused: t, autoplayError: n, ended: r, autoplaying: i } = this.nf;
		if (e.autoplay = i(), this.mf.rf || !t()) {
			e.stopImmediatePropagation();
			return;
		}
		y(e, this.zf.get("waiting")), this.Af("play", e), t.set(!1), n.set(void 0), (r() || this.mf.pf) && (this.mf.pf = !1, r.set(!1), this.N(this.createEvent("replay", { trigger: e })));
	}
	"play-fail"(e) {
		y(e, this.zf.get("play")), this.Af("play", e);
		let { paused: t, playing: n } = this.nf;
		t.set(!0), n.set(!1), this.Cf();
	}
	playing(e) {
		let t = this.zf.get("play");
		t ? (y(e, this.zf.get("waiting")), y(e, t)) : y(e, this.zf.get("seeked")), setTimeout(() => this.Cf(), 0);
		let { paused: n, playing: r, seeking: i, ended: a } = this.nf;
		if (n.set(!1), r.set(!0), i.set(!1), a.set(!1), this.mf.rf) {
			e.stopImmediatePropagation(), this.mf.rf = !1;
			return;
		}
		this.started(e);
	}
	started(e) {
		let { started: t, live: n, liveSyncPosition: r, seekableEnd: i } = this.nf;
		if (!t()) {
			if (n()) {
				let e = r() ?? i() - 2;
				Number.isFinite(e) && (this.j.$provider().currentTime = e);
			}
			t.set(!0), this.N(this.createEvent("started", { trigger: e }));
		}
	}
	pause(e) {
		if (this.mf.rf) {
			e.stopImmediatePropagation();
			return;
		}
		y(e, this.zf.get("seeked")), this.Af("pause", e);
		let { paused: t, playing: n, seeking: r } = this.nf;
		t.set(!0), n.set(!1), r.set(!1), this.Cf();
	}
	"time-update"(e) {
		let { currentTime: t, played: n, waiting: r } = this.nf, i = e.detail;
		t.set(i.currentTime), n.set(i.played), r.set(!1);
		for (let t of this.j.textTracks) t[hr](i.currentTime, e);
	}
	"volume-change"(e) {
		let { volume: t, muted: n } = this.nf, r = e.detail;
		t.set(r.volume), n.set(r.muted || r.volume === 0), this.Af("volume", e);
	}
	seeking = fr((e) => {
		let { seeking: t, currentTime: n, paused: r } = this.nf;
		t.set(!0), n.set(e.detail), this.Af("seeking", e), r() && (this.Bf = e, this.Ff());
	}, 150, { leading: !0 });
	seeked(e) {
		let { seeking: t, currentTime: n, paused: r, duration: i, ended: a } = this.nf;
		if (this.mf.$a) t.set(!0), e.stopImmediatePropagation();
		else if (t()) {
			let o = this.zf.get("waiting");
			y(e, o), o?.trigger?.type !== "seeking" && y(e, this.zf.get("seeking")), r() && this.Hf(), t.set(!1), e.detail !== i() && a.set(!1), n.set(e.detail), this.Af("seeked", e);
			let s = e.originEvent;
			s && s.isTrusted && !/seek/.test(s.type) && this.started(e);
		}
	}
	waiting(e) {
		this.Df || this.mf.$a || (e.stopImmediatePropagation(), this.Bf = e, this.Ff());
	}
	Ff = ur(() => {
		if (!this.Bf) return;
		this.Df = !0;
		let { waiting: e, playing: t } = this.nf;
		e.set(!0), t.set(!1);
		let n = this.createEvent("waiting", { trigger: this.Bf });
		this.zf.set("waiting", n), this.el.dispatchEvent(n), this.Bf = void 0, this.Df = !1;
	}, 300);
	ended(e) {
		if (this.mf.rf) {
			e.stopImmediatePropagation();
			return;
		}
		let { paused: t, playing: n, seeking: r, ended: i } = this.nf;
		t.set(!0), n.set(!1), r.set(!1), i.set(!0), this.Cf();
	}
	Hf() {
		this.Ff.cancel(), this.nf.waiting.set(!1);
	}
	"fullscreen-change"(e) {
		this.nf.fullscreen.set(e.detail), this.Af("fullscreen", e);
	}
	"fullscreen-error"(e) {
		this.Af("fullscreen", e);
	}
	"picture-in-picture-change"(e) {
		this.nf.pictureInPicture.set(e.detail), this.Af("pip", e);
	}
	"picture-in-picture-error"(e) {
		this.Af("pip", e);
	}
}, xr = class extends C {
	onAttach(e) {
		g(this.Tf.bind(this)), g(this.Uf.bind(this)), g(this.Vf.bind(this)), g(this.Wf.bind(this)), g(this.Xf.bind(this)), g(this.Yf.bind(this)), g(this.Zf.bind(this)), g(this._f.bind(this)), g(this.$f.bind(this)), g(this.ag.bind(this));
	}
	bg() {}
	Tf() {
		let e = this.$props.autoplay();
		this.$store.autoplay.set(e), this.dispatch("autoplay-change", { detail: e });
	}
	Vf() {
		let e = this.$props.loop();
		this.$store.loop.set(e), this.dispatch("loop-change", { detail: e });
	}
	Wf() {
		let e = this.$props.controls();
		this.$store.controls.set(e), this.dispatch("controls-change", { detail: e });
	}
	Uf() {
		let e = this.$props.poster();
		this.$store.poster.set(e), this.dispatch("poster-change", { detail: e });
	}
	Xf() {
		this.$store.crossorigin.set(this.$props.crossorigin());
	}
	Yf() {
		let e = this.$props.playsinline();
		this.$store.playsinline.set(e), this.dispatch("playsinline-change", { detail: e });
	}
	_f() {
		this.dispatch("live-change", { detail: this.$store.live() });
	}
	Zf() {
		this.$store.liveEdgeTolerance.set(this.$props.liveEdgeTolerance()), this.$store.minLiveDVRWindow.set(this.$props.minLiveDVRWindow());
	}
	$f() {
		this.dispatch("live-edge-change", { detail: this.$store.liveEdge() });
	}
	ag() {
		this.$store.thumbnails.set(this.$props.thumbnails());
	}
};
function Sr(e, t = "preconnect") {
	if (!ee(document.querySelector(`link[href="${e}"]`))) return !0;
	let n = document.createElement("link");
	return n.rel = t, n.href = e, n.crossOrigin = "true", document.head.append(n), !0;
}
var Cr = {};
function wr(e) {
	if (Cr[e]) return Cr[e].promise;
	let t = _e();
	if (!ee(document.querySelector(`script[src="${e}"]`))) return t.resolve(), t.promise;
	let n = document.createElement("script");
	return n.src = e, n.onload = () => {
		t.resolve(), delete Cr[e];
	}, n.onerror = () => {
		t.reject(), delete Cr[e];
	}, setTimeout(() => document.head.append(n), 0), t.promise;
}
function Tr(e) {
	return e === "use-credentials" ? "include" : S(e) ? "same-origin" : void 0;
}
function Er(e, t) {
	for (let n = 0, r = t.length; n < r; n++) if (Dr(t[n], e)) return t[n];
	return null;
}
function Dr(e, t) {
	return t >= e.startTime && t < e.endTime;
}
function Or(e, t, n) {
	let r = e.toArray().find((e) => e.kind === "chapters" && e.mode === "showing");
	if (r !== t) {
		if (!r) {
			n(null);
			return;
		}
		r.readyState == 2 ? n(r) : (n(null), r.addEventListener("load", () => n(r), { once: !0 }));
	}
}
var kr = class extends ye {
	static createId(e) {
		return `id::${e.type}-${e.kind}-${e.src ?? e.label}`;
	}
	src;
	content;
	type;
	encoding;
	id = "";
	label = "";
	language = "";
	kind;
	default = !1;
	Ia = !1;
	Ea = 0;
	Ga = "disabled";
	Ja = {};
	Ha = [];
	Da = [];
	Fa = [];
	[W] = 0;
	[U];
	[_r] = null;
	[G] = null;
	get metadata() {
		return this.Ja;
	}
	get regions() {
		return this.Ha;
	}
	get cues() {
		return this.Da;
	}
	get activeCues() {
		return this.Fa;
	}
	get readyState() {
		return this[W];
	}
	get mode() {
		return this.Ga;
	}
	set mode(e) {
		this.setMode(e);
	}
	constructor(e) {
		super();
		for (let t of Object.keys(e)) this[t] = e[t];
		this.type ||= "vtt", e.content ? import("./prod-CKqKSCtX.js").then((e) => e.t).then(({ parseText: t, VTTCue: n, VTTRegion: r }) => {
			e.type === "json" ? this.Ka(e.content, n, r) : t(e.content, { type: e.type }).then(({ cues: e, regions: t }) => {
				this.Da = e, this.Ha = t, this.La();
			});
		}) : e.src || (this[W] = 2);
	}
	addCue(e, t) {
		let n = 0, r = this.Da.length;
		for (n = 0; n < r && !(e.endTime <= this.Da[n].startTime); n++);
		n === r ? this.Da.push(e) : this.Da.splice(n, 0, e), t?.type !== "cuechange" && this[G]?.track.addCue(e), this.dispatchEvent(new h("add-cue", {
			detail: e,
			trigger: t
		})), Dr(e, this.Ea) && this[hr](this.Ea, t);
	}
	removeCue(e, t) {
		let n = this.Da.indexOf(e);
		if (n >= 0) {
			let r = this.Fa.includes(e);
			this.Da.splice(n, 1), this[G]?.track.removeCue(e), this.dispatchEvent(new h("remove-cue", {
				detail: e,
				trigger: t
			})), r && this[hr](this.Ea, t);
		}
	}
	setMode(e, t) {
		this.Ga !== e && (this.Ga = e, e === "disabled" ? (this.Fa = [], this.Ma()) : this.readyState === 2 ? this[hr](this.Ea, t) : this.Na(), this.dispatchEvent(new h("mode-change", {
			detail: this,
			trigger: t
		})), this[_r]?.());
	}
	[hr](e, t) {
		if (this.Ea = e, this.mode === "disabled" || !this.Da.length) return;
		let n = [];
		for (let t = 0, r = this.Da.length; t < r; t++) {
			let r = this.Da[t];
			Dr(r, e) && n.push(r);
		}
		let r = n.length !== this.Fa.length;
		if (!r) {
			for (let e = 0; e < n.length; e++) if (!this.Fa.includes(n[e])) {
				r = !0;
				break;
			}
		}
		this.Fa = n, r && this.Ma(t);
	}
	[gr]() {
		this.Ia = !0, this.Ga !== "disabled" && this.Na();
	}
	async Na() {
		if (!(!this.Ia || !this.src || this[W] > 0)) {
			this[W] = 1, this.dispatchEvent(new h("load-start"));
			try {
				let { parseResponse: e, VTTCue: t, VTTRegion: n } = await import("./prod-CKqKSCtX.js").then((e) => e.t), r = this[U]?.(), i = fetch(this.src, {
					headers: this.type === "json" ? { "Content-Type": "application/json" } : void 0,
					credentials: Tr(r)
				});
				if (this.type === "json") this.Ka(await (await i).text(), t, n);
				else {
					let { errors: t, metadata: n, regions: r, cues: a } = await e(i, {
						type: this.type,
						encoding: this.encoding
					});
					if (t[0]?.code === 0) throw t[0];
					this.Ja = n, this.Ha = r, this.Da = a;
				}
				this.La();
			} catch (e) {
				this.Oa(e);
			}
		}
	}
	La() {
		if (this[W] = 2, !this.src || this.type !== "vtt") {
			let e = this[G]?.track;
			if (e) for (let t of this.Da) e.addCue(t);
		}
		let e = new h("load");
		this[hr](this.Ea, e), this.dispatchEvent(e);
	}
	Oa(e) {
		this[W] = 3, this.dispatchEvent(new h("error", { detail: e }));
	}
	Ka(e, t, n) {
		try {
			e = JSON.parse(e), e.regions && (this.Ha = e.regions.map((e) => Object.assign(new n(), e))), e.cues && (this.Da = e.cues.filter((e) => re(e.startTime) && re(e.endTime)).map((e) => Object.assign(new t(0, 0, ""), e)));
		} catch (e) {
			this.Oa(e);
		}
	}
	Ma(e) {
		this.dispatchEvent(new h("cue-change", { trigger: e }));
	}
}, Ar = /captions|subtitles/;
function K(e) {
	return Ar.test(e.kind);
}
var jr = class {
	constructor(e) {
		this.$ = e;
	}
	Z = null;
	Y = null;
	_ = -1;
	setTarget(e) {
		this.Z = e;
	}
	getPlayer(e) {
		return this.Y || (e ?? this.Z)?.dispatchEvent(new h("find-media-player", {
			detail: (e) => void (this.Y = e),
			bubbles: !0,
			composed: !0
		})), this.Y;
	}
	setPlayer(e) {
		this.Y = e;
	}
	startLoading(e) {
		this.X("media-start-loading", e);
	}
	play(e) {
		this.X("media-play-request", e);
	}
	pause(e) {
		this.X("media-pause-request", e);
	}
	mute(e) {
		this.X("media-mute-request", e);
	}
	unmute(e) {
		this.X("media-unmute-request", e);
	}
	enterFullscreen(e, t) {
		this.X("media-enter-fullscreen-request", t, e);
	}
	exitFullscreen(e, t) {
		this.X("media-exit-fullscreen-request", t, e);
	}
	enterPictureInPicture(e) {
		this.X("media-enter-pip-request", e);
	}
	exitPictureInPicture(e) {
		this.X("media-exit-pip-request", e);
	}
	seeking(e, t) {
		this.X("media-seeking-request", t, e);
	}
	seek(e, t) {
		this.X("media-seek-request", t, e);
	}
	seekToLiveEdge(e) {
		this.X("media-live-edge-request", e);
	}
	changeVolume(e, t) {
		this.X("media-volume-change-request", t, Math.max(0, Math.min(1, e)));
	}
	changeAudioTrack(e, t) {
		this.X("media-audio-track-change-request", t, e);
	}
	changeQuality(e, t) {
		this.X("media-quality-change-request", t, e);
	}
	changeTextTrackMode(e, t, n) {
		this.X("media-text-track-change-request", n, {
			index: e,
			mode: t
		});
	}
	changePlaybackRate(e, t) {
		this.X("media-rate-change-request", t, e);
	}
	resumeUserIdle(e) {
		this.X("media-resume-user-idle-request", e);
	}
	pauseUserIdle(e) {
		this.X("media-pause-user-idle-request", e);
	}
	togglePaused(e) {
		let t = this.getPlayer(e?.target);
		t && (t.state.paused ? this.play(e) : this.pause(e));
	}
	toggleUserIdle(e) {
		let t = this.getPlayer(e?.target);
		t && t.user.idle(!t.user.idling, 0, e);
	}
	toggleMuted(e) {
		let t = this.getPlayer(e?.target);
		t && (t.state.muted ? this.unmute(e) : this.mute(e));
	}
	toggleFullscreen(e, t) {
		let n = this.getPlayer(t?.target);
		n && (n.state.fullscreen ? this.exitFullscreen(e, t) : this.enterFullscreen(e, t));
	}
	togglePictureInPicture(e) {
		let t = this.getPlayer(e?.target);
		t && (t.state.pictureInPicture ? this.exitPictureInPicture(e) : this.enterPictureInPicture(e));
	}
	toggleCaptions(e) {
		let t = this.getPlayer(e?.target);
		if (!t) return;
		let n = t.state.textTracks, r = t.state.textTrack;
		if (r) {
			let t = n.indexOf(r);
			this.changeTextTrackMode(t, "disabled", e), this._ = t;
		} else {
			let t = this._;
			(!n[t] || !K(n[t])) && (t = -1), t === -1 && (t = n.findIndex((e) => K(e) && e.default)), t === -1 && (t = n.findIndex((e) => K(e))), t >= 0 && this.changeTextTrackMode(t, "showing", e), this._ = -1;
		}
	}
	X(e, t, n) {
		let r = new h(e, {
			bubbles: !0,
			composed: !0,
			detail: n,
			trigger: t
		});
		(t?.target && (t.target === document || t.target === window || t.target === document.body || this.Y && !this.Y.contains(t.target)) ? this.Z ?? this.getPlayer() : t?.target ?? this.Z)?.dispatchEvent(r);
	}
	aa(e) {}
}, Mr = class extends C {
	j;
	onConnect() {
		this.j = H(), g(this.cg.bind(this));
	}
	cg() {
		let { canLoad: e, thumbnailCues: t } = this.j.$store;
		if (!e()) return;
		let n = new AbortController(), { crossorigin: r, thumbnails: i } = this.j.$store, a = i();
		if (a) return import("./prod-CKqKSCtX.js").then((e) => e.t).then(({ parseResponse: e }) => {
			e(fetch(a, {
				signal: n.signal,
				credentials: Tr(r())
			})).then(({ cues: e }) => t.set(e)).catch(se);
		}), () => {
			n.abort(), t.set([]);
		};
	}
}, Nr = class extends Zn {
	getById(e) {
		return e === "" ? null : this.a.find((t) => t.id === e) ?? null;
	}
}, Pr = class {
	priority = 0;
	eg = !0;
	qa = null;
	ya = null;
	dg = /* @__PURE__ */ new Set();
	canRender() {
		return !0;
	}
	attach(e) {
		this.qa = e, e.textTracks.onchange = this.Hc.bind(this);
	}
	addTrack(e) {
		this.dg.add(e), this.gg(e);
	}
	removeTrack(e) {
		e[G]?.remove?.(), e[G] = null, this.dg.delete(e);
	}
	changeTrack(e) {
		let t = e?.[G];
		t && t.track.mode !== "showing" && (t.track.mode = "showing"), this.ya = e;
	}
	setDisplay(e) {
		this.eg = e, this.Hc();
	}
	detach() {
		this.qa && (this.qa.textTracks.onchange = null);
		for (let e of this.dg) this.removeTrack(e);
		this.dg.clear(), this.qa = null, this.ya = null;
	}
	gg(e) {
		if (!this.qa) return;
		let t = e[G] ??= this.hg(e);
		t instanceof HTMLElement && (this.qa.append(t), t.track.mode = t.default ? "showing" : "hidden");
	}
	hg(e) {
		let t = document.createElement("track"), n = e.default || e.mode === "showing", r = e.src && e.type === "vtt";
		return t.id = e.id, t.src = r ? e.src : "https://cdn.jsdelivr.net/npm/vidstack@0.6.12/empty.vtt", t.label = e.label, t.kind = e.kind, t.default = n, e.language && (t.srclang = e.language), n && !r && this.fg(e, t.track), t;
	}
	fg(e, t) {
		if (!(e.src && e.type === "vtt" || t.cues?.length)) for (let n of e.cues) t.addCue(n);
	}
	Hc(e) {
		for (let t of this.dg) {
			let n = t[G]?.track;
			if (!n) continue;
			if (!this.eg) {
				n.mode = "disabled";
				continue;
			}
			let r = n.mode === "showing";
			r && this.fg(t, n), t.setMode(r ? "showing" : "disabled", e);
		}
	}
}, Fr = class {
	constructor(e) {
		this.j = e;
		let t = e.textTracks;
		this.pa = t, g(this.ua.bind(this)), f(this.ra.bind(this)), b(t, "add", this.va.bind(this)), b(t, "remove", this.wa.bind(this)), b(t, "mode-change", this.na.bind(this));
	}
	qa = null;
	pa;
	oa = [];
	sa = !1;
	la = null;
	ma = null;
	ua() {
		let { $store: e, $iosControls: t } = this.j;
		this.sa = e.controls() || t(), this.na();
	}
	add(e) {
		this.oa.push(e), this.na();
	}
	remove(e) {
		e.detach(), this.oa.splice(this.oa.indexOf(e), 1), this.na();
	}
	[mr](e) {
		requestAnimationFrame(() => {
			if (this.qa = e, e) {
				this.la = new Pr(), this.la.attach(e);
				for (let e of this.pa) this.ta(e);
			}
			this.na();
		});
	}
	ta(e) {
		K(e) && this.la?.addTrack(e);
	}
	xa(e) {
		K(e) && this.la?.removeTrack(e);
	}
	va(e) {
		this.ta(e.detail);
	}
	wa(e) {
		this.xa(e.detail);
	}
	na() {
		if (!this.qa) {
			this.ra();
			return;
		}
		let e = this.pa.selected;
		if (this.sa || e?.[vr]) {
			this.ma?.changeTrack(null), this.la.setDisplay(!0), this.la.changeTrack(e);
			return;
		}
		if (this.la.setDisplay(!1), this.la.changeTrack(null), !e) {
			this.ma?.changeTrack(null);
			return;
		}
		let t = this.oa.sort((e, t) => e.priority - t.priority).find((t) => t.canRender(e));
		this.ma !== t && (this.ma?.detach(), t?.attach(this.qa), this.ma = t ?? null), t?.changeTrack(e);
	}
	ra() {
		this.la?.detach(), this.la = null, this.ma?.detach(), this.ma = null;
	}
}, Ir = class extends on {
	Ia = !1;
	Pa = {};
	[U];
	get selected() {
		return this.a.find((e) => e.mode === "showing" && K(e)) ?? null;
	}
	add(e, t) {
		let n = e instanceof kr ? e : new kr(e);
		return this.Pa[e.kind] && e.default && delete e.default, n.addEventListener("mode-change", this.Qa), this[Xt](n, t), n[U] = this[U], this.Ia && n[gr](), e.default && (this.Pa[e.kind] = n, n.mode = "showing"), this;
	}
	remove(e, t) {
		if (this.a.includes(e)) return e === this.Pa[e.kind] && delete this.Pa[e.kind], e.mode = "disabled", e[_r] = null, e.removeEventListener("mode-change", this.Qa), this[Zt](e, t), this;
	}
	clear(e) {
		for (let t of this.a) this.remove(t, e);
		return this;
	}
	getById(e) {
		return this.a.find((t) => t.id === e) ?? null;
	}
	getByKind(e) {
		let t = Array.isArray(e) ? e : [e];
		return this.a.filter((e) => t.includes(e.kind));
	}
	[gr]() {
		if (!this.Ia) {
			for (let e of this.a) e[gr]();
			this.Ia = !0;
		}
	}
	Qa = this.Ra.bind(this);
	Ra(e) {
		let t = e.detail;
		if (t.mode === "showing") {
			let e = K(t) ? ["captions", "subtitles"] : [t.kind];
			for (let n of this.a) n.mode === "showing" && n != t && e.includes(n.kind) && (n.mode = "disabled");
		}
		this.dispatchEvent(new h("mode-change", {
			detail: e.detail,
			trigger: e
		}));
	}
}, Lr = class {
	constructor(e, t, n) {
		this.l = e, this.j = t, this.k = n;
		let r = new Yt(), i = new Jt(), a = new Kt();
		this.Ie = u(() => t.$props.preferNativeHLS() ? [
			i,
			a,
			r
		] : [
			r,
			i,
			a
		]), g(this.Ke.bind(this)), g(this.Le.bind(this)), g(this.Me.bind(this)), g(this.Ne.bind(this));
	}
	Ie;
	Ke() {
		this.j.delegate.p("sources-change", { detail: [...Rr(this.j.$props.src()), ...this.l()] });
	}
	Le() {
		let { $store: t } = this.j, n = t.sources(), r = e(t.source), i = this.Je(r, n);
		if (n[0]?.src && !i.src && !i.type) {
			let { crossorigin: r } = t, i = Tr(r()), a = new AbortController();
			return Promise.all(n.map((e) => S(e.src) && e.type === "?" ? fetch(e.src, {
				method: "HEAD",
				credentials: i,
				signal: a.signal
			}).then((t) => (e.type = t.headers.get("content-type") || "??", e)).catch(() => e) : e)).then((n) => {
				a.signal.aborted || (this.Je(e(t.source), n), _());
			}), () => a.abort();
		}
		_();
	}
	Je(t, n) {
		let r = {
			src: "",
			type: ""
		}, i = null;
		for (let t of n) {
			let n = e(this.Ie).find((e) => e.canPlay(t));
			n && (r = t, i = n);
		}
		return this.Oe(t, r, i), this.Pe(e(this.k), i), r;
	}
	Oe(e, t, n) {
		t.src === e.src && t.type === e.type || (this.j.delegate.p("source-change", { detail: t }), this.j.delegate.p("media-type-change", { detail: n?.mediaType(t) || "unknown" }));
	}
	Pe(t, n) {
		n !== t && (this.j.delegate.p("provider-change", { detail: null }), n && e(() => n.preconnect?.(this.j)), this.k.set(n), this.j.delegate.p("provider-loader-change", { detail: n }));
	}
	Me() {
		let t = this.j.$provider();
		if (t) {
			if (this.j.$store.canLoad()) {
				e(() => t.setup({
					...this.j,
					player: this.j.player
				}));
				return;
			}
			e(() => t.preconnect?.(this.j));
		}
	}
	Ne() {
		let t = this.j.$provider(), n = this.j.$store.source();
		if (this.j.$store.canLoad()) {
			e(() => t?.loadSource(n, e(this.j.$store.preload)));
			return;
		}
		try {
			S(n.src) && Sr(new URL(n.src).origin, "preconnect");
		} catch {}
	}
};
function Rr(e) {
	return (d(e) ? e : [!S(e) && "src" in e ? e : { src: e }]).map(({ src: e, type: t }) => ({
		src: e,
		type: t ?? (!S(e) || e.startsWith("blob:") ? "video/object" : "?")
	}));
}
var zr = class {
	constructor(e, t) {
		this.m = e, this.j = t, g(this.He.bind(this));
	}
	Ge = [];
	He() {
		let e = [...this.j.$props.textTracks(), ...this.m()];
		for (let t of this.Ge) if (!e.some((e) => e.id === t.id)) {
			let e = t.id && this.j.textTracks.getById(t.id);
			e && this.j.textTracks.remove(e);
		}
		for (let t of e) {
			let e = t.id || kr.createId(t);
			this.j.textTracks.getById(e) || (t.id = e, this.j.textTracks.add(t));
		}
		this.Ge = e;
	}
}, Br = class extends w {
	static el = P({ tagName: "media-outlet" });
	j;
	l = m([]);
	m = m([]);
	k = m(null);
	constructor(e) {
		super(e), this.j = H(), new Lr(this.l, this.j, this.k), new zr(this.m, this.j);
	}
	onAttach(e) {
		e.setAttribute("keep-alive", "");
	}
	onConnect(e) {
		let t = new ResizeObserver(De(this.n.bind(this)));
		t.observe(e);
		let n = new MutationObserver(this.o.bind(this));
		return n.observe(e, {
			attributes: !0,
			childList: !0
		}), yn && b(e, "touchstart", (e) => e.preventDefault(), { passive: !1 }), Nn(() => {
			this.n(), this.o();
		}), () => {
			t.disconnect(), n.disconnect();
		};
	}
	onDestroy() {
		this.j.$store.currentTime.set(0);
	}
	n() {
		let e = this.j.player, t = this.el.offsetWidth, n = this.el.offsetHeight;
		e && (e.$store.mediaWidth.set(t), e.$store.mediaHeight.set(n), i(e, "--media-width", t + "px"), i(e, "--media-height", n + "px"));
	}
	o() {
		let e = [], t = [], n = this.el.children;
		for (let r of n) r instanceof HTMLSourceElement ? e.push({
			src: r.src,
			type: r.type
		}) : r instanceof HTMLTrackElement && t.push({
			id: r.id,
			src: r.src,
			kind: r.track.kind,
			language: r.srclang,
			label: r.label,
			default: r.default,
			type: r.getAttribute("data-type")
		});
		this.l.set(e), this.m.set(t), _();
	}
	render() {
		let t;
		return f(() => t?.destroy?.()), () => {
			t?.destroy();
			let n = this.k();
			if (!n) return null;
			let r = n.render(this.j.$store);
			return e(() => {
				n.load(this.j).then((r) => {
					e(this.k) === n && (this.j.delegate.p("provider-change", { detail: r }), t = r);
				});
			}), r;
		};
	}
}, Vr = class extends C {
	constructor(e, t) {
		super(e), this.ig = t;
	}
	onAttach(e) {
		let { $props: t, ariaKeys: n } = H(), r = e.getAttribute("aria-keyshortcuts");
		if (r) {
			n[this.ig] = r, f(() => {
				delete n[this.ig];
			});
			return;
		}
		let i = t.keyShortcuts()[this.ig];
		i && e.setAttribute("aria-keyshortcuts", i);
	}
}, Hr = /* @__PURE__ */ E("<!$><svg viewBox=\"0 0 32 32\" fill=\"none\" aria-hidden=\"true\" focusable=\"false\" data-media-icon=\"true\"></svg>");
function q({ slot: e, part: t, paths: n, rotate: r }) {
	return (() => {
		let [i, a] = D(Hr);
		return A(i, "data-rotate", r), A(i, "slot", e), A(i, "part", t), $e || (i.innerHTML = n), i;
	})();
}
//#endregion
//#region node_modules/vidstack/dist/prod/media-ui.js
function J(e, t = 2) {
	return Number(e.toFixed(t));
}
function Ur(e) {
	return String(e).split(".")[1]?.length ?? 0;
}
function Wr(e, t, n) {
	return Math.max(e, Math.min(n, t));
}
var Gr = m(!1);
b(document, "pointerdown", () => {
	Gr.set(!1);
}), b(document, "keydown", (e) => {
	e.metaKey || e.altKey || e.ctrlKey || Gr.set(!0);
});
var Y = class extends C {
	Qe = m(!1);
	onConnect(e) {
		g(() => {
			if (!Gr()) {
				this.Qe.set(!1), Kr(e, !1), this.listen("pointerenter", this.Re.bind(this)), this.listen("pointerleave", this.Se.bind(this));
				return;
			}
			let t = document.activeElement === e;
			this.Qe.set(t), Kr(e, t), this.listen("focus", this.Te.bind(this)), this.listen("blur", this.Ue.bind(this));
		});
	}
	focused() {
		return this.Qe();
	}
	Te() {
		this.Qe.set(!0), Kr(this.el, !0);
	}
	Ue() {
		this.Qe.set(!1), Kr(this.el, !1);
	}
	Re() {
		qr(this.el, !0);
	}
	Se() {
		qr(this.el, !1);
	}
};
function Kr(e, t) {
	a(e, "data-focus", t), a(e, "data-hocus", t);
}
function qr(e, t) {
	a(e, "data-hocus", t), a(e, "data-hover", t);
}
var Jr = t();
(class extends w {
	static el = P({
		tagName: "media-tooltip",
		props: { position: "top center" }
	});
	onAttach(e) {
		te(Jr) && Nn(() => {
			e.isConnected && p(Jr).bb(e);
		}), this.setAttributes({ position: this.$props.position });
	}
});
var Yr = 0, Xr = class extends C {
	constructor(e) {
		super(e), c(Jr, { bb: this.bb.bind(this) });
	}
	bb(e) {
		let t = `media-tooltip-${++Yr}`;
		a(this.el, "aria-describedby", t), a(e, "id", t), a(e, "role", "tooltip"), this.el.removeAttribute("aria-label");
	}
}, Zr = Object.defineProperty, Qr = Object.getOwnPropertyDescriptor, $r = (e, t, n, r) => {
	for (var i = r > 1 ? void 0 : r ? Qr(t, n) : t, a = e.length - 1, o; a >= 0; a--) (o = e[a]) && (i = (r ? o(t, n, i) : o(i)) || i);
	return r && i && Zr(t, n, i), i;
}, ei = {
	disabled: !1,
	defaultPressed: !1,
	defaultAppearance: !1
}, X = class extends w {
	static el = P({
		tagName: "media-toggle-button",
		props: ei
	});
	cb = m(!1);
	db;
	constructor(e) {
		super(e), new Y(e), new Xr(e), this.db && new Vr(e, this.db);
	}
	get pressed() {
		return e(this.cb);
	}
	onAttach(e) {
		l(this.cb) && this.cb.set(this.$props.defaultPressed()), z(e, "tabindex", "0"), z(e, "role", "button");
		let { disabled: t, defaultAppearance: n } = this.$props;
		this.setAttributes({
			disabled: t,
			"default-appearance": n,
			"data-pressed": this.cb,
			"aria-pressed": this.eb.bind(this),
			"data-media-button": !0
		});
	}
	onConnect(e) {
		V(e, this.fb.bind(this));
	}
	eb() {
		return xe(this.cb());
	}
	gb(e) {
		l(this.cb) && this.cb.set((e) => !e);
	}
	fb(e) {
		let t = this.$props.disabled();
		if (t) {
			t && e.stopImmediatePropagation();
			return;
		}
		e.preventDefault(), this.gb(e);
	}
};
$r([jt], X.prototype, "pressed", 1);
var ti = "<path d=\"M8.66667 6.66667C8.29848 6.66667 8 6.96514 8 7.33333V24.6667C8 25.0349 8.29848 25.3333 8.66667 25.3333H12.6667C13.0349 25.3333 13.3333 25.0349 13.3333 24.6667V7.33333C13.3333 6.96514 13.0349 6.66667 12.6667 6.66667H8.66667Z\" fill=\"currentColor\"/> <path d=\"M19.3333 6.66667C18.9651 6.66667 18.6667 6.96514 18.6667 7.33333V24.6667C18.6667 25.0349 18.9651 25.3333 19.3333 25.3333H23.3333C23.7015 25.3333 24 25.0349 24 24.6667V7.33333C24 6.96514 23.7015 6.66667 23.3333 6.66667H19.3333Z\" fill=\"currentColor\"/>", ni = "<path d=\"M10.6667 6.6548C10.6667 6.10764 11.2894 5.79346 11.7295 6.11862L24.377 15.4634C24.7377 15.7298 24.7377 16.2692 24.3771 16.5357L11.7295 25.8813C11.2895 26.2065 10.6667 25.8923 10.6667 25.3451L10.6667 6.6548Z\" fill=\"currentColor\"/>", ri = "<path d=\"M15.6038 12.2147C16.0439 12.5399 16.6667 12.2257 16.6667 11.6786V10.1789C16.6667 10.1001 16.7351 10.0384 16.8134 10.0479C20.1116 10.4494 22.6667 13.2593 22.6667 16.6659C22.6667 20.3481 19.6817 23.3332 15.9995 23.3332C12.542 23.3332 9.69927 20.7014 9.36509 17.332C9.32875 16.9655 9.03371 16.6662 8.66548 16.6662L6.66655 16.6666C6.29841 16.6666 5.99769 16.966 6.02187 17.3334C6.36494 22.5454 10.7012 26.6667 16 26.6667C21.5228 26.6667 26 22.1895 26 16.6667C26 11.4103 21.9444 7.10112 16.7916 6.69757C16.7216 6.69209 16.6667 6.63396 16.6667 6.56372V4.98824C16.6667 4.44106 16.0439 4.12689 15.6038 4.45206L11.0765 7.79738C10.7159 8.06387 10.7159 8.60326 11.0766 8.86973L15.6038 12.2147Z\" fill=\"currentColor\"/>", ii = class extends X {
	static el = P({
		tagName: "media-play-button",
		props: ei
	});
	j;
	db = "togglePaused";
	onAttach(e) {
		this.j = H(), this.cb = this.hb.bind(this), super.onAttach(e), B(e, this.ib.bind(this));
		let { paused: t, ended: n } = this.j.$store;
		this.setAttributes({
			"data-paused": t,
			"data-ended": n
		});
	}
	gb(e) {
		let t = this.j.remote;
		this.cb() ? t.pause(e) : t.play(e);
	}
	hb() {
		let { paused: e } = this.j.$store;
		return !e();
	}
	ib() {
		let { paused: e } = this.j.$store;
		return e() ? "Play" : "Pause";
	}
	render() {
		return [
			k(q, {
				paths: ni,
				slot: "play"
			}),
			k(q, {
				paths: ri,
				slot: "replay"
			}),
			k(q, {
				paths: ti,
				slot: "pause"
			})
		];
	}
}, ai = "<path d=\"M8 28.0003C8 27.6321 8.29848 27.3336 8.66667 27.3336H23.3333C23.7015 27.3336 24 27.6321 24 28.0003V29.3336C24 29.7018 23.7015 30.0003 23.3333 30.0003H8.66667C8.29848 30.0003 8 29.7018 8 29.3336V28.0003Z\" fill=\"currentColor\"/> <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M4.66602 6.66699C4.29783 6.66699 3.99935 6.96547 3.99935 7.33366V24.667C3.99935 25.0352 4.29783 25.3337 4.66602 25.3337H27.3327C27.7009 25.3337 27.9994 25.0352 27.9994 24.667V7.33366C27.9994 6.96547 27.7009 6.66699 27.3327 6.66699H4.66602ZM8.66659 21.3333C8.2984 21.3333 7.99992 21.0349 7.99992 20.6667V11.3333C7.99992 10.9651 8.2984 10.6667 8.66659 10.6667H13.9999C14.3681 10.6667 14.6666 10.9651 14.6666 11.3333V12.6667C14.6666 13.0349 14.3681 13.3333 13.9999 13.3333H10.7999C10.7263 13.3333 10.6666 13.393 10.6666 13.4667V18.5333C10.6666 18.607 10.7263 18.6667 10.7999 18.6667H13.9999C14.3681 18.6667 14.6666 18.9651 14.6666 19.3333V20.6667C14.6666 21.0349 14.3681 21.3333 13.9999 21.3333H8.66659ZM17.9999 21.3333C17.6317 21.3333 17.3333 21.0349 17.3333 20.6667V11.3333C17.3333 10.9651 17.6317 10.6667 17.9999 10.6667H23.3333C23.7014 10.6667 23.9999 10.9651 23.9999 11.3333V12.6667C23.9999 13.0349 23.7014 13.3333 23.3333 13.3333H20.1333C20.0596 13.3333 19.9999 13.393 19.9999 13.4667V18.5333C19.9999 18.607 20.0596 18.6667 20.1333 18.6667H23.3333C23.7014 18.6667 23.9999 18.9651 23.9999 19.3333V20.6667C23.9999 21.0349 23.7014 21.3333 23.3333 21.3333H17.9999Z\" fill=\"currentColor\"/>", oi = "<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M4.6661 6.66699C4.29791 6.66699 3.99943 6.96547 3.99943 7.33366V24.667C3.99943 25.0352 4.29791 25.3337 4.6661 25.3337H27.3328C27.701 25.3337 27.9994 25.0352 27.9994 24.667V7.33366C27.9994 6.96547 27.701 6.66699 27.3328 6.66699H4.6661ZM8.66667 21.3333C8.29848 21.3333 8 21.0349 8 20.6667V11.3333C8 10.9651 8.29848 10.6667 8.66667 10.6667H14C14.3682 10.6667 14.6667 10.9651 14.6667 11.3333V12.6667C14.6667 13.0349 14.3682 13.3333 14 13.3333H10.8C10.7264 13.3333 10.6667 13.393 10.6667 13.4667V18.5333C10.6667 18.607 10.7264 18.6667 10.8 18.6667H14C14.3682 18.6667 14.6667 18.9651 14.6667 19.3333V20.6667C14.6667 21.0349 14.3682 21.3333 14 21.3333H8.66667ZM18 21.3333C17.6318 21.3333 17.3333 21.0349 17.3333 20.6667V11.3333C17.3333 10.9651 17.6318 10.6667 18 10.6667H23.3333C23.7015 10.6667 24 10.9651 24 11.3333V12.6667C24 13.0349 23.7015 13.3333 23.3333 13.3333H20.1333C20.0597 13.3333 20 13.393 20 13.4667V18.5333C20 18.607 20.0597 18.6667 20.1333 18.6667H23.3333C23.7015 18.6667 24 18.9651 24 19.3333V20.6667C24 21.0349 23.7015 21.3333 23.3333 21.3333H18Z\" fill=\"currentColor\"/>";
function si(e) {
	return e ? "true" : "false";
}
function Z(e) {
	return () => si(e());
}
(class extends X {
	static el = P({
		tagName: "media-caption-button",
		props: ei
	});
	j;
	db = "toggleCaptions";
	onAttach(e) {
		this.j = H(), this.cb = this.hb.bind(this), super.onAttach(e), B(e, this.ib.bind(this)), this.setAttributes({ "aria-hidden": Z(this.jb.bind(this)) });
	}
	gb(e) {
		this.j.remote.toggleCaptions(e);
	}
	hb() {
		let { textTrack: e } = this.j.$store, t = e();
		return !!t && K(t);
	}
	jb() {
		let { textTracks: e } = this.j.$store;
		return e().filter(K).length == 0;
	}
	ib() {
		let { textTrack: e } = this.j.$store;
		return e() ? "Closed-Captions Off" : "Closed-Captions On";
	}
	render() {
		return [k(q, {
			paths: ai,
			slot: "on"
		}), k(q, {
			paths: oi,
			slot: "off"
		})];
	}
});
var ci = "<path d=\"M19.3334 13.3333C18.9652 13.3333 18.6667 13.0349 18.6667 12.6667L18.6667 7.33333C18.6667 6.96514 18.9652 6.66666 19.3334 6.66666H21.3334C21.7015 6.66666 22 6.96514 22 7.33333V9.86666C22 9.9403 22.0597 10 22.1334 10L24.6667 10C25.0349 10 25.3334 10.2985 25.3334 10.6667V12.6667C25.3334 13.0349 25.0349 13.3333 24.6667 13.3333L19.3334 13.3333Z\" fill=\"currentColor\"/> <path d=\"M13.3334 19.3333C13.3334 18.9651 13.0349 18.6667 12.6667 18.6667H7.33335C6.96516 18.6667 6.66669 18.9651 6.66669 19.3333V21.3333C6.66669 21.7015 6.96516 22 7.33335 22H9.86669C9.94032 22 10 22.0597 10 22.1333L10 24.6667C10 25.0349 10.2985 25.3333 10.6667 25.3333H12.6667C13.0349 25.3333 13.3334 25.0349 13.3334 24.6667L13.3334 19.3333Z\" fill=\"currentColor\"/> <path d=\"M18.6667 24.6667C18.6667 25.0349 18.9652 25.3333 19.3334 25.3333H21.3334C21.7015 25.3333 22 25.0349 22 24.6667V22.1333C22 22.0597 22.0597 22 22.1334 22H24.6667C25.0349 22 25.3334 21.7015 25.3334 21.3333V19.3333C25.3334 18.9651 25.0349 18.6667 24.6667 18.6667L19.3334 18.6667C18.9652 18.6667 18.6667 18.9651 18.6667 19.3333L18.6667 24.6667Z\" fill=\"currentColor\"/> <path d=\"M10.6667 13.3333H12.6667C13.0349 13.3333 13.3334 13.0349 13.3334 12.6667L13.3334 10.6667V7.33333C13.3334 6.96514 13.0349 6.66666 12.6667 6.66666H10.6667C10.2985 6.66666 10 6.96514 10 7.33333L10 9.86666C10 9.9403 9.94033 10 9.86669 10L7.33335 10C6.96516 10 6.66669 10.2985 6.66669 10.6667V12.6667C6.66669 13.0349 6.96516 13.3333 7.33335 13.3333L10.6667 13.3333Z\" fill=\"currentColor\"/>", li = "<path d=\"M25.3299 7.26517C25.2958 6.929 25.0119 6.66666 24.6667 6.66666H19.3334C18.9652 6.66666 18.6667 6.96514 18.6667 7.33333V9.33333C18.6667 9.70152 18.9652 10 19.3334 10L21.8667 10C21.9403 10 22 10.0597 22 10.1333V12.6667C22 13.0349 22.2985 13.3333 22.6667 13.3333H24.6667C25.0349 13.3333 25.3334 13.0349 25.3334 12.6667V7.33333C25.3334 7.31032 25.3322 7.28758 25.3299 7.26517Z\" fill=\"currentColor\"/> <path d=\"M22 21.8667C22 21.9403 21.9403 22 21.8667 22L19.3334 22C18.9652 22 18.6667 22.2985 18.6667 22.6667V24.6667C18.6667 25.0349 18.9652 25.3333 19.3334 25.3333L24.6667 25.3333C25.0349 25.3333 25.3334 25.0349 25.3334 24.6667V19.3333C25.3334 18.9651 25.0349 18.6667 24.6667 18.6667H22.6667C22.2985 18.6667 22 18.9651 22 19.3333V21.8667Z\" fill=\"currentColor\"/> <path d=\"M12.6667 22H10.1334C10.0597 22 10 21.9403 10 21.8667V19.3333C10 18.9651 9.70154 18.6667 9.33335 18.6667H7.33335C6.96516 18.6667 6.66669 18.9651 6.66669 19.3333V24.6667C6.66669 25.0349 6.96516 25.3333 7.33335 25.3333H12.6667C13.0349 25.3333 13.3334 25.0349 13.3334 24.6667V22.6667C13.3334 22.2985 13.0349 22 12.6667 22Z\" fill=\"currentColor\"/> <path d=\"M10 12.6667V10.1333C10 10.0597 10.0597 10 10.1334 10L12.6667 10C13.0349 10 13.3334 9.70152 13.3334 9.33333V7.33333C13.3334 6.96514 13.0349 6.66666 12.6667 6.66666H7.33335C6.96516 6.66666 6.66669 6.96514 6.66669 7.33333V12.6667C6.66669 13.0349 6.96516 13.3333 7.33335 13.3333H9.33335C9.70154 13.3333 10 13.0349 10 12.6667Z\" fill=\"currentColor\"/>", ui = class extends X {
	static el = P({
		tagName: "media-fullscreen-button",
		props: {
			...ei,
			target: "prefer-media"
		}
	});
	j;
	db = "toggleFullscreen";
	onAttach(e) {
		this.j = H(), this.cb = this.hb.bind(this), super.onAttach(e), B(e, this.ib.bind(this));
		let { fullscreen: t } = this.j.$store;
		this.setAttributes({
			"aria-hidden": Z(this.jb.bind(this)),
			"data-fullscreen": t
		});
	}
	gb(e) {
		let t = this.j.remote, n = this.$props.target();
		this.cb() ? t.exitFullscreen(n, e) : t.enterFullscreen(n, e);
	}
	hb() {
		let { fullscreen: e } = this.j.$store;
		return e();
	}
	jb() {
		let { canFullscreen: e } = this.j.$store;
		return !e();
	}
	ib() {
		let { fullscreen: e } = this.j.$store;
		return e() ? "Exit Fullscreen" : "Enter Fullscreen";
	}
	render() {
		return [k(q, {
			paths: li,
			slot: "enter"
		}), k(q, {
			paths: ci,
			slot: "exit"
		})];
	}
}, di = "<path d=\"M17.5091 24.6594C17.5091 25.2066 16.8864 25.5208 16.4463 25.1956L9.44847 20.0252C9.42553 20.0083 9.39776 19.9991 9.36923 19.9991H4.66667C4.29848 19.9991 4 19.7006 4 19.3325V12.6658C4 12.2976 4.29848 11.9991 4.66667 11.9991H9.37115C9.39967 11.9991 9.42745 11.99 9.45039 11.973L16.4463 6.8036C16.8863 6.47842 17.5091 6.79259 17.5091 7.33977L17.5091 24.6594Z\" fill=\"currentColor\"/> <path d=\"M28.8621 13.6422C29.1225 13.3818 29.1225 12.9597 28.8621 12.6994L27.9193 11.7566C27.659 11.4962 27.2368 11.4962 26.9765 11.7566L24.7134 14.0197C24.6613 14.0717 24.5769 14.0717 24.5248 14.0197L22.262 11.7568C22.0016 11.4964 21.5795 11.4964 21.3191 11.7568L20.3763 12.6996C20.116 12.9599 20.116 13.382 20.3763 13.6424L22.6392 15.9053C22.6913 15.9573 22.6913 16.0418 22.6392 16.0938L20.3768 18.3562C20.1165 18.6166 20.1165 19.0387 20.3768 19.299L21.3196 20.2419C21.58 20.5022 22.0021 20.5022 22.2624 20.2418L24.5248 17.9795C24.5769 17.9274 24.6613 17.9274 24.7134 17.9795L26.976 20.2421C27.2363 20.5024 27.6585 20.5024 27.9188 20.2421L28.8616 19.2992C29.122 19.0389 29.122 18.6168 28.8616 18.3564L26.599 16.0938C26.547 16.0418 26.547 15.9573 26.599 15.9053L28.8621 13.6422Z\" fill=\"currentColor\"/>", fi = "<path d=\"M17.5091 24.6595C17.5091 25.2066 16.8864 25.5208 16.4463 25.1956L9.44847 20.0252C9.42553 20.0083 9.39776 19.9992 9.36923 19.9992H4.66667C4.29848 19.9992 4 19.7007 4 19.3325V12.6658C4 12.2976 4.29848 11.9992 4.66667 11.9992H9.37115C9.39967 11.9992 9.42745 11.99 9.45039 11.9731L16.4463 6.80363C16.8863 6.47845 17.5091 6.79262 17.5091 7.3398L17.5091 24.6595Z\" fill=\"currentColor\"/> <path d=\"M27.5091 9.33336C27.8773 9.33336 28.1758 9.63184 28.1758 10V22C28.1758 22.3682 27.8773 22.6667 27.5091 22.6667H26.1758C25.8076 22.6667 25.5091 22.3682 25.5091 22V10C25.5091 9.63184 25.8076 9.33336 26.1758 9.33336L27.5091 9.33336Z\" fill=\"currentColor\"/> <path d=\"M22.1758 12C22.544 12 22.8424 12.2985 22.8424 12.6667V19.3334C22.8424 19.7016 22.544 20 22.1758 20H20.8424C20.4743 20 20.1758 19.7016 20.1758 19.3334V12.6667C20.1758 12.2985 20.4743 12 20.8424 12H22.1758Z\" fill=\"currentColor\"/>", pi = "<path d=\"M17.5091 24.6594C17.5091 25.2066 16.8864 25.5207 16.4463 25.1956L9.44847 20.0252C9.42553 20.0083 9.39776 19.9991 9.36923 19.9991H4.66667C4.29848 19.9991 4 19.7006 4 19.3324V12.6658C4 12.2976 4.29848 11.9991 4.66667 11.9991H9.37115C9.39967 11.9991 9.42745 11.99 9.45039 11.973L16.4463 6.80358C16.8863 6.4784 17.5091 6.79258 17.5091 7.33975L17.5091 24.6594Z\" fill=\"currentColor\"/> <path d=\"M22.8424 12.6667C22.8424 12.2985 22.544 12 22.1758 12H20.8424C20.4743 12 20.1758 12.2985 20.1758 12.6667V19.3333C20.1758 19.7015 20.4743 20 20.8424 20H22.1758C22.544 20 22.8424 19.7015 22.8424 19.3333V12.6667Z\" fill=\"currentColor\"/>", mi = class extends X {
	static el = P({
		tagName: "media-mute-button",
		props: ei
	});
	j;
	db = "toggleMuted";
	onAttach(e) {
		this.j = H(), this.cb = this.hb.bind(this), B(e, this.ib.bind(this)), this.setAttributes({
			"data-muted": this.cb,
			"data-volume": this.kb.bind(this)
		}), super.onAttach(e);
	}
	gb(e) {
		let t = this.j.remote;
		this.cb() ? t.unmute(e) : t.mute(e);
	}
	hb() {
		let { muted: e, volume: t } = this.j.$store;
		return e() || t() === 0;
	}
	ib() {
		return this.cb() ? "Unmute" : "Mute";
	}
	kb() {
		let { muted: e, volume: t } = this.j.$store, n = t();
		if (e() || n === 0) return "muted";
		if (n >= .5) return "high";
		if (n < .5) return "low";
	}
	render() {
		return [
			k(q, {
				paths: fi,
				slot: "volume-high"
			}),
			k(q, {
				paths: pi,
				slot: "volume-low"
			}),
			k(q, {
				paths: di,
				slot: "volume-muted"
			})
		];
	}
}, hi = "<path d=\"M5.33334 26V19.4667C5.33334 19.393 5.39304 19.3333 5.46668 19.3333H7.86668C7.94031 19.3333 8.00001 19.393 8.00001 19.4667V23.3333C8.00001 23.7015 8.29849 24 8.66668 24H23.3333C23.7015 24 24 23.7015 24 23.3333V8.66666C24 8.29847 23.7015 7.99999 23.3333 7.99999H19.4667C19.393 7.99999 19.3333 7.9403 19.3333 7.86666V5.46666C19.3333 5.39302 19.393 5.33333 19.4667 5.33333H26C26.3682 5.33333 26.6667 5.63181 26.6667 5.99999V26C26.6667 26.3682 26.3682 26.6667 26 26.6667H6.00001C5.63182 26.6667 5.33334 26.3682 5.33334 26Z\" fill=\"currentColor\"/> <path d=\"M14.0098 8.42359H10.806C10.6872 8.42359 10.6277 8.56721 10.7117 8.6512L16.5491 14.4886C16.8094 14.7489 16.8094 15.171 16.5491 15.4314L15.3234 16.657C15.0631 16.9174 14.641 16.9174 14.3806 16.657L8.63739 10.9138C8.55339 10.8298 8.40978 10.8893 8.40978 11.0081V14.0236C8.40978 14.3918 8.1113 14.6903 7.74311 14.6903H6.00978C5.64159 14.6903 5.34311 14.3918 5.34311 14.0236L5.34311 6.02359C5.34311 5.6554 5.64159 5.35692 6.00978 5.35692L14.0098 5.35692C14.378 5.35692 14.6764 5.6554 14.6764 6.02359V7.75692C14.6764 8.12511 14.378 8.42359 14.0098 8.42359Z\" fill=\"currentColor\"/>", gi = "<path d=\"M16 15.3333C15.6318 15.3333 15.3333 15.6318 15.3333 16V20C15.3333 20.3682 15.6318 20.6667 16 20.6667H21.3333C21.7015 20.6667 22 20.3682 22 20V16C22 15.6318 21.7015 15.3333 21.3333 15.3333H16Z\" fill=\"currentColor\"/> <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M5.33333 7.33334C5.33333 6.96515 5.63181 6.66667 5.99999 6.66667H26C26.3682 6.66667 26.6667 6.96515 26.6667 7.33334V24.6667C26.6667 25.0349 26.3682 25.3333 26 25.3333H5.99999C5.63181 25.3333 5.33333 25.0349 5.33333 24.6667V7.33334ZM7.99999 10C7.99999 9.63182 8.29847 9.33334 8.66666 9.33334H23.3333C23.7015 9.33334 24 9.63182 24 10V22C24 22.3682 23.7015 22.6667 23.3333 22.6667H8.66666C8.29847 22.6667 7.99999 22.3682 7.99999 22V10Z\" fill=\"currentColor\"/>";
(class extends X {
	static el = P({
		tagName: "media-pip-button",
		props: ei
	});
	j;
	db = "togglePictureInPicture";
	onAttach(e) {
		this.j = H(), this.cb = this.hb.bind(this), super.onAttach(e), B(e, this.ib.bind(this));
		let { pictureInPicture: t } = this.j.$store;
		this.setAttributes({
			"aria-hidden": Z(this.jb.bind(this)),
			"data-pip": t
		});
	}
	gb(e) {
		let t = this.j.remote;
		this.cb() ? t.exitPictureInPicture(e) : t.enterPictureInPicture(e);
	}
	hb() {
		let { pictureInPicture: e } = this.j.$store;
		return e();
	}
	jb() {
		let { canPictureInPicture: e } = this.j.$store;
		return !e();
	}
	ib() {
		let { pictureInPicture: e } = this.j.$store;
		return e() ? "Exit Picture In Picture" : "Enter Picture In Picture";
	}
	render() {
		return [k(q, {
			paths: gi,
			slot: "enter"
		}), k(q, {
			paths: hi,
			slot: "exit"
		})];
	}
});
var _i = "<path d=\"M15.6038 12.2148C16.0439 12.5399 16.6667 12.2257 16.6667 11.6786V10.1789C16.6667 10.1001 16.7351 10.0384 16.8134 10.0479C20.1116 10.4494 22.6667 13.2593 22.6667 16.6659C22.6667 20.3481 19.6817 23.3332 15.9995 23.3332C12.542 23.3332 9.69927 20.7015 9.36509 17.332C9.32875 16.9655 9.03371 16.6662 8.66548 16.6662L6.66655 16.6666C6.29841 16.6666 5.99769 16.966 6.02187 17.3334C6.36494 22.5454 10.7012 26.6667 16 26.6667C21.5228 26.6667 26 22.1895 26 16.6667C26 11.4103 21.9444 7.10112 16.7916 6.69758C16.7216 6.69209 16.6667 6.63396 16.6667 6.56372V4.98824C16.6667 4.44106 16.0439 4.12689 15.6038 4.45207L11.0765 7.79738C10.7159 8.06387 10.7159 8.60327 11.0766 8.86974L15.6038 12.2148Z\" fill=\"currentColor\"/>", vi = "<path d=\"M16.4167 12.2148C15.9766 12.5399 15.3538 12.2257 15.3538 11.6786V10.1789C15.3538 10.1001 15.2854 10.0384 15.2072 10.0479C11.9089 10.4494 9.35384 13.2593 9.35384 16.6659C9.35384 20.3481 12.3389 23.3332 16.0211 23.3332C19.4785 23.3332 22.3212 20.7015 22.6554 17.332C22.6918 16.9655 22.9868 16.6662 23.355 16.6662L25.354 16.6666C25.7221 16.6666 26.0228 16.966 25.9986 17.3334C25.6556 22.5454 21.3193 26.6667 16.0205 26.6667C10.4977 26.6667 6.02051 22.1895 6.02051 16.6667C6.02051 11.4103 10.0761 7.10112 15.2289 6.69758C15.2989 6.69209 15.3538 6.63396 15.3538 6.56372V4.98824C15.3538 4.44106 15.9766 4.12689 16.4167 4.45207L20.944 7.79738C21.3046 8.06387 21.3046 8.60327 20.9439 8.86974L16.4167 12.2148Z\" fill=\"currentColor\"/>", yi = class extends w {
	static el = P({
		tagName: "media-seek-button",
		props: {
			disabled: !1,
			defaultAppearance: !1,
			seconds: 30
		}
	});
	j;
	constructor(e) {
		super(e), this.j = H(), new Y(e), new Xr(e);
	}
	onAttach(e) {
		z(e, "tabindex", "0"), z(e, "role", "button"), B(e, this.ib.bind(this));
		let { seconds: t, defaultAppearance: n } = this.$props;
		this.setAttributes({
			seconds: t,
			"default-appearance": n,
			"aria-hidden": Z(this.jb.bind(this)),
			"data-media-button": !0
		});
	}
	onConnect(e) {
		V(e, this.gb.bind(this));
	}
	jb() {
		let { canSeek: e } = this.j.$store;
		return !e();
	}
	ib() {
		let { seconds: e } = this.$props;
		return `Seek ${e() > 0 ? "forward" : "backward"} ${e()} seconds`;
	}
	gb(e) {
		let { seconds: t, disabled: n } = this.$props;
		if (n()) return;
		let { currentTime: r } = this.j.$store, i = r() + t();
		this.j.remote.seek(i, e);
	}
	render() {
		return [k(q, {
			paths: _i,
			slot: "backward"
		}), k(q, {
			paths: vi,
			slot: "forward"
		})];
	}
}, bi = new ve({
	min: 0,
	max: 100,
	value: 50,
	pointerValue: 0,
	focused: !1,
	dragging: !1,
	pointing: !1,
	get interactive() {
		return this.dragging || this.focused || this.pointing;
	},
	get fillRate() {
		return xi(this.min, this.max, this.value);
	},
	get fillPercent() {
		return this.fillRate * 100;
	},
	get pointerRate() {
		return xi(this.min, this.max, this.pointerValue);
	},
	get pointerPercent() {
		return this.pointerRate * 100;
	}
});
function xi(e, t, n) {
	let r = t - e, i = n - e;
	return r > 0 ? i / r : 0;
}
var Si = {
	min: 0,
	max: 100,
	disabled: !1,
	value: 100,
	step: 1,
	keyStep: 1,
	shiftKeyMultiplier: 5,
	trackClass: null,
	trackFillClass: null,
	trackProgressClass: null,
	thumbContainerClass: null,
	thumbClass: null
};
function Ci(e, t, n, r) {
	return Wr(e, J(n, Ur(r)), t);
}
function wi(e, t, n, r) {
	let i = Wr(0, n, 1);
	return e + r * ((t - e) * i / r);
}
var Ti = {
	Left: -1,
	ArrowLeft: -1,
	Up: 1,
	ArrowUp: 1,
	Right: 1,
	ArrowRight: 1,
	Down: -1,
	ArrowDown: -1
}, Ei = class extends C {
	constructor(e, t, n) {
		super(e), this.jg = t, this.j = n;
	}
	onConnect() {
		g(this.vg.bind(this)), g(this.wg.bind(this)), this.jg.tc && Nn(() => {
			let e = this.j.player?.querySelector("media-outlet");
			e && (this.Id = e, b(e, "touchstart", this.xg.bind(this)), b(e, "touchmove", this.yg.bind(this)));
		});
	}
	Id = null;
	lg = null;
	ng = null;
	xg(e) {
		this.lg = e.touches[0].clientX;
	}
	yg(e) {
		if (ee(this.lg) || (e.preventDefault(), this.$store.dragging())) return;
		let t = e.touches[0].clientX - this.lg;
		Math.abs(t) > 20 && (this.lg = e.touches[0].clientX, this.ng = this.$store.value(), this.qg(this.ng, e));
	}
	vg() {
		this.jg.mb() || (this.listen("focus", this.Te.bind(this)), this.listen("pointerenter", this.Re.bind(this)), this.listen("pointermove", this.zg.bind(this)), this.listen("pointerleave", this.Se.bind(this)), this.listen("pointerdown", this.Ag.bind(this)), this.listen("keydown", this.Za.bind(this)), this.listen("keyup", this.Ya.bind(this)));
	}
	wg() {
		this.jg.mb() || !this.$store.dragging() || (b(document, "pointerup", this.Bg.bind(this)), b(document, "pointermove", this.Cg.bind(this)), yn && b(document, "touchmove", this.Dg.bind(this), { passive: !1 }));
	}
	Te() {
		this.kg(this.$store.value());
	}
	rg(e, t) {
		let { value: n, min: r, max: i, dragging: a } = this.$store, o = Math.max(r(), Math.min(e, i()));
		n.set(o);
		let s = this.createEvent("value-change", {
			detail: o,
			trigger: t
		});
		if (this.el.dispatchEvent(s), this.jg.Hb(s), a()) {
			let e = this.createEvent("drag-value-change", {
				detail: o,
				trigger: t
			});
			this.el.dispatchEvent(e), this.jg.Kb(e);
		}
	}
	kg(e, t) {
		let { pointerValue: n, dragging: r } = this.$store;
		if (n.set(e), this.dispatch("pointer-value-change", {
			detail: e,
			trigger: t
		}), r()) {
			let n = this.jg.nb === "vertical" ? "bottom" : "left", r = this.jg.nb === "vertical" ? "height" : "width";
			this.og && !this.el?.hasAttribute("data-chapters") && (this.og.style[r] = e + "%"), this.mg && (this.mg.style[n] = e + "%"), this.rg(e, t);
		}
	}
	pg(e) {
		let t, n = this.el.getBoundingClientRect(), { min: r, max: i } = this.$store;
		if (this.jg.nb === "vertical") {
			let { bottom: r, height: i } = n;
			t = (r - e.clientY) / i;
		} else if (this.lg && re(this.ng)) {
			let { width: n } = this.Id.getBoundingClientRect(), a = (e.clientX - this.lg) / n, o = i() - r(), s = o * Math.abs(a);
			t = (a < 0 ? this.ng - s : this.ng + s) / o;
		} else {
			let { left: r, width: i } = n;
			t = (e.clientX - r) / i;
		}
		return Math.max(r(), Math.min(i(), this.jg.Gb(wi(r(), i(), t, this.jg.vb()))));
	}
	Re(e) {
		this.$store.pointing.set(!0);
	}
	zg(e) {
		let { dragging: t } = this.$store;
		t() || this.kg(this.pg(e), e);
	}
	Se(e) {
		this.$store.pointing.set(!1);
	}
	Ag(e) {
		if (e.button !== 0) return;
		let t = this.pg(e);
		this.qg(t, e), this.kg(t, e);
	}
	mg = null;
	og = null;
	qg(e, t) {
		let { dragging: n } = this.$store;
		if (n()) return;
		n.set(!0), this.mg = this.el.querySelector("shadow-root > div[part=\"thumb-container\"]"), this.og = this.el.querySelector("shadow-root > div[part~=\"track-fill\"]"), this.j.remote.pauseUserIdle(t);
		let r = this.createEvent("drag-start", {
			detail: e,
			trigger: t
		});
		this.el.dispatchEvent(r), this.jg.Ib(r);
	}
	tg(e, t) {
		let { dragging: n } = this.$store;
		if (!n()) return;
		n.set(!1), this.og &&= (i(this.og, "width", null), null), this.mg &&= (i(this.mg, "left", null), i(this.mg, "bottom", null), null), this.j.remote.resumeUserIdle(t);
		let r = this.createEvent("drag-end", {
			detail: e,
			trigger: t
		});
		this.el.dispatchEvent(r), this.jg.Jb(r), this.lg = null, this.ng = null;
	}
	sg;
	Za(e) {
		if (he(e)) {
			let t = e.trigger;
			if (x(t)) e = t;
			else return;
		}
		let { key: t } = e, { min: r, max: i } = this.$store, a;
		if (t === "Home" || t === "PageUp" ? a = r() : t === "End" || t === "PageDown" ? a = i() : !e.metaKey && /[0-9]/.test(t) && (a = (i() - r()) / 10 * Number(t)), !n(a)) {
			this.kg(a, e), this.rg(a, e);
			return;
		}
		let o = this.ug(e);
		if (!o) return;
		let s = t === this.sg;
		!this.$store.dragging() && s && this.qg(o, e), this.kg(o, e), s || this.rg(o, e), this.sg = t;
	}
	Ya(e) {
		if (he(e)) {
			let t = e.trigger;
			if (x(t)) e = t;
			else return;
		}
		this.sg = "";
		let { dragging: t, value: n } = this.$store;
		if (!t()) return;
		let r = this.ug(e) ?? n();
		this.kg(r), this.tg(r, e);
	}
	ug(e) {
		let { key: t, shiftKey: n } = e;
		if (!Object.keys(Ti).includes(t)) return;
		let { shiftKeyMultiplier: r } = this.$props, { value: i } = this.$store, a = this.jg.vb(), o = this.jg.Fb(), s = (n ? o * r() : o) * Number(Ti[t]), c = (i() + s) / a;
		return Number((a * c).toFixed(3));
	}
	Bg(e) {
		if (e.button !== 0) return;
		let t = this.pg(e);
		this.kg(t, e), this.tg(t, e);
	}
	Dg(e) {
		e.preventDefault();
	}
	Cg = fr((e) => {
		this.kg(this.pg(e), e);
	}, 20, { leading: !0 });
}, Di = t(() => ({})), Oi = /* @__PURE__ */ E("<!$><div part=\"track\"></div>"), ki = /* @__PURE__ */ E("<!$><div part=\"track track-fill\"></div>"), Ai = /* @__PURE__ */ E("<!$><div part=\"track track-progress\"></div>"), ji = /* @__PURE__ */ E("<!$><div part=\"thumb-container\"><!$><div part=\"thumb\"></div></div>"), Mi = class extends w {
	static el = P({
		tagName: "media-slider",
		props: Si,
		store: bi
	});
	j;
	pb = !1;
	nb = "";
	constructor(e) {
		super(e), c(Di), this.j = H(), new Ei(e, this, this.j);
		let t = new Y(e);
		this.$store.focused = t.focused.bind(t);
	}
	onAttach(e) {
		z(e, "role", "slider"), z(e, "tabindex", "0"), z(e, "aria-orientation", "horizontal"), z(e, "autocomplete", "off"), this.nb = e.getAttribute("aria-orientation") || "", this.pb || (g(this.qb.bind(this)), g(this.rb.bind(this))), g(this.sb.bind(this)), this.tb();
	}
	onConnect(e) {
		this.ub();
	}
	render() {
		let { trackClass: e, trackFillClass: t, trackProgressClass: n, thumbContainerClass: r, thumbClass: i } = this.$props;
		return [
			(() => {
				let [t, n] = D(Oi);
				return M(() => A(t, "class", e())), t;
			})(),
			(() => {
				let [e, n] = D(ki);
				return M(() => A(e, "class", t())), e;
			})(),
			(() => {
				let [e, t] = D(Ai);
				return M(() => A(e, "class", n())), e;
			})(),
			(() => {
				let [e, t] = D(ji), n = Qe(t);
				return M(() => A(e, "class", r())), M(() => A(n, "class", i())), e;
			})()
		];
	}
	vb() {
		return this.$props.step();
	}
	Fb() {
		return this.$props.keyStep();
	}
	Gb(e) {
		return Math.round(e);
	}
	mb() {
		return this.$props.disabled();
	}
	qb() {
		let { min: e, max: t } = this.$props;
		this.$store.min.set(e()), this.$store.max.set(t());
	}
	rb() {
		if (!this.mb()) return;
		let { dragging: e, pointing: t } = this.$store;
		e.set(!1), t.set(!1);
	}
	sb() {
		let { dragging: t, value: n, min: r, max: i } = this.$store;
		e(t) || n.set(Ci(r(), i(), n(), this.vb()));
	}
	wb() {
		return xe(this.mb());
	}
	xb() {
		return this.$props.min();
	}
	yb() {
		return this.$props.max();
	}
	zb() {
		let { value: e } = this.$store;
		return Math.round(e());
	}
	Ab() {
		let { value: e, max: t } = this.$store;
		return J(e() / t() * 100, 2) + "%";
	}
	tb() {
		let { disabled: e } = this.$props, { dragging: t, interactive: n, pointing: r } = this.$store;
		this.setAttributes({
			disabled: e,
			"data-dragging": t,
			"data-pointing": r,
			"data-interactive": n,
			"aria-disabled": this.wb.bind(this),
			"aria-valuemin": this.xb.bind(this),
			"aria-valuemax": this.yb.bind(this),
			"aria-valuenow": this.zb.bind(this),
			"aria-valuetext": this.Ab.bind(this),
			"data-styled": this.Bb.bind(this),
			"data-media-slider": !0
		}), g(this.Cb.bind(this));
	}
	Bb() {
		return !!this.$props.trackClass();
	}
	Cb() {
		let { fillPercent: e, pointerPercent: t } = this.$store;
		this.Db(J(e(), 3), J(t(), 3));
	}
	Db = De((e, t) => {
		this.el?.style.setProperty("--slider-fill-percent", e + "%"), this.el?.style.setProperty("--slider-pointer-percent", t + "%");
	});
	lb = null;
	ub() {
		this.lb = this.el.querySelector("[slot=\"preview\"]"), this.lb && (g(this.Eb.bind(this)), Promise.resolve().then(function() {
			return Ha;
		}).then(({ setupPreviewStyles: e }) => {
			e(this.lb, this.nb);
		}));
	}
	Eb() {
		if (this.mb() || !this.lb) return;
		window.requestAnimationFrame(this.ob);
		let e = new ResizeObserver(this.ob);
		return e.observe(this.lb), () => e.disconnect();
	}
	ob = De(() => {
		if (!this.lb) return;
		let e = this.lb.getBoundingClientRect();
		i(this.lb, "--computed-width", e.width + "px"), i(this.lb, "--computed-height", e.height + "px");
	});
	Hb(e) {}
	Ib(e) {}
	Jb(e) {}
	Kb(e) {}
}, Ni = /* @__PURE__ */ E("<!$><img part=\"img\" loading=\"eager\" decoding=\"async\" aria-hidden=\"true\" />"), Pi = class extends w {
	static el = P({
		tagName: "media-thumbnail",
		props: { time: 0 }
	});
	j;
	ke = null;
	me = null;
	ne = [];
	Pb = m("");
	oe = m(!1);
	pe = m(null);
	constructor(e) {
		super(e), this.j = H();
	}
	onAttach() {
		this.setAttributes({
			"data-loading": this.Tb.bind(this),
			"aria-hidden": Z(this.jb.bind(this))
		});
	}
	onConnect() {
		g(this.ge.bind(this)), g(this.se.bind(this)), g(this.te.bind(this));
	}
	ge() {
		this.Pb(), this.j.$store.thumbnails(), this.oe.set(!1);
	}
	ue() {
		this.oe.set(!0), this.qe();
	}
	Tb() {
		return !this.jb() && !this.oe();
	}
	jb() {
		let { duration: e, thumbnailCues: t } = this.j.$store;
		return !Number.isFinite(e()) || t().length === 0;
	}
	se() {
		let { time: e } = this.$props, { duration: t, thumbnailCues: n } = this.j.$store, r = n(), i = e();
		if (!r || !Number.isFinite(t())) {
			this.pe.set(null);
			return;
		}
		this.pe.set(Er(i, r));
	}
	ve(e) {
		this.ke = e;
	}
	te() {
		let t = this.pe(), n = e(this.j.$store.thumbnails);
		if (!n || !t) {
			this.Pb.set(""), this.re();
			return;
		}
		let [r, i = ""] = (t.text || "").split("#");
		if (this.me = this.we(i), !this.me) {
			this.re();
			return;
		}
		this.Pb.set(this.xe(n, r)), this.qe();
	}
	xe(e, t) {
		return /https?:/.test(t) ? t : `${e.split("/").slice(0, -1).join("/")}${t.replace(/^\/?/, "/")}`.replace(/^\/\//, "/");
	}
	we(e) {
		let [t, n] = e.split("="), r = {}, i = n?.split(",");
		if (!t || !n) return null;
		for (let e = 0; e < t.length; e++) r[t[e]] = +i[e];
		return r;
	}
	qe = De(this.ye.bind(this));
	ye() {
		if (!this.ke || !this.me || !this.el) return;
		let { w: e, h: t, x: n, y: r } = this.me, { maxWidth: i, maxHeight: a, minWidth: o, minHeight: s } = getComputedStyle(this.el), c = Math.max(parseInt(o) / e, parseInt(s) / t), l = Math.min(parseInt(i) / e, parseInt(a) / t), u = l < 1 ? l : c > 1 ? c : 1;
		this.le(this.el, "--thumbnail-width", `${e * u}px`), this.le(this.el, "--thumbnail-height", `${t * u}px`), this.le(this.ke, "width", `${this.ke.naturalWidth * u}px`), this.le(this.ke, "height", `${this.ke.naturalHeight * u}px`), this.le(this.ke, "transform", `translate(-${n * u}px, -${r * u}px)`);
	}
	le(e, t, n) {
		e.style.setProperty(t, n), this.ne.push(() => e.style.removeProperty(t));
	}
	re() {
		for (let e of this.ne) e();
		this.ne = [];
	}
	render() {
		let { crossorigin: e } = this.j.$store;
		return (() => {
			let [t, n] = D(Ni);
			return M(() => A(t, "src", this.Pb())), M(() => A(t, "crossorigin", e())), j(t, "load", this.ue.bind(this)), at(t, this.ve.bind(this)), t;
		})();
	}
}, Fi = /* @__PURE__ */ E("<!$><media-thumbnail part=\"thumbnail\" mk-d></media-thumbnail>");
(class extends w {
	static el = P({ tagName: "media-slider-thumbnail" });
	static register = [Pi];
	j;
	Lb;
	constructor(e) {
		super(e), this.j = H(), this.Lb = s(bi);
	}
	Mb() {
		let { duration: e } = this.j.$store;
		return this.Lb.pointerRate() * e();
	}
	render() {
		let e = this.Mb.bind(this);
		return (() => {
			let [t, n] = D(Fi);
			return M(() => A(t, "time", e())), et(t), t;
		})();
	}
});
var Ii = /* @__PURE__ */ E("<!$><video muted=\"\" playsinline=\"\" preload=\"auto\" part=\"video\" style=\"max-width: unset\"></video>");
(class extends w {
	static el = P({
		tagName: "media-slider-video",
		props: { src: void 0 }
	});
	j;
	Lb;
	qa = null;
	Nb = m(!1);
	Ob = m(!1);
	Pb;
	Qb;
	onAttach() {
		this.j = H(), this.Lb = s(bi), this.Pb = u(this.Sb.bind(this)), this.Qb = u(this.jb.bind(this)), this.setAttributes({
			"data-loading": this.Tb.bind(this),
			"aria-hidden": Z(this.Qb)
		}), g(this.Ub.bind(this)), g(this.Vb.bind(this));
	}
	onConnect() {
		this.qa.readyState >= 2 && this.Rb();
	}
	render() {
		let { crossorigin: e } = this.j.$store;
		return (() => {
			let [t, n] = D(Ii);
			return M(() => A(t, "src", this.Pb())), M(() => A(t, "crossorigin", e())), j(t, "canplay", this.Rb.bind(this)), j(t, "error", this.Wb.bind(this)), at(t, this.Xb.bind(this)), t;
		})();
	}
	Sb() {
		let { canLoad: e } = this.j.$store;
		return e() ? this.$props.src() : null;
	}
	Tb() {
		return !this.Nb() && !this.Qb();
	}
	jb() {
		let { duration: e } = this.j.$store;
		return !!this.Ob() || !this.Nb() || !Number.isFinite(e());
	}
	Ub() {
		this.Pb(), this.Nb.set(!1), this.Ob.set(!1);
	}
	Rb(e) {
		this.Nb.set(!0), this.dispatch("can-play", { trigger: e });
	}
	Wb(e) {
		this.Ob.set(!0), this.dispatch("error", { trigger: e });
	}
	Vb() {
		let { duration: e } = this.j.$store, { pointerRate: t } = this.Lb;
		this.Nb() && this.qa && Number.isFinite(e()) && Number.isFinite(t()) && (this.qa.currentTime = t() * e());
	}
	Xb(e) {
		this.qa = e;
	}
});
function Li(e, t) {
	let n = String(e), r = n.length;
	if (r < t) {
		let n = t - r;
		return `${"0".repeat(n)}${e}`;
	}
	return n;
}
function Ri(e) {
	return {
		hours: Math.trunc(e / 3600),
		minutes: Math.trunc(e % 3600 / 60),
		seconds: Math.trunc(e % 60),
		fraction: Number((e - Math.trunc(e)).toPrecision(3))
	};
}
function zi(e, t = !1, n = !1, r = !1) {
	let { hours: i, minutes: a, seconds: o } = Ri(e), s = t ? Li(i, 2) : i, c = n ? Li(a, 2) : a, l = Li(o, 2);
	return i > 0 || r ? `${s}:${c}:${l}` : `${c}:${l}`;
}
function Bi(e) {
	let t = [], { hours: n, minutes: r, seconds: i } = Ri(e);
	return n > 0 && t.push(`${n} hour`), r > 0 && t.push(`${r} min`), (i > 0 || t.length === 0) && t.push(`${i} sec`), t.join(" ");
}
var Vi = /* @__PURE__ */ E("<!$><span><!$></span>");
(class extends w {
	static el = P({
		tagName: "media-slider-value",
		props: {
			type: "current",
			format: void 0,
			showHours: !1,
			padHours: !1,
			padMinutes: !1,
			decimalPlaces: 2
		}
	});
	Yb;
	Zb;
	Lb;
	onAttach() {
		this.Lb = s(bi), this.Yb = p(Di), this.Zb = u(this._b.bind(this));
	}
	_b() {
		let { type: e, format: t, decimalPlaces: n, padHours: r, padMinutes: i, showHours: a } = this.$props, { value: o, pointerValue: s, min: c, max: l } = this.Lb, u = e() === "current" ? o() : s();
		if (t() === "percent") {
			let e = u / (l() - c()) * 100;
			return (this.Yb.percent ?? J)(e, n()) + "﹪";
		} else if (t() === "time") return (this.Yb.time ?? zi)(u, r(), i(), a());
		else return this.Yb.value?.(u) ?? u.toFixed(2);
	}
	render() {
		return (() => {
			let [e, t] = D(Vi);
			return O(t.nextNode(), this.Zb), e;
		})();
	}
});
var Hi = class extends Mi {
	static el = P({
		tagName: "media-volume-slider",
		props: {
			...Si,
			min: N({
				value: 0,
				attribute: !1
			}),
			max: N({
				value: 100,
				attribute: !1
			}),
			value: N({
				value: 100,
				attribute: !1
			})
		},
		store: bi
	});
	pb = !0;
	onAttach(e) {
		z(e, "aria-label", "Media volume"), super.onAttach(e), wn().then((t) => {
			t || a(e, "aria-hidden", "true");
		}), g(this.D.bind(this));
	}
	D() {
		let { muted: e, volume: t } = this.j.$store, n = e() ? 0 : t() * 100;
		this.$store.value.set(n), this.dispatch("value-change", { detail: n });
	}
	$b = fr(this.ac.bind(this), 25);
	ac(e) {
		if (!e.trigger) return;
		let t = J(e.detail / 100, 3);
		this.j.remote.changeVolume(t, e);
	}
	Hb(e) {
		this.$b(e);
	}
	Kb(e) {
		this.$b(e);
	}
	xb() {
		return 0;
	}
	yb() {
		return 100;
	}
}, Ui = class {
	Fg;
	Gg;
	Eg = /* @__PURE__ */ new Map();
	Hg = m([]);
	constructor(e) {
		this.Fg = e.firstChild, this.Gg = new MutationObserver(this.o.bind(this)), this.Gg.observe(this.Fg, {
			subtree: !0,
			childList: !0
		}), g(this.Ig.bind(this)), f(this.Jg.bind(this));
	}
	o(e) {
		let t = Array.from(this.Eg.keys()).join(",");
		for (let n of e) for (let e of n.addedNodes) ge(e) && e.matches(t) && this.uc();
	}
	dc(e, t) {
		return this.Eg.set(e, t), this.Hg.set((e) => [...e, t]), this;
	}
	uc = De(this.na.bind(this));
	na() {
		for (let [t, n] of this.Eg) {
			let r = e(n);
			for (let e of this.Fg.querySelectorAll(t)) a(e, "class", r);
		}
	}
	Ig() {
		for (let e of this.Hg()) e();
		this.uc();
	}
	Jg() {
		this.Hg.set([]), this.Eg.clear(), this.Gg.disconnect();
	}
}, Wi = /* @__PURE__ */ E("<div part=\"chapters\"></div>"), Gi = /* @__PURE__ */ E("<div part=\"chapter-container\"><div part=\"chapter\"><div part=\"track\"></div><div part=\"track track-fill\" style=\"width: 0%\"></div><div part=\"track track-progress\" style=\"width: 0%\"></div></div></div>"), Ki = class {
	constructor(e, t, n) {
		this.j = e, this.Lb = t, this.Hc = n;
	}
	Kg = [];
	Mg = [];
	Lg = 0;
	Ng = 0;
	render(e, t) {
		return e?.length ? ot(() => (() => {
			let n = tt(Wi);
			return M(() => A(n, "class", t())), rt(n, () => this.Sg(e)), n;
		})()) : null;
	}
	Sg(e) {
		this.Kg = this.Tg(e);
		let t = this.Kg[0];
		this.Hc(t.startTime === 0 ? t.text : "");
		for (let e = 0; e < this.Kg.length; e++) this.Mg.push(this.Ug());
		return this.Vg(), g(this.Wg.bind(this)), g(this.Xg.bind(this)), g(this.Yg.bind(this)), f(() => {
			this.Mg = [], this.Lg = 0, this.Ng = 0;
		}), this.Mg;
	}
	Ug() {
		return tt(Gi);
	}
	Pg(e) {
		return e.firstChild.firstChild.nextSibling;
	}
	Zg(e) {
		return e.firstChild.lastChild;
	}
	_g() {
		return this.Kg[this.Kg.length - 1].endTime;
	}
	Vg() {
		let e, t = this._g();
		for (let n = 0; n < this.Kg.length; n++) e = this.Kg[n], this.Mg[n].style.width = J((e.endTime - e.startTime) / t * 100, 3) + "%";
	}
	Wg() {
		let { fillPercent: t, value: n, pointing: r } = this.Lb, i = this.Kg[this.Lg], a = this.Qg(i.startTime <= e(n) ? this.Lg : 0, t());
		a > this.Lg ? this.Rg(this.Lg, a, "100%") : a < this.Lg && this.Rg(a + 1, this.Lg + 1, "0%"), !e(r) && this.Lg !== a && this.Hc(this.Kg[a].text);
		let o = this.Pg(this.Mg[a]), s = this.Og(this.Kg[a], t()) + "%";
		o.style.width !== s && (o.style.width = s), this.Lg = a;
	}
	Xg() {
		let { pointing: e, pointerPercent: t } = this.Lb;
		if (!e()) return;
		let n = this.Qg(0, t());
		this.Hc(this.Kg[n].text);
	}
	Rg(e, t, n) {
		for (let r = e; r < t; r++) this.Pg(this.Mg[r]).style.width = n;
	}
	Qg(e, t) {
		let n = 0;
		for (let r = e; r < this.Kg.length; r++) if (n = this.Og(this.Kg[r], t), n >= 0 && n < 100) return r;
		return 0;
	}
	Yg() {
		this.$g(this.ah());
	}
	$g = De((e) => {
		let t;
		for (let n = this.Ng; n < this.Mg.length; n++) if (t = this.Og(this.Kg[n], e), this.Zg(this.Mg[n]).style.width = t + "%", t < 100) {
			this.Ng = n;
			break;
		}
	});
	ah = u(this.bh.bind(this));
	bh() {
		let { bufferedEnd: e, duration: t } = this.j;
		return J(Math.min(e() / Math.max(t(), 1), 1), 3) * 100;
	}
	Og(e, t) {
		let n = this.Kg[this.Kg.length - 1], r = e.startTime / n.endTime * 100, i = e.endTime / n.endTime * 100;
		return Math.max(0, J(t >= i ? 100 : (t - r) / (i - r) * 100, 3));
	}
	Tg(e) {
		let t = [];
		for (let n = 0; n < e.length - 1; n++) {
			let r = e[n], i = e[n + 1];
			if (t.push(r), i) {
				let e = i.startTime - r.endTime;
				e > 0 && t.push(new window.VTTCue(r.endTime, r.endTime + e, ""));
			}
		}
		return t.push(e[e.length - 1]), t;
	}
}, qi = class extends Mi {
	static el = P({
		tagName: "media-time-slider",
		props: {
			...Si,
			min: N({
				value: 0,
				attribute: !1
			}),
			max: N({
				value: 100,
				attribute: !1
			}),
			value: N({
				value: 0,
				attribute: !1
			}),
			pauseWhileDragging: !1,
			seekingRequestThrottle: 100,
			chaptersClass: null,
			chapterContainerClass: null,
			chapterClass: null
		},
		store: bi
	});
	pb = !0;
	tc = !0;
	ec;
	ya = m(null);
	gc;
	hc;
	constructor(e) {
		super(e), c(Di, {
			value: this.jc.bind(this),
			time: this.kc.bind(this)
		});
	}
	onAttach(e) {
		z(e, "aria-label", "Media time"), super.onAttach(e), this.gc = new Ki(this.j.$store, this.$store, this.ic.set), this.setAttributes({ "data-chapters": this.lc.bind(this) }), this.setStyles({ "--media-buffered-percent": this.mc.bind(this) }), g(this.E.bind(this)), g(this.nc.bind(this)), g(this.oc.bind(this)), Nn(() => {
			g(this.pc.bind(this));
		});
	}
	mc() {
		let { bufferedEnd: e, duration: t } = this.j.$store;
		return J(Math.min(e() / Math.max(t(), 1), 1) * 100, 3) + "%";
	}
	lc() {
		let { duration: e } = this.j.$store;
		return this.hc?.uc(), this.ya()?.cues.length && Number.isFinite(e()) && e() > 0;
	}
	onConnect(e) {
		super.onConnect(e), this.Ra(), b(this.j.textTracks, "mode-change", this.Ra.bind(this));
		let { chapterContainerClass: t, chapterClass: n, trackClass: r, trackFillClass: i, trackProgressClass: a } = this.$props;
		this.hc = new Ui(e).dc("[part=\"chapter-container\"]", t).dc("[part=\"chapter\"]", n).dc("[part=\"track\"]", r).dc("[part~=\"track-fill\"]", i).dc("[part~=\"track-progress\"]", a);
	}
	render() {
		let e = super.render(), { chaptersClass: t } = this.$props;
		return [ct(() => this.gc.render(this.ya()?.cues, t)), e];
	}
	nc() {
		this.ec = fr(this.$a.bind(this), this.$props.seekingRequestThrottle());
	}
	E() {
		let { currentTime: t } = this.j.$store, { value: n, dragging: r } = this.$store, i = this.qc(t());
		e(r) || (n.set(i), this.dispatch("value-change", { detail: i }));
	}
	pc() {
		let e = this.j.player;
		e && this.lb && a(e, "data-preview", this.$store.interactive());
	}
	$a(e, t) {
		this.j.remote.seeking(e, t);
	}
	rc(e, t, n) {
		this.ec.cancel();
		let { live: r } = this.j.$store;
		if (r() && t >= 99) {
			this.j.remote.seekToLiveEdge(n);
			return;
		}
		this.j.remote.seek(e, n);
	}
	fc = !1;
	Ib(e) {
		let { pauseWhileDragging: t } = this.$props;
		if (t()) {
			let { paused: t } = this.j.$store;
			this.fc = !t(), this.j.remote.pause(e);
		}
	}
	Kb(e) {
		this.ec(this.bc(e.detail), e);
	}
	Jb(e) {
		let t = e.detail;
		this.rc(this.bc(t), t, e);
		let { pauseWhileDragging: n } = this.$props;
		n() && this.fc && (this.j.remote.play(e), this.fc = !1);
	}
	Hb(e) {
		let { dragging: t } = this.$store;
		t() || !e.trigger || this.Jb(e);
	}
	vb() {
		let e = this.$props.step() / this.j.$store.duration() * 100;
		return Number.isFinite(e) ? e : 1;
	}
	Fb() {
		let e = this.$props.keyStep() / this.j.$store.duration() * 100;
		return Number.isFinite(e) ? e : 1;
	}
	Gb(e) {
		return J(e, 3);
	}
	mb() {
		let { canSeek: e } = this.j.$store;
		return super.mb() || !e();
	}
	xb() {
		return 0;
	}
	yb() {
		return 100;
	}
	Ab() {
		let e = this.bc(this.$store.value()), { duration: t } = this.j.$store;
		return Number.isFinite(e) ? `${Bi(e)} out of ${Bi(t())}` : "live";
	}
	bc(e) {
		let { duration: t } = this.j.$store;
		return Math.round(e / 100 * t());
	}
	qc(e) {
		let { liveEdge: t, duration: n } = this.j.$store, r = Math.max(0, Math.min(1, t() ? 1 : Math.min(e, n()) / n()));
		return Number.isNaN(r) ? 0 : Number.isFinite(r) ? r * 100 : 100;
	}
	jc(e) {
		let t = this.bc(e), { live: n, duration: r } = this.j.$store;
		return Number.isFinite(t) ? (n() ? t - r() : t).toFixed(0) : "LIVE";
	}
	kc(e, t, n, r) {
		let i = this.bc(e), { live: a, duration: o } = this.j.$store, s = a() ? i - o() : i;
		return Number.isFinite(i) ? `${s < 0 ? "-" : ""}${zi(Math.abs(s), t, ee(n) ? Math.abs(s) >= 3600 : n, r)}` : "LIVE";
	}
	cc = null;
	ic = m("");
	Ra() {
		Or(this.j.textTracks, e(this.ya), this.ya.set);
	}
	oc() {
		if (this.ya(), this.cc = this.el?.querySelector("[part=\"chapter-title\"]") ?? null, this.cc) return g(this.sc.bind(this)), () => {
			this.cc.textContent = "", this.cc = null;
		};
	}
	sc() {
		this.cc.textContent = this.ic();
	}
}, Q = t(), Ji = /* @__PURE__ */ [
	"a[href]",
	"[tabindex]",
	"input",
	"select",
	"button"
].map((e) => `${e}:not([aria-hidden])`).join(","), Yi = /* @__PURE__ */ new Set([
	"Escape",
	"Tab",
	"ArrowUp",
	"ArrowDown",
	"Home",
	"PageUp",
	"End",
	"PageDown",
	"Enter",
	" "
]), Xi = class {
	constructor(e) {
		this.jg = e;
	}
	zd = 0;
	dh = null;
	ch = [];
	get a() {
		return this.ch;
	}
	hd(e) {
		b(e, "focus", this.Te.bind(this)), this.dh = e;
	}
	gd() {
		this.dh && (this.na(), b(this.dh, "keyup", this.Ya.bind(this)), b(this.dh, "keydown", this.Za.bind(this)), f(() => {
			this.zd = 0, this.ch = [];
		}));
	}
	na() {
		this.zd = 0, this.ch = this.hh();
	}
	kd(e = this.gh()) {
		let t = this.ch[e], n = this.jg.dd();
		t && n && requestAnimationFrame(() => {
			n.scrollTop = t.offsetTop - n.offsetHeight / 2 + t.offsetHeight / 2;
		});
	}
	eh(e) {
		this.zd = e, this.ch[e]?.focus(), this.kd(e);
	}
	gh() {
		return this.ch.findIndex((e) => e.getAttribute("aria-checked") === "true");
	}
	Te() {
		setTimeout(() => {
			let e = this.gh();
			this.eh(e >= 0 ? e : 0);
		}, 100);
	}
	Ya(e) {
		Yi.has(e.key) && (e.stopPropagation(), e.preventDefault());
	}
	Za(e) {
		if (Yi.has(e.key)) switch (e.stopPropagation(), e.preventDefault(), e.key) {
			case "Escape":
				this.jg.ed(e);
				break;
			case "Tab":
				this.eh(this.fh(e.shiftKey ? -1 : 1));
				break;
			case "ArrowUp":
				this.eh(this.fh(-1));
				break;
			case "ArrowDown":
				this.eh(this.fh(1));
				break;
			case "Home":
			case "PageUp":
				this.eh(0);
				break;
			case "End":
			case "PageDown":
				this.eh(this.ch.length - 1);
				break;
		}
	}
	fh(e) {
		let t = this.zd;
		do
			t = (t + e + this.ch.length) % this.ch.length;
		while (this.ch[t].offsetParent === null);
		return t;
	}
	hh() {
		if (!this.dh) return [];
		let e = this.dh.querySelectorAll(Ji), t = [], n = (e) => e.hasAttribute("data-media-menu-items");
		for (let r of e) r instanceof HTMLElement && r.offsetParent !== null && Mn(this.dh, r, n) && t.push(r);
		return t;
	}
}, Zi = Object.defineProperty, Qi = Object.getOwnPropertyDescriptor, $i = (e, t, n, r) => {
	for (var i = r > 1 ? void 0 : r ? Qi(t, n) : t, a = e.length - 1, o; a >= 0; a--) (o = e[a]) && (i = (r ? o(t, n, i) : o(i)) || i);
	return r && i && Zi(t, n, i), i;
}, ea = 0, ta = class extends w {
	static el = P({
		tagName: "media-menu",
		props: { position: null }
	});
	j;
	Bc;
	Cc;
	wc = m(!1);
	Ic = m(!1);
	Jc = m(!1);
	xc;
	yc = /* @__PURE__ */ new Set();
	Dc = null;
	vc = null;
	Ac = null;
	zc;
	constructor(e) {
		super(e), this.j = H();
		let t = ++ea;
		this.Bc = `media-menu-${t}`, this.Cc = `media-menu-button-${t}`, te(Q) && (this.xc = p(Q)), this.zc = new Xi({
			dd: this.Sc.bind(this),
			ed: this.close.bind(this)
		}), c(Q, {
			wc: this.wc,
			fd: m(""),
			Ec: this.Ec.bind(this),
			Kc: this.Kc.bind(this),
			Lc: this.Lc.bind(this),
			Mc: this.Mc.bind(this),
			Nc: this.Nc.bind(this),
			Fc: this.Fc.bind(this)
		});
	}
	onAttach(e) {
		let { position: t } = this.$props;
		this.setAttributes({
			position: t,
			"data-open": this.wc,
			"data-submenu": !!this.xc,
			"data-disabled": this.mb.bind(this),
			"data-media-menu": !0
		});
	}
	onConnect(e) {
		this.xc || g(this.Oc.bind(this)), g(this.Tc.bind(this)), this.xc?.Fc(e), requestAnimationFrame(() => this.n());
	}
	onDestroy() {
		this.Pc(), this.Dc = null, this.vc = null, this.Ac = null;
	}
	Pc() {
		if (!this.vc || this.el?.contains(this.vc)) return;
		let e = this.vc?.parentElement;
		this.el.append(this.vc), e?.localName === "media-menu" && (e.destroy(), e.remove());
	}
	Oc() {
		if (!this.el) return;
		let { breakpointX: e, breakpointY: t, viewType: n, orientation: r, fullscreen: o } = this.j.$store, s = n() === "audio" ? e() === "sm" : t() === "sm";
		if (!(!this.vc || this.xc)) {
			if (a(this.el, "data-popup", s), a(this.el, "data-popup-wide", s && r() === "landscape"), s && !o() && this.el.contains?.(this.vc)) {
				let e = this.el.cloneNode();
				e.appendChild(this.vc), requestAnimationFrame(() => {
					if (!this.el) return;
					let t = "--media-focus-ring", n = getComputedStyle(this.el).getPropertyValue(t);
					n && i(e, t, n);
				}), v(() => {
					document.body.append(e);
				}, this.j.scope);
			}
			return this.n(), () => this.Pc();
		}
	}
	Tc() {
		let e = this.Qc();
		if (this.n(), this.Rc(e), !e) return;
		this.zc.gd();
		let t = this.Uc();
		t && V(t, this.Vc.bind(this)), this.listen("pointerup", this.Wc.bind(this)), b(window, "pointerup", this.Xc.bind(this));
	}
	Kc(e) {
		let t = !!this.xc, n = this.Qc.bind(this), r = Z(n), i = Z(this.mb.bind(this));
		z(e, "tabindex", t ? "-1" : "0"), z(e, "role", t ? "menuitem" : "button"), a(e, "id", this.Cc), a(e, "aria-controls", this.Bc), a(e, "aria-haspopup", "true"), g(() => {
			a(e, "aria-disabled", i()), a(e, "aria-expanded", r()), t || a(e, "aria-pressed", r()), a(e, "data-pressed", n());
		}), a(e, "data-media-button", !t), a(e, "data-media-menu-button", ""), V(e, this.Yc.bind(this)), this.Dc = e;
	}
	Lc(t) {
		z(t, "role", "menu"), z(t, "tabindex", "-1"), a(t, "id", this.Bc), a(t, "aria-describedby", this.Cc), a(t, "data-media-menu-items", ""), this.vc = t, this.zc.hd(t), this.Oc(), this.Rc(e(this.wc));
	}
	Mc(e) {
		this.Ac = e;
	}
	Rc(e) {
		this.vc && a(this.vc, "aria-hidden", xe(!e));
	}
	Nc(e) {
		this.Jc.set(e);
	}
	Yc(e) {
		this.xc && e.stopPropagation(), !this.mb() && (this.wc.set((e) => !e), this.Gc(), _(), x(e) && this.vc?.focus(), this.Hc(e));
	}
	Hc(t) {
		let n = e(this.wc);
		this.dispatch(n ? "open" : "close", { trigger: t }), n ? (this.xc || (this.j.activeMenu?.close(t), this.j.activeMenu = this), this.Ac?.id?.(t)) : (this.xc || (setTimeout(() => {
			for (let e of this.yc) e.close(t);
		}, 300), this.j.activeMenu = null), this.Ac?.jd?.(t)), n && !x(t) && requestAnimationFrame(() => {
			this.zc.na(), setTimeout(() => {
				this.zc.kd();
			}, 100);
		});
	}
	Qc() {
		return !this.mb() && this.wc();
	}
	mb() {
		return this.Ic() || this.Jc();
	}
	ld = this.Ec.bind(this);
	Ec(e) {
		this.Ic.set(e);
	}
	Wc(e) {
		e.stopPropagation();
	}
	Xc() {
		if (this.xc) return setTimeout(this.close.bind(this), 800);
		this.close();
	}
	Vc(e) {
		e.stopPropagation(), this.close(e);
	}
	Uc() {
		let e = this.el.querySelector("[slot=\"close-target\"]");
		return Mn(this.el, e) ? e : null;
	}
	Sc() {
		if (this.xc) {
			let e = this.el;
			for (; e && e.tagName !== "media-menu" && e.hasAttribute("data-submenu");) e = e.parentNode;
			return e;
		} else return this.vc;
	}
	Gc(e) {
		this.xc || (this.wc() ? this.j.remote.pauseUserIdle(e) : this.j.remote.resumeUserIdle(e));
	}
	Fc(e) {
		this.yc.add(e), b(e, "open", this.Zc), b(e, "close", this._c), f(this.$c);
	}
	$c = this.ad.bind(this);
	ad(e) {
		this.yc.delete(e);
	}
	Zc = this.bd.bind(this);
	bd(e) {
		for (let t of this.yc) t !== e.target && t.setAttribute("aria-hidden", "true");
		this.n();
	}
	_c = this.cd.bind(this);
	cd() {
		for (let e of this.yc) e.removeAttribute("aria-hidden");
		this.n();
	}
	n() {
		if (!this.vc) return;
		let e = getComputedStyle(this.vc), t = parseFloat(e.paddingTop) + parseFloat(e.paddingBottom), n = [...this.vc.children];
		n[0]?.localName === "shadow-root" && n.push(...n[0].children);
		for (let e of n) t += e.offsetHeight;
		requestAnimationFrame(() => {
			this.vc && (a(this.vc, "data-resizing", ""), setTimeout(() => {
				this.vc && a(this.vc, "data-resizing", !1);
			}, 250), i(this.vc, "--menu-height", t + "px"));
		});
	}
	open(t) {
		e(this.wc) || (this.wc.set(!0), _(), this.Hc(t), x(t) && this.vc?.focus(), this.Gc(t));
	}
	close(t) {
		e(this.wc) && (this.wc.set(!1), _(), x(t) && requestAnimationFrame(() => {
			this.Dc?.focus();
		}), this.Hc(t), this.Gc(t));
	}
};
$i([Mt], ta.prototype, "open", 1), $i([Mt], ta.prototype, "close", 1);
var na = class extends w {
	static el = P({
		tagName: "media-menu-button",
		props: { disabled: !1 }
	});
	md;
	constructor(e) {
		super(e), this.md = p(Q), new Y(e), new Xr(e);
	}
	onAttach(e) {
		this.md.Kc(e), g(this.rb.bind(this));
	}
	onConnect(e) {
		let t = Array.from(e.querySelectorAll("[slot=\"hint\"]")).pop();
		t && g(() => {
			let e = this.md.fd();
			e && (t.textContent = e);
		});
	}
	rb() {
		this.md.Nc(this.$props.disabled());
	}
}, ra = class extends w {
	static el = P({ tagName: "media-menu-items" });
	md;
	constructor(e) {
		super(e), this.md = p(Q), new Y(e);
	}
	onAttach(e) {
		this.md.Lc(e);
	}
}, ia = t(), aa = Object.defineProperty, oa = Object.getOwnPropertyDescriptor, sa = (e, t, n, r) => {
	for (var i = r > 1 ? void 0 : r ? oa(t, n) : t, a = e.length - 1, o; a >= 0; a--) (o = e[a]) && (i = (r ? o(t, n, i) : o(i)) || i);
	return r && i && aa(t, n, i), i;
}, $ = class extends w {
	static el = P({
		tagName: "media-radio-group",
		props: { value: "" }
	});
	td = /* @__PURE__ */ new Set();
	sd = m("");
	get values() {
		return Array.from(this.td).map((e) => e.sd());
	}
	get value() {
		return this.sd();
	}
	set value(e) {
		this.Hc(e);
	}
	constructor(e) {
		super(e), c(ia, {
			add: this.wd.bind(this),
			remove: this.xd.bind(this)
		});
	}
	onAttach(e) {
		te(Q) || z(e, "role", "radiogroup"), this.ud(), this.setAttributes({ value: this.sd });
	}
	onConnect() {
		g(this.ud.bind(this));
	}
	onDestroy() {
		this.td.clear();
	}
	wd(e) {
		this.td.has(e) || (this.td.add(e), e.qd = this.yd, e.pd(e.sd() === this.sd()));
	}
	xd(e) {
		e.qd = null, this.td.delete(e);
	}
	ud() {
		this.Hc(this.$props.value());
	}
	yd = this.Hc.bind(this);
	Hc(t, n) {
		let r = e(this.sd);
		if (!t || t === r) return;
		let i = this.vd(r), a = this.vd(t);
		i?.pd(!1, n), a?.pd(!0, n), this.sd.set(t), this.dispatch("change", { trigger: n });
	}
	vd(t) {
		for (let n of this.td) if (t === e(n.sd)) return n;
		return null;
	}
};
sa([jt], $.prototype, "values", 1), sa([jt], $.prototype, "value", 1);
var ca = Object.defineProperty, la = Object.getOwnPropertyDescriptor, ua = (e, t, n, r) => {
	for (var i = r > 1 ? void 0 : r ? la(t, n) : t, a = e.length - 1, o; a >= 0; a--) (o = e[a]) && (i = (r ? o(t, n, i) : o(i)) || i);
	return r && i && ca(t, n, i), i;
}, da = /* @__PURE__ */ E("<!$><div part=\"check\"></div>"), fa = class extends w {
	static el = P({
		tagName: "media-radio",
		props: { value: "" }
	});
	nd = m(!1);
	od = {
		sd: this.$props.value,
		pd: this.pd.bind(this),
		qd: null
	};
	get checked() {
		return this.nd();
	}
	constructor(e) {
		super(e), new Y(e);
	}
	onAttach() {
		g(this.sb.bind(this)), this.rd();
		let e = te(Q);
		this.setAttributes({
			value: this.$props.value,
			role: e ? "menuitemradio" : "radio",
			tabindex: e ? -1 : 0,
			"aria-checked": Z(this.nd)
		});
	}
	onConnect(e) {
		this.rd(), V(e, this.gb.bind(this));
	}
	onDisconnect() {
		p(ia).remove(this.od);
	}
	rd() {
		p(ia).add(this.od);
	}
	sb() {
		let { value: t } = this.$props, n = t();
		e(this.nd) && this.od.qd?.(n);
	}
	gb(t) {
		e(this.nd) || (this.nd.set(!0), this.dispatch("change", { trigger: t }), this.od.qd?.(e(this.$props.value), t));
	}
	pd(t, n) {
		e(this.nd) !== t && (this.nd.set(t), this.dispatch("change", { trigger: n }));
	}
	render() {
		return Ze(da);
	}
};
ua([jt], fa.prototype, "checked", 1);
var pa = /* @__PURE__ */ E("<!$><media-radio-group mk-d><!$></media-radio-group>"), ma = /* @__PURE__ */ E("<!$><media-radio mk-d><!$></media-radio>");
function ha(e) {
	let { value: t, onChange: n, radioGroupClass: r } = e;
	return (() => {
		let [i, a] = D(pa), o = a.nextNode();
		return M(() => A(i, "class", r())), j(i, "change", n), st(() => {
			O(o, () => ga(e));
		}, et(i, { value: t })), i;
	})();
}
function ga(e) {
	let { options: t } = e;
	return t().map((t) => (() => {
		let [n, r] = D(ma), i = r.nextNode();
		return A(n, "part", e.part), st(() => {
			O(i, t.content);
		}, et(n, { value: t.value })), n;
	})());
}
var _a = /* @__PURE__ */ E("<!$><media-thumbnail part=\"thumbnail\" mk-d></media-thumbnail>"), va = /* @__PURE__ */ E("<!$><div part=\"content\"><div part=\"title\"><!$></div><div part=\"start-time\"><!$></div><div part=\"duration\"><!$></div></div>");
(class extends ra {
	static el = P({
		tagName: "media-chapters-menu-items",
		props: {
			containerClass: null,
			chapterClass: null,
			thumbnailClass: null,
			contentClass: null,
			titleClass: null,
			startTimeClass: null,
			durationClass: null
		}
	});
	static register = [
		Pi,
		$,
		fa
	];
	j;
	zd = m(0);
	ya = m(null);
	constructor(e) {
		super(e), this.j = H();
	}
	onAttach(e) {
		super.onAttach(e), this.md.Mc({ id: this.id.bind(this) }), this.setAttributes({ "data-thumbnails": this.Ad.bind(this) });
	}
	id() {
		e(() => this.E());
	}
	onConnect(e) {
		g(this.E.bind(this)), g(this.Bd.bind(this)), this.Ra(), b(this.j.textTracks, "mode-change", this.Ra.bind(this));
		let { chapterClass: t, thumbnailClass: n, contentClass: r, titleClass: i, startTimeClass: a, durationClass: o } = this.$props;
		new Ui(e).dc("[part=\"chapter\"]", t).dc("[part=\"thumbnail\"]", n).dc("[part=\"content\"]", r).dc("[part=\"title\"]", i).dc("[part=\"start-time\"]", a).dc("[part=\"duration\"]", o);
	}
	Ad() {
		let { thumbnailCues: e } = this.j.$store;
		return e().length > 0;
	}
	E() {
		if (!this.md.wc()) return;
		let e = this.ya();
		if (!e) {
			this.zd.set(-1);
			return;
		}
		let { currentTime: t } = this.j.$store, n = t(), r = e.cues.findIndex((e) => Dr(e, n));
		if (this.zd.set(r), r >= 0) {
			let t = e.cues[r], a = this.el.querySelector("shadow-root media-radio[aria-checked='true']"), o = (n - t.startTime) / (t.endTime - t.startTime) * 100;
			a && i(a, "--played-percent", J(o, 3) + "%");
		}
	}
	Bd() {
		this.md.Ec(this.mb());
	}
	mb() {
		let e = this.ya();
		return !e || !e.cues.length;
	}
	Hc(e) {
		if (this.mb() || !e.trigger) return;
		let t = +e.target.value, n = this.ya()?.cues;
		re(t) && n?.[t] && (this.zd.set(t), this.j.remote.seek(n[t].startTime, e));
	}
	Ra() {
		Or(this.j.textTracks, e(this.ya), this.ya.set);
	}
	Cd() {
		return this.zd() + "";
	}
	Dd() {
		let e = this.ya();
		return e ? e.cues.map((e, t) => ({
			value: t + "",
			content: () => [(() => {
				let t = ct(() => this.Ad() && (() => {
					let [t, n] = D(_a);
					return et(t, { time: e.startTime }), t;
				})());
				return t(), t;
			})(), (() => {
				let [t, n] = D(va), r = n.nextNode(), i = n.nextNode(), a = n.nextNode();
				return O(r, e.text), O(i, () => zi(e.startTime, !1, e.startTime >= 3600)), O(a, () => Bi(e.endTime - e.startTime)), t;
			})()]
		})) : [];
	}
	render() {
		let { containerClass: e } = this.$props;
		return ha({
			part: "chapter",
			value: this.Cd.bind(this),
			options: this.Dd.bind(this),
			radioGroupClass: e,
			onChange: this.Hc.bind(this)
		});
	}
});
var ya = /* @__PURE__ */ E("<!$><span part=\"label\"><!$></span>");
(class extends ra {
	static el = P({
		tagName: "media-audio-menu-items",
		props: {
			emptyLabel: "Default",
			radioClass: null,
			radioGroupClass: null,
			radioCheckClass: null
		}
	});
	static register = [$, fa];
	j;
	constructor(e) {
		super(e), this.j = H();
	}
	onConnect(e) {
		g(this.Bd.bind(this)), g(this.Ed.bind(this));
		let { radioClass: t, radioCheckClass: n } = this.$props;
		new Ui(e).dc("media-radio", t).dc("[part=\"check\"]", n);
	}
	Ed() {
		let { emptyLabel: e } = this.$props, { audioTrack: t } = this.j.$store, n = t();
		this.md.fd.set(n?.label ?? e());
	}
	Bd() {
		this.md.Ec(this.mb());
	}
	mb() {
		let { audioTracks: e } = this.j.$store;
		return e().length === 0;
	}
	Hc(e) {
		if (this.mb()) return;
		let t = e.target.value, n = this.j.audioTracks.toArray().findIndex((e) => e.label.toLowerCase() === t);
		n >= 0 && this.j.remote.changeAudioTrack(n, e);
	}
	Cd() {
		let { audioTrack: e } = this.j.$store, t = e();
		return t ? t.label.toLowerCase() : "";
	}
	Dd() {
		let { audioTracks: e } = this.j.$store;
		return e().map((e) => ({
			value: e.label.toLowerCase(),
			content: () => (() => {
				let [t, n] = D(ya);
				return O(n.nextNode(), e.label), t;
			})()
		}));
	}
	render() {
		let { radioGroupClass: e } = this.$props;
		return ha({
			value: this.Cd.bind(this),
			options: this.Dd.bind(this),
			radioGroupClass: e,
			onChange: this.Hc.bind(this)
		});
	}
});
var ba = "<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M26.6667 5.99998C26.6667 5.63179 26.3682 5.33331 26 5.33331H11.3333C10.9651 5.33331 10.6667 5.63179 10.6667 5.99998V17.5714C10.6667 17.6694 10.5644 17.7342 10.4741 17.6962C9.91823 17.4625 9.30754 17.3333 8.66667 17.3333C6.08934 17.3333 4 19.4226 4 22C4 24.5773 6.08934 26.6666 8.66667 26.6666C11.244 26.6666 13.3333 24.5773 13.3333 22V8.66665C13.3333 8.29846 13.6318 7.99998 14 7.99998L23.3333 7.99998C23.7015 7.99998 24 8.29846 24 8.66665V14.9048C24 15.0027 23.8978 15.0675 23.8075 15.0296C23.2516 14.7958 22.6409 14.6666 22 14.6666C19.4227 14.6666 17.3333 16.756 17.3333 19.3333C17.3333 21.9106 19.4227 24 22 24C24.5773 24 26.6667 21.9106 26.6667 19.3333V5.99998ZM22 21.3333C23.1046 21.3333 24 20.4379 24 19.3333C24 18.2287 23.1046 17.3333 22 17.3333C20.8954 17.3333 20 18.2287 20 19.3333C20 20.4379 20.8954 21.3333 22 21.3333ZM8.66667 24C9.77124 24 10.6667 23.1045 10.6667 22C10.6667 20.8954 9.77124 20 8.66667 20C7.5621 20 6.66667 20.8954 6.66667 22C6.66667 23.1045 7.5621 24 8.66667 24Z\" fill=\"currentColor\"/>", xa = "<path d=\"M13.0908 14.3334C12.972 14.3334 12.9125 14.1898 12.9965 14.1058L17.7021 9.40022C17.9625 9.13987 17.9625 8.71776 17.7021 8.45741L16.2879 7.04319C16.0275 6.78284 15.6054 6.78284 15.3451 7.04319L6.8598 15.5285C6.59945 15.7888 6.59945 16.2109 6.8598 16.4713L8.27401 17.8855L8.27536 17.8868L15.3453 24.9568C15.6057 25.2172 16.0278 25.2172 16.2881 24.9568L17.7024 23.5426C17.9627 23.2822 17.9627 22.8601 17.7024 22.5998L12.9969 17.8944C12.9129 17.8104 12.9724 17.6668 13.0912 17.6668L26 17.6668C26.3682 17.6668 26.6667 17.3683 26.6667 17.0001V15.0001C26.6667 14.6319 26.3682 14.3334 26 14.3334L13.0908 14.3334Z\" fill=\"currentColor\"/>", Sa = "<path d=\"M15.905 17.4809C15.9571 17.533 16.0415 17.533 16.0936 17.4809L22.4111 11.1635C22.6714 10.9031 23.0935 10.9031 23.3539 11.1635L24.9567 12.7662C25.217 13.0266 25.217 13.4487 24.9567 13.709L18.1028 20.5629C18.0937 20.5732 18.0842 20.5833 18.0744 20.5931L16.4716 22.1959C16.2113 22.4562 15.7892 22.4562 15.5288 22.1959L7.04353 13.7106C6.78318 13.4503 6.78318 13.0281 7.04353 12.7678L8.6463 11.165C8.90665 10.9047 9.32876 10.9047 9.58911 11.165L15.905 17.4809Z\" fill=\"currentColor\"/>", Ca = /* @__PURE__ */ E("<!$><span slot=\"label\"><!$></span>"), wa = /* @__PURE__ */ E("<!$><div slot=\"hint\"></div>");
function Ta({ label: e, iconPaths: t }) {
	return [
		k(q, {
			slot: "close-icon",
			paths: xa
		}),
		k(q, {
			slot: "icon",
			paths: t
		}),
		(() => {
			let [t, n] = D(Ca);
			return O(n.nextNode(), e), t;
		})(),
		Ze(wa),
		k(q, {
			slot: "open-icon",
			paths: Sa
		})
	];
}
(class extends na {
	static el = P({
		tagName: "media-audio-menu-button",
		props: {
			disabled: !1,
			label: "Audio"
		}
	});
	render() {
		let { label: e } = this.$props;
		return Ta({
			label: e,
			iconPaths: ba
		});
	}
});
var Ea = /* @__PURE__ */ E("<!$><span part=\"label\"><!$></span>"), Da = Ea;
(class extends ra {
	static el = P({
		tagName: "media-captions-menu-items",
		props: {
			offLabel: "Off",
			radioClass: null,
			radioGroupClass: null,
			radioCheckClass: null
		}
	});
	static register = [$, fa];
	j;
	constructor(e) {
		super(e), this.j = H();
	}
	onConnect(e) {
		g(this.Bd.bind(this)), g(this.Ed.bind(this));
		let { radioClass: t, radioCheckClass: n } = this.$props;
		new Ui(e).dc("media-radio", t).dc("[part=\"check\"]", n);
	}
	Ed() {
		let { offLabel: e } = this.$props, { textTrack: t } = this.j.$store, n = t();
		this.md.fd.set(n && K(n) && n.mode === "showing" ? n.label : e());
	}
	Bd() {
		this.md.Ec(this.mb());
	}
	mb() {
		let { textTracks: e } = this.j.$store;
		return e().filter(K).length === 0;
	}
	Hc(e) {
		if (this.mb()) return;
		let t = e.target.value;
		if (t === "off") {
			let t = this.j.textTracks.selected;
			if (t) {
				let n = this.j.textTracks.toArray().indexOf(t);
				this.j.remote.changeTextTrackMode(n, "disabled", e);
			}
			return;
		}
		let n = this.j.textTracks.toArray().findIndex((e) => e.label.toLowerCase() === t);
		n >= 0 && this.j.remote.changeTextTrackMode(n, "showing", e);
	}
	Cd() {
		let { textTrack: e, textTracks: t } = this.j.$store, n = e();
		return n && K(n) && n.mode === "showing" ? n.label.toLowerCase() : "off";
	}
	Dd() {
		let { offLabel: e } = this.$props, { textTracks: t } = this.j.$store;
		return [{
			value: "off",
			content: () => (() => {
				let [t, n] = D(Ea);
				return O(n.nextNode(), e), t;
			})()
		}, ...t().filter(K).map((e) => ({
			value: e.label.toLowerCase(),
			content: () => (() => {
				let [t, n] = D(Da);
				return O(n.nextNode(), e.label), t;
			})()
		}))];
	}
	render() {
		let { radioGroupClass: e } = this.$props;
		return ha({
			value: this.Cd.bind(this),
			options: this.Dd.bind(this),
			radioGroupClass: e,
			onChange: this.Hc.bind(this)
		});
	}
}), class extends na {
	static el = P({
		tagName: "media-captions-menu-button",
		props: {
			disabled: !1,
			label: "Captions"
		}
	});
	render() {
		let { label: e } = this.$props;
		return Ta({
			label: e,
			iconPaths: oi
		});
	}
};
var Oa = /* @__PURE__ */ E("<!$><span part=\"label\"><!$></span>");
(class extends ra {
	static el = P({
		tagName: "media-playback-rate-menu-items",
		props: {
			normalLabel: "Normal",
			rates: [
				.25,
				.5,
				.75,
				1,
				1.25,
				1.5,
				1.75,
				2
			],
			radioGroupClass: null,
			radioClass: null,
			radioCheckClass: null
		}
	});
	static register = [$, fa];
	j;
	constructor(e) {
		super(e), this.j = H();
	}
	onConnect(e) {
		g(this.Ed.bind(this));
		let { radioClass: t, radioCheckClass: n } = this.$props;
		new Ui(e).dc("media-radio", t).dc("[part=\"check\"]", n);
	}
	Ed() {
		let { normalLabel: e } = this.$props, { playbackRate: t } = this.j.$store, n = t();
		this.md.fd.set(n === 1 ? e() : n + "×");
	}
	Hc(e) {
		let t = e.target;
		this.j.remote.changePlaybackRate(+t.value, e);
	}
	Cd() {
		let { playbackRate: e } = this.j.$store;
		return e() + "";
	}
	Dd() {
		let { rates: e, normalLabel: t } = this.$props;
		return e().map((e) => ({
			value: e + "",
			content: () => (() => {
				let [n, r] = D(Oa);
				return O(r.nextNode(), () => e === 1 ? t() : e + "×"), n;
			})()
		}));
	}
	render() {
		let { radioGroupClass: e } = this.$props;
		return ha({
			value: this.Cd.bind(this),
			options: this.Dd.bind(this),
			radioGroupClass: e,
			onChange: this.Hc.bind(this)
		});
	}
});
var ka = "<path d=\"M25.14 25.1089C25.0171 25.2532 24.8356 25.3333 24.646 25.3333H22.8124C22.1084 25.3333 21.7734 24.1872 22.2745 23.6927C23.9161 22.0729 24.9336 19.822 24.9336 17.3333C24.9336 12.3997 20.9336 8.39973 16 8.39973C11.0664 8.39973 7.06641 12.3997 7.06641 17.3333C7.06641 19.822 8.08389 22.0729 9.72555 23.6927C10.2266 24.1872 9.89155 25.3333 9.18762 25.3333H7.35398C7.16436 25.3333 6.98294 25.2532 6.86001 25.1089C5.07703 23.015 4 20.2991 4 17.3333C4 10.7057 9.3724 5.33333 16 5.33333C22.6276 5.33333 28 10.7057 28 17.3333C28 20.2991 26.923 23.015 25.14 25.1089Z\" fill=\"currentColor\"/> <path d=\"M21.1992 14.3399C21.4595 14.0796 21.4595 13.6575 21.1992 13.3971L20.2564 12.4543C19.996 12.194 19.5739 12.194 19.3136 12.4543L16.4492 15.3187C16.4185 15.3493 16.3749 15.3629 16.332 15.3568C16.2236 15.3414 16.1127 15.3334 16 15.3334C14.7113 15.3334 13.6667 16.378 13.6667 17.6667C13.6667 18.9554 14.7113 20 16 20C17.2887 20 18.3333 18.9554 18.3333 17.6667C18.3333 17.5464 18.3242 17.4283 18.3067 17.313C18.3001 17.2696 18.3136 17.2255 18.3446 17.1945L21.1992 14.3399Z\" fill=\"currentColor\"/>";
(class extends na {
	static el = P({
		tagName: "media-playback-rate-menu-button",
		props: {
			disabled: !1,
			label: "Speed"
		}
	});
	render() {
		let { label: e } = this.$props;
		return Ta({
			label: e,
			iconPaths: ka
		});
	}
});
var Aa = /* @__PURE__ */ E("<!$><span><!$></span>"), ja = /* @__PURE__ */ E("<!$><span part=\"label\"><!$></span>"), Ma = /* @__PURE__ */ E("<!$><span part=\"info\"><!$></span>");
(class extends ra {
	static el = P({
		tagName: "media-quality-menu-items",
		props: {
			autoLabel: "Auto",
			hideBitrate: !1,
			radioGroupClass: null,
			radioClass: null,
			radioCheckClass: null
		}
	});
	static register = [$, fa];
	j;
	Gd = u(() => {
		let { qualities: e } = this.j.$store;
		return [...e()].sort((e, t) => t.height === e.height ? t.bitrate - e.bitrate : t.height - e.height);
	});
	constructor(e) {
		super(e), this.j = H();
	}
	onConnect(e) {
		g(this.Bd.bind(this)), g(this.Ed.bind(this));
		let { radioClass: t, radioCheckClass: n } = this.$props;
		new Ui(e).dc("media-radio", t).dc("[part=\"check\"]", n);
	}
	Ed() {
		let { autoLabel: e } = this.$props, { autoQuality: t, quality: n } = this.j.$store, r = n() ? n().height + "p" : "";
		this.md.fd.set(t() ? e() + ` (${r})` : r);
	}
	Bd() {
		let { qualities: e } = this.j.$store;
		this.md.Ec(e().length === 0);
	}
	mb() {
		let { canSetQuality: e, qualities: t } = this.j.$store;
		return !e() || t().length === 0;
	}
	Hc(t) {
		if (this.mb()) return;
		let n = t.target.value;
		if (n === "auto") {
			this.j.remote.changeQuality(-1, t);
			return;
		}
		let { qualities: r } = this.j.$store, i = e(r).findIndex((e) => this.Fd(e) === n);
		i >= 0 && this.j.remote.changeQuality(i, t);
	}
	Cd() {
		let { quality: e, autoQuality: t } = this.j.$store;
		if (t()) return "auto";
		let n = e();
		return n ? this.Fd(n) : "auto";
	}
	Fd(e) {
		return e.height + "_" + e.bitrate;
	}
	Dd() {
		let { autoLabel: e, hideBitrate: t } = this.$props;
		return [{
			value: "auto",
			content: () => (() => {
				let [t, n] = D(Aa);
				return O(n.nextNode(), e), t;
			})()
		}, ...this.Gd().map((e) => {
			let n = `${J(e.bitrate / 1e6, 2)} Mbps`;
			return {
				value: this.Fd(e),
				content: () => [(() => {
					let [t, n] = D(ja);
					return O(n.nextNode(), e.height + "p"), t;
				})(), (() => {
					let e = ct(() => !t() && (() => {
						let [e, t] = D(Ma);
						return O(t.nextNode(), n), e;
					})());
					return e(), e;
				})()]
			};
		})];
	}
	render() {
		let { radioGroupClass: e } = this.$props;
		return ha({
			value: this.Cd.bind(this),
			options: this.Dd.bind(this),
			radioGroupClass: e,
			onChange: this.Hc.bind(this)
		});
	}
});
var Na = "<path d=\"M18.6669 10.4001C18.6669 10.7683 18.3684 11.0667 18.0002 11.0667H16.2668C15.8987 11.0667 15.6002 10.7683 15.6002 10.4001V9.86674C15.6002 9.7931 15.5405 9.73341 15.4669 9.73341H5.99998C5.63179 9.73341 5.33331 9.43493 5.33331 9.06674V7.33341C5.33331 6.96522 5.63179 6.66674 5.99998 6.66674H15.4669C15.5405 6.66674 15.6002 6.60704 15.6002 6.53341V6.00007C15.6002 5.63188 15.8987 5.3334 16.2668 5.3334H18.0002C18.3684 5.3334 18.6669 5.63188 18.6669 6.00007V10.4001Z\" fill=\"currentColor\"/> <path d=\"M11.3334 18.8668C11.7016 18.8668 12.0001 18.5683 12.0001 18.2001V13.8001C12.0001 13.4319 11.7016 13.1335 11.3334 13.1335H9.60006C9.23187 13.1335 8.93339 13.4319 8.93339 13.8001V14.3335C8.93339 14.4071 8.8737 14.4668 8.80006 14.4668H6.00006C5.63187 14.4668 5.33339 14.7653 5.33339 15.1335V16.8668C5.33339 17.235 5.63187 17.5335 6.00006 17.5335H8.80006C8.8737 17.5335 8.93339 17.5932 8.93339 17.6668V18.2001C8.93339 18.5683 9.23187 18.8668 9.60006 18.8668H11.3334Z\" fill=\"currentColor\"/> <path d=\"M18.6667 26.0001C18.6667 26.3683 18.3682 26.6668 18 26.6668H16.2667C15.8985 26.6668 15.6 26.3683 15.6 26.0001V25.4668C15.6 25.3931 15.5403 25.3334 15.4667 25.3334H6.00014C5.63195 25.3334 5.33348 25.0349 5.33348 24.6668V22.9334C5.33348 22.5652 5.63195 22.2668 6.00014 22.2668H15.4667C15.5403 22.2668 15.6 22.2071 15.6 22.1334V21.6001C15.6 21.2319 15.8985 20.9334 16.2667 20.9334H18C18.3682 20.9334 18.6667 21.2319 18.6667 21.6001V26.0001Z\" fill=\"currentColor\"/> <path d=\"M22 24.6668C22 25.0349 22.2985 25.3334 22.6667 25.3334H26.0001C26.3683 25.3334 26.6668 25.0349 26.6668 24.6668V22.9334C26.6668 22.5652 26.3683 22.2668 26.0001 22.2668H22.6667C22.2985 22.2668 22 22.5652 22 22.9334V24.6668Z\" fill=\"currentColor\"/> <path d=\"M16.0001 17.5335C15.6319 17.5335 15.3334 17.235 15.3334 16.8668V15.1335C15.3334 14.7653 15.6319 14.4668 16.0001 14.4668H26.0001C26.3683 14.4668 26.6667 14.7653 26.6667 15.1335V16.8668C26.6667 17.235 26.3683 17.5335 26.0001 17.5335H16.0001Z\" fill=\"currentColor\"/> <path d=\"M22.0002 9.06674C22.0002 9.43493 22.2987 9.73341 22.6669 9.73341H26C26.3682 9.73341 26.6666 9.43493 26.6666 9.06674V7.3334C26.6666 6.96521 26.3682 6.66674 26 6.66674H22.6669C22.2987 6.66674 22.0002 6.96522 22.0002 7.33341V9.06674Z\" fill=\"currentColor\"/>";
(class extends na {
	static el = P({
		tagName: "media-quality-menu-button",
		props: {
			disabled: !1,
			label: "Quality"
		}
	});
	render() {
		let { label: e } = this.$props;
		return Ta({
			label: e,
			iconPaths: Na
		});
	}
});
var Pa = class extends w {
	static el = P({
		tagName: "media-gesture",
		props: {
			event: void 0,
			action: void 0
		}
	});
	j;
	Id = null;
	onAttach() {
		let { event: e, action: t } = this.$props;
		this.setAttributes({
			event: e,
			action: t
		});
	}
	onConnect() {
		this.j = H(), Nn(() => {
			this.Id = this.j.player.querySelector("media-outlet"), g(this.Ld.bind(this));
		});
	}
	Ld() {
		let e = this.$props.event();
		!this.Id || !e || (/^dbl/.test(e) && (e = e.split(/^dbl/)[1]), b(this.Id, e, this.Md.bind(this)));
	}
	Hd = 0;
	Jd = -1;
	Md(t) {
		if (!(!this.Nd(t) || ke(t) && (t.button !== 0 || this.j.activeMenu))) {
			if (t.MEDIA_GESTURE = !0, t.preventDefault(), !e(this.$props.event)?.startsWith("dbl")) this.Hd === 0 && setTimeout(() => {
				this.Hd === 1 && this.Kd(t);
			}, 250);
			else if (this.Hd === 1) {
				queueMicrotask(() => this.Kd(t)), clearTimeout(this.Jd), this.Hd = 0;
				return;
			}
			this.Hd === 0 && (this.Jd = window.setTimeout(() => {
				this.Hd = 0;
			}, 275)), this.Hd++;
		}
	}
	Kd(t) {
		this.el.setAttribute("data-triggered", ""), requestAnimationFrame(() => {
			this.Od() && this.Pd(e(this.$props.action), t), requestAnimationFrame(() => {
				this.el.removeAttribute("data-triggered");
			});
		});
	}
	Nd(e) {
		if (!this.el) return !1;
		if (ke(e) || de(e) || ie(e)) {
			let t = ie(e) ? e.touches[0] : void 0, n = t?.clientX ?? e.clientX, r = t?.clientY ?? e.clientY, i = this.el.getBoundingClientRect(), a = r >= i.top && r <= i.bottom && n >= i.left && n <= i.right;
			return e.type.includes("leave") ? !a : a;
		}
		return !0;
	}
	Od() {
		let e = this.j.player.querySelectorAll("media-gesture[data-triggered]");
		return Array.from(e).sort((e, t) => getComputedStyle(t).zIndex - +getComputedStyle(e).zIndex)[0]?.component === this;
	}
	Pd(t, n) {
		if (!t) return;
		let [i, a] = t.replace(/:([a-z])/, "-$1").split(":");
		t.includes(":fullscreen") ? this.j.remote.toggleFullscreen("prefer-media", n) : t.includes("seek:") ? this.j.remote.seek(e(this.j.$store.currentTime) + (+a || 0), n) : this.j.remote[r(i)](n);
	}
}, Fa = /* @__PURE__ */ E("<!$><svg part=\"icon\" fill=\"none\" viewBox=\"0 0 120 120\" aria-hidden=\"true\"><circle part=\"track\" cx=\"60\" cy=\"60\" r=\"54\" stroke=\"currentColor\"></circle><circle part=\"track-fill\" cx=\"60\" cy=\"60\" r=\"54\" stroke=\"currentColor\" pathLength=\"100\"></circle></svg>");
(class extends w {
	static el = P({ tagName: "media-buffering-indicator" });
	j;
	onAttach() {
		this.j = H(), this.setAttributes({ "data-buffering": u(this.Qd.bind(this)) });
	}
	Qd() {
		let { canPlay: e, waiting: t } = this.j.$store;
		return !e() || t();
	}
	render() {
		return Ze(Fa);
	}
});
var Ia = class {
	constructor(e) {
		this.Sd = e;
	}
	priority = 10;
	ya = null;
	ih = we();
	attach() {}
	canRender() {
		return !0;
	}
	detach() {
		this.ih.empty(), this.Sd.reset(), this.ya = null;
	}
	changeTrack(e) {
		!e || this.ya === e || (this.ih.empty(), e.readyState < 2 ? (this.Sd.reset(), this.ih.add(b(e, "load", () => this.jh(e), { once: !0 }))) : this.jh(e), this.ih.add(b(e, "add-cue", (e) => {
			this.Sd.addCue(e.detail);
		}), b(e, "remove-cue", (e) => {
			this.Sd.removeCue(e.detail);
		})), this.ya = e);
	}
	jh(e) {
		this.Sd.changeTrack({
			cues: [...e.cues],
			regions: [...e.regions]
		});
	}
};
(class extends w {
	static el = P({
		tagName: "media-captions",
		props: { textDir: "ltr" }
	});
	j;
	Sd;
	Rd;
	onAttach() {
		this.j = H(), this.setAttributes({ "aria-hidden": Z(this.jb.bind(this)) });
	}
	onConnect(e) {
		this.Sd = new Me(e), this.Rd = new Ia(this.Sd), g(this.Ud.bind(this));
	}
	onDisconnect() {
		this.Rd && (this.Rd.detach(), this.j.textRenderers.remove(this.Rd)), this.Sd?.destroy();
	}
	jb() {
		let { textTrack: e } = this.j.$store, t = e();
		return !t || !K(t);
	}
	Ud() {
		let { viewType: e } = this.j.$store;
		return e() === "audio" ? this.Vd() : this.Wd();
	}
	Vd() {
		return g(this.oc.bind(this)), () => {
			this.el.textContent = "";
		};
	}
	oc() {
		if (this.jb()) return;
		let { textTrack: e } = this.j.$store;
		this.Td(), b(e(), "cue-change", this.Td.bind(this)), g(this.Xd.bind(this));
	}
	Td() {
		this.el.textContent = "";
		let { currentTime: t, textTrack: n } = this.j.$store, r = e(t), i = e(n).activeCues;
		for (let e of i) {
			let t = document.createElement("div");
			t.setAttribute("part", "cue"), t.innerHTML = Ae(e, r), this.el.append(t);
		}
	}
	Xd() {
		let { currentTime: e } = this.j.$store;
		je(this.el, e());
	}
	Wd() {
		return g(this.Yd.bind(this)), g(this.Zd.bind(this)), this.j.textRenderers.add(this.Rd), () => {
			this.el.textContent = "", this.Rd.detach(), this.j.textRenderers.remove(this.Rd);
		};
	}
	Yd() {
		this.Sd.dir = this.$props.textDir();
	}
	Zd() {
		if (this.jb()) return;
		let { currentTime: e } = this.j.$store;
		this.Sd.currentTime = e();
	}
});
var La = /* @__PURE__ */ E("<!$><div part=\"container\"><div part=\"text\">LIVE</div></div>");
(class extends w {
	static el = P({ tagName: "media-live-indicator" });
	j;
	constructor(e) {
		super(e), this.j = H(), new Y(e);
	}
	onAttach(e) {
		let { live: t, liveEdge: n } = this.j.$store;
		B(e, this.ib.bind(this)), this.setAttributes({
			tabindex: this._d.bind(this),
			role: this.$d.bind(this),
			"data-live": t,
			"data-live-edge": n,
			"data-media-button": !0
		});
	}
	onConnect(e) {
		V(e, this.gb.bind(this));
	}
	ib() {
		let { live: e } = this.j.$store;
		return e() ? "Go live" : null;
	}
	_d() {
		let { live: e } = this.j.$store;
		return e() ? 0 : null;
	}
	$d() {
		let { live: e } = this.j.$store;
		return e() ? "button" : null;
	}
	gb(e) {
		let { liveEdge: t } = this.j.$store;
		t() || this.j.remote.seekToLiveEdge(e);
	}
	render() {
		return Ze(La);
	}
});
var Ra = /* @__PURE__ */ E("<!$><img part=\"img\" />");
(class extends w {
	static el = P({
		tagName: "media-poster",
		props: { alt: void 0 }
	});
	j;
	ae = m(!0);
	be = m(!1);
	ce;
	de;
	onAttach(e) {
		this.j = H(), this.ce = u(this.ee.bind(this)), this.de = this.fe.bind(this), this.setAttributes({
			"data-loading": this.ae,
			"aria-hidden": Z(this.jb.bind(this))
		});
	}
	onConnect(e) {
		let { canLoad: t, poster: n } = this.j.$store;
		window.requestAnimationFrame(() => {
			t() || Sr(n());
		}), g(this.ge.bind(this));
	}
	jb() {
		let { poster: e } = this.j.$store;
		return this.be() || !e();
	}
	ee() {
		let { canLoad: e, poster: t } = this.j.$store;
		return e() && t().length ? t() : null;
	}
	fe() {
		return this.ce() ? this.$props.alt() : null;
	}
	ge() {
		let { canLoad: e, poster: t } = this.j.$store, n = e() && !!t();
		this.ae.set(n), this.be.set(!1);
	}
	he() {
		this.ae.set(!1);
	}
	Wb() {
		this.ae.set(!1), this.be.set(!0);
	}
	render() {
		let { crossorigin: e } = this.j.$store;
		return (() => {
			let [t, n] = D(Ra);
			return M(() => A(t, "src", this.ce())), M(() => A(t, "alt", this.de())), M(() => A(t, "crossorigin", e())), j(t, "load", this.he.bind(this)), j(t, "error", this.Wb.bind(this)), t;
		})();
	}
});
var za = /* @__PURE__ */ E("<!$><span><!$></span>"), Ba = class extends w {
	static el = P({
		tagName: "media-time",
		props: {
			type: "current",
			showHours: !1,
			padHours: null,
			padMinutes: null,
			remainder: !1
		}
	});
	j;
	ie;
	onAttach() {
		this.j = H(), this.ie = u(this.Mb.bind(this));
	}
	Mb() {
		let { type: e, remainder: t, padHours: n, padMinutes: r, showHours: i } = this.$props, a = this.je(e()), o = this.j.$store.duration();
		if (!Number.isFinite(a + o)) return "LIVE";
		let s = t() ? Math.max(0, o - a) : a;
		return zi(s, n(), ee(r()) ? s >= 3600 : r(), i());
	}
	je(e) {
		let { bufferedEnd: t, duration: n, currentTime: r } = this.j.$store;
		switch (e) {
			case "buffered": return t();
			case "duration": return n();
			default: return r();
		}
	}
	render() {
		return (() => {
			let [e, t] = D(za);
			return O(t.nextNode(), this.ie), e;
		})();
	}
};
function Va(e, t) {
	let n = e.getBoundingClientRect(), r = {
		"--computed-width": n.width + "px",
		"--computed-height": n.height + "px",
		"--preview-width": "var(--media-slider-preview-width, var(--computed-width))",
		"--preview-height": "var(--media-slider-preview-height, var(--computed-height))"
	};
	r = t === "vertical" ? {
		...r,
		"--preview-height-half": "calc(var(--preview-height) / 2)",
		"--preview-top-clamp": "max(var(--preview-height-half), var(--slider-pointer-percent))",
		"--preview-bottom-clamp": "calc(100% - var(--preview-height-half))",
		"--preview-bottom": "min(var(--preview-top-clamp), var(--preview-bottom-clamp))"
	} : {
		...r,
		"--preview-width-half": "calc(var(--preview-width) / 2)",
		"--preview-left-clamp": "max(var(--preview-width-half), var(--slider-pointer-percent))",
		"--preview-right-clamp": "calc(100% - var(--preview-width-half))",
		"--preview-left": "min(var(--preview-left-clamp), var(--preview-right-clamp))"
	};
	for (let t of Object.keys(r)) e.style.setProperty(t, r[t]);
}
var Ha = /*#__PURE__*/ Object.freeze({
	__proto__: null,
	setupPreviewStyles: Va
});
//#endregion
export { Un as $, xr as A, kr as B, tr as C, sr as D, or as E, G as F, xn as G, Mr as H, vr as I, ir as J, Sn as K, _r as L, Qn as M, kn as N, br as O, U as P, Pn as Q, W as R, Bn as S, jr as T, er as U, Ir as V, fn as W, K as X, Dn as Y, wr as Z, yn as _, ii as a, w as at, $t as b, qi as c, jt as ct, Ur as d, Sr as et, mr as f, _n as g, vn as h, mi as i, Nt as it, Br as j, qn as k, Hi as l, Je as lt, $n as m, ui as n, Ut as nt, yi as o, P as ot, Nr as p, Cn as q, Pa as r, Wt as rt, Ba as s, Mt as st, Y as t, z as tt, Wr as u, Xt as v, nr as w, Fn as x, Zt as y, Fr as z };
