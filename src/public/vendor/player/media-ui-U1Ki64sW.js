import { $ as e, A as t, B as n, C as r, D as i, E as a, F as o, G as s, H as c, J as l, K as u, L as d, M as ee, N as f, P as te, Q as p, R as ne, S as re, T as ie, U as ae, V as oe, W as m, X as se, Y as h, Z as ce, _ as le, b as ue, c as g, d as de, et as fe, f as pe, g as me, h as he, i as ge, j as _, k as _e, l as ve, m as ye, n as be, nt as v, p as xe, q as Se, r as Ce, rt as we, s as Te, t as Ee, tt as y, u as b, v as De, w as x, x as Oe, y as S, z as C } from "./std-Dbvq-pq2.js";
import { d as ke, f as Ae, p as w, t as je } from "./prod-yin0M9SD.js";
//#region node_modules/maverick.js/dist/prod/chunks/chunk-XC5AOFRA.js
var T = class {
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
		return new g(e, t[0]);
	}
	dispatch(e, ...t) {
		if (!this.el) return;
		let n = new g(e, t[0]);
		this.el.dispatchEvent(n);
	}
	listen(e, t, n) {
		return this.el ? x(this.el, e, t, n) : oe;
	}
}, E = class extends T {
	constructor(e) {
		super(e), this.render && !e.F && !e.h && (e.h = this.render.bind(this));
	}
	destroy() {
		this.instance.y();
	}
}, Me = (e) => document.createTreeWalker(e, NodeFilter.SHOW_COMMENT, (e) => e.nodeValue === "$"), D = null;
function Ne(e, t) {
	let n = D;
	D = { w: Me(t.target) };
	let r = e();
	return D = n, r;
}
var Pe = /* @__PURE__ */ Symbol(0), Fe = pe("$$"), Ie = /* @__PURE__ */ Symbol(0), Le = /* @__PURE__ */ pe("/$"), Re = "/[]";
function ze(e, t, n) {
	let r = o(t);
	r && t[rt] && (t = t(), r = o(t)), r ? Ve(e, t, n) : !D && (t || t === 0) && Be(e, f(t) ? Ke(t) : le(t) ? t : document.createTextNode(t + ""), n);
}
function Be(e, t, n) {
	t && (n ? e.insertBefore(t, n) : e.appendChild(t));
}
function Ve(e, t, n) {
	let r = n && n.nodeType === 8 ? n : Fe.cloneNode();
	r !== n && Be(e, r, n), _(() => void He(r, ae(t)));
}
function He(e, t) {
	let n = e[Ie];
	if (f(t)) if (D) e[Ie] = We(e);
	else {
		n && Ge(e, n);
		let r = Ke(t);
		if (!r) return;
		n || r.appendChild(Ue(e)), e.after(r);
	}
	else if (le(t)) n && Ge(e, n), D || e.after(t), n || t.after(Ue(e));
	else if (C(t) || ne(t)) {
		if (e[Pe]) {
			e.nextSibling.data = t + "";
			return;
		}
		n && Ge(e, n);
		let r;
		D ? r = e.nextSibling : (r = document.createTextNode(t + ""), e.after(r)), e[Pe] = !0, n || r.after(Ue(e));
	} else n && Ge(e, n);
}
function Ue(e) {
	return e[Ie] = Le.cloneNode();
}
function We(e) {
	for (; e;) {
		if (e.nodeType === 8 && e.nodeValue === Re) return e;
		e = e.nextSibling;
	}
}
function Ge(e, t) {
	for (; e.nextSibling !== t;) e.nextSibling.remove();
	e[Pe] = !1;
}
function Ke(e) {
	let t = ye(e);
	if (!t.length) return null;
	let n = xe();
	for (let e = 0; e < t.length; e++) {
		let r = t[e];
		o(r) ? Ve(n, r) : n.append(r);
	}
	return n;
}
function qe(e) {
	Ye(e, { insert: ze });
}
var Je = Symbol(0);
function Ye(e, t) {
	let n = e.el.tagName;
	window.customElements.get(n) || (window[Je] || (window[Je] = /* @__PURE__ */ new Map()), window[Je].set(n, e), window.customElements.define(n, vt(e, t)));
}
function O(e) {
	let t = document.createElement("template");
	return t.innerHTML = e, t.content;
}
function k(e, t = D == null ? void 0 : D.w) {
	try {
		return [Ze(t), t];
	} catch {
		return k(e, Me(document.importNode(e, !0)));
	}
}
function Xe(e) {
	return k(e)[0];
}
function Ze(e) {
	let t = e.nextNode().nextSibling;
	if (t.localName.indexOf("-") > 0 && t.firstChild && t.firstChild.nodeName === "SHADOW-ROOT") {
		let n = t.firstChild.nextSibling || t.nextSibling;
		n && (e.currentNode = n);
	}
	return t;
}
var Qe = D;
function $e(e, t) {
	var n;
	let r = (n = window[Je]) == null ? void 0 : n.get(e.localName);
	if (!r) throw Error(e.localName);
	let i = ft(r, { props: t });
	return e.attachComponent(i), i.instance.c;
}
function et(e) {
	return document.importNode(e, !0).firstElementChild;
}
function tt(e) {
	return document.createElement(e);
}
var nt = ze;
function A(e, t) {
	ze(e.parentElement, t, e);
}
function j(t, n = {}) {
	return e(() => t(n));
}
var rt = /* @__PURE__ */ Symbol(0);
function it(e, t) {
	f(t) ? t.filter(o).forEach((t) => t(e)) : o(t) && t(e);
}
var M = a;
function at(e, t, n, r = !1) {
	o(n) && x(e, t, n, { capture: r });
}
var ot = e, st = y, N = _, ct = u, lt = /* @__PURE__ */ Symbol(0), ut = /* @__PURE__ */ Symbol(0), dt = /* @__PURE__ */ Symbol(0);
function ft(e, t) {
	let n = new pt(e, t);
	return y(() => new e(n), n.c);
}
var pt = class {
	constructor(e, t = {}) {
		this.m = null, this.h = null, this.F = !1, this.j = !1, this.f = {}, this.q = {}, this.e = {}, this.z = null, this.k = null, this.d = [], this.p = [], this.i = [], this.x = [], fe((n) => {
			var r;
			this.c = se(), this.G = n, t.scope && t.scope.append(this.c);
			let i = e.el.store;
			i && (this.k = i.create(), this.z = new Proxy(this.k, { get: (e, t) => this.k[t]() }), c(i, this.k));
			let a = e.el.props;
			if (a && (this.e = mt(a), t.props)) {
				for (let e of Object.keys(t.props)) if (e in a) {
					let n = t.props[e];
					ce(n) ? Se(() => void this.e[e].set(n())) : this.e[e].set(n);
				}
			}
			(r = t.props) != null && r.innerHTML && (this.F = !0), p(this.y.bind(this));
		});
	}
	y() {
		var e;
		if (!this.j) {
			this.j = !0;
			for (let e of this.x) y(() => e(this.m), this.c);
			(e = this.m) == null || e.destroy(), this.d.length = 0, this.p.length = 0, this.i.length = 0, this.x.length = 0, v(), this.G(), this.m = null, this.h = null;
		}
	}
};
function mt(e) {
	let t = {};
	for (let n of Object.keys(e)) {
		let r = e[n];
		t[n] = h(r.value, r);
	}
	return t;
}
async function ht(e) {
	let t = _t(e), n = e.constructor.a;
	if (t && (await customElements.whenDefined(t.localName), t[lt] === !0 || await new Promise((e) => t[lt].push(e))), e.isConnected) {
		var r;
		t != null && t.keepAlive && (e.keepAlive = !0), e.attachComponent(ft(n, { scope: t == null || (r = t.component) == null ? void 0 : r.instance.c }));
	}
}
function gt(e) {
	let t = e.constructor, n = t.a, r = {};
	if (!t.f) return r;
	for (let a of e.attributes) {
		var i;
		let o = t.f.get(a.name), s = o && ((i = n.el.props[o].type) == null ? void 0 : i.from);
		s && (r[o] = s(e.getAttribute(a.name)));
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
		let e = f(n) ? n : n == null ? void 0 : n();
		if (f(e)) for (let n of e) Ye(n, t);
	}
	let r;
	if (e.el.props) {
		r = /* @__PURE__ */ new Map();
		for (let t of Object.keys(e.el.props)) {
			let n = e.el.props[t].attribute;
			if (n !== !1) {
				let e = n == null ? de(t) : n;
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
		var e;
		return (e = this.a) == null ? void 0 : e.instance.k;
	}
	get state() {
		return this.a.instance.z;
	}
	static get observedAttributes() {
		return this.f ? Array.from(this.f.keys()) : [];
	}
	attributeChangedCallback(e, t, n) {
		var r;
		let i = this.constructor;
		if (!this.a || !i.f) return;
		let a = i.f.get(e), o = (r = i.a.el.props[a]) == null || (r = r.type) == null ? void 0 : r.from;
		o && this.a.instance.e[a].set(o(n));
	}
	connectedCallback() {
		var e;
		let t = (e = this.a) == null ? void 0 : e.instance;
		if (!this.A && !t) return this.N();
		!t || !this.isConnected || this.r || this.j || (this.hasAttribute("keep-alive") && (this.keepAlive = !0), this.r = !0, t.p.length && y(() => {
			fe((e) => {
				this.s = se();
				for (let e of t.p) y(() => {
					let t = e(this);
					ce(t) && this.i.push(t);
				}, this.s);
				this.i.push(e);
			});
		}, t.c), f(this[lt]) && (ie(this[lt], this), this[lt] = !0));
	}
	disconnectedCallback() {
		var e;
		let t = (e = this.a) == null ? void 0 : e.instance;
		if (!(!this.r || this.j)) {
			this.r = !1;
			for (let e of this.i) y(e, this.s);
			if (t != null && t.i.length) for (let e of t.i) y(() => e(this), t.c);
			this.s = null, !this.A && !this.keepAlive && requestAnimationFrame(() => {
				this.isConnected || (t == null || t.y(), this.j = !0);
			});
		}
	}
	attachComponent(e) {
		let t = e.instance, n = this.constructor, r = n.a.el, o = n.H;
		this.a || this.j || y(() => {
			var s, c;
			this.o = t.h ? r.shadowRoot ? (s = this.shadowRoot) == null ? this.attachShadow(te(r.shadowRoot) ? { mode: "open" } : r.shadowRoot) : s : St(this) : null, !D && r.shadowRoot && r.css && o != null && o.adoptCSS && o.adoptCSS(this.o, r.css), t.m = this, this.a = e;
			let l = gt(this);
			for (let e of Object.keys(l)) t.e[e].set(l[e]);
			if ((c = this.l) != null && c.size) for (let e of this.l.values()) e();
			this.l = null;
			for (let e of [...t.d, ...this.d]) y(() => e(this), t.c);
			t.d.length = 0, this.d = null;
			let u = t.f, d = t.q;
			if (u) for (let e of Object.keys(u)) ce(u[e]) ? Se(() => a(this, e, u[e]())) : a(this, e, u[e]);
			if (d) for (let e of Object.keys(d)) ce(d[e]) ? Se(() => i(this, e, d[e]())) : i(this, e, d[e]);
			if (this.dispatchEvent(new Event("attached")), this.o && o && t.h) {
				let e = () => o.insert(this.o, t.h);
				this.hasAttribute("mk-h") && !n.a.el.nohydrate ? Ne(e, { target: this.o }) : e();
			}
			this.connectedCallback();
		}, t.c);
	}
	subscribe(e) {
		return y(() => Se(() => e(this.a.instance.z)), this.a.instance.c);
	}
	onAttach(e) {
		return this.a ? (e(this), oe) : (this.d.add(e), () => {
			var t;
			return (t = this.d) == null ? void 0 : t.delete(e);
		});
	}
	onEventDispatch(e) {
		let t = this.constructor;
		if (t.n) for (let n of t.n) e(n);
		this.I = e;
	}
	destroy() {
		var e;
		this.disconnectedCallback(), (e = this.a) == null || e.destroy(), this.a = null, this.j = !0;
	}
	dispatchEvent(e) {
		if (this.A) {
			let n = this.constructor;
			if (n.n || (n.n = /* @__PURE__ */ new Set()), !n.n.has(e.type)) {
				var t;
				(t = this.I) == null || t.call(this, e.type), n.n.add(e.type);
			}
		}
		return we(() => super.dispatchEvent(e));
	}
	async N() {
		this.B || (this.B = !0, await ht(this), this.B = !1);
	}
	P(e) {}
};
bt = lt;
function St(e) {
	if (e.firstChild && he(e.firstChild) && e.firstChild.localName === "shadow-root") return e.firstChild;
	{
		let t = tt("shadow-root");
		return e.prepend(t), t;
	}
}
var Ct = Symbol(0);
function P(e) {
	return {
		[Ct]: !0,
		...e
	};
}
function F(e) {
	if ("props" in e) {
		let n = e.props;
		for (let e of Object.keys(n)) {
			var t;
			let r = (t = n[e]) != null && t[Ct] ? n[e] : {
				[Ct]: !0,
				value: n[e]
			};
			r.attribute !== !1 && !r.type && (r.type = At(r.value)), n[e] = r;
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
		case "object": return f(e) ? Ot : kt;
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
	return (e == null ? void 0 : e.$$PROVIDER_TYPE) === "HLS";
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
var Gt = /* @__PURE__ */ O("<!$><audio preload=\"none\" aria-hidden=\"true\"></audio>"), Kt = class {
	constructor() {
		w(this, "kh", void 0);
	}
	canPlay({ src: e, type: t }) {
		return C(e) ? Lt.test(e) || Rt.has(t) || e.startsWith("blob:") && t === "audio/object" : t === "audio/object";
	}
	mediaType() {
		return "audio";
	}
	async load() {
		return new (await (import("./provider-CXLxpYVy.js"))).AudioProvider(this.kh);
	}
	render(e) {
		return (() => {
			let [t, n] = k(Gt);
			return N(() => M(t, "controls", e.controls())), N(() => M(t, "crossorigin", e.crossorigin())), it(t, (e) => void (this.kh = e)), t;
		})();
	}
}, qt = /* @__PURE__ */ O("<!$><video preload=\"none\" aria-hidden=\"true\"></video>"), Jt = class {
	constructor() {
		w(this, "qa", void 0);
	}
	canPlay(e) {
		return C(e.src) ? zt.test(e.src) || Bt.has(e.type) || e.src.startsWith("blob:") && e.type === "video/object" || Ut(e) && wn() : e.type === "video/object";
	}
	mediaType() {
		return "video";
	}
	async load(e) {
		return new (await (import("./provider-lJBTWfPA.js"))).VideoProvider(this.qa, e);
	}
	render(e) {
		let t = u(() => e.poster() && e.controls() ? e.poster() : null);
		return (() => {
			let [n, r] = k(qt);
			return N(() => M(n, "controls", e.controls())), N(() => M(n, "crossorigin", e.crossorigin())), N(() => M(n, "poster", t())), it(n, (e) => void (this.qa = e)), n;
		})();
	}
}, Yt = class e extends Jt {
	preconnect() {
		Dr("https://cdn.jsdelivr.net", "preconnect");
	}
	canPlay({ src: t, type: n }) {
		return e.supported && C(t) && (Vt.test(t) || Ht.has(n));
	}
	async load(e) {
		return new (await (import("./provider-8ck_e9N1.js"))).HLSProvider(this.qa, e);
	}
};
w(Yt, "supported", An());
//#endregion
//#region node_modules/vidstack/dist/prod/media-core.js
var Xt, Zt, Qt, $t = Symbol(0), en = Symbol(0), tn = Symbol(0), nn = Symbol(0), rn = Symbol(0), an = Symbol(0), on = Symbol(0), sn = Symbol(0), cn = Symbol(0);
Qt = Symbol.iterator;
var ln = class extends ve {
	constructor(...e) {
		super(...e), w(this, "a", []), w(this, rn, !1);
	}
	get length() {
		return this.a.length;
	}
	get readonly() {
		return this[rn];
	}
	toArray() {
		return [...this.a];
	}
	[Qt]() {
		return this.a.values();
	}
	[$t](e, t) {
		let n = this.a.length;
		"" + n in this || Object.defineProperty(this, n, { get() {
			return this.a[n];
		} }), !this.a.includes(e) && (this.a.push(e), this.dispatchEvent(new g("add", {
			detail: e,
			trigger: t
		})));
	}
	[en](e, t) {
		let n = this.a.indexOf(e);
		if (n >= 0) {
			var r;
			(r = this[sn]) == null || r.call(this, e, t), this.a.splice(n, 1), this.dispatchEvent(new g("remove", {
				detail: e,
				trigger: t
			}));
		}
	}
	[tn](e) {
		var t;
		for (let t of [...this.a]) this[en](t, e);
		this.a = [], this[an](!1, e), (t = this[on]) == null || t.call(this);
	}
	[an](e, t) {
		this[rn] !== e && (this[rn] = e, this.dispatchEvent(new g("readonly-change", {
			detail: e,
			trigger: t
		})));
	}
}, I = {
	fullscreenEnabled: 0,
	fullscreenElement: 1,
	requestFullscreen: 2,
	exitFullscreen: 3,
	fullscreenchange: 4,
	fullscreenerror: 5,
	fullscreen: 6
}, un = [
	"webkitFullscreenEnabled",
	"webkitFullscreenElement",
	"webkitRequestFullscreen",
	"webkitExitFullscreen",
	"webkitfullscreenchange",
	"webkitfullscreenerror",
	"-webkit-full-screen"
], dn = [
	"mozFullScreenEnabled",
	"mozFullScreenElement",
	"mozRequestFullScreen",
	"mozCancelFullScreen",
	"mozfullscreenchange",
	"mozfullscreenerror",
	"-moz-full-screen"
], fn = [
	"msFullscreenEnabled",
	"msFullscreenElement",
	"msRequestFullscreen",
	"msExitFullscreen",
	"MSFullscreenChange",
	"MSFullscreenError",
	"-ms-fullscreen"
], L = typeof window < "u" && window.document !== void 0 ? window.document : {}, R = "fullscreenEnabled" in L && Object.keys(I) || un[0] in L && un || dn[0] in L && dn || fn[0] in L && fn || [], z = {
	requestFullscreen: function(e) {
		return e[R[I.requestFullscreen]]();
	},
	requestFullscreenFunction: function(e) {
		return e[R[I.requestFullscreen]];
	},
	get exitFullscreen() {
		return L[R[I.exitFullscreen]].bind(L);
	},
	get fullscreenPseudoClass() {
		return ":" + R[I.fullscreen];
	},
	addEventListener: function(e, t, n) {
		return L.addEventListener(R[I[e]], t, n);
	},
	removeEventListener: function(e, t, n) {
		return L.removeEventListener(R[I[e]], t, n);
	},
	get fullscreenEnabled() {
		return !!L[R[I.fullscreenEnabled]];
	},
	set fullscreenEnabled(e) {},
	get fullscreenElement() {
		return L[R[I.fullscreenElement]];
	},
	set fullscreenElement(e) {},
	get onfullscreenchange() {
		return L[("on" + R[I.fullscreenchange]).toLowerCase()];
	},
	set onfullscreenchange(e) {
		return L[("on" + R[I.fullscreenchange]).toLowerCase()] = e;
	},
	get onfullscreenerror() {
		return L[("on" + R[I.fullscreenerror]).toLowerCase()];
	},
	set onfullscreenerror(e) {
		return L[("on" + R[I.fullscreenerror]).toLowerCase()] = e;
	}
}, pn = z.fullscreenEnabled, mn = class extends T {
	constructor(...e) {
		super(...e), w(this, "b", !1), w(this, "c", !1);
	}
	get active() {
		return this.c;
	}
	get supported() {
		return pn;
	}
	onConnect() {
		x(z, "fullscreenchange", this.d.bind(this)), x(z, "fullscreenerror", this.e.bind(this));
	}
	async onDisconnect() {
		pn && await this.exit();
	}
	d(e) {
		let t = gn(this.el);
		t !== this.c && (t || (this.b = !1), this.c = t, this.dispatch("fullscreen-change", {
			detail: t,
			trigger: e
		}));
	}
	e(e) {
		this.b && (this.dispatch("fullscreen-error", {
			detail: null,
			trigger: e
		}), this.b = !1);
	}
	async enter() {
		try {
			return this.b = !0, !this.el || gn(this.el) ? void 0 : (_n(), z.requestFullscreen(this.el));
		} catch (e) {
			throw this.b = !1, e;
		}
	}
	async exit() {
		if (!(!this.el || !gn(this.el))) return _n(), z.exitFullscreen();
	}
};
function hn() {
	return pn;
}
function gn(e) {
	if (z.fullscreenElement === e) return !0;
	try {
		return e.matches(z.fullscreenPseudoClass);
	} catch {
		return !1;
	}
}
function _n() {
	if (!pn) throw Error("[vidstack] no fullscreen API");
}
var vn = (Xt = navigator) == null ? void 0 : Xt.userAgent.toLowerCase(), yn = /iphone|ipad|ipod|ios|crios|fxios/i.test(vn), bn = /(iphone|ipod)/gi.test((Zt = navigator) == null ? void 0 : Zt.platform), xn = !!window.chrome, Sn = !!window.safari || yn;
function Cn() {
	return !n(screen.orientation) && o(screen.orientation.lock) && o(screen.orientation.unlock);
}
function wn(e) {
	return e || (e = document.createElement("video")), e.canPlayType("application/vnd.apple.mpegurl").length > 0;
}
function Tn(e) {
	return !!document.pictureInPictureEnabled && !e.disablePictureInPicture;
}
function En(e) {
	return o(e.webkitSupportsPresentationMode) && o(e.webkitSetPresentationMode);
}
async function Dn() {
	let e = document.createElement("video");
	return e.volume = .5, await Te(0), e.volume === .5;
}
function On() {
	var e, t, n;
	return (e = (t = window) == null ? void 0 : t.MediaSource) == null ? (n = window) == null ? void 0 : n.WebKitMediaSource : e;
}
function kn() {
	var e, t, n;
	return (e = (t = window) == null ? void 0 : t.SourceBuffer) == null ? (n = window) == null ? void 0 : n.WebKitSourceBuffer : e;
}
function An() {
	let e = On();
	if (n(e)) return !1;
	let t = e && o(e.isTypeSupported) && e.isTypeSupported("video/mp4; codecs=\"avc1.42E01E,mp4a.40.2\""), r = kn(), i = n(r) || !n(r.prototype) && o(r.prototype.appendBuffer) && o(r.prototype.remove);
	return !!t && !!i;
}
var jn = Cn(), Mn = class extends T {
	constructor(...e) {
		super(...e), w(this, "g", h(Pn())), w(this, "f", h(!1)), w(this, "h", void 0);
	}
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
		return jn;
	}
	onConnect() {
		if (jn) x(screen.orientation, "change", this.i.bind(this));
		else {
			let e = window.matchMedia("(orientation: landscape)");
			return e.onchange = this.i.bind(this), () => e.onchange = null;
		}
	}
	async onDisconnect() {
		jn && this.f() && await this.unlock();
	}
	i(t) {
		this.g.set(Pn()), this.dispatch("orientation-change", {
			detail: {
				orientation: e(this.g),
				lock: this.h
			},
			trigger: t
		});
	}
	async lock(t) {
		e(this.f) || this.h === t || (Nn(), await screen.orientation.lock(t), this.f.set(!0), this.h = t);
	}
	async unlock() {
		e(this.f) && (Nn(), this.h = void 0, await screen.orientation.unlock(), this.f.set(!1));
	}
};
function Nn() {
	if (!jn) throw Error("[vidstack] no orientation API");
}
function Pn() {
	return jn ? window.screen.orientation.type : window.innerWidth >= window.innerHeight ? "landscape-primary" : "portrait-primary";
}
function B(e, t, n) {
	e.hasAttribute(t) || e.setAttribute(t, n);
}
function V(e, t) {
	if (e.hasAttribute("aria-label") || e.hasAttribute("aria-describedby")) return;
	function n() {
		a(e, "aria-label", t());
	}
	_(n);
}
function Fn(e, t, n) {
	for (; t;) if (t === e) return !0;
	else if (t.localName === e.localName || n != null && n(t)) break;
	else t = t.parentElement;
	return !1;
}
function In(e, t) {
	x(e, "pointerup", (e) => {
		e.button === 0 && t(e);
	}), x(e, "keydown", (e) => {
		De(e) && t(e);
	});
}
function Ln(e) {
	let t = se();
	requestAnimationFrame(() => y(e, t));
}
var Rn = t();
function H() {
	return m(Rn);
}
var zn = [
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
], Bn = {
	togglePaused: "k Space",
	toggleMuted: "m",
	toggleFullscreen: "f",
	togglePictureInPicture: "i",
	toggleCaptions: "c",
	seekBackward: "ArrowLeft",
	seekForward: "ArrowRight",
	volumeUp: "ArrowUp",
	volumeDown: "ArrowDown"
}, Vn = /* @__PURE__ */ new Set([
	"Shift",
	"Alt",
	"Meta",
	"Control"
]), Hn = "button, [role=\"button\"]", Un = "input, textarea, select, [contenteditable], [role^=\"menuitem\"]", Wn = class extends T {
	constructor(e, t) {
		super(e), w(this, "Ua", void 0), w(this, "Ta", null), this.j = t;
	}
	onConnect() {
		_(this.Xa.bind(this));
	}
	Xa() {
		let { keyDisabled: t, keyTarget: n } = this.$props;
		if (t()) return;
		let r = n() === "player" ? this.el : document, i = h(!1);
		r === this.el ? (this.listen("focusin", () => i.set(!0)), this.listen("focusout", (e) => {
			this.el.contains(e.target) || i.set(!1);
		})) : (e(i) || i.set(document.querySelector("media-player") === this.el), x(document, "focusin", (e) => {
			let t = e.composedPath().find((e) => e instanceof Element && e.localName === "media-player");
			t !== void 0 && i.set(this.el === t);
		})), _(() => {
			i() && (x(r, "keyup", this.Ya.bind(this)), x(r, "keydown", this.Za.bind(this)), x(r, "keydown", this._a.bind(this), { capture: !0 }));
		});
	}
	Ya(e) {
		let t = document.activeElement, n = t == null ? void 0 : t.hasAttribute("data-media-slider");
		if (!e.key || !this.$store.canSeek() || n || t != null && t.matches(Un)) return;
		let r = this.Va(e);
		if (r != null && r.startsWith("seek") && (e.preventDefault(), e.stopPropagation(), this.Ta ? (this.Wa(e), this.Ta = null) : (this.j.remote.seek(this.Ua, e), this.Ua = void 0)), r != null && r.startsWith("volume")) {
			let t = this.el.querySelector("media-volume-slider");
			t == null || t.dispatchEvent(new g("keyup", { trigger: e }));
		}
	}
	Za(e) {
		if (!e.key || Vn.has(e.key)) return;
		let t = document.activeElement;
		if (t != null && t.matches(Un) || De(e) && t != null && t.matches(Hn)) return;
		let n = t == null ? void 0 : t.hasAttribute("data-media-slider"), r = this.Va(e);
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
				if (t) t.dispatchEvent(new g("keydown", { trigger: e }));
				else {
					let t = e.shiftKey ? .1 : .05;
					this.j.remote.changeVolume(this.$store.volume() + (r === "volumeUp" ? +t : -t), e);
				}
				break;
			case "toggleFullscreen":
				this.j.remote.toggleFullscreen("prefer-media", e);
				break;
			default:
				var i, a;
				(i = (a = this.j.remote)[r]) == null || i.call(a, e);
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
		return Object.keys(t).find((n) => t[n].split(" ").some((t) => Kn(t).replace(/Control/g, "Ctrl").split("+").every((t) => Vn.has(t) ? e[t.toLowerCase() + "Key"] : e.key === t.replace("Space", " "))));
	}
	ab(e, t) {
		var n;
		let r = e.shiftKey ? 10 : 5;
		return this.Ua = Math.max(0, Math.min(((n = this.Ua) == null ? this.$store.currentTime() : n) + (t === "seekForward" ? +r : -r), this.$store.duration()));
	}
	Wa(e) {
		var t;
		(t = this.Ta) == null || t.dispatchEvent(new g(e.type, { trigger: e }));
	}
	$a(e, t) {
		this.$store.canSeek() && (this.Ta || (this.Ta = this.el.querySelector("media-time-slider")), this.Ta ? this.Wa(e) : this.j.remote.seeking(this.ab(e, t), e));
	}
}, Gn = [
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
function Kn(e) {
	return e.replace(/Shift\+(\d)/g, (e, t) => Gn[t - 1]);
}
var qn = {
	autoplay: !1,
	aspectRatio: P({
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
	preferNativeHLS: P({
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
	keyShortcuts: Bn,
	title: "",
	thumbnails: null,
	textTracks: P({
		value: [],
		attribute: !1
	}),
	smallBreakpointX: 600,
	largeBreakpointX: 980,
	smallBreakpointY: 380,
	largeBreakpointY: 600
}, Jn = class {
	get length() {
		return this.W.length;
	}
	constructor(e, t) {
		w(this, "W", void 0), f(e) ? this.W = e : !n(e) && !n(t) ? this.W = [[e, t]] : this.W = [];
	}
	start(e) {
		var t;
		return (t = this.W[e][0]) == null ? Infinity : t;
	}
	end(e) {
		var t;
		return (t = this.W[e][1]) == null ? Infinity : t;
	}
};
function Yn(e) {
	if (!e.length) return null;
	let t = e.start(0);
	for (let n = 1; n < e.length; n++) {
		let r = e.start(n);
		r < t && (t = r);
	}
	return t;
}
function Xn(e) {
	if (!e.length) return null;
	let t = e.end(0);
	for (let n = 1; n < e.length; n++) {
		let r = e.end(n);
		r > t && (t = r);
	}
	return t;
}
var Zn = new _e({
	audioTracks: [],
	audioTrack: null,
	autoplay: !1,
	autoplayError: void 0,
	buffered: new Jn(),
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
	played: new Jn(),
	playing: !1,
	playsinline: !1,
	pictureInPicture: !1,
	preload: "metadata",
	playbackRate: 1,
	qualities: [],
	quality: null,
	autoQuality: !1,
	canSetQuality: !0,
	seekable: new Jn(),
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
		var e;
		return (e = Yn(this.buffered)) == null ? 0 : e;
	},
	get bufferedEnd() {
		var e;
		return (e = Xn(this.buffered)) == null ? 0 : e;
	},
	get seekableStart() {
		var e;
		return (e = Yn(this.seekable)) == null ? 0 : e;
	},
	get seekableEnd() {
		var e;
		return this.canPlay ? (e = Xn(this.seekable)) == null ? Infinity : e : 0;
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
		var e;
		return this.live && Number.isFinite(this.seekableEnd) ? Math.max(0, ((e = this.liveSyncPosition) == null ? this.seekableEnd : e) - this.liveEdgeTolerance) : 0;
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
}), Qn = /* @__PURE__ */ new Set(/* @__PURE__ */ "autoplay.breakpointX.breakpointY.canFullscreen.canLoad.canPictureInPicture.controls.fullscreen.logLevel.loop.mediaHeight.mediaWidth.muted.orientation.pictureInPicture.playsinline.poster.preload.providedStreamType.providedViewType.source.sources.textTrack.textTracks.thumbnailCues.thumbnails.title.touchPointer.volume".split("."));
function $n(e) {
	Zn.reset(e, (e) => !Qn.has(e)), v();
}
var er = Symbol(0), tr = class extends ln {
	get selected() {
		var e;
		return (e = this.a.find((e) => e.selected)) == null ? null : e;
	}
	get selectedIndex() {
		return this.a.findIndex((e) => e.selected);
	}
	[sn](e, t) {
		this[nn](e, !1, t);
	}
	[$t](e, t) {
		e[er] = !1, Object.defineProperty(e, "selected", {
			get() {
				return this[er];
			},
			set: (t) => {
				var n;
				this.readonly || ((n = this[cn]) == null || n.call(this), this[nn](e, t));
			}
		}), super[$t](e, t);
	}
	[nn](e, t, n) {
		if (t === e[er]) return;
		let r = this.selected;
		e[er] = t, (t ? r !== e : r === e) && (r && (r[er] = !1), this.dispatchEvent(new g("change", {
			detail: {
				prev: r,
				current: this.selected
			},
			trigger: n
		})));
	}
}, nr = Symbol(0), rr = Symbol(0), ir = class extends tr {
	constructor(...e) {
		super(...e), w(this, "Sa", !1), w(this, "switch", "current"), w(this, rr, void 0);
	}
	get auto() {
		return this.Sa || this.readonly;
	}
	[cn]() {
		this[nr](!1);
	}
	[on](e) {
		this[nr](!1, e);
	}
	autoSelect(e) {
		this.readonly || this.Sa || !this[rr] || (this[rr](), this[nr](!0, e));
	}
	[nr](e, t) {
		this.Sa !== e && (this.Sa = e, this.dispatchEvent(new g("auto-change", {
			detail: e,
			trigger: t
		})));
	}
}, ar = class extends T {
	constructor(e, t) {
		super(e), this.jf = t;
	}
	async onAttach(e) {
		let t = this.$props.load();
		if (t === "eager") requestAnimationFrame(this.jf);
		else if (t === "idle") {
			let { waitIdlePeriod: e } = await import("./std-Dbvq-pq2.js").then((e) => e.a);
			e(this.jf);
		} else if (t === "visible") {
			let t = new IntersectionObserver((e) => {
				e[0].isIntersecting && (t.disconnect(), this.jf());
			});
			return t.observe(e), t.disconnect.bind(t);
		}
	}
}, or = class {
	constructor(e, t) {
		this.N = e, this.j = t;
	}
	p(e, ...t) {
		this.N(new g(e, t == null ? void 0 : t[0]));
	}
	async lf(t, n) {
		let { $store: r, logger: i } = this.j;
		e(r.canPlay) || (this.p("can-play", {
			detail: t,
			trigger: n
		}), v(), r.canPlay() && r.autoplay() && !r.started() && await this.kf());
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
}, sr = class {
	constructor() {
		w(this, "Ze", /* @__PURE__ */ new Map());
	}
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
		var t, n;
		return (t = (n = this.Ze.get(e)) == null ? void 0 : n.size) == null ? 0 : t;
	}
	gf() {
		this.Ze.clear();
	}
};
function cr(e) {
	return e instanceof Error ? e : Error(JSON.stringify(e));
}
var lr = class extends T {
	constructor(...e) {
		super(...e), w(this, "da", -2), w(this, "ba", 2e3), w(this, "ea", !1), w(this, "ca", null);
	}
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
		_(this.C.bind(this)), x(this.el, "play", this.ia.bind(this)), x(this.el, "pause", this.ja.bind(this));
	}
	C() {
		if (this.$store.paused()) return;
		let e = this.ka.bind(this);
		for (let t of ["pointerup", "keydown"]) x(this.el, t, e);
		_(() => {
			this.$store.touchPointer() || x(this.el, "pointermove", e);
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
		if (!e.MEDIA_GESTURE) {
			if (S(e)) if (e.key === "Escape") {
				var t;
				(t = this.el) == null || t.focus(), this.ca = null;
			} else this.ca && (e.preventDefault(), requestAnimationFrame(() => {
				var e;
				(e = this.ca) == null || e.focus(), this.ca = null;
			}));
			this.idle(!1, 0, e), this.idle(!0, this.ba, e);
		}
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
		var n;
		this.$store.userIdle() !== e && (this.$store.userIdle.set(e), e && document.activeElement && (n = this.el) != null && n.contains(document.activeElement) && (this.ca = document.activeElement, requestAnimationFrame(() => {
			var e;
			return (e = this.el) == null ? void 0 : e.focus();
		})), this.dispatch("user-idle-change", {
			detail: e,
			trigger: t
		}));
	}
}, ur = class {
	constructor() {
		w(this, "$a", !1), w(this, "rf", !1), w(this, "pf", !1), w(this, "Ze", new sr());
	}
}, dr = class extends T {
	constructor(e, t, n, r) {
		super(e), w(this, "Q", void 0), w(this, "of", void 0), w(this, "nb", void 0), w(this, "nf", void 0), w(this, "q", void 0), w(this, "qf", !1), this.u = t, this.mf = n, this.j = r, this.nf = r.$store, this.q = r.$provider, this.Q = new lr(e), this.of = new mn(e), this.nb = new Mn(e);
	}
	onConnect() {
		_(this.uf.bind(this)), _(this.vf.bind(this)), _(this.wf.bind(this));
		let e = Object.getOwnPropertyNames(Object.getPrototypeOf(this)), t = this.xf.bind(this);
		for (let n of e) n.startsWith("media-") && this.listen(n, t);
		this.listen("fullscreen-change", this.d.bind(this));
	}
	xf(t) {
		var n;
		t.stopPropagation(), e(this.q) && ((n = this[t.type]) == null || n.call(this, t));
	}
	async M() {
		let { canPlay: t, paused: n, ended: r, autoplaying: i, seekableStart: a } = this.nf;
		if (e(n)) try {
			let n = e(this.q);
			return fr(n, e(t)), e(r) && (n.currentTime = a() + .1), n.play();
		} catch (e) {
			let t = this.createEvent("play-fail", { detail: cr(e) });
			throw t.autoplay = i(), this.u.N(t), e;
		}
	}
	async L() {
		let { canPlay: t, paused: n } = this.nf;
		if (e(n)) return;
		let r = e(this.q);
		return fr(r, e(t)), r.pause();
	}
	V() {
		var t;
		let { canPlay: n, live: r, liveEdge: i, canSeek: a, liveSyncPosition: o, seekableEnd: s, userBehindLiveEdge: c } = this.nf;
		if (c.set(!1), e(() => !r() || i() || !a())) return;
		let l = e(this.q);
		fr(l, e(n)), l.currentTime = (t = o()) == null ? s() - 2 : t;
	}
	async R(t = "prefer-media") {
		let n = e(this.q), r = t === "prefer-media" && this.of.supported || t === "media" ? this.of : n == null ? void 0 : n.fullscreen;
		if (pr(t, r), !r.active) return e(this.nf.pictureInPicture) && (this.qf = !0, await this.U()), r.enter();
	}
	async S(t = "prefer-media") {
		let n = e(this.q), r = t === "prefer-media" && this.of.supported || t === "media" ? this.of : n == null ? void 0 : n.fullscreen;
		if (pr(t, r), r.active) {
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
		var t;
		let { canLoad: n, canFullscreen: r } = this.nf, i = this.of.supported || ((t = this.q()) == null || (t = t.fullscreen) == null ? void 0 : t.supported) || !1;
		n() && e(r) === i || r.set(i);
	}
	wf() {
		var t;
		let { canLoad: n, canPictureInPicture: r } = this.nf, i = ((t = this.q()) == null || (t = t.pictureInPicture) == null ? void 0 : t.supported) || !1;
		n() && e(r) === i || r.set(i);
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
		this.u.N(this.createEvent("fullscreen-error", { detail: cr(e) }));
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
		this.u.N(this.createEvent("picture-in-picture-error", { detail: cr(e) }));
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
			let t = this.createEvent("play-fail", { detail: cr(e) });
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
function fr(e, t) {
	if (!(e && t)) throw Error("[vidstack] media not ready");
}
function pr(e, t) {
	if (!(t != null && t.supported)) throw Error("[vidstack] no fullscreen support");
}
var mr = hr;
function hr(e, t, n) {
	var r = null, i = null, a = function() {
		r && (clearTimeout(r), i = null, r = null);
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
var gr = _r;
function _r(e, t, n) {
	var r = null, i = null, a = n && n.leading, o = n && n.trailing;
	a == null && (a = !0), o == null && (o = !a), a == 1 && (o = !1);
	var s = function() {
		r && (clearTimeout(r), r = null);
	}, c = function() {
		var e = i;
		s(), e && e();
	}, l = function() {
		var n = a && !r, s = this, c = arguments;
		if (i = function() {
			return e.apply(s, c);
		}, r || (r = setTimeout(function() {
			if (r = null, o) return i();
		}, t)), n) return n = !1, i();
	};
	return l.cancel = s, l.flush = c, l;
}
var vr = Symbol(0), yr = Symbol(0), U = Symbol(0), br = Symbol(0), xr = Symbol(0), Sr = Symbol(0), W = Symbol(0), Cr = Symbol(0), wr = /* @__PURE__ */ new Set([
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
]), Tr = class extends T {
	constructor(e, t, n) {
		super(e), w(this, "nf", void 0), w(this, "zf", /* @__PURE__ */ new Map()), w(this, "Gf", !0), w(this, "Df", !1), w(this, "Bf", void 0), w(this, "seeking", gr((e) => {
			let { seeking: t, currentTime: n, paused: r } = this.nf;
			t.set(!0), n.set(e.detail), this.Af("seeking", e), r() && (this.Bf = e, this.Ff());
		}, 150, { leading: !0 })), w(this, "Ff", mr(() => {
			if (!this.Bf) return;
			this.Df = !0;
			let { waiting: e, playing: t } = this.nf;
			e.set(!0), t.set(!1);
			let n = this.createEvent("waiting", { trigger: this.Bf });
			this.zf.set("waiting", n), this.el.dispatchEvent(n), this.Bf = void 0, this.Df = !1;
		}, 300)), this.mf = t, this.j = n, this.nf = n.$store;
	}
	onAttach(e) {
		e.setAttribute("aria-busy", "true");
	}
	onConnect(e) {
		this.Mf(), this.Nf(), this.Of(), this.listen("fullscreen-change", this["fullscreen-change"].bind(this)), this.listen("fullscreen-error", this["fullscreen-error"].bind(this));
	}
	N(e) {
		var t;
		let n = e.type;
		(t = this[e.type]) == null || t.call(this, e);
		var r;
		wr.has(n) && this.zf.set(n, e), (r = this.el) == null || r.dispatchEvent(e);
	}
	Cf() {
		this.Hf(), this.mf.pf = !1, this.mf.rf = !1, this.Df = !1, this.Bf = void 0, this.zf.clear();
	}
	Af(e, t) {
		this.mf.Ze.cf(e, (e) => {
			t.request = e, b(t, e);
		});
	}
	Mf() {
		this.Ef(), this.If();
		let e = this.j.textTracks;
		x(e, "add", this.Ef.bind(this)), x(e, "remove", this.Ef.bind(this)), x(e, "mode-change", this.If.bind(this));
	}
	Nf() {
		let e = this.j.qualities;
		x(e, "add", this.Jf.bind(this)), x(e, "remove", this.Jf.bind(this)), x(e, "change", this.Pf.bind(this)), x(e, "auto-change", this.Qf.bind(this)), x(e, "readonly-change", this.Rf.bind(this));
	}
	Of() {
		let e = this.j.audioTracks;
		x(e, "add", this.Kf.bind(this)), x(e, "remove", this.Kf.bind(this)), x(e, "change", this.Sf.bind(this));
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
		b(e, this.zf.get("play")), b(e, this.zf.get("can-play")), this.nf.autoplayError.set(void 0);
	}
	"autoplay-fail"(e) {
		b(e, this.zf.get("play-fail")), b(e, this.zf.get("can-play")), this.nf.autoplayError.set(e.detail), this.Cf();
	}
	"can-load"(e) {
		this.nf.canLoad.set(!0), this.zf.set("can-load", e), this.Af("load", e), this.j.textTracks[xr]();
	}
	"media-type-change"(e) {
		b(e, this.zf.get("source-change"));
		let t = this.nf.viewType();
		this.nf.mediaType.set(e.detail), t !== this.nf.viewType() && setTimeout(() => this.dispatch("view-type-change", {
			detail: this.nf.viewType(),
			trigger: e
		}), 0);
	}
	"stream-type-change"(e) {
		let { streamType: t, inferredStreamType: n } = this.nf;
		b(e, this.zf.get("source-change")), n.set(e.detail), e.detail = t();
	}
	"rate-change"(e) {
		this.nf.playbackRate.set(e.detail), this.Af("rate", e);
	}
	"sources-change"(e) {
		this.nf.sources.set(e.detail);
	}
	"source-change"(e) {
		var t;
		if (b(e, this.zf.get("sources-change")), this.nf.source.set(e.detail), (t = this.el) == null || t.setAttribute("aria-busy", "true"), this.Gf) {
			this.Gf = !1;
			return;
		}
		this.j.audioTracks[tn](e), this.j.qualities[tn](e), this.Cf(), $n(this.j.$store), this.zf.set(e.type, e);
	}
	abort(e) {
		b(e, this.zf.get("source-change")), b(e, this.zf.get("can-load"));
	}
	"load-start"(e) {
		b(e, this.zf.get("source-change"));
	}
	error(e) {
		this.nf.error.set(e.detail), b(e, this.zf.get("abort"));
	}
	"loaded-metadata"(e) {
		b(e, this.zf.get("load-start"));
	}
	"loaded-data"(e) {
		b(e, this.zf.get("load-start"));
	}
	"can-play"(e) {
		var t, n;
		((t = e.trigger) == null ? void 0 : t.type) !== "loadedmetadata" && b(e, this.zf.get("loaded-metadata")), this.Lf(e.detail), (n = this.el) == null || n.setAttribute("aria-busy", "false");
	}
	"can-play-through"(e) {
		this.Lf(e.detail), b(e, this.zf.get("can-play"));
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
		b(e, this.zf.get("waiting")), this.Af("play", e), t.set(!1), n.set(void 0), (r() || this.mf.pf) && (this.mf.pf = !1, r.set(!1), this.N(this.createEvent("replay", { trigger: e })));
	}
	"play-fail"(e) {
		b(e, this.zf.get("play")), this.Af("play", e);
		let { paused: t, playing: n } = this.nf;
		t.set(!0), n.set(!1), this.Cf();
	}
	playing(e) {
		let t = this.zf.get("play");
		t ? (b(e, this.zf.get("waiting")), b(e, t)) : b(e, this.zf.get("seeked")), setTimeout(() => this.Cf(), 0);
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
				var a;
				let e = (a = r()) == null ? i() - 2 : a;
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
		b(e, this.zf.get("seeked")), this.Af("pause", e);
		let { paused: t, playing: n, seeking: r } = this.nf;
		t.set(!0), n.set(!1), r.set(!1), this.Cf();
	}
	"time-update"(e) {
		let { currentTime: t, played: n, waiting: r } = this.nf, i = e.detail;
		t.set(i.currentTime), n.set(i.played), r.set(!1);
		for (let t of this.j.textTracks) t[br](i.currentTime, e);
	}
	"volume-change"(e) {
		let { volume: t, muted: n } = this.nf, r = e.detail;
		t.set(r.volume), n.set(r.muted || r.volume === 0), this.Af("volume", e);
	}
	seeked(e) {
		let { seeking: t, currentTime: n, paused: r, duration: i, ended: a } = this.nf;
		if (this.mf.$a) t.set(!0), e.stopImmediatePropagation();
		else if (t()) {
			var o;
			let s = this.zf.get("waiting");
			b(e, s), (s == null || (o = s.trigger) == null ? void 0 : o.type) !== "seeking" && b(e, this.zf.get("seeking")), r() && this.Hf(), t.set(!1), e.detail !== i() && a.set(!1), n.set(e.detail), this.Af("seeked", e);
			let c = e.originEvent;
			c && c.isTrusted && !/seek/.test(c.type) && this.started(e);
		}
	}
	waiting(e) {
		this.Df || this.mf.$a || (e.stopImmediatePropagation(), this.Bf = e, this.Ff());
	}
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
}, Er = class extends T {
	onAttach(e) {
		_(this.Tf.bind(this)), _(this.Uf.bind(this)), _(this.Vf.bind(this)), _(this.Wf.bind(this)), _(this.Xf.bind(this)), _(this.Yf.bind(this)), _(this.Zf.bind(this)), _(this._f.bind(this)), _(this.$f.bind(this)), _(this.ag.bind(this));
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
function Dr(e, t = "preconnect") {
	if (!d(document.querySelector(`link[href="${e}"]`))) return !0;
	let n = document.createElement("link");
	return n.rel = t, n.href = e, n.crossOrigin = "true", document.head.append(n), !0;
}
var Or = {};
function kr(e) {
	if (Or[e]) return Or[e].promise;
	let t = ge();
	if (!d(document.querySelector(`script[src="${e}"]`))) return t.resolve(), t.promise;
	let n = document.createElement("script");
	return n.src = e, n.onload = () => {
		t.resolve(), delete Or[e];
	}, n.onerror = () => {
		t.reject(), delete Or[e];
	}, setTimeout(() => document.head.append(n), 0), t.promise;
}
function Ar(e) {
	return e === "use-credentials" ? "include" : C(e) ? "same-origin" : void 0;
}
function jr(e, t) {
	for (let n = 0, r = t.length; n < r; n++) if (Mr(t[n], e)) return t[n];
	return null;
}
function Mr(e, t) {
	return t >= e.startTime && t < e.endTime;
}
function Nr(e, t, n) {
	let r = e.toArray().find((e) => e.kind === "chapters" && e.mode === "showing");
	if (r !== t) {
		if (!r) {
			n(null);
			return;
		}
		r.readyState == 2 ? n(r) : (n(null), r.addEventListener("load", () => n(r), { once: !0 }));
	}
}
var Pr = class extends ve {
	static createId(e) {
		var t;
		return `id::${e.type}-${e.kind}-${(t = e.src) == null ? e.label : t}`;
	}
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
		return this[U];
	}
	get mode() {
		return this.Ga;
	}
	set mode(e) {
		this.setMode(e);
	}
	constructor(e) {
		super(), w(this, "src", void 0), w(this, "content", void 0), w(this, "type", void 0), w(this, "encoding", void 0), w(this, "id", ""), w(this, "label", ""), w(this, "language", ""), w(this, "kind", void 0), w(this, "default", !1), w(this, "Ia", !1), w(this, "Ea", 0), w(this, "Ga", "disabled"), w(this, "Ja", {}), w(this, "Ha", []), w(this, "Da", []), w(this, "Fa", []), w(this, U, 0), w(this, yr, void 0), w(this, Sr, null), w(this, W, null);
		for (let t of Object.keys(e)) this[t] = e[t];
		this.type || (this.type = "vtt"), e.content ? import("./prod-CIp3osj0.js").then((e) => e.t).then(({ parseText: t, VTTCue: n, VTTRegion: r }) => {
			e.type === "json" ? this.Ka(e.content, n, r) : t(e.content, { type: e.type }).then(({ cues: e, regions: t }) => {
				this.Da = e, this.Ha = t, this.La();
			});
		}) : e.src || (this[U] = 2);
	}
	addCue(e, t) {
		let n = 0, r = this.Da.length;
		for (n = 0; n < r && !(e.endTime <= this.Da[n].startTime); n++);
		if (n === r ? this.Da.push(e) : this.Da.splice(n, 0, e), (t == null ? void 0 : t.type) !== "cuechange") {
			var i;
			(i = this[W]) == null || i.track.addCue(e);
		}
		this.dispatchEvent(new g("add-cue", {
			detail: e,
			trigger: t
		})), Mr(e, this.Ea) && this[br](this.Ea, t);
	}
	removeCue(e, t) {
		let n = this.Da.indexOf(e);
		if (n >= 0) {
			var r;
			let i = this.Fa.includes(e);
			this.Da.splice(n, 1), (r = this[W]) == null || r.track.removeCue(e), this.dispatchEvent(new g("remove-cue", {
				detail: e,
				trigger: t
			})), i && this[br](this.Ea, t);
		}
	}
	setMode(e, t) {
		var n;
		this.Ga !== e && (this.Ga = e, e === "disabled" ? (this.Fa = [], this.Ma()) : this.readyState === 2 ? this[br](this.Ea, t) : this.Na(), this.dispatchEvent(new g("mode-change", {
			detail: this,
			trigger: t
		})), (n = this[Sr]) == null || n.call(this));
	}
	[br](e, t) {
		if (this.Ea = e, this.mode === "disabled" || !this.Da.length) return;
		let n = [];
		for (let t = 0, r = this.Da.length; t < r; t++) {
			let r = this.Da[t];
			Mr(r, e) && n.push(r);
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
	[xr]() {
		this.Ia = !0, this.Ga !== "disabled" && this.Na();
	}
	async Na() {
		if (!(!this.Ia || !this.src || this[U] > 0)) {
			this[U] = 1, this.dispatchEvent(new g("load-start"));
			try {
				var e;
				let { parseResponse: n, VTTCue: r, VTTRegion: i } = await import("./prod-CIp3osj0.js").then((e) => e.t), a = (e = this[yr]) == null ? void 0 : e.call(this), o = fetch(this.src, {
					headers: this.type === "json" ? { "Content-Type": "application/json" } : void 0,
					credentials: Ar(a)
				});
				if (this.type === "json") this.Ka(await (await o).text(), r, i);
				else {
					var t;
					let { errors: e, metadata: r, regions: i, cues: a } = await n(o, {
						type: this.type,
						encoding: this.encoding
					});
					if (((t = e[0]) == null ? void 0 : t.code) === 0) throw e[0];
					this.Ja = r, this.Ha = i, this.Da = a;
				}
				this.La();
			} catch (e) {
				this.Oa(e);
			}
		}
	}
	La() {
		if (this[U] = 2, !this.src || this.type !== "vtt") {
			var e;
			let t = (e = this[W]) == null ? void 0 : e.track;
			if (t) for (let e of this.Da) t.addCue(e);
		}
		let t = new g("load");
		this[br](this.Ea, t), this.dispatchEvent(t);
	}
	Oa(e) {
		this[U] = 3, this.dispatchEvent(new g("error", { detail: e }));
	}
	Ka(e, t, n) {
		try {
			e = JSON.parse(e), e.regions && (this.Ha = e.regions.map((e) => Object.assign(new n(), e))), e.cues && (this.Da = e.cues.filter((e) => ne(e.startTime) && ne(e.endTime)).map((e) => Object.assign(new t(0, 0, ""), e)));
		} catch (e) {
			this.Oa(e);
		}
	}
	Ma(e) {
		this.dispatchEvent(new g("cue-change", { trigger: e }));
	}
}, Fr = /captions|subtitles/;
function G(e) {
	return Fr.test(e.kind);
}
var Ir = class {
	constructor(e) {
		w(this, "Z", null), w(this, "Y", null), w(this, "_", -1), this.$ = e;
	}
	setTarget(e) {
		this.Z = e;
	}
	getPlayer(e) {
		var t;
		return this.Y || (t = e == null ? this.Z : e) == null || t.dispatchEvent(new g("find-media-player", {
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
		let t = this.getPlayer(e == null ? void 0 : e.target);
		t && (t.state.paused ? this.play(e) : this.pause(e));
	}
	toggleUserIdle(e) {
		let t = this.getPlayer(e == null ? void 0 : e.target);
		t && t.user.idle(!t.user.idling, 0, e);
	}
	toggleMuted(e) {
		let t = this.getPlayer(e == null ? void 0 : e.target);
		t && (t.state.muted ? this.unmute(e) : this.mute(e));
	}
	toggleFullscreen(e, t) {
		let n = this.getPlayer(t == null ? void 0 : t.target);
		n && (n.state.fullscreen ? this.exitFullscreen(e, t) : this.enterFullscreen(e, t));
	}
	togglePictureInPicture(e) {
		let t = this.getPlayer(e == null ? void 0 : e.target);
		t && (t.state.pictureInPicture ? this.exitPictureInPicture(e) : this.enterPictureInPicture(e));
	}
	toggleCaptions(e) {
		let t = this.getPlayer(e == null ? void 0 : e.target);
		if (!t) return;
		let n = t.state.textTracks, r = t.state.textTrack;
		if (r) {
			let t = n.indexOf(r);
			this.changeTextTrackMode(t, "disabled", e), this._ = t;
		} else {
			let t = this._;
			(!n[t] || !G(n[t])) && (t = -1), t === -1 && (t = n.findIndex((e) => G(e) && e.default)), t === -1 && (t = n.findIndex((e) => G(e))), t >= 0 && this.changeTextTrackMode(t, "showing", e), this._ = -1;
		}
	}
	X(e, t, n) {
		var r, i;
		let a = new g(e, {
			bubbles: !0,
			composed: !0,
			detail: n,
			trigger: t
		}), o = t != null && t.target && (t.target === document || t.target === window || t.target === document.body || this.Y && !this.Y.contains(t.target)) ? (r = this.Z) == null ? this.getPlayer() : r : (i = t == null ? void 0 : t.target) == null ? this.Z : i;
		o == null || o.dispatchEvent(a);
	}
	aa(e) {}
}, Lr = class extends T {
	constructor(...e) {
		super(...e), w(this, "j", void 0);
	}
	onConnect() {
		this.j = H(), _(this.cg.bind(this));
	}
	cg() {
		let { canLoad: e, thumbnailCues: t } = this.j.$store;
		if (!e()) return;
		let n = new AbortController(), { crossorigin: r, thumbnails: i } = this.j.$store, a = i();
		if (a) return import("./prod-CIp3osj0.js").then((e) => e.t).then(({ parseResponse: e }) => {
			e(fetch(a, {
				signal: n.signal,
				credentials: Ar(r())
			})).then(({ cues: e }) => t.set(e)).catch(oe);
		}), () => {
			n.abort(), t.set([]);
		};
	}
}, Rr = class extends tr {
	getById(e) {
		var t;
		return e === "" || (t = this.a.find((t) => t.id === e)) == null ? null : t;
	}
}, zr = class {
	constructor() {
		w(this, "priority", 0), w(this, "eg", !0), w(this, "qa", null), w(this, "ya", null), w(this, "dg", /* @__PURE__ */ new Set());
	}
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
		var t, n;
		(t = e[W]) == null || (n = t.remove) == null || n.call(t), e[W] = null, this.dg.delete(e);
	}
	changeTrack(e) {
		let t = e == null ? void 0 : e[W];
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
		var t;
		if (!this.qa) return;
		let n = (t = e[W]) == null ? e[W] = this.hg(e) : t;
		n instanceof HTMLElement && (this.qa.append(n), n.track.mode = n.default ? "showing" : "hidden");
	}
	hg(e) {
		let t = document.createElement("track"), n = e.default || e.mode === "showing", r = e.src && e.type === "vtt";
		return t.id = e.id, t.src = r ? e.src : "https://cdn.jsdelivr.net/npm/vidstack@0.6.12/empty.vtt", t.label = e.label, t.kind = e.kind, t.default = n, e.language && (t.srclang = e.language), n && !r && this.fg(e, t.track), t;
	}
	fg(e, t) {
		var n;
		if (!(e.src && e.type === "vtt" || (n = t.cues) != null && n.length)) for (let n of e.cues) t.addCue(n);
	}
	Hc(e) {
		for (let n of this.dg) {
			var t;
			let r = (t = n[W]) == null ? void 0 : t.track;
			if (!r) continue;
			if (!this.eg) {
				r.mode = "disabled";
				continue;
			}
			let i = r.mode === "showing";
			i && this.fg(n, r), n.setMode(i ? "showing" : "disabled", e);
		}
	}
}, Br = class {
	constructor(e) {
		w(this, "qa", null), w(this, "pa", void 0), w(this, "oa", []), w(this, "sa", !1), w(this, "la", null), w(this, "ma", null), this.j = e;
		let t = e.textTracks;
		this.pa = t, _(this.ua.bind(this)), p(this.ra.bind(this)), x(t, "add", this.va.bind(this)), x(t, "remove", this.wa.bind(this)), x(t, "mode-change", this.na.bind(this));
	}
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
	[vr](e) {
		requestAnimationFrame(() => {
			if (this.qa = e, e) {
				this.la = new zr(), this.la.attach(e);
				for (let e of this.pa) this.ta(e);
			}
			this.na();
		});
	}
	ta(e) {
		var t;
		G(e) && ((t = this.la) == null || t.addTrack(e));
	}
	xa(e) {
		var t;
		G(e) && ((t = this.la) == null || t.removeTrack(e));
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
		if (this.sa || e != null && e[Cr]) {
			var t;
			(t = this.ma) == null || t.changeTrack(null), this.la.setDisplay(!0), this.la.changeTrack(e);
			return;
		}
		if (this.la.setDisplay(!1), this.la.changeTrack(null), !e) {
			var n;
			(n = this.ma) == null || n.changeTrack(null);
			return;
		}
		let r = this.oa.sort((e, t) => e.priority - t.priority).find((t) => t.canRender(e));
		if (this.ma !== r) {
			var i;
			(i = this.ma) == null || i.detach(), r == null || r.attach(this.qa), this.ma = r == null ? null : r;
		}
		r == null || r.changeTrack(e);
	}
	ra() {
		var e, t;
		(e = this.la) == null || e.detach(), this.la = null, (t = this.ma) == null || t.detach(), this.ma = null;
	}
}, Vr = class extends ln {
	constructor(...e) {
		super(...e), w(this, "Ia", !1), w(this, "Pa", {}), w(this, yr, void 0), w(this, "Qa", this.Ra.bind(this));
	}
	get selected() {
		let e = this.a.find((e) => e.mode === "showing" && G(e));
		return e == null ? null : e;
	}
	add(e, t) {
		let n = e instanceof Pr ? e : new Pr(e);
		return this.Pa[e.kind] && e.default && delete e.default, n.addEventListener("mode-change", this.Qa), this[$t](n, t), n[yr] = this[yr], this.Ia && n[xr](), e.default && (this.Pa[e.kind] = n, n.mode = "showing"), this;
	}
	remove(e, t) {
		if (this.a.includes(e)) return e === this.Pa[e.kind] && delete this.Pa[e.kind], e.mode = "disabled", e[Sr] = null, e.removeEventListener("mode-change", this.Qa), this[en](e, t), this;
	}
	clear(e) {
		for (let t of this.a) this.remove(t, e);
		return this;
	}
	getById(e) {
		var t;
		return (t = this.a.find((t) => t.id === e)) == null ? null : t;
	}
	getByKind(e) {
		let t = Array.isArray(e) ? e : [e];
		return this.a.filter((e) => t.includes(e.kind));
	}
	[xr]() {
		if (!this.Ia) {
			for (let e of this.a) e[xr]();
			this.Ia = !0;
		}
	}
	Ra(e) {
		let t = e.detail;
		if (t.mode === "showing") {
			let e = G(t) ? ["captions", "subtitles"] : [t.kind];
			for (let n of this.a) n.mode === "showing" && n != t && e.includes(n.kind) && (n.mode = "disabled");
		}
		this.dispatchEvent(new g("mode-change", {
			detail: e.detail,
			trigger: e
		}));
	}
}, Hr = class {
	constructor(e, t, n) {
		w(this, "Ie", void 0), this.l = e, this.j = t, this.k = n;
		let r = new Yt(), i = new Jt(), a = new Kt();
		this.Ie = u(() => t.$props.preferNativeHLS() ? [
			i,
			a,
			r
		] : [
			r,
			i,
			a
		]), _(this.Ke.bind(this)), _(this.Le.bind(this)), _(this.Me.bind(this)), _(this.Ne.bind(this));
	}
	Ke() {
		this.j.delegate.p("sources-change", { detail: [...Ur(this.j.$props.src()), ...this.l()] });
	}
	Le() {
		var t;
		let { $store: n } = this.j, r = n.sources(), i = e(n.source), a = this.Je(i, r);
		if ((t = r[0]) != null && t.src && !a.src && !a.type) {
			let { crossorigin: t } = n, i = Ar(t()), a = new AbortController();
			return Promise.all(r.map((e) => C(e.src) && e.type === "?" ? fetch(e.src, {
				method: "HEAD",
				credentials: i,
				signal: a.signal
			}).then((t) => (e.type = t.headers.get("content-type") || "??", e)).catch(() => e) : e)).then((t) => {
				a.signal.aborted || (this.Je(e(n.source), t), v());
			}), () => a.abort();
		}
		v();
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
		t.src === e.src && t.type === e.type || (this.j.delegate.p("source-change", { detail: t }), this.j.delegate.p("media-type-change", { detail: (n == null ? void 0 : n.mediaType(t)) || "unknown" }));
	}
	Pe(t, n) {
		n !== t && (this.j.delegate.p("provider-change", { detail: null }), n && e(() => {
			var e;
			return (e = n.preconnect) == null ? void 0 : e.call(n, this.j);
		}), this.k.set(n), this.j.delegate.p("provider-loader-change", { detail: n }));
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
			e(() => {
				var e;
				return (e = t.preconnect) == null ? void 0 : e.call(t, this.j);
			});
		}
	}
	Ne() {
		let t = this.j.$provider(), n = this.j.$store.source();
		if (this.j.$store.canLoad()) {
			e(() => t == null ? void 0 : t.loadSource(n, e(this.j.$store.preload)));
			return;
		}
		try {
			C(n.src) && Dr(new URL(n.src).origin, "preconnect");
		} catch {}
	}
};
function Ur(e) {
	return (f(e) ? e : [!C(e) && "src" in e ? e : { src: e }]).map(({ src: e, type: t }) => ({
		src: e,
		type: t == null ? !C(e) || e.startsWith("blob:") ? "video/object" : "?" : t
	}));
}
var Wr = class {
	constructor(e, t) {
		w(this, "Ge", []), this.m = e, this.j = t, _(this.He.bind(this));
	}
	He() {
		let e = [...this.j.$props.textTracks(), ...this.m()];
		for (let t of this.Ge) if (!e.some((e) => e.id === t.id)) {
			let e = t.id && this.j.textTracks.getById(t.id);
			e && this.j.textTracks.remove(e);
		}
		for (let t of e) {
			let e = t.id || Pr.createId(t);
			this.j.textTracks.getById(e) || (t.id = e, this.j.textTracks.add(t));
		}
		this.Ge = e;
	}
}, Gr = class extends E {
	constructor(e) {
		super(e), w(this, "j", void 0), w(this, "l", h([])), w(this, "m", h([])), w(this, "k", h(null)), this.j = H(), new Hr(this.l, this.j, this.k), new Wr(this.m, this.j);
	}
	onAttach(e) {
		e.setAttribute("keep-alive", "");
	}
	onConnect(e) {
		let t = new ResizeObserver(Ee(this.n.bind(this)));
		t.observe(e);
		let n = new MutationObserver(this.o.bind(this));
		return n.observe(e, {
			attributes: !0,
			childList: !0
		}), Sn && x(e, "touchstart", (e) => e.preventDefault(), { passive: !1 }), Ln(() => {
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
		this.l.set(e), this.m.set(t), v();
	}
	render() {
		let t;
		return p(() => {
			var e;
			return t == null || (e = t.destroy) == null ? void 0 : e.call(t);
		}), () => {
			t == null || t.destroy();
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
};
w(Gr, "el", F({ tagName: "media-outlet" }));
var Kr = class extends T {
	constructor(e, t) {
		super(e), this.ig = t;
	}
	onAttach(e) {
		let { $props: t, ariaKeys: n } = H(), r = e.getAttribute("aria-keyshortcuts");
		if (r) {
			n[this.ig] = r, p(() => {
				delete n[this.ig];
			});
			return;
		}
		let i = t.keyShortcuts()[this.ig];
		i && e.setAttribute("aria-keyshortcuts", i);
	}
}, qr = /* @__PURE__ */ O("<!$><svg viewBox=\"0 0 32 32\" fill=\"none\" aria-hidden=\"true\" focusable=\"false\" data-media-icon=\"true\"></svg>");
function K({ slot: e, part: t, paths: n, rotate: r }) {
	return (() => {
		let [i, a] = k(qr);
		return M(i, "data-rotate", r), M(i, "slot", e), M(i, "part", t), Qe || (i.innerHTML = n), i;
	})();
}
//#endregion
//#region node_modules/vidstack/dist/prod/media-ui.js
function q(e, t = 2) {
	return Number(e.toFixed(t));
}
function Jr(e) {
	var t, n;
	return (t = (n = String(e).split(".")[1]) == null ? void 0 : n.length) == null ? 0 : t;
}
function Yr(e, t, n) {
	return Math.max(e, Math.min(n, t));
}
var Xr = h(!1);
x(document, "pointerdown", () => {
	Xr.set(!1);
}), x(document, "keydown", (e) => {
	e.metaKey || e.altKey || e.ctrlKey || Xr.set(!0);
});
var J = class extends T {
	constructor(...e) {
		super(...e), w(this, "Qe", h(!1));
	}
	onConnect(e) {
		_(() => {
			if (!Xr()) {
				this.Qe.set(!1), Zr(e, !1), this.listen("pointerenter", this.Re.bind(this)), this.listen("pointerleave", this.Se.bind(this));
				return;
			}
			let t = document.activeElement === e;
			this.Qe.set(t), Zr(e, t), this.listen("focus", this.Te.bind(this)), this.listen("blur", this.Ue.bind(this));
		});
	}
	focused() {
		return this.Qe();
	}
	Te() {
		this.Qe.set(!0), Zr(this.el, !0);
	}
	Ue() {
		this.Qe.set(!1), Zr(this.el, !1);
	}
	Re() {
		Qr(this.el, !0);
	}
	Se() {
		Qr(this.el, !1);
	}
};
function Zr(e, t) {
	a(e, "data-focus", t), a(e, "data-hocus", t);
}
function Qr(e, t) {
	a(e, "data-hocus", t), a(e, "data-hover", t);
}
var $r = t();
w(class extends E {
	onAttach(e) {
		ee($r) && Ln(() => {
			e.isConnected && m($r).bb(e);
		}), this.setAttributes({ position: this.$props.position });
	}
}, "el", F({
	tagName: "media-tooltip",
	props: { position: "top center" }
}));
var ei = 0, ti = class extends T {
	constructor(e) {
		super(e), c($r, { bb: this.bb.bind(this) });
	}
	bb(e) {
		let t = `media-tooltip-${++ei}`;
		a(this.el, "aria-describedby", t), a(e, "id", t), a(e, "role", "tooltip"), this.el.removeAttribute("aria-label");
	}
}, ni = Object.defineProperty, ri = Object.getOwnPropertyDescriptor, ii = (e, t, n, r) => {
	for (var i = r > 1 ? void 0 : r ? ri(t, n) : t, a = e.length - 1, o; a >= 0; a--) (o = e[a]) && (i = (r ? o(t, n, i) : o(i)) || i);
	return r && i && ni(t, n, i), i;
}, ai = {
	disabled: !1,
	defaultPressed: !1,
	defaultAppearance: !1
}, Y = class extends E {
	constructor(e) {
		super(e), w(this, "cb", h(!1)), w(this, "db", void 0), new J(e), new ti(e), this.db && new Kr(e, this.db);
	}
	get pressed() {
		return e(this.cb);
	}
	onAttach(e) {
		l(this.cb) && this.cb.set(this.$props.defaultPressed()), B(e, "tabindex", "0"), B(e, "role", "button");
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
		In(e, this.fb.bind(this));
	}
	eb() {
		return be(this.cb());
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
w(Y, "el", F({
	tagName: "media-toggle-button",
	props: ai
})), ii([jt], Y.prototype, "pressed", 1);
var oi = "<path d=\"M8.66667 6.66667C8.29848 6.66667 8 6.96514 8 7.33333V24.6667C8 25.0349 8.29848 25.3333 8.66667 25.3333H12.6667C13.0349 25.3333 13.3333 25.0349 13.3333 24.6667V7.33333C13.3333 6.96514 13.0349 6.66667 12.6667 6.66667H8.66667Z\" fill=\"currentColor\"/> <path d=\"M19.3333 6.66667C18.9651 6.66667 18.6667 6.96514 18.6667 7.33333V24.6667C18.6667 25.0349 18.9651 25.3333 19.3333 25.3333H23.3333C23.7015 25.3333 24 25.0349 24 24.6667V7.33333C24 6.96514 23.7015 6.66667 23.3333 6.66667H19.3333Z\" fill=\"currentColor\"/>", si = "<path d=\"M10.6667 6.6548C10.6667 6.10764 11.2894 5.79346 11.7295 6.11862L24.377 15.4634C24.7377 15.7298 24.7377 16.2692 24.3771 16.5357L11.7295 25.8813C11.2895 26.2065 10.6667 25.8923 10.6667 25.3451L10.6667 6.6548Z\" fill=\"currentColor\"/>", ci = "<path d=\"M15.6038 12.2147C16.0439 12.5399 16.6667 12.2257 16.6667 11.6786V10.1789C16.6667 10.1001 16.7351 10.0384 16.8134 10.0479C20.1116 10.4494 22.6667 13.2593 22.6667 16.6659C22.6667 20.3481 19.6817 23.3332 15.9995 23.3332C12.542 23.3332 9.69927 20.7014 9.36509 17.332C9.32875 16.9655 9.03371 16.6662 8.66548 16.6662L6.66655 16.6666C6.29841 16.6666 5.99769 16.966 6.02187 17.3334C6.36494 22.5454 10.7012 26.6667 16 26.6667C21.5228 26.6667 26 22.1895 26 16.6667C26 11.4103 21.9444 7.10112 16.7916 6.69757C16.7216 6.69209 16.6667 6.63396 16.6667 6.56372V4.98824C16.6667 4.44106 16.0439 4.12689 15.6038 4.45206L11.0765 7.79738C10.7159 8.06387 10.7159 8.60326 11.0766 8.86973L15.6038 12.2147Z\" fill=\"currentColor\"/>";
w(class extends Y {
	constructor(...e) {
		super(...e), w(this, "j", void 0), w(this, "db", "togglePaused");
	}
	onAttach(e) {
		this.j = H(), this.cb = this.hb.bind(this), super.onAttach(e), V(e, this.ib.bind(this));
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
			j(K, {
				paths: si,
				slot: "play"
			}),
			j(K, {
				paths: ci,
				slot: "replay"
			}),
			j(K, {
				paths: oi,
				slot: "pause"
			})
		];
	}
}, "el", F({
	tagName: "media-play-button",
	props: ai
}));
var li = "<path d=\"M8 28.0003C8 27.6321 8.29848 27.3336 8.66667 27.3336H23.3333C23.7015 27.3336 24 27.6321 24 28.0003V29.3336C24 29.7018 23.7015 30.0003 23.3333 30.0003H8.66667C8.29848 30.0003 8 29.7018 8 29.3336V28.0003Z\" fill=\"currentColor\"/> <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M4.66602 6.66699C4.29783 6.66699 3.99935 6.96547 3.99935 7.33366V24.667C3.99935 25.0352 4.29783 25.3337 4.66602 25.3337H27.3327C27.7009 25.3337 27.9994 25.0352 27.9994 24.667V7.33366C27.9994 6.96547 27.7009 6.66699 27.3327 6.66699H4.66602ZM8.66659 21.3333C8.2984 21.3333 7.99992 21.0349 7.99992 20.6667V11.3333C7.99992 10.9651 8.2984 10.6667 8.66659 10.6667H13.9999C14.3681 10.6667 14.6666 10.9651 14.6666 11.3333V12.6667C14.6666 13.0349 14.3681 13.3333 13.9999 13.3333H10.7999C10.7263 13.3333 10.6666 13.393 10.6666 13.4667V18.5333C10.6666 18.607 10.7263 18.6667 10.7999 18.6667H13.9999C14.3681 18.6667 14.6666 18.9651 14.6666 19.3333V20.6667C14.6666 21.0349 14.3681 21.3333 13.9999 21.3333H8.66659ZM17.9999 21.3333C17.6317 21.3333 17.3333 21.0349 17.3333 20.6667V11.3333C17.3333 10.9651 17.6317 10.6667 17.9999 10.6667H23.3333C23.7014 10.6667 23.9999 10.9651 23.9999 11.3333V12.6667C23.9999 13.0349 23.7014 13.3333 23.3333 13.3333H20.1333C20.0596 13.3333 19.9999 13.393 19.9999 13.4667V18.5333C19.9999 18.607 20.0596 18.6667 20.1333 18.6667H23.3333C23.7014 18.6667 23.9999 18.9651 23.9999 19.3333V20.6667C23.9999 21.0349 23.7014 21.3333 23.3333 21.3333H17.9999Z\" fill=\"currentColor\"/>", ui = "<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M4.6661 6.66699C4.29791 6.66699 3.99943 6.96547 3.99943 7.33366V24.667C3.99943 25.0352 4.29791 25.3337 4.6661 25.3337H27.3328C27.701 25.3337 27.9994 25.0352 27.9994 24.667V7.33366C27.9994 6.96547 27.701 6.66699 27.3328 6.66699H4.6661ZM8.66667 21.3333C8.29848 21.3333 8 21.0349 8 20.6667V11.3333C8 10.9651 8.29848 10.6667 8.66667 10.6667H14C14.3682 10.6667 14.6667 10.9651 14.6667 11.3333V12.6667C14.6667 13.0349 14.3682 13.3333 14 13.3333H10.8C10.7264 13.3333 10.6667 13.393 10.6667 13.4667V18.5333C10.6667 18.607 10.7264 18.6667 10.8 18.6667H14C14.3682 18.6667 14.6667 18.9651 14.6667 19.3333V20.6667C14.6667 21.0349 14.3682 21.3333 14 21.3333H8.66667ZM18 21.3333C17.6318 21.3333 17.3333 21.0349 17.3333 20.6667V11.3333C17.3333 10.9651 17.6318 10.6667 18 10.6667H23.3333C23.7015 10.6667 24 10.9651 24 11.3333V12.6667C24 13.0349 23.7015 13.3333 23.3333 13.3333H20.1333C20.0597 13.3333 20 13.393 20 13.4667V18.5333C20 18.607 20.0597 18.6667 20.1333 18.6667H23.3333C23.7015 18.6667 24 18.9651 24 19.3333V20.6667C24 21.0349 23.7015 21.3333 23.3333 21.3333H18Z\" fill=\"currentColor\"/>";
function di(e) {
	return e ? "true" : "false";
}
function X(e) {
	return () => di(e());
}
w(class extends Y {
	constructor(...e) {
		super(...e), w(this, "j", void 0), w(this, "db", "toggleCaptions");
	}
	onAttach(e) {
		this.j = H(), this.cb = this.hb.bind(this), super.onAttach(e), V(e, this.ib.bind(this)), this.setAttributes({ "aria-hidden": X(this.jb.bind(this)) });
	}
	gb(e) {
		this.j.remote.toggleCaptions(e);
	}
	hb() {
		let { textTrack: e } = this.j.$store, t = e();
		return !!t && G(t);
	}
	jb() {
		let { textTracks: e } = this.j.$store;
		return e().filter(G).length == 0;
	}
	ib() {
		let { textTrack: e } = this.j.$store;
		return e() ? "Closed-Captions Off" : "Closed-Captions On";
	}
	render() {
		return [j(K, {
			paths: li,
			slot: "on"
		}), j(K, {
			paths: ui,
			slot: "off"
		})];
	}
}, "el", F({
	tagName: "media-caption-button",
	props: ai
}));
var fi = "<path d=\"M19.3334 13.3333C18.9652 13.3333 18.6667 13.0349 18.6667 12.6667L18.6667 7.33333C18.6667 6.96514 18.9652 6.66666 19.3334 6.66666H21.3334C21.7015 6.66666 22 6.96514 22 7.33333V9.86666C22 9.9403 22.0597 10 22.1334 10L24.6667 10C25.0349 10 25.3334 10.2985 25.3334 10.6667V12.6667C25.3334 13.0349 25.0349 13.3333 24.6667 13.3333L19.3334 13.3333Z\" fill=\"currentColor\"/> <path d=\"M13.3334 19.3333C13.3334 18.9651 13.0349 18.6667 12.6667 18.6667H7.33335C6.96516 18.6667 6.66669 18.9651 6.66669 19.3333V21.3333C6.66669 21.7015 6.96516 22 7.33335 22H9.86669C9.94032 22 10 22.0597 10 22.1333L10 24.6667C10 25.0349 10.2985 25.3333 10.6667 25.3333H12.6667C13.0349 25.3333 13.3334 25.0349 13.3334 24.6667L13.3334 19.3333Z\" fill=\"currentColor\"/> <path d=\"M18.6667 24.6667C18.6667 25.0349 18.9652 25.3333 19.3334 25.3333H21.3334C21.7015 25.3333 22 25.0349 22 24.6667V22.1333C22 22.0597 22.0597 22 22.1334 22H24.6667C25.0349 22 25.3334 21.7015 25.3334 21.3333V19.3333C25.3334 18.9651 25.0349 18.6667 24.6667 18.6667L19.3334 18.6667C18.9652 18.6667 18.6667 18.9651 18.6667 19.3333L18.6667 24.6667Z\" fill=\"currentColor\"/> <path d=\"M10.6667 13.3333H12.6667C13.0349 13.3333 13.3334 13.0349 13.3334 12.6667L13.3334 10.6667V7.33333C13.3334 6.96514 13.0349 6.66666 12.6667 6.66666H10.6667C10.2985 6.66666 10 6.96514 10 7.33333L10 9.86666C10 9.9403 9.94033 10 9.86669 10L7.33335 10C6.96516 10 6.66669 10.2985 6.66669 10.6667V12.6667C6.66669 13.0349 6.96516 13.3333 7.33335 13.3333L10.6667 13.3333Z\" fill=\"currentColor\"/>", pi = "<path d=\"M25.3299 7.26517C25.2958 6.929 25.0119 6.66666 24.6667 6.66666H19.3334C18.9652 6.66666 18.6667 6.96514 18.6667 7.33333V9.33333C18.6667 9.70152 18.9652 10 19.3334 10L21.8667 10C21.9403 10 22 10.0597 22 10.1333V12.6667C22 13.0349 22.2985 13.3333 22.6667 13.3333H24.6667C25.0349 13.3333 25.3334 13.0349 25.3334 12.6667V7.33333C25.3334 7.31032 25.3322 7.28758 25.3299 7.26517Z\" fill=\"currentColor\"/> <path d=\"M22 21.8667C22 21.9403 21.9403 22 21.8667 22L19.3334 22C18.9652 22 18.6667 22.2985 18.6667 22.6667V24.6667C18.6667 25.0349 18.9652 25.3333 19.3334 25.3333L24.6667 25.3333C25.0349 25.3333 25.3334 25.0349 25.3334 24.6667V19.3333C25.3334 18.9651 25.0349 18.6667 24.6667 18.6667H22.6667C22.2985 18.6667 22 18.9651 22 19.3333V21.8667Z\" fill=\"currentColor\"/> <path d=\"M12.6667 22H10.1334C10.0597 22 10 21.9403 10 21.8667V19.3333C10 18.9651 9.70154 18.6667 9.33335 18.6667H7.33335C6.96516 18.6667 6.66669 18.9651 6.66669 19.3333V24.6667C6.66669 25.0349 6.96516 25.3333 7.33335 25.3333H12.6667C13.0349 25.3333 13.3334 25.0349 13.3334 24.6667V22.6667C13.3334 22.2985 13.0349 22 12.6667 22Z\" fill=\"currentColor\"/> <path d=\"M10 12.6667V10.1333C10 10.0597 10.0597 10 10.1334 10L12.6667 10C13.0349 10 13.3334 9.70152 13.3334 9.33333V7.33333C13.3334 6.96514 13.0349 6.66666 12.6667 6.66666H7.33335C6.96516 6.66666 6.66669 6.96514 6.66669 7.33333V12.6667C6.66669 13.0349 6.96516 13.3333 7.33335 13.3333H9.33335C9.70154 13.3333 10 13.0349 10 12.6667Z\" fill=\"currentColor\"/>", mi = class extends Y {
	constructor(...e) {
		super(...e), w(this, "j", void 0), w(this, "db", "toggleFullscreen");
	}
	onAttach(e) {
		this.j = H(), this.cb = this.hb.bind(this), super.onAttach(e), V(e, this.ib.bind(this));
		let { fullscreen: t } = this.j.$store;
		this.setAttributes({
			"aria-hidden": X(this.jb.bind(this)),
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
		return [j(K, {
			paths: pi,
			slot: "enter"
		}), j(K, {
			paths: fi,
			slot: "exit"
		})];
	}
};
w(mi, "el", F({
	tagName: "media-fullscreen-button",
	props: {
		...ai,
		target: "prefer-media"
	}
}));
var hi = "<path d=\"M17.5091 24.6594C17.5091 25.2066 16.8864 25.5208 16.4463 25.1956L9.44847 20.0252C9.42553 20.0083 9.39776 19.9991 9.36923 19.9991H4.66667C4.29848 19.9991 4 19.7006 4 19.3325V12.6658C4 12.2976 4.29848 11.9991 4.66667 11.9991H9.37115C9.39967 11.9991 9.42745 11.99 9.45039 11.973L16.4463 6.8036C16.8863 6.47842 17.5091 6.79259 17.5091 7.33977L17.5091 24.6594Z\" fill=\"currentColor\"/> <path d=\"M28.8621 13.6422C29.1225 13.3818 29.1225 12.9597 28.8621 12.6994L27.9193 11.7566C27.659 11.4962 27.2368 11.4962 26.9765 11.7566L24.7134 14.0197C24.6613 14.0717 24.5769 14.0717 24.5248 14.0197L22.262 11.7568C22.0016 11.4964 21.5795 11.4964 21.3191 11.7568L20.3763 12.6996C20.116 12.9599 20.116 13.382 20.3763 13.6424L22.6392 15.9053C22.6913 15.9573 22.6913 16.0418 22.6392 16.0938L20.3768 18.3562C20.1165 18.6166 20.1165 19.0387 20.3768 19.299L21.3196 20.2419C21.58 20.5022 22.0021 20.5022 22.2624 20.2418L24.5248 17.9795C24.5769 17.9274 24.6613 17.9274 24.7134 17.9795L26.976 20.2421C27.2363 20.5024 27.6585 20.5024 27.9188 20.2421L28.8616 19.2992C29.122 19.0389 29.122 18.6168 28.8616 18.3564L26.599 16.0938C26.547 16.0418 26.547 15.9573 26.599 15.9053L28.8621 13.6422Z\" fill=\"currentColor\"/>", gi = "<path d=\"M17.5091 24.6595C17.5091 25.2066 16.8864 25.5208 16.4463 25.1956L9.44847 20.0252C9.42553 20.0083 9.39776 19.9992 9.36923 19.9992H4.66667C4.29848 19.9992 4 19.7007 4 19.3325V12.6658C4 12.2976 4.29848 11.9992 4.66667 11.9992H9.37115C9.39967 11.9992 9.42745 11.99 9.45039 11.9731L16.4463 6.80363C16.8863 6.47845 17.5091 6.79262 17.5091 7.3398L17.5091 24.6595Z\" fill=\"currentColor\"/> <path d=\"M27.5091 9.33336C27.8773 9.33336 28.1758 9.63184 28.1758 10V22C28.1758 22.3682 27.8773 22.6667 27.5091 22.6667H26.1758C25.8076 22.6667 25.5091 22.3682 25.5091 22V10C25.5091 9.63184 25.8076 9.33336 26.1758 9.33336L27.5091 9.33336Z\" fill=\"currentColor\"/> <path d=\"M22.1758 12C22.544 12 22.8424 12.2985 22.8424 12.6667V19.3334C22.8424 19.7016 22.544 20 22.1758 20H20.8424C20.4743 20 20.1758 19.7016 20.1758 19.3334V12.6667C20.1758 12.2985 20.4743 12 20.8424 12H22.1758Z\" fill=\"currentColor\"/>", _i = "<path d=\"M17.5091 24.6594C17.5091 25.2066 16.8864 25.5207 16.4463 25.1956L9.44847 20.0252C9.42553 20.0083 9.39776 19.9991 9.36923 19.9991H4.66667C4.29848 19.9991 4 19.7006 4 19.3324V12.6658C4 12.2976 4.29848 11.9991 4.66667 11.9991H9.37115C9.39967 11.9991 9.42745 11.99 9.45039 11.973L16.4463 6.80358C16.8863 6.4784 17.5091 6.79258 17.5091 7.33975L17.5091 24.6594Z\" fill=\"currentColor\"/> <path d=\"M22.8424 12.6667C22.8424 12.2985 22.544 12 22.1758 12H20.8424C20.4743 12 20.1758 12.2985 20.1758 12.6667V19.3333C20.1758 19.7015 20.4743 20 20.8424 20H22.1758C22.544 20 22.8424 19.7015 22.8424 19.3333V12.6667Z\" fill=\"currentColor\"/>", vi = class extends Y {
	constructor(...e) {
		super(...e), w(this, "j", void 0), w(this, "db", "toggleMuted");
	}
	onAttach(e) {
		this.j = H(), this.cb = this.hb.bind(this), V(e, this.ib.bind(this)), this.setAttributes({
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
			j(K, {
				paths: gi,
				slot: "volume-high"
			}),
			j(K, {
				paths: _i,
				slot: "volume-low"
			}),
			j(K, {
				paths: hi,
				slot: "volume-muted"
			})
		];
	}
};
w(vi, "el", F({
	tagName: "media-mute-button",
	props: ai
}));
var yi = "<path d=\"M5.33334 26V19.4667C5.33334 19.393 5.39304 19.3333 5.46668 19.3333H7.86668C7.94031 19.3333 8.00001 19.393 8.00001 19.4667V23.3333C8.00001 23.7015 8.29849 24 8.66668 24H23.3333C23.7015 24 24 23.7015 24 23.3333V8.66666C24 8.29847 23.7015 7.99999 23.3333 7.99999H19.4667C19.393 7.99999 19.3333 7.9403 19.3333 7.86666V5.46666C19.3333 5.39302 19.393 5.33333 19.4667 5.33333H26C26.3682 5.33333 26.6667 5.63181 26.6667 5.99999V26C26.6667 26.3682 26.3682 26.6667 26 26.6667H6.00001C5.63182 26.6667 5.33334 26.3682 5.33334 26Z\" fill=\"currentColor\"/> <path d=\"M14.0098 8.42359H10.806C10.6872 8.42359 10.6277 8.56721 10.7117 8.6512L16.5491 14.4886C16.8094 14.7489 16.8094 15.171 16.5491 15.4314L15.3234 16.657C15.0631 16.9174 14.641 16.9174 14.3806 16.657L8.63739 10.9138C8.55339 10.8298 8.40978 10.8893 8.40978 11.0081V14.0236C8.40978 14.3918 8.1113 14.6903 7.74311 14.6903H6.00978C5.64159 14.6903 5.34311 14.3918 5.34311 14.0236L5.34311 6.02359C5.34311 5.6554 5.64159 5.35692 6.00978 5.35692L14.0098 5.35692C14.378 5.35692 14.6764 5.6554 14.6764 6.02359V7.75692C14.6764 8.12511 14.378 8.42359 14.0098 8.42359Z\" fill=\"currentColor\"/>", bi = "<path d=\"M16 15.3333C15.6318 15.3333 15.3333 15.6318 15.3333 16V20C15.3333 20.3682 15.6318 20.6667 16 20.6667H21.3333C21.7015 20.6667 22 20.3682 22 20V16C22 15.6318 21.7015 15.3333 21.3333 15.3333H16Z\" fill=\"currentColor\"/> <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M5.33333 7.33334C5.33333 6.96515 5.63181 6.66667 5.99999 6.66667H26C26.3682 6.66667 26.6667 6.96515 26.6667 7.33334V24.6667C26.6667 25.0349 26.3682 25.3333 26 25.3333H5.99999C5.63181 25.3333 5.33333 25.0349 5.33333 24.6667V7.33334ZM7.99999 10C7.99999 9.63182 8.29847 9.33334 8.66666 9.33334H23.3333C23.7015 9.33334 24 9.63182 24 10V22C24 22.3682 23.7015 22.6667 23.3333 22.6667H8.66666C8.29847 22.6667 7.99999 22.3682 7.99999 22V10Z\" fill=\"currentColor\"/>", xi = class extends Y {
	constructor(...e) {
		super(...e), w(this, "j", void 0), w(this, "db", "togglePictureInPicture");
	}
	onAttach(e) {
		this.j = H(), this.cb = this.hb.bind(this), super.onAttach(e), V(e, this.ib.bind(this));
		let { pictureInPicture: t } = this.j.$store;
		this.setAttributes({
			"aria-hidden": X(this.jb.bind(this)),
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
		return [j(K, {
			paths: bi,
			slot: "enter"
		}), j(K, {
			paths: yi,
			slot: "exit"
		})];
	}
};
w(xi, "el", F({
	tagName: "media-pip-button",
	props: ai
}));
var Si = "<path d=\"M15.6038 12.2148C16.0439 12.5399 16.6667 12.2257 16.6667 11.6786V10.1789C16.6667 10.1001 16.7351 10.0384 16.8134 10.0479C20.1116 10.4494 22.6667 13.2593 22.6667 16.6659C22.6667 20.3481 19.6817 23.3332 15.9995 23.3332C12.542 23.3332 9.69927 20.7015 9.36509 17.332C9.32875 16.9655 9.03371 16.6662 8.66548 16.6662L6.66655 16.6666C6.29841 16.6666 5.99769 16.966 6.02187 17.3334C6.36494 22.5454 10.7012 26.6667 16 26.6667C21.5228 26.6667 26 22.1895 26 16.6667C26 11.4103 21.9444 7.10112 16.7916 6.69758C16.7216 6.69209 16.6667 6.63396 16.6667 6.56372V4.98824C16.6667 4.44106 16.0439 4.12689 15.6038 4.45207L11.0765 7.79738C10.7159 8.06387 10.7159 8.60327 11.0766 8.86974L15.6038 12.2148Z\" fill=\"currentColor\"/>", Ci = "<path d=\"M16.4167 12.2148C15.9766 12.5399 15.3538 12.2257 15.3538 11.6786V10.1789C15.3538 10.1001 15.2854 10.0384 15.2072 10.0479C11.9089 10.4494 9.35384 13.2593 9.35384 16.6659C9.35384 20.3481 12.3389 23.3332 16.0211 23.3332C19.4785 23.3332 22.3212 20.7015 22.6554 17.332C22.6918 16.9655 22.9868 16.6662 23.355 16.6662L25.354 16.6666C25.7221 16.6666 26.0228 16.966 25.9986 17.3334C25.6556 22.5454 21.3193 26.6667 16.0205 26.6667C10.4977 26.6667 6.02051 22.1895 6.02051 16.6667C6.02051 11.4103 10.0761 7.10112 15.2289 6.69758C15.2989 6.69209 15.3538 6.63396 15.3538 6.56372V4.98824C15.3538 4.44106 15.9766 4.12689 16.4167 4.45207L20.944 7.79738C21.3046 8.06387 21.3046 8.60327 20.9439 8.86974L16.4167 12.2148Z\" fill=\"currentColor\"/>";
w(class extends E {
	constructor(e) {
		super(e), w(this, "j", void 0), this.j = H(), new J(e), new ti(e);
	}
	onAttach(e) {
		B(e, "tabindex", "0"), B(e, "role", "button"), V(e, this.ib.bind(this));
		let { seconds: t, defaultAppearance: n } = this.$props;
		this.setAttributes({
			seconds: t,
			"default-appearance": n,
			"aria-hidden": X(this.jb.bind(this)),
			"data-media-button": !0
		});
	}
	onConnect(e) {
		In(e, this.gb.bind(this));
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
		return [j(K, {
			paths: Si,
			slot: "backward"
		}), j(K, {
			paths: Ci,
			slot: "forward"
		})];
	}
}, "el", F({
	tagName: "media-seek-button",
	props: {
		disabled: !1,
		defaultAppearance: !1,
		seconds: 30
	}
}));
var wi = new _e({
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
		return Ti(this.min, this.max, this.value);
	},
	get fillPercent() {
		return this.fillRate * 100;
	},
	get pointerRate() {
		return Ti(this.min, this.max, this.pointerValue);
	},
	get pointerPercent() {
		return this.pointerRate * 100;
	}
});
function Ti(e, t, n) {
	let r = t - e, i = n - e;
	return r > 0 ? i / r : 0;
}
var Ei = {
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
function Di(e, t, n, r) {
	return Yr(e, q(n, Jr(r)), t);
}
function Oi(e, t, n, r) {
	let i = Yr(0, n, 1);
	return e + r * ((t - e) * i / r);
}
var ki = {
	Left: -1,
	ArrowLeft: -1,
	Up: 1,
	ArrowUp: 1,
	Right: 1,
	ArrowRight: 1,
	Down: -1,
	ArrowDown: -1
}, Ai = class extends T {
	constructor(e, t, n) {
		super(e), w(this, "Id", null), w(this, "lg", null), w(this, "ng", null), w(this, "mg", null), w(this, "og", null), w(this, "sg", void 0), w(this, "Cg", gr((e) => {
			this.kg(this.pg(e), e);
		}, 20, { leading: !0 })), this.jg = t, this.j = n;
	}
	onConnect() {
		_(this.vg.bind(this)), _(this.wg.bind(this)), this.jg.tc && Ln(() => {
			var e;
			let t = (e = this.j.player) == null ? void 0 : e.querySelector("media-outlet");
			t && (this.Id = t, x(t, "touchstart", this.xg.bind(this)), x(t, "touchmove", this.yg.bind(this)));
		});
	}
	xg(e) {
		this.lg = e.touches[0].clientX;
	}
	yg(e) {
		if (d(this.lg) || (e.preventDefault(), this.$store.dragging())) return;
		let t = e.touches[0].clientX - this.lg;
		Math.abs(t) > 20 && (this.lg = e.touches[0].clientX, this.ng = this.$store.value(), this.qg(this.ng, e));
	}
	vg() {
		this.jg.mb() || (this.listen("focus", this.Te.bind(this)), this.listen("pointerenter", this.Re.bind(this)), this.listen("pointermove", this.zg.bind(this)), this.listen("pointerleave", this.Se.bind(this)), this.listen("pointerdown", this.Ag.bind(this)), this.listen("keydown", this.Za.bind(this)), this.listen("keyup", this.Ya.bind(this)));
	}
	wg() {
		this.jg.mb() || !this.$store.dragging() || (x(document, "pointerup", this.Bg.bind(this)), x(document, "pointermove", this.Cg.bind(this)), Sn && x(document, "touchmove", this.Dg.bind(this), { passive: !1 }));
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
			var i;
			let n = this.jg.nb === "vertical" ? "bottom" : "left", r = this.jg.nb === "vertical" ? "height" : "width";
			this.og && !((i = this.el) != null && i.hasAttribute("data-chapters")) && (this.og.style[r] = e + "%"), this.mg && (this.mg.style[n] = e + "%"), this.rg(e, t);
		}
	}
	pg(e) {
		let t, n = this.el.getBoundingClientRect(), { min: r, max: i } = this.$store;
		if (this.jg.nb === "vertical") {
			let { bottom: r, height: i } = n;
			t = (r - e.clientY) / i;
		} else if (this.lg && ne(this.ng)) {
			let { width: n } = this.Id.getBoundingClientRect(), a = (e.clientX - this.lg) / n, o = i() - r(), s = o * Math.abs(a);
			t = (a < 0 ? this.ng - s : this.ng + s) / o;
		} else {
			let { left: r, width: i } = n;
			t = (e.clientX - r) / i;
		}
		return Math.max(r(), Math.min(i(), this.jg.Gb(Oi(r(), i(), t, this.jg.vb()))));
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
		n.set(!1), this.og && (i(this.og, "width", null), this.og = null), this.mg && (i(this.mg, "left", null), i(this.mg, "bottom", null), this.mg = null), this.j.remote.resumeUserIdle(t);
		let r = this.createEvent("drag-end", {
			detail: e,
			trigger: t
		});
		this.el.dispatchEvent(r), this.jg.Jb(r), this.lg = null, this.ng = null;
	}
	Za(e) {
		if (me(e)) {
			let t = e.trigger;
			if (S(t)) e = t;
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
		var t;
		if (me(e)) {
			let t = e.trigger;
			if (S(t)) e = t;
			else return;
		}
		this.sg = "";
		let { dragging: n, value: r } = this.$store;
		if (!n()) return;
		let i = (t = this.ug(e)) == null ? r() : t;
		this.kg(i), this.tg(i, e);
	}
	ug(e) {
		let { key: t, shiftKey: n } = e;
		if (!Object.keys(ki).includes(t)) return;
		let { shiftKeyMultiplier: r } = this.$props, { value: i } = this.$store, a = this.jg.vb(), o = this.jg.Fb(), s = (n ? o * r() : o) * Number(ki[t]), c = (i() + s) / a;
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
}, ji = t(() => ({})), Mi = /* @__PURE__ */ O("<!$><div part=\"track\"></div>"), Ni = /* @__PURE__ */ O("<!$><div part=\"track track-fill\"></div>"), Pi = /* @__PURE__ */ O("<!$><div part=\"track track-progress\"></div>"), Fi = /* @__PURE__ */ O("<!$><div part=\"thumb-container\"><!$><div part=\"thumb\"></div></div>"), Ii = class extends E {
	constructor(e) {
		super(e), w(this, "j", void 0), w(this, "pb", !1), w(this, "nb", ""), w(this, "Db", Ee((e, t) => {
			var n, r;
			(n = this.el) == null || n.style.setProperty("--slider-fill-percent", e + "%"), (r = this.el) == null || r.style.setProperty("--slider-pointer-percent", t + "%");
		})), w(this, "lb", null), w(this, "ob", Ee(() => {
			if (!this.lb) return;
			let e = this.lb.getBoundingClientRect();
			i(this.lb, "--computed-width", e.width + "px"), i(this.lb, "--computed-height", e.height + "px");
		})), c(ji), this.j = H(), new Ai(e, this, this.j);
		let t = new J(e);
		this.$store.focused = t.focused.bind(t);
	}
	onAttach(e) {
		B(e, "role", "slider"), B(e, "tabindex", "0"), B(e, "aria-orientation", "horizontal"), B(e, "autocomplete", "off"), this.nb = e.getAttribute("aria-orientation") || "", this.pb || (_(this.qb.bind(this)), _(this.rb.bind(this))), _(this.sb.bind(this)), this.tb();
	}
	onConnect(e) {
		this.ub();
	}
	render() {
		let { trackClass: e, trackFillClass: t, trackProgressClass: n, thumbContainerClass: r, thumbClass: i } = this.$props;
		return [
			(() => {
				let [t, n] = k(Mi);
				return N(() => M(t, "class", e())), t;
			})(),
			(() => {
				let [e, n] = k(Ni);
				return N(() => M(e, "class", t())), e;
			})(),
			(() => {
				let [e, t] = k(Pi);
				return N(() => M(e, "class", n())), e;
			})(),
			(() => {
				let [e, t] = k(Fi), n = Ze(t);
				return N(() => M(e, "class", r())), N(() => M(n, "class", i())), e;
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
		e(t) || n.set(Di(r(), i(), n(), this.vb()));
	}
	wb() {
		return be(this.mb());
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
		return q(e() / t() * 100, 2) + "%";
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
		}), _(this.Cb.bind(this));
	}
	Bb() {
		return !!this.$props.trackClass();
	}
	Cb() {
		let { fillPercent: e, pointerPercent: t } = this.$store;
		this.Db(q(e(), 3), q(t(), 3));
	}
	ub() {
		this.lb = this.el.querySelector("[slot=\"preview\"]"), this.lb && (_(this.Eb.bind(this)), Promise.resolve().then(function() {
			return Qa;
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
	Hb(e) {}
	Ib(e) {}
	Jb(e) {}
	Kb(e) {}
};
w(Ii, "el", F({
	tagName: "media-slider",
	props: Ei,
	store: wi
}));
var Li = /* @__PURE__ */ O("<!$><img part=\"img\" loading=\"eager\" decoding=\"async\" aria-hidden=\"true\" />"), Ri = class extends E {
	constructor(e) {
		super(e), w(this, "j", void 0), w(this, "ke", null), w(this, "me", null), w(this, "ne", []), w(this, "Pb", h("")), w(this, "oe", h(!1)), w(this, "pe", h(null)), w(this, "qe", Ee(this.ye.bind(this))), this.j = H();
	}
	onAttach() {
		this.setAttributes({
			"data-loading": this.Tb.bind(this),
			"aria-hidden": X(this.jb.bind(this))
		});
	}
	onConnect() {
		_(this.ge.bind(this)), _(this.se.bind(this)), _(this.te.bind(this));
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
		this.pe.set(jr(i, r));
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
		let [t, n] = e.split("="), r = {}, i = n == null ? void 0 : n.split(",");
		if (!t || !n) return null;
		for (let e = 0; e < t.length; e++) r[t[e]] = +i[e];
		return r;
	}
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
			let [t, n] = k(Li);
			return N(() => M(t, "src", this.Pb())), N(() => M(t, "crossorigin", e())), at(t, "load", this.ue.bind(this)), it(t, this.ve.bind(this)), t;
		})();
	}
};
w(Ri, "el", F({
	tagName: "media-thumbnail",
	props: { time: 0 }
}));
var zi = /* @__PURE__ */ O("<!$><media-thumbnail part=\"thumbnail\" mk-d></media-thumbnail>"), Bi = class extends E {
	constructor(e) {
		super(e), w(this, "j", void 0), w(this, "Lb", void 0), this.j = H(), this.Lb = s(wi);
	}
	Mb() {
		let { duration: e } = this.j.$store;
		return this.Lb.pointerRate() * e();
	}
	render() {
		let e = this.Mb.bind(this);
		return (() => {
			let [t, n] = k(zi);
			return N(() => M(t, "time", e())), $e(t), t;
		})();
	}
};
w(Bi, "el", F({ tagName: "media-slider-thumbnail" })), w(Bi, "register", [Ri]);
var Vi = /* @__PURE__ */ O("<!$><video muted=\"\" playsinline=\"\" preload=\"auto\" part=\"video\" style=\"max-width: unset\"></video>");
w(class extends E {
	constructor(...e) {
		super(...e), w(this, "j", void 0), w(this, "Lb", void 0), w(this, "qa", null), w(this, "Nb", h(!1)), w(this, "Ob", h(!1)), w(this, "Pb", void 0), w(this, "Qb", void 0);
	}
	onAttach() {
		this.j = H(), this.Lb = s(wi), this.Pb = u(this.Sb.bind(this)), this.Qb = u(this.jb.bind(this)), this.setAttributes({
			"data-loading": this.Tb.bind(this),
			"aria-hidden": X(this.Qb)
		}), _(this.Ub.bind(this)), _(this.Vb.bind(this));
	}
	onConnect() {
		this.qa.readyState >= 2 && this.Rb();
	}
	render() {
		let { crossorigin: e } = this.j.$store;
		return (() => {
			let [t, n] = k(Vi);
			return N(() => M(t, "src", this.Pb())), N(() => M(t, "crossorigin", e())), at(t, "canplay", this.Rb.bind(this)), at(t, "error", this.Wb.bind(this)), it(t, this.Xb.bind(this)), t;
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
}, "el", F({
	tagName: "media-slider-video",
	props: { src: void 0 }
}));
function Hi(e, t) {
	let n = String(e), r = n.length;
	if (r < t) {
		let n = t - r;
		return `${"0".repeat(n)}${e}`;
	}
	return n;
}
function Ui(e) {
	return {
		hours: Math.trunc(e / 3600),
		minutes: Math.trunc(e % 3600 / 60),
		seconds: Math.trunc(e % 60),
		fraction: Number((e - Math.trunc(e)).toPrecision(3))
	};
}
function Wi(e, t = !1, n = !1, r = !1) {
	let { hours: i, minutes: a, seconds: o } = Ui(e), s = t ? Hi(i, 2) : i, c = n ? Hi(a, 2) : a, l = Hi(o, 2);
	return i > 0 || r ? `${s}:${c}:${l}` : `${c}:${l}`;
}
function Gi(e) {
	let t = [], { hours: n, minutes: r, seconds: i } = Ui(e);
	return n > 0 && t.push(`${n} hour`), r > 0 && t.push(`${r} min`), (i > 0 || t.length === 0) && t.push(`${i} sec`), t.join(" ");
}
var Ki = /* @__PURE__ */ O("<!$><span><!$></span>"), qi = class extends E {
	constructor(...e) {
		super(...e), w(this, "Yb", void 0), w(this, "Zb", void 0), w(this, "Lb", void 0);
	}
	onAttach() {
		this.Lb = s(wi), this.Yb = m(ji), this.Zb = u(this._b.bind(this));
	}
	_b() {
		let { type: e, format: t, decimalPlaces: n, padHours: r, padMinutes: i, showHours: a } = this.$props, { value: o, pointerValue: s, min: c, max: l } = this.Lb, u = e() === "current" ? o() : s();
		if (t() === "percent") {
			var d;
			let e = u / (l() - c()) * 100;
			return ((d = this.Yb.percent) == null ? q : d)(e, n()) + "﹪";
		} else if (t() === "time") {
			var ee;
			return ((ee = this.Yb.time) == null ? Wi : ee)(u, r(), i(), a());
		} else {
			var f, te, p;
			return (f = (te = (p = this.Yb).value) == null ? void 0 : te.call(p, u)) == null ? u.toFixed(2) : f;
		}
	}
	render() {
		return (() => {
			let [e, t] = k(Ki);
			return A(t.nextNode(), this.Zb), e;
		})();
	}
};
w(qi, "el", F({
	tagName: "media-slider-value",
	props: {
		type: "current",
		format: void 0,
		showHours: !1,
		padHours: !1,
		padMinutes: !1,
		decimalPlaces: 2
	}
}));
var Ji = class extends Ii {
	constructor(...e) {
		super(...e), w(this, "pb", !0), w(this, "$b", gr(this.ac.bind(this), 25));
	}
	onAttach(e) {
		B(e, "aria-label", "Media volume"), super.onAttach(e), Dn().then((t) => {
			t || a(e, "aria-hidden", "true");
		}), _(this.D.bind(this));
	}
	D() {
		let { muted: e, volume: t } = this.j.$store, n = e() ? 0 : t() * 100;
		this.$store.value.set(n), this.dispatch("value-change", { detail: n });
	}
	ac(e) {
		if (!e.trigger) return;
		let t = q(e.detail / 100, 3);
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
};
w(Ji, "el", F({
	tagName: "media-volume-slider",
	props: {
		...Ei,
		min: P({
			value: 0,
			attribute: !1
		}),
		max: P({
			value: 100,
			attribute: !1
		}),
		value: P({
			value: 100,
			attribute: !1
		})
	},
	store: wi
}));
var Yi = class {
	constructor(e) {
		w(this, "Fg", void 0), w(this, "Gg", void 0), w(this, "Eg", /* @__PURE__ */ new Map()), w(this, "Hg", h([])), w(this, "uc", Ee(this.na.bind(this))), this.Fg = e.firstChild, this.Gg = new MutationObserver(this.o.bind(this)), this.Gg.observe(this.Fg, {
			subtree: !0,
			childList: !0
		}), _(this.Ig.bind(this)), p(this.Jg.bind(this));
	}
	o(e) {
		let t = Array.from(this.Eg.keys()).join(",");
		for (let n of e) for (let e of n.addedNodes) he(e) && e.matches(t) && this.uc();
	}
	dc(e, t) {
		return this.Eg.set(e, t), this.Hg.set((e) => [...e, t]), this;
	}
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
}, Xi = /* @__PURE__ */ O("<div part=\"chapters\"></div>"), Zi = /* @__PURE__ */ O("<div part=\"chapter-container\"><div part=\"chapter\"><div part=\"track\"></div><div part=\"track track-fill\" style=\"width: 0%\"></div><div part=\"track track-progress\" style=\"width: 0%\"></div></div></div>"), Qi = class {
	constructor(e, t, n) {
		w(this, "Kg", []), w(this, "Mg", []), w(this, "Lg", 0), w(this, "Ng", 0), w(this, "$g", Ee((e) => {
			let t;
			for (let n = this.Ng; n < this.Mg.length; n++) if (t = this.Og(this.Kg[n], e), this.Zg(this.Mg[n]).style.width = t + "%", t < 100) {
				this.Ng = n;
				break;
			}
		})), w(this, "ah", u(this.bh.bind(this))), this.j = e, this.Lb = t, this.Hc = n;
	}
	render(e, t) {
		return e != null && e.length ? ot(() => (() => {
			let n = et(Xi);
			return N(() => M(n, "class", t())), nt(n, () => this.Sg(e)), n;
		})()) : null;
	}
	Sg(e) {
		this.Kg = this.Tg(e);
		let t = this.Kg[0];
		this.Hc(t.startTime === 0 ? t.text : "");
		for (let e = 0; e < this.Kg.length; e++) this.Mg.push(this.Ug());
		return this.Vg(), _(this.Wg.bind(this)), _(this.Xg.bind(this)), _(this.Yg.bind(this)), p(() => {
			this.Mg = [], this.Lg = 0, this.Ng = 0;
		}), this.Mg;
	}
	Ug() {
		return et(Zi);
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
		for (let n = 0; n < this.Kg.length; n++) e = this.Kg[n], this.Mg[n].style.width = q((e.endTime - e.startTime) / t * 100, 3) + "%";
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
	bh() {
		let { bufferedEnd: e, duration: t } = this.j;
		return q(Math.min(e() / Math.max(t(), 1), 1), 3) * 100;
	}
	Og(e, t) {
		let n = this.Kg[this.Kg.length - 1], r = e.startTime / n.endTime * 100, i = e.endTime / n.endTime * 100;
		return Math.max(0, q(t >= i ? 100 : (t - r) / (i - r) * 100, 3));
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
}, $i = class extends Ii {
	constructor(e) {
		super(e), w(this, "pb", !0), w(this, "tc", !0), w(this, "ec", void 0), w(this, "ya", h(null)), w(this, "gc", void 0), w(this, "hc", void 0), w(this, "fc", !1), w(this, "cc", null), w(this, "ic", h("")), c(ji, {
			value: this.jc.bind(this),
			time: this.kc.bind(this)
		});
	}
	onAttach(e) {
		B(e, "aria-label", "Media time"), super.onAttach(e), this.gc = new Qi(this.j.$store, this.$store, this.ic.set), this.setAttributes({ "data-chapters": this.lc.bind(this) }), this.setStyles({ "--media-buffered-percent": this.mc.bind(this) }), _(this.E.bind(this)), _(this.nc.bind(this)), _(this.oc.bind(this)), Ln(() => {
			_(this.pc.bind(this));
		});
	}
	mc() {
		let { bufferedEnd: e, duration: t } = this.j.$store;
		return q(Math.min(e() / Math.max(t(), 1), 1) * 100, 3) + "%";
	}
	lc() {
		var e, t;
		let { duration: n } = this.j.$store;
		return (e = this.hc) == null || e.uc(), ((t = this.ya()) == null ? void 0 : t.cues.length) && Number.isFinite(n()) && n() > 0;
	}
	onConnect(e) {
		super.onConnect(e), this.Ra(), x(this.j.textTracks, "mode-change", this.Ra.bind(this));
		let { chapterContainerClass: t, chapterClass: n, trackClass: r, trackFillClass: i, trackProgressClass: a } = this.$props;
		this.hc = new Yi(e).dc("[part=\"chapter-container\"]", t).dc("[part=\"chapter\"]", n).dc("[part=\"track\"]", r).dc("[part~=\"track-fill\"]", i).dc("[part~=\"track-progress\"]", a);
	}
	render() {
		let e = super.render(), { chaptersClass: t } = this.$props;
		return [ct(() => {
			var e;
			return this.gc.render((e = this.ya()) == null ? void 0 : e.cues, t);
		}), e];
	}
	nc() {
		this.ec = gr(this.$a.bind(this), this.$props.seekingRequestThrottle());
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
		return q(e, 3);
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
		return Number.isFinite(e) ? `${Gi(e)} out of ${Gi(t())}` : "live";
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
		return Number.isFinite(i) ? `${s < 0 ? "-" : ""}${Wi(Math.abs(s), t, d(n) ? Math.abs(s) >= 3600 : n, r)}` : "LIVE";
	}
	Ra() {
		Nr(this.j.textTracks, e(this.ya), this.ya.set);
	}
	oc() {
		var e, t;
		if (this.ya(), this.cc = (e = (t = this.el) == null ? void 0 : t.querySelector("[part=\"chapter-title\"]")) == null ? null : e, this.cc) return _(this.sc.bind(this)), () => {
			this.cc.textContent = "", this.cc = null;
		};
	}
	sc() {
		this.cc.textContent = this.ic();
	}
};
w($i, "el", F({
	tagName: "media-time-slider",
	props: {
		...Ei,
		min: P({
			value: 0,
			attribute: !1
		}),
		max: P({
			value: 100,
			attribute: !1
		}),
		value: P({
			value: 0,
			attribute: !1
		}),
		pauseWhileDragging: !1,
		seekingRequestThrottle: 100,
		chaptersClass: null,
		chapterContainerClass: null,
		chapterClass: null
	},
	store: wi
}));
var Z = t(), ea = /* @__PURE__ */ [
	"a[href]",
	"[tabindex]",
	"input",
	"select",
	"button"
].map((e) => `${e}:not([aria-hidden])`).join(","), ta = /* @__PURE__ */ new Set([
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
]), na = class {
	constructor(e) {
		w(this, "zd", 0), w(this, "dh", null), w(this, "ch", []), this.jg = e;
	}
	get a() {
		return this.ch;
	}
	hd(e) {
		x(e, "focus", this.Te.bind(this)), this.dh = e;
	}
	gd() {
		this.dh && (this.na(), x(this.dh, "keyup", this.Ya.bind(this)), x(this.dh, "keydown", this.Za.bind(this)), p(() => {
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
		var t;
		this.zd = e, (t = this.ch[e]) == null || t.focus(), this.kd(e);
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
		ta.has(e.key) && (e.stopPropagation(), e.preventDefault());
	}
	Za(e) {
		if (ta.has(e.key)) switch (e.stopPropagation(), e.preventDefault(), e.key) {
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
		let e = this.dh.querySelectorAll(ea), t = [], n = (e) => e.hasAttribute("data-media-menu-items");
		for (let r of e) r instanceof HTMLElement && r.offsetParent !== null && Fn(this.dh, r, n) && t.push(r);
		return t;
	}
}, ra = Object.defineProperty, ia = Object.getOwnPropertyDescriptor, aa = (e, t, n, r) => {
	for (var i = r > 1 ? void 0 : r ? ia(t, n) : t, a = e.length - 1, o; a >= 0; a--) (o = e[a]) && (i = (r ? o(t, n, i) : o(i)) || i);
	return r && i && ra(t, n, i), i;
}, oa = 0, sa = class extends E {
	constructor(e) {
		super(e), w(this, "j", void 0), w(this, "Bc", void 0), w(this, "Cc", void 0), w(this, "wc", h(!1)), w(this, "Ic", h(!1)), w(this, "Jc", h(!1)), w(this, "xc", void 0), w(this, "yc", /* @__PURE__ */ new Set()), w(this, "Dc", null), w(this, "vc", null), w(this, "Ac", null), w(this, "zc", void 0), w(this, "ld", this.Ec.bind(this)), w(this, "$c", this.ad.bind(this)), w(this, "Zc", this.bd.bind(this)), w(this, "_c", this.cd.bind(this)), this.j = H();
		let t = ++oa;
		this.Bc = `media-menu-${t}`, this.Cc = `media-menu-button-${t}`, ee(Z) && (this.xc = m(Z)), this.zc = new na({
			dd: this.Sc.bind(this),
			ed: this.close.bind(this)
		}), c(Z, {
			wc: this.wc,
			fd: h(""),
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
		var t;
		this.xc || _(this.Oc.bind(this)), _(this.Tc.bind(this)), (t = this.xc) == null || t.Fc(e), requestAnimationFrame(() => this.n());
	}
	onDestroy() {
		this.Pc(), this.Dc = null, this.vc = null, this.Ac = null;
	}
	Pc() {
		var e, t;
		if (!this.vc || (e = this.el) != null && e.contains(this.vc)) return;
		let n = (t = this.vc) == null ? void 0 : t.parentElement;
		this.el.append(this.vc), (n == null ? void 0 : n.localName) === "media-menu" && (n.destroy(), n.remove());
	}
	Oc() {
		if (!this.el) return;
		let { breakpointX: e, breakpointY: t, viewType: n, orientation: r, fullscreen: o } = this.j.$store, s = n() === "audio" ? e() === "sm" : t() === "sm";
		if (!(!this.vc || this.xc)) {
			if (a(this.el, "data-popup", s), a(this.el, "data-popup-wide", s && r() === "landscape"), s && !o()) {
				var c, l;
				if ((c = (l = this.el).contains) != null && c.call(l, this.vc)) {
					let e = this.el.cloneNode();
					e.appendChild(this.vc), requestAnimationFrame(() => {
						if (!this.el) return;
						let t = "--media-focus-ring", n = getComputedStyle(this.el).getPropertyValue(t);
						n && i(e, t, n);
					}), y(() => {
						document.body.append(e);
					}, this.j.scope);
				}
			}
			return this.n(), () => this.Pc();
		}
	}
	Tc() {
		let e = this.Qc();
		if (this.n(), this.Rc(e), !e) return;
		this.zc.gd();
		let t = this.Uc();
		t && In(t, this.Vc.bind(this)), this.listen("pointerup", this.Wc.bind(this)), x(window, "pointerup", this.Xc.bind(this));
	}
	Kc(e) {
		let t = !!this.xc, n = this.Qc.bind(this), r = X(n), i = X(this.mb.bind(this));
		B(e, "tabindex", t ? "-1" : "0"), B(e, "role", t ? "menuitem" : "button"), a(e, "id", this.Cc), a(e, "aria-controls", this.Bc), a(e, "aria-haspopup", "true"), _(() => {
			a(e, "aria-disabled", i()), a(e, "aria-expanded", r()), t || a(e, "aria-pressed", r()), a(e, "data-pressed", n());
		}), a(e, "data-media-button", !t), a(e, "data-media-menu-button", ""), In(e, this.Yc.bind(this)), this.Dc = e;
	}
	Lc(t) {
		B(t, "role", "menu"), B(t, "tabindex", "-1"), a(t, "id", this.Bc), a(t, "aria-describedby", this.Cc), a(t, "data-media-menu-items", ""), this.vc = t, this.zc.hd(t), this.Oc(), this.Rc(e(this.wc));
	}
	Mc(e) {
		this.Ac = e;
	}
	Rc(e) {
		this.vc && a(this.vc, "aria-hidden", be(!e));
	}
	Nc(e) {
		this.Jc.set(e);
	}
	Yc(e) {
		if (this.xc && e.stopPropagation(), !this.mb()) {
			if (this.wc.set((e) => !e), this.Gc(), v(), S(e)) {
				var t;
				(t = this.vc) == null || t.focus();
			}
			this.Hc(e);
		}
	}
	Hc(t) {
		let n = e(this.wc);
		if (this.dispatch(n ? "open" : "close", { trigger: t }), n) {
			var r, i;
			if (!this.xc) {
				var a;
				(a = this.j.activeMenu) == null || a.close(t), this.j.activeMenu = this;
			}
			(r = this.Ac) == null || (i = r.id) == null || i.call(r, t);
		} else {
			var o, s;
			this.xc || (setTimeout(() => {
				for (let e of this.yc) e.close(t);
			}, 300), this.j.activeMenu = null), (o = this.Ac) == null || (s = o.jd) == null || s.call(o, t);
		}
		n && !S(t) && requestAnimationFrame(() => {
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
		return Fn(this.el, e) ? e : null;
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
		this.yc.add(e), x(e, "open", this.Zc), x(e, "close", this._c), p(this.$c);
	}
	ad(e) {
		this.yc.delete(e);
	}
	bd(e) {
		for (let t of this.yc) t !== e.target && t.setAttribute("aria-hidden", "true");
		this.n();
	}
	cd() {
		for (let e of this.yc) e.removeAttribute("aria-hidden");
		this.n();
	}
	n() {
		var e;
		if (!this.vc) return;
		let t = getComputedStyle(this.vc), n = parseFloat(t.paddingTop) + parseFloat(t.paddingBottom), r = [...this.vc.children];
		((e = r[0]) == null ? void 0 : e.localName) === "shadow-root" && r.push(...r[0].children);
		for (let e of r) n += e.offsetHeight;
		requestAnimationFrame(() => {
			this.vc && (a(this.vc, "data-resizing", ""), setTimeout(() => {
				this.vc && a(this.vc, "data-resizing", !1);
			}, 250), i(this.vc, "--menu-height", n + "px"));
		});
	}
	open(t) {
		if (!e(this.wc)) {
			if (this.wc.set(!0), v(), this.Hc(t), S(t)) {
				var n;
				(n = this.vc) == null || n.focus();
			}
			this.Gc(t);
		}
	}
	close(t) {
		e(this.wc) && (this.wc.set(!1), v(), S(t) && requestAnimationFrame(() => {
			var e;
			(e = this.Dc) == null || e.focus();
		}), this.Hc(t), this.Gc(t));
	}
};
w(sa, "el", F({
	tagName: "media-menu",
	props: { position: null }
})), aa([Mt], sa.prototype, "open", 1), aa([Mt], sa.prototype, "close", 1);
var ca = class extends E {
	constructor(e) {
		super(e), w(this, "md", void 0), this.md = m(Z), new J(e), new ti(e);
	}
	onAttach(e) {
		this.md.Kc(e), _(this.rb.bind(this));
	}
	onConnect(e) {
		let t = Array.from(e.querySelectorAll("[slot=\"hint\"]")).pop();
		t && _(() => {
			let e = this.md.fd();
			e && (t.textContent = e);
		});
	}
	rb() {
		this.md.Nc(this.$props.disabled());
	}
};
w(ca, "el", F({
	tagName: "media-menu-button",
	props: { disabled: !1 }
}));
var la = class extends E {
	constructor(e) {
		super(e), w(this, "md", void 0), this.md = m(Z), new J(e);
	}
	onAttach(e) {
		this.md.Lc(e);
	}
};
w(la, "el", F({ tagName: "media-menu-items" }));
var ua = t(), da = Object.defineProperty, fa = Object.getOwnPropertyDescriptor, pa = (e, t, n, r) => {
	for (var i = r > 1 ? void 0 : r ? fa(t, n) : t, a = e.length - 1, o; a >= 0; a--) (o = e[a]) && (i = (r ? o(t, n, i) : o(i)) || i);
	return r && i && da(t, n, i), i;
}, Q = class extends E {
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
		super(e), w(this, "td", /* @__PURE__ */ new Set()), w(this, "sd", h("")), w(this, "yd", this.Hc.bind(this)), c(ua, {
			add: this.wd.bind(this),
			remove: this.xd.bind(this)
		});
	}
	onAttach(e) {
		ee(Z) || B(e, "role", "radiogroup"), this.ud(), this.setAttributes({ value: this.sd });
	}
	onConnect() {
		_(this.ud.bind(this));
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
	Hc(t, n) {
		let r = e(this.sd);
		if (!t || t === r) return;
		let i = this.vd(r), a = this.vd(t);
		i == null || i.pd(!1, n), a == null || a.pd(!0, n), this.sd.set(t), this.dispatch("change", { trigger: n });
	}
	vd(t) {
		for (let n of this.td) if (t === e(n.sd)) return n;
		return null;
	}
};
w(Q, "el", F({
	tagName: "media-radio-group",
	props: { value: "" }
})), pa([jt], Q.prototype, "values", 1), pa([jt], Q.prototype, "value", 1);
var ma = Object.defineProperty, ha = Object.getOwnPropertyDescriptor, ga = (e, t, n, r) => {
	for (var i = r > 1 ? void 0 : r ? ha(t, n) : t, a = e.length - 1, o; a >= 0; a--) (o = e[a]) && (i = (r ? o(t, n, i) : o(i)) || i);
	return r && i && ma(t, n, i), i;
}, _a = /* @__PURE__ */ O("<!$><div part=\"check\"></div>"), $ = class extends E {
	get checked() {
		return this.nd();
	}
	constructor(e) {
		super(e), w(this, "nd", h(!1)), w(this, "od", {
			sd: this.$props.value,
			pd: this.pd.bind(this),
			qd: null
		}), new J(e);
	}
	onAttach() {
		_(this.sb.bind(this)), this.rd();
		let e = ee(Z);
		this.setAttributes({
			value: this.$props.value,
			role: e ? "menuitemradio" : "radio",
			tabindex: e ? -1 : 0,
			"aria-checked": X(this.nd)
		});
	}
	onConnect(e) {
		this.rd(), In(e, this.gb.bind(this));
	}
	onDisconnect() {
		m(ua).remove(this.od);
	}
	rd() {
		m(ua).add(this.od);
	}
	sb() {
		let { value: t } = this.$props, n = t();
		if (e(this.nd)) {
			var r, i;
			(r = (i = this.od).qd) == null || r.call(i, n);
		}
	}
	gb(t) {
		var n, r;
		e(this.nd) || (this.nd.set(!0), this.dispatch("change", { trigger: t }), (n = (r = this.od).qd) == null || n.call(r, e(this.$props.value), t));
	}
	pd(t, n) {
		e(this.nd) !== t && (this.nd.set(t), this.dispatch("change", { trigger: n }));
	}
	render() {
		return Xe(_a);
	}
};
w($, "el", F({
	tagName: "media-radio",
	props: { value: "" }
})), ga([jt], $.prototype, "checked", 1);
var va = /* @__PURE__ */ O("<!$><media-radio-group mk-d><!$></media-radio-group>"), ya = /* @__PURE__ */ O("<!$><media-radio mk-d><!$></media-radio>");
function ba(e) {
	let { value: t, onChange: n, radioGroupClass: r } = e;
	return (() => {
		let [i, a] = k(va), o = a.nextNode();
		return N(() => M(i, "class", r())), at(i, "change", n), st(() => {
			A(o, () => xa(e));
		}, $e(i, { value: t })), i;
	})();
}
function xa(e) {
	let { options: t } = e;
	return t().map((t) => (() => {
		let [n, r] = k(ya), i = r.nextNode();
		return M(n, "part", e.part), st(() => {
			A(i, t.content);
		}, $e(n, { value: t.value })), n;
	})());
}
var Sa = /* @__PURE__ */ O("<!$><media-thumbnail part=\"thumbnail\" mk-d></media-thumbnail>"), Ca = /* @__PURE__ */ O("<!$><div part=\"content\"><div part=\"title\"><!$></div><div part=\"start-time\"><!$></div><div part=\"duration\"><!$></div></div>"), wa = class extends la {
	constructor(e) {
		super(e), w(this, "j", void 0), w(this, "zd", h(0)), w(this, "ya", h(null)), this.j = H();
	}
	onAttach(e) {
		super.onAttach(e), this.md.Mc({ id: this.id.bind(this) }), this.setAttributes({ "data-thumbnails": this.Ad.bind(this) });
	}
	id() {
		e(() => this.E());
	}
	onConnect(e) {
		_(this.E.bind(this)), _(this.Bd.bind(this)), this.Ra(), x(this.j.textTracks, "mode-change", this.Ra.bind(this));
		let { chapterClass: t, thumbnailClass: n, contentClass: r, titleClass: i, startTimeClass: a, durationClass: o } = this.$props;
		new Yi(e).dc("[part=\"chapter\"]", t).dc("[part=\"thumbnail\"]", n).dc("[part=\"content\"]", r).dc("[part=\"title\"]", i).dc("[part=\"start-time\"]", a).dc("[part=\"duration\"]", o);
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
		let { currentTime: t } = this.j.$store, n = t(), r = e.cues.findIndex((e) => Mr(e, n));
		if (this.zd.set(r), r >= 0) {
			let t = e.cues[r], a = this.el.querySelector("shadow-root media-radio[aria-checked='true']"), o = (n - t.startTime) / (t.endTime - t.startTime) * 100;
			a && i(a, "--played-percent", q(o, 3) + "%");
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
		var t;
		if (this.mb() || !e.trigger) return;
		let n = +e.target.value, r = (t = this.ya()) == null ? void 0 : t.cues;
		ne(n) && r != null && r[n] && (this.zd.set(n), this.j.remote.seek(r[n].startTime, e));
	}
	Ra() {
		Nr(this.j.textTracks, e(this.ya), this.ya.set);
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
					let [t, n] = k(Sa);
					return $e(t, { time: e.startTime }), t;
				})());
				return t(), t;
			})(), (() => {
				let [t, n] = k(Ca), r = n.nextNode(), i = n.nextNode(), a = n.nextNode();
				return A(r, e.text), A(i, () => Wi(e.startTime, !1, e.startTime >= 3600)), A(a, () => Gi(e.endTime - e.startTime)), t;
			})()]
		})) : [];
	}
	render() {
		let { containerClass: e } = this.$props;
		return ba({
			part: "chapter",
			value: this.Cd.bind(this),
			options: this.Dd.bind(this),
			radioGroupClass: e,
			onChange: this.Hc.bind(this)
		});
	}
};
w(wa, "el", F({
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
})), w(wa, "register", [
	Ri,
	Q,
	$
]);
var Ta = /* @__PURE__ */ O("<!$><span part=\"label\"><!$></span>"), Ea = class extends la {
	constructor(e) {
		super(e), w(this, "j", void 0), this.j = H();
	}
	onConnect(e) {
		_(this.Bd.bind(this)), _(this.Ed.bind(this));
		let { radioClass: t, radioCheckClass: n } = this.$props;
		new Yi(e).dc("media-radio", t).dc("[part=\"check\"]", n);
	}
	Ed() {
		var e;
		let { emptyLabel: t } = this.$props, { audioTrack: n } = this.j.$store, r = n();
		this.md.fd.set((e = r == null ? void 0 : r.label) == null ? t() : e);
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
				let [t, n] = k(Ta);
				return A(n.nextNode(), e.label), t;
			})()
		}));
	}
	render() {
		let { radioGroupClass: e } = this.$props;
		return ba({
			value: this.Cd.bind(this),
			options: this.Dd.bind(this),
			radioGroupClass: e,
			onChange: this.Hc.bind(this)
		});
	}
};
w(Ea, "el", F({
	tagName: "media-audio-menu-items",
	props: {
		emptyLabel: "Default",
		radioClass: null,
		radioGroupClass: null,
		radioCheckClass: null
	}
})), w(Ea, "register", [Q, $]);
var Da = "<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M26.6667 5.99998C26.6667 5.63179 26.3682 5.33331 26 5.33331H11.3333C10.9651 5.33331 10.6667 5.63179 10.6667 5.99998V17.5714C10.6667 17.6694 10.5644 17.7342 10.4741 17.6962C9.91823 17.4625 9.30754 17.3333 8.66667 17.3333C6.08934 17.3333 4 19.4226 4 22C4 24.5773 6.08934 26.6666 8.66667 26.6666C11.244 26.6666 13.3333 24.5773 13.3333 22V8.66665C13.3333 8.29846 13.6318 7.99998 14 7.99998L23.3333 7.99998C23.7015 7.99998 24 8.29846 24 8.66665V14.9048C24 15.0027 23.8978 15.0675 23.8075 15.0296C23.2516 14.7958 22.6409 14.6666 22 14.6666C19.4227 14.6666 17.3333 16.756 17.3333 19.3333C17.3333 21.9106 19.4227 24 22 24C24.5773 24 26.6667 21.9106 26.6667 19.3333V5.99998ZM22 21.3333C23.1046 21.3333 24 20.4379 24 19.3333C24 18.2287 23.1046 17.3333 22 17.3333C20.8954 17.3333 20 18.2287 20 19.3333C20 20.4379 20.8954 21.3333 22 21.3333ZM8.66667 24C9.77124 24 10.6667 23.1045 10.6667 22C10.6667 20.8954 9.77124 20 8.66667 20C7.5621 20 6.66667 20.8954 6.66667 22C6.66667 23.1045 7.5621 24 8.66667 24Z\" fill=\"currentColor\"/>", Oa = "<path d=\"M13.0908 14.3334C12.972 14.3334 12.9125 14.1898 12.9965 14.1058L17.7021 9.40022C17.9625 9.13987 17.9625 8.71776 17.7021 8.45741L16.2879 7.04319C16.0275 6.78284 15.6054 6.78284 15.3451 7.04319L6.8598 15.5285C6.59945 15.7888 6.59945 16.2109 6.8598 16.4713L8.27401 17.8855L8.27536 17.8868L15.3453 24.9568C15.6057 25.2172 16.0278 25.2172 16.2881 24.9568L17.7024 23.5426C17.9627 23.2822 17.9627 22.8601 17.7024 22.5998L12.9969 17.8944C12.9129 17.8104 12.9724 17.6668 13.0912 17.6668L26 17.6668C26.3682 17.6668 26.6667 17.3683 26.6667 17.0001V15.0001C26.6667 14.6319 26.3682 14.3334 26 14.3334L13.0908 14.3334Z\" fill=\"currentColor\"/>", ka = "<path d=\"M15.905 17.4809C15.9571 17.533 16.0415 17.533 16.0936 17.4809L22.4111 11.1635C22.6714 10.9031 23.0935 10.9031 23.3539 11.1635L24.9567 12.7662C25.217 13.0266 25.217 13.4487 24.9567 13.709L18.1028 20.5629C18.0937 20.5732 18.0842 20.5833 18.0744 20.5931L16.4716 22.1959C16.2113 22.4562 15.7892 22.4562 15.5288 22.1959L7.04353 13.7106C6.78318 13.4503 6.78318 13.0281 7.04353 12.7678L8.6463 11.165C8.90665 10.9047 9.32876 10.9047 9.58911 11.165L15.905 17.4809Z\" fill=\"currentColor\"/>", Aa = /* @__PURE__ */ O("<!$><span slot=\"label\"><!$></span>"), ja = /* @__PURE__ */ O("<!$><div slot=\"hint\"></div>");
function Ma({ label: e, iconPaths: t }) {
	return [
		j(K, {
			slot: "close-icon",
			paths: Oa
		}),
		j(K, {
			slot: "icon",
			paths: t
		}),
		(() => {
			let [t, n] = k(Aa);
			return A(n.nextNode(), e), t;
		})(),
		Xe(ja),
		j(K, {
			slot: "open-icon",
			paths: ka
		})
	];
}
w(class extends ca {
	render() {
		let { label: e } = this.$props;
		return Ma({
			label: e,
			iconPaths: Da
		});
	}
}, "el", F({
	tagName: "media-audio-menu-button",
	props: {
		disabled: !1,
		label: "Audio"
	}
}));
var Na = /* @__PURE__ */ O("<!$><span part=\"label\"><!$></span>"), Pa = Na, Fa = class extends la {
	constructor(e) {
		super(e), w(this, "j", void 0), this.j = H();
	}
	onConnect(e) {
		_(this.Bd.bind(this)), _(this.Ed.bind(this));
		let { radioClass: t, radioCheckClass: n } = this.$props;
		new Yi(e).dc("media-radio", t).dc("[part=\"check\"]", n);
	}
	Ed() {
		let { offLabel: e } = this.$props, { textTrack: t } = this.j.$store, n = t();
		this.md.fd.set(n && G(n) && n.mode === "showing" ? n.label : e());
	}
	Bd() {
		this.md.Ec(this.mb());
	}
	mb() {
		let { textTracks: e } = this.j.$store;
		return e().filter(G).length === 0;
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
		return n && G(n) && n.mode === "showing" ? n.label.toLowerCase() : "off";
	}
	Dd() {
		let { offLabel: e } = this.$props, { textTracks: t } = this.j.$store;
		return [{
			value: "off",
			content: () => (() => {
				let [t, n] = k(Na);
				return A(n.nextNode(), e), t;
			})()
		}, ...t().filter(G).map((e) => ({
			value: e.label.toLowerCase(),
			content: () => (() => {
				let [t, n] = k(Pa);
				return A(n.nextNode(), e.label), t;
			})()
		}))];
	}
	render() {
		let { radioGroupClass: e } = this.$props;
		return ba({
			value: this.Cd.bind(this),
			options: this.Dd.bind(this),
			radioGroupClass: e,
			onChange: this.Hc.bind(this)
		});
	}
};
w(Fa, "el", F({
	tagName: "media-captions-menu-items",
	props: {
		offLabel: "Off",
		radioClass: null,
		radioGroupClass: null,
		radioCheckClass: null
	}
})), w(Fa, "register", [Q, $]), w(class extends ca {
	render() {
		let { label: e } = this.$props;
		return Ma({
			label: e,
			iconPaths: ui
		});
	}
}, "el", F({
	tagName: "media-captions-menu-button",
	props: {
		disabled: !1,
		label: "Captions"
	}
}));
var Ia = /* @__PURE__ */ O("<!$><span part=\"label\"><!$></span>"), La = class extends la {
	constructor(e) {
		super(e), w(this, "j", void 0), this.j = H();
	}
	onConnect(e) {
		_(this.Ed.bind(this));
		let { radioClass: t, radioCheckClass: n } = this.$props;
		new Yi(e).dc("media-radio", t).dc("[part=\"check\"]", n);
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
				let [n, r] = k(Ia);
				return A(r.nextNode(), () => e === 1 ? t() : e + "×"), n;
			})()
		}));
	}
	render() {
		let { radioGroupClass: e } = this.$props;
		return ba({
			value: this.Cd.bind(this),
			options: this.Dd.bind(this),
			radioGroupClass: e,
			onChange: this.Hc.bind(this)
		});
	}
};
w(La, "el", F({
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
})), w(La, "register", [Q, $]);
var Ra = "<path d=\"M25.14 25.1089C25.0171 25.2532 24.8356 25.3333 24.646 25.3333H22.8124C22.1084 25.3333 21.7734 24.1872 22.2745 23.6927C23.9161 22.0729 24.9336 19.822 24.9336 17.3333C24.9336 12.3997 20.9336 8.39973 16 8.39973C11.0664 8.39973 7.06641 12.3997 7.06641 17.3333C7.06641 19.822 8.08389 22.0729 9.72555 23.6927C10.2266 24.1872 9.89155 25.3333 9.18762 25.3333H7.35398C7.16436 25.3333 6.98294 25.2532 6.86001 25.1089C5.07703 23.015 4 20.2991 4 17.3333C4 10.7057 9.3724 5.33333 16 5.33333C22.6276 5.33333 28 10.7057 28 17.3333C28 20.2991 26.923 23.015 25.14 25.1089Z\" fill=\"currentColor\"/> <path d=\"M21.1992 14.3399C21.4595 14.0796 21.4595 13.6575 21.1992 13.3971L20.2564 12.4543C19.996 12.194 19.5739 12.194 19.3136 12.4543L16.4492 15.3187C16.4185 15.3493 16.3749 15.3629 16.332 15.3568C16.2236 15.3414 16.1127 15.3334 16 15.3334C14.7113 15.3334 13.6667 16.378 13.6667 17.6667C13.6667 18.9554 14.7113 20 16 20C17.2887 20 18.3333 18.9554 18.3333 17.6667C18.3333 17.5464 18.3242 17.4283 18.3067 17.313C18.3001 17.2696 18.3136 17.2255 18.3446 17.1945L21.1992 14.3399Z\" fill=\"currentColor\"/>";
w(class extends ca {
	render() {
		let { label: e } = this.$props;
		return Ma({
			label: e,
			iconPaths: Ra
		});
	}
}, "el", F({
	tagName: "media-playback-rate-menu-button",
	props: {
		disabled: !1,
		label: "Speed"
	}
}));
var za = /* @__PURE__ */ O("<!$><span><!$></span>"), Ba = /* @__PURE__ */ O("<!$><span part=\"label\"><!$></span>"), Va = /* @__PURE__ */ O("<!$><span part=\"info\"><!$></span>"), Ha = class extends la {
	constructor(e) {
		super(e), w(this, "j", void 0), w(this, "Gd", u(() => {
			let { qualities: e } = this.j.$store;
			return [...e()].sort((e, t) => t.height === e.height ? t.bitrate - e.bitrate : t.height - e.height);
		})), this.j = H();
	}
	onConnect(e) {
		_(this.Bd.bind(this)), _(this.Ed.bind(this));
		let { radioClass: t, radioCheckClass: n } = this.$props;
		new Yi(e).dc("media-radio", t).dc("[part=\"check\"]", n);
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
				let [t, n] = k(za);
				return A(n.nextNode(), e), t;
			})()
		}, ...this.Gd().map((e) => {
			let n = `${q(e.bitrate / 1e6, 2)} Mbps`;
			return {
				value: this.Fd(e),
				content: () => [(() => {
					let [t, n] = k(Ba);
					return A(n.nextNode(), e.height + "p"), t;
				})(), (() => {
					let e = ct(() => !t() && (() => {
						let [e, t] = k(Va);
						return A(t.nextNode(), n), e;
					})());
					return e(), e;
				})()]
			};
		})];
	}
	render() {
		let { radioGroupClass: e } = this.$props;
		return ba({
			value: this.Cd.bind(this),
			options: this.Dd.bind(this),
			radioGroupClass: e,
			onChange: this.Hc.bind(this)
		});
	}
};
w(Ha, "el", F({
	tagName: "media-quality-menu-items",
	props: {
		autoLabel: "Auto",
		hideBitrate: !1,
		radioGroupClass: null,
		radioClass: null,
		radioCheckClass: null
	}
})), w(Ha, "register", [Q, $]);
var Ua = "<path d=\"M18.6669 10.4001C18.6669 10.7683 18.3684 11.0667 18.0002 11.0667H16.2668C15.8987 11.0667 15.6002 10.7683 15.6002 10.4001V9.86674C15.6002 9.7931 15.5405 9.73341 15.4669 9.73341H5.99998C5.63179 9.73341 5.33331 9.43493 5.33331 9.06674V7.33341C5.33331 6.96522 5.63179 6.66674 5.99998 6.66674H15.4669C15.5405 6.66674 15.6002 6.60704 15.6002 6.53341V6.00007C15.6002 5.63188 15.8987 5.3334 16.2668 5.3334H18.0002C18.3684 5.3334 18.6669 5.63188 18.6669 6.00007V10.4001Z\" fill=\"currentColor\"/> <path d=\"M11.3334 18.8668C11.7016 18.8668 12.0001 18.5683 12.0001 18.2001V13.8001C12.0001 13.4319 11.7016 13.1335 11.3334 13.1335H9.60006C9.23187 13.1335 8.93339 13.4319 8.93339 13.8001V14.3335C8.93339 14.4071 8.8737 14.4668 8.80006 14.4668H6.00006C5.63187 14.4668 5.33339 14.7653 5.33339 15.1335V16.8668C5.33339 17.235 5.63187 17.5335 6.00006 17.5335H8.80006C8.8737 17.5335 8.93339 17.5932 8.93339 17.6668V18.2001C8.93339 18.5683 9.23187 18.8668 9.60006 18.8668H11.3334Z\" fill=\"currentColor\"/> <path d=\"M18.6667 26.0001C18.6667 26.3683 18.3682 26.6668 18 26.6668H16.2667C15.8985 26.6668 15.6 26.3683 15.6 26.0001V25.4668C15.6 25.3931 15.5403 25.3334 15.4667 25.3334H6.00014C5.63195 25.3334 5.33348 25.0349 5.33348 24.6668V22.9334C5.33348 22.5652 5.63195 22.2668 6.00014 22.2668H15.4667C15.5403 22.2668 15.6 22.2071 15.6 22.1334V21.6001C15.6 21.2319 15.8985 20.9334 16.2667 20.9334H18C18.3682 20.9334 18.6667 21.2319 18.6667 21.6001V26.0001Z\" fill=\"currentColor\"/> <path d=\"M22 24.6668C22 25.0349 22.2985 25.3334 22.6667 25.3334H26.0001C26.3683 25.3334 26.6668 25.0349 26.6668 24.6668V22.9334C26.6668 22.5652 26.3683 22.2668 26.0001 22.2668H22.6667C22.2985 22.2668 22 22.5652 22 22.9334V24.6668Z\" fill=\"currentColor\"/> <path d=\"M16.0001 17.5335C15.6319 17.5335 15.3334 17.235 15.3334 16.8668V15.1335C15.3334 14.7653 15.6319 14.4668 16.0001 14.4668H26.0001C26.3683 14.4668 26.6667 14.7653 26.6667 15.1335V16.8668C26.6667 17.235 26.3683 17.5335 26.0001 17.5335H16.0001Z\" fill=\"currentColor\"/> <path d=\"M22.0002 9.06674C22.0002 9.43493 22.2987 9.73341 22.6669 9.73341H26C26.3682 9.73341 26.6666 9.43493 26.6666 9.06674V7.3334C26.6666 6.96521 26.3682 6.66674 26 6.66674H22.6669C22.2987 6.66674 22.0002 6.96522 22.0002 7.33341V9.06674Z\" fill=\"currentColor\"/>";
w(class extends ca {
	render() {
		let { label: e } = this.$props;
		return Ma({
			label: e,
			iconPaths: Ua
		});
	}
}, "el", F({
	tagName: "media-quality-menu-button",
	props: {
		disabled: !1,
		label: "Quality"
	}
})), w(class extends E {
	constructor(...e) {
		super(...e), w(this, "j", void 0), w(this, "Id", null), w(this, "Hd", 0), w(this, "Jd", -1);
	}
	onAttach() {
		let { event: e, action: t } = this.$props;
		this.setAttributes({
			event: e,
			action: t
		});
	}
	onConnect() {
		this.j = H(), Ln(() => {
			this.Id = this.j.player.querySelector("media-outlet"), _(this.Ld.bind(this));
		});
	}
	Ld() {
		let e = this.$props.event();
		!this.Id || !e || (/^dbl/.test(e) && (e = e.split(/^dbl/)[1]), x(this.Id, e, this.Md.bind(this)));
	}
	Md(t) {
		var n;
		if (!(!this.Nd(t) || Oe(t) && (t.button !== 0 || this.j.activeMenu))) {
			if (t.MEDIA_GESTURE = !0, t.preventDefault(), !((n = e(this.$props.event)) != null && n.startsWith("dbl"))) this.Hd === 0 && setTimeout(() => {
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
		if (Oe(e) || ue(e) || re(e)) {
			var t, n;
			let r = re(e) ? e.touches[0] : void 0, i = (t = r == null ? void 0 : r.clientX) == null ? e.clientX : t, a = (n = r == null ? void 0 : r.clientY) == null ? e.clientY : n, o = this.el.getBoundingClientRect(), s = a >= o.top && a <= o.bottom && i >= o.left && i <= o.right;
			return e.type.includes("leave") ? !s : s;
		}
		return !0;
	}
	Od() {
		var e;
		let t = this.j.player.querySelectorAll("media-gesture[data-triggered]");
		return ((e = Array.from(t).sort((e, t) => getComputedStyle(t).zIndex - +getComputedStyle(e).zIndex)[0]) == null ? void 0 : e.component) === this;
	}
	Pd(t, n) {
		if (!t) return;
		let [i, a] = t.replace(/:([a-z])/, "-$1").split(":");
		t.includes(":fullscreen") ? this.j.remote.toggleFullscreen("prefer-media", n) : t.includes("seek:") ? this.j.remote.seek(e(this.j.$store.currentTime) + (+a || 0), n) : this.j.remote[r(i)](n);
	}
}, "el", F({
	tagName: "media-gesture",
	props: {
		event: void 0,
		action: void 0
	}
}));
var Wa = /* @__PURE__ */ O("<!$><svg part=\"icon\" fill=\"none\" viewBox=\"0 0 120 120\" aria-hidden=\"true\"><circle part=\"track\" cx=\"60\" cy=\"60\" r=\"54\" stroke=\"currentColor\"></circle><circle part=\"track-fill\" cx=\"60\" cy=\"60\" r=\"54\" stroke=\"currentColor\" pathLength=\"100\"></circle></svg>");
w(class extends E {
	constructor(...e) {
		super(...e), w(this, "j", void 0);
	}
	onAttach() {
		this.j = H(), this.setAttributes({ "data-buffering": u(this.Qd.bind(this)) });
	}
	Qd() {
		let { canPlay: e, waiting: t } = this.j.$store;
		return !e() || t();
	}
	render() {
		return Xe(Wa);
	}
}, "el", F({ tagName: "media-buffering-indicator" }));
var Ga = class {
	constructor(e) {
		w(this, "priority", 10), w(this, "ya", null), w(this, "ih", Ce()), this.Sd = e;
	}
	attach() {}
	canRender() {
		return !0;
	}
	detach() {
		this.ih.empty(), this.Sd.reset(), this.ya = null;
	}
	changeTrack(e) {
		!e || this.ya === e || (this.ih.empty(), e.readyState < 2 ? (this.Sd.reset(), this.ih.add(x(e, "load", () => this.jh(e), { once: !0 }))) : this.jh(e), this.ih.add(x(e, "add-cue", (e) => {
			this.Sd.addCue(e.detail);
		}), x(e, "remove-cue", (e) => {
			this.Sd.removeCue(e.detail);
		})), this.ya = e);
	}
	jh(e) {
		this.Sd.changeTrack({
			cues: [...e.cues],
			regions: [...e.regions]
		});
	}
}, Ka = class extends E {
	constructor(...e) {
		super(...e), w(this, "j", void 0), w(this, "Sd", void 0), w(this, "Rd", void 0);
	}
	onAttach() {
		this.j = H(), this.setAttributes({ "aria-hidden": X(this.jb.bind(this)) });
	}
	onConnect(e) {
		this.Sd = new je(e), this.Rd = new Ga(this.Sd), _(this.Ud.bind(this));
	}
	onDisconnect() {
		var e;
		this.Rd && (this.Rd.detach(), this.j.textRenderers.remove(this.Rd)), (e = this.Sd) == null || e.destroy();
	}
	jb() {
		let { textTrack: e } = this.j.$store, t = e();
		return !t || !G(t);
	}
	Ud() {
		let { viewType: e } = this.j.$store;
		return e() === "audio" ? this.Vd() : this.Wd();
	}
	Vd() {
		return _(this.oc.bind(this)), () => {
			this.el.textContent = "";
		};
	}
	oc() {
		if (this.jb()) return;
		let { textTrack: e } = this.j.$store;
		this.Td(), x(e(), "cue-change", this.Td.bind(this)), _(this.Xd.bind(this));
	}
	Td() {
		this.el.textContent = "";
		let { currentTime: t, textTrack: n } = this.j.$store, r = e(t), i = e(n).activeCues;
		for (let e of i) {
			let t = document.createElement("div");
			t.setAttribute("part", "cue"), t.innerHTML = ke(e, r), this.el.append(t);
		}
	}
	Xd() {
		let { currentTime: e } = this.j.$store;
		Ae(this.el, e());
	}
	Wd() {
		return _(this.Yd.bind(this)), _(this.Zd.bind(this)), this.j.textRenderers.add(this.Rd), () => {
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
};
w(Ka, "el", F({
	tagName: "media-captions",
	props: { textDir: "ltr" }
}));
var qa = /* @__PURE__ */ O("<!$><div part=\"container\"><div part=\"text\">LIVE</div></div>");
w(class extends E {
	constructor(e) {
		super(e), w(this, "j", void 0), this.j = H(), new J(e);
	}
	onAttach(e) {
		let { live: t, liveEdge: n } = this.j.$store;
		V(e, this.ib.bind(this)), this.setAttributes({
			tabindex: this._d.bind(this),
			role: this.$d.bind(this),
			"data-live": t,
			"data-live-edge": n,
			"data-media-button": !0
		});
	}
	onConnect(e) {
		In(e, this.gb.bind(this));
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
		return Xe(qa);
	}
}, "el", F({ tagName: "media-live-indicator" }));
var Ja = /* @__PURE__ */ O("<!$><img part=\"img\" />");
w(class extends E {
	constructor(...e) {
		super(...e), w(this, "j", void 0), w(this, "ae", h(!0)), w(this, "be", h(!1)), w(this, "ce", void 0), w(this, "de", void 0);
	}
	onAttach(e) {
		this.j = H(), this.ce = u(this.ee.bind(this)), this.de = this.fe.bind(this), this.setAttributes({
			"data-loading": this.ae,
			"aria-hidden": X(this.jb.bind(this))
		});
	}
	onConnect(e) {
		let { canLoad: t, poster: n } = this.j.$store;
		window.requestAnimationFrame(() => {
			t() || Dr(n());
		}), _(this.ge.bind(this));
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
			let [t, n] = k(Ja);
			return N(() => M(t, "src", this.ce())), N(() => M(t, "alt", this.de())), N(() => M(t, "crossorigin", e())), at(t, "load", this.he.bind(this)), at(t, "error", this.Wb.bind(this)), t;
		})();
	}
}, "el", F({
	tagName: "media-poster",
	props: { alt: void 0 }
}));
var Ya = /* @__PURE__ */ O("<!$><span><!$></span>"), Xa = class extends E {
	constructor(...e) {
		super(...e), w(this, "j", void 0), w(this, "ie", void 0);
	}
	onAttach() {
		this.j = H(), this.ie = u(this.Mb.bind(this));
	}
	Mb() {
		let { type: e, remainder: t, padHours: n, padMinutes: r, showHours: i } = this.$props, a = this.je(e()), o = this.j.$store.duration();
		if (!Number.isFinite(a + o)) return "LIVE";
		let s = t() ? Math.max(0, o - a) : a;
		return Wi(s, n(), d(r()) ? s >= 3600 : r(), i());
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
			let [e, t] = k(Ya);
			return A(t.nextNode(), this.ie), e;
		})();
	}
};
w(Xa, "el", F({
	tagName: "media-time",
	props: {
		type: "current",
		showHours: !1,
		padHours: null,
		padMinutes: null,
		remainder: !1
	}
}));
function Za(e, t) {
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
var Qa = /*#__PURE__*/ Object.freeze({
	__proto__: null,
	setupPreviewStyles: Za
});
//#endregion
export { qn as $, Er as A, Pr as B, ar as C, dr as D, ur as E, W as F, wn as G, Lr as H, Cr as I, cr as J, Tn as K, Sr as L, nr as M, Mn as N, Tr as O, yr as P, Rn as Q, U as R, Wn as S, Ir as T, ir as U, Vr as V, hn as W, G as X, An as Y, kr as Z, Sn as _, xi as a, E as at, nn as b, $i as c, jt as ct, Jr as d, Dr as et, vr as f, bn as g, xn as h, vi as i, Nt as it, Gr as j, Zn as k, Ji as l, qe as lt, rr as m, J as n, Ut as nt, qi as o, F as ot, Rr as p, En as q, mi as r, Wt as rt, Xa as s, Mt as st, Ka as t, B as tt, Yr as u, $t as v, or as w, zn as x, en as y, Br as z };
