//#region node_modules/media-captions/dist/prod/index.js
var e = {
	LoadFail: 0,
	BadSignature: 1,
	BadTimestamp: 2,
	BadSettingValue: 3,
	BadFormat: 4,
	UnknownSetting: 5
}, t = class extends Error {
	code;
	line;
	constructor(e) {
		super(e.reason), this.code = e.code, this.line = e.line;
	}
}, n = /\r?\n|\r/gm, r = class {
	writable;
	readable;
	constructor(e) {
		let t = new i(e);
		this.writable = new WritableStream({
			write(e) {
				t.transform(e);
			},
			close() {
				t.close();
			}
		}), this.readable = new ReadableStream({ start(e) {
			t.onLine = (t) => e.enqueue(t), t.onClose = () => e.close();
		} });
	}
}, i = class {
	x = "";
	y;
	onLine;
	onClose;
	constructor(e) {
		this.y = new TextDecoder(e);
	}
	transform(e) {
		this.x += this.y.decode(e, { stream: !0 });
		let t = this.x.split(n);
		this.x = t.pop() || "";
		for (let e = 0; e < t.length; e++) this.onLine(t[e].trim());
	}
	close() {
		this.x && this.onLine(this.x.trim()), this.x = "", this.onClose();
	}
};
async function a(e, t) {
	return o(new ReadableStream({ start(t) {
		let r = e.split(n);
		for (let e of r) t.enqueue(e);
		t.close();
	} }), t);
}
async function o(e, t) {
	let n = t?.type ?? "vtt", r;
	if (typeof n == "string") switch (n) {
		case "srt":
			r = (await import("./srt-parser-Be1wSMtL.js")).default;
			break;
		case "ssa":
		case "ass":
			r = (await import("./ssa-parser-BTkGeyiW.js")).default;
			break;
		default: r = (await Promise.resolve().then(function() {
			return le;
		})).default;
	}
	else r = n;
	let i, a = e.getReader(), o = r(), s = !!t?.strict || !!t?.errors;
	await o.init({
		strict: !1,
		...t,
		errors: s,
		type: n,
		cancel() {
			a.cancel(), i = o.done(!0);
		}
	});
	let c = 1;
	for (;;) {
		let { value: e, done: t } = await a.read();
		if (t) {
			o.parse("", c), i = o.done(!1);
			break;
		}
		o.parse(e, c), c++;
	}
	return i;
}
async function s(e, t) {
	let n = await e;
	if (!n.ok || !n.body) return {
		metadata: {},
		cues: [],
		regions: [],
		errors: [void 0]
	};
	let r = n.headers.get("content-type") || "", i = r.match(/text\/(.*?)(?:;|$)/)?.[1], a = r.match(/charset=(.*?)(?:;|$)/)?.[1];
	return c(n.body, {
		type: i,
		encoding: a,
		...t
	});
}
async function c(e, { encoding: t = "utf-8", ...n } = {}) {
	return o(e.pipeThrough(new r(t)), n);
}
var l = window.VTTCue, u = class extends l {
	region = null;
	vertical = "";
	snapToLines = !0;
	line = "auto";
	lineAlign = "start";
	position = "auto";
	positionAlign = "auto";
	size = 100;
	align = "center";
	style;
}, d = class {
	id = "";
	width = 100;
	lines = 3;
	regionAnchorX = 0;
	regionAnchorY = 100;
	viewportAnchorX = 0;
	viewportAnchorY = 100;
	scroll = "";
}, f = ",", ee = "%";
function te(e) {
	let t = parseInt(e, 10);
	return Number.isNaN(t) ? null : t;
}
function p(e) {
	let t = parseInt(e.replace(ee, ""), 10);
	return !Number.isNaN(t) && t >= 0 && t <= 100 ? t : null;
}
function m(e) {
	if (!e.includes(f)) return null;
	let [t, n] = e.split(f).map(p);
	return t !== null && n !== null ? [t, n] : null;
}
function h(e) {
	let t = parseFloat(e);
	return Number.isNaN(t) ? null : t;
}
var ne = "WEBVTT", g = ",", re = "%", _ = /[:=]/, v = /^[\s\t]*(region|vertical|line|position|size|align)[:=]/, y = "NOTE", b = "REGION", x = /^REGION:?[\s\t]+/, S = /[\s\t]+/, C = "-->", w = /[\s\t]*-->[\s\t]+/, ie = /start|center|end|left|right/, ae = /start|center|end/, oe = /line-(?:left|right)|center|auto/, se = /^(?:(\d{1,2}):)?(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/, T = /* @__PURE__ */ ((e) => (e[e.None = 0] = "None", e[e.Header = 1] = "Header", e[e.Cue = 2] = "Cue", e[e.Region = 3] = "Region", e[e.Note = 4] = "Note", e))(T || {}), E = class {
	f;
	c = 0;
	g = {};
	h = {};
	j = [];
	a = null;
	b = null;
	k = [];
	d;
	l = "";
	async init(e) {
		this.f = e, e.strict && (this.c = 1), e.errors && (this.d = (await import("./errors-DO9C_ArM.js")).ParseErrorBuilder);
	}
	parse(e, t) {
		if (e === "") this.a ? (this.j.push(this.a), this.f.onCue?.(this.a), this.a = null) : this.b ? (this.h[this.b.id] = this.b, this.f.onRegion?.(this.b), this.b = null) : this.c === 1 && (this.i(e, t), this.f.onHeaderMetadata?.(this.g)), this.c = 0;
		else if (this.c) switch (this.c) {
			case 1:
				this.i(e, t);
				break;
			case 2:
				if (this.a) {
					let n = this.a.text.length > 0;
					!n && v.test(e) ? this.m(e.split(S), t) : this.a.text += (n ? "\n" : "") + e;
				}
				break;
			case 3:
				this.n(e.split(S), t);
				break;
		}
		else if (e.startsWith(y)) this.c = 4;
		else if (e.startsWith(b)) this.c = 3, this.b = new d(), this.n(e.replace(x, "").split(S), t);
		else if (e.includes(C)) {
			let n = this.o(e, t);
			n && (this.a = new u(n[0], n[1], ""), this.a.id = this.l, this.m(n[2], t)), this.c = 2;
		} else t === 1 && this.i(e, t);
		this.l = e;
	}
	done() {
		return {
			metadata: this.g,
			cues: this.j,
			regions: Object.values(this.h),
			errors: this.k
		};
	}
	i(e, t) {
		if (t > 1) {
			if (_.test(e)) {
				let [t, n] = e.split(_);
				t && (this.g[t] = (n || "").replace(S, ""));
			}
		} else e.startsWith(ne) ? this.c = 1 : this.e(this.d?.p());
	}
	o(e, t) {
		let [n, r = ""] = e.split(w), [i, ...a] = r.split(S), o = D(n), s = D(i);
		if (o !== null && s !== null && s > o) return [
			o,
			s,
			a
		];
		o === null && this.e(this.d?.q(n, t)), s === null && this.e(this.d?.r(i, t)), o != null && s !== null && s > o && this.e(this.d?.s(o, s, t));
	}
	n(e, t) {
		let n;
		for (let r = 0; r < e.length; r++) if (_.test(e[r])) {
			n = !1;
			let [i, a] = e[r].split(_);
			switch (i) {
				case "id":
					this.b.id = a;
					break;
				case "width":
					let e = p(a);
					e === null ? n = !0 : this.b.width = e;
					break;
				case "lines":
					let r = te(a);
					r === null ? n = !0 : this.b.lines = r;
					break;
				case "regionanchor":
					let o = m(a);
					o === null ? n = !0 : (this.b.regionAnchorX = o[0], this.b.regionAnchorY = o[1]);
					break;
				case "viewportanchor":
					let s = m(a);
					s === null ? n = !0 : (this.b.viewportAnchorX = s[0], this.b.viewportAnchorY = s[1]);
					break;
				case "scroll":
					a === "up" ? this.b.scroll = "up" : n = !0;
					break;
				default: this.e(this.d?.t(i, a, t));
			}
			n && this.e(this.d?.u(i, a, t));
		}
	}
	m(e, t) {
		let n;
		for (let r = 0; r < e.length; r++) if (n = !1, _.test(e[r])) {
			let [i, a] = e[r].split(_);
			switch (i) {
				case "region":
					let e = this.h[a];
					e && (this.a.region = e);
					break;
				case "vertical":
					a === "lr" || a === "rl" ? (this.a.vertical = a, this.a.region = null) : n = !0;
					break;
				case "line":
					let [r, o] = a.split(g);
					if (r.includes(re)) {
						let e = p(r);
						e === null ? n = !0 : (this.a.line = e, this.a.snapToLines = !1);
					} else {
						let e = h(r);
						e === null ? n = !0 : this.a.line = e;
					}
					ae.test(o) ? this.a.lineAlign = o : o && (n = !0), this.a.line !== "auto" && (this.a.region = null);
					break;
				case "position":
					let [s, c] = a.split(g), l = p(s);
					l === null ? n = !0 : this.a.position = l, c && oe.test(c) ? this.a.positionAlign = c : c && (n = !0);
					break;
				case "size":
					let u = p(a);
					u === null ? n = !0 : (this.a.size = u, u < 100 && (this.a.region = null));
					break;
				case "align":
					ie.test(a) ? this.a.align = a : n = !0;
					break;
				default: this.e(this.d?.v(i, a, t));
			}
			n && this.e(this.d?.w(i, a, t));
		}
	}
	e(e) {
		if (e) {
			if (this.k.push(e), this.f.strict) throw this.f.cancel(), e;
			this.f.onError?.(e);
		}
	}
};
function D(e) {
	let t = e.match(se);
	if (!t) return null;
	let n = t[1] ? parseInt(t[1], 10) : 0, r = parseInt(t[2], 10), i = parseInt(t[3], 10), a = t[4] ? parseInt(t[4].padEnd(3, "0"), 10) : 0, o = n * 3600 + r * 60 + i + a / 1e3;
	return n < 0 || r < 0 || i < 0 || a < 0 || r > 59 || i > 59 ? null : o;
}
function ce() {
	return new E();
}
var le = /*#__PURE__*/ Object.freeze({
	__proto__: null,
	VTTBlock: T,
	VTTParser: E,
	default: ce,
	parseVTTTimestamp: D
}), ue = /[0-9]/, de = /[\s\t]+/, O = {
	c: "span",
	i: "i",
	b: "b",
	u: "u",
	ruby: "ruby",
	rt: "rt",
	v: "span",
	lang: "span",
	timestamp: "span"
}, k = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": "\"",
	"&#39;": "'",
	"&nbsp;": "\xA0",
	"&lrm;": "‎",
	"&rlm;": "‏"
}, A = /&(?:amp|lt|gt|quot|#(0+)?39|nbsp|lrm|rlm);/g, j = /* @__PURE__ */ new Set([
	"white",
	"lime",
	"cyan",
	"red",
	"yellow",
	"magenta",
	"blue",
	"black"
]), M = /* @__PURE__ */ new Set(Object.keys(O));
function N(e) {
	let t = "", n = 1, r = [], i = [], a;
	for (let r = 0; r < e.text.length; r++) {
		let l = e.text[r];
		switch (n) {
			case 1:
				l === "<" ? (c(), n = 2) : t += l;
				break;
			case 2:
				switch (l) {
					case "\n":
					case "	":
					case " ":
						o(), n = 4;
						break;
					case ".":
						o(), n = 3;
						break;
					case "/":
						n = 5;
						break;
					case ">":
						o(), n = 1;
						break;
					default:
						!t && ue.test(l) && (n = 6), t += l;
						break;
				}
				break;
			case 3:
				switch (l) {
					case "	":
					case " ":
					case "\n":
						s(), a && a.class?.trim(), n = 4;
						break;
					case ".":
						s();
						break;
					case ">":
						s(), a && a.class?.trim(), n = 1;
						break;
					default: t += l;
				}
				break;
			case 4:
				l === ">" ? (t = t.replace(de, " "), a?.type === "v" ? a.voice = F(t) : a?.type === "lang" && (a.lang = F(t)), t = "", n = 1) : t += l;
				break;
			case 5:
				l === ">" && (t = "", a = i.pop(), n = 1);
				break;
			case 6:
				if (l === ">") {
					let r = D(t);
					r !== null && r >= e.startTime && r <= e.endTime && (t = "timestamp", o(), a.time = r), t = "", n = 1;
				} else t += l;
				break;
		}
	}
	function o() {
		if (M.has(t)) {
			let e = a;
			a = P(t), e ? (i[i.length - 1] !== e && i.push(e), e.children.push(a)) : r.push(a);
		}
		t = "", n = 1;
	}
	function s() {
		if (a && t) {
			let e = t.replace("bg_", "");
			j.has(e) ? a[t.startsWith("bg_") ? "bgColor" : "color"] = e : a.class = a.class ? a.class + " " + t : t;
		}
		t = "";
	}
	function c() {
		if (!t) return;
		let e = {
			type: "text",
			data: F(t)
		};
		a ? a.children.push(e) : r.push(e), t = "";
	}
	return n === 1 && c(), r;
}
function P(e) {
	return {
		tagName: O[e],
		type: e,
		children: []
	};
}
function F(e) {
	return e.replace(A, (e) => k[e] || "'");
}
function I(e, t, n) {
	e.style.setProperty(`--${t}`, n + "");
}
function L(e, t, n = !0) {
	e.setAttribute(`data-${t}`, n === !0 ? "" : n + "");
}
function R(e, t) {
	e.setAttribute("part", t);
}
function z(e) {
	return parseFloat(getComputedStyle(e).lineHeight) || 0;
}
function B(e, t = 0) {
	return V(N(e), t);
}
function V(e, t = 0) {
	let n, r = "";
	for (let i of e) if (i.type === "text") r += i.data;
	else {
		let e = i.type === "timestamp";
		n = {}, n.class = i.class, n.title = i.type === "v" && i.voice, n.lang = i.type === "lang" && i.lang, n.part = i.type === "v" && "voice", e && (n.part = "timed", n["data-time"] = i.time, n["data-future"] = i.time > t, n["data-past"] = i.time < t), n.style = `${i.color ? `color: ${i.color};` : ""}${i.bgColor ? `background-color: ${i.bgColor};` : ""}`;
		let a = Object.entries(n).filter((e) => e[1]).map((e) => `${e[0]}="${e[1] === !0 ? "" : e[1]}"`).join(" ");
		r += `<${i.tagName}${a ? " " + a : ""}>${V(i.children)}</${i.tagName}>`;
	}
	return r;
}
function H(e, t) {
	for (let n of e.querySelectorAll("[part=\"timed\"]")) {
		let e = Number(n.getAttribute("data-time"));
		Number.isNaN(e) || (e > t ? L(n, "future") : n.removeAttribute("data-future"), e < t ? L(n, "past") : n.removeAttribute("data-past"));
	}
}
function fe(e, t) {
	let n = null, r;
	function i() {
		a(), e(...r), r = void 0;
	}
	function a() {
		clearTimeout(n), n = null;
	}
	function o() {
		r = [].slice.call(arguments), a(), n = setTimeout(i, t);
	}
	return o;
}
var U = Symbol(0);
function W(e) {
	return e instanceof HTMLElement ? {
		top: e.offsetTop,
		width: e.clientWidth,
		height: e.clientHeight,
		left: e.offsetLeft,
		right: e.offsetLeft + e.clientWidth,
		bottom: e.offsetTop + e.clientHeight
	} : { ...e };
}
function G(e, t, n) {
	switch (t) {
		case "+x":
			e.left += n, e.right += n;
			break;
		case "-x":
			e.left -= n, e.right -= n;
			break;
		case "+y":
			e.top += n, e.bottom += n;
			break;
		case "-y":
			e.top -= n, e.bottom -= n;
			break;
	}
}
function pe(e, t) {
	return e.left <= t.right && e.right >= t.left && e.top <= t.bottom && e.bottom >= t.top;
}
function me(e, t) {
	for (let n = 0; n < t.length; n++) if (pe(e, t[n])) return t[n];
	return null;
}
function K(e, t) {
	return t.top >= 0 && t.bottom <= e.height && t.left >= 0 && t.right <= e.width;
}
function he(e, t, n) {
	switch (n) {
		case "+x": return t.left < 0;
		case "-x": return t.right > e.width;
		case "+y": return t.top < 0;
		case "-y": return t.bottom > e.height;
	}
}
function ge(e, t) {
	return Math.max(0, Math.min(e.width, t.right) - Math.max(0, t.left)) * Math.max(0, Math.min(e.height, t.bottom) - Math.max(0, t.top)) / (e.height * e.width);
}
function q(e, t) {
	return {
		top: t.top / e.height,
		left: t.left / e.width,
		right: (e.width - t.right) / e.width,
		bottom: (e.height - t.bottom) / e.height
	};
}
function J(e, t) {
	return t.top *= e.height, t.left *= e.width, t.right = e.width - t.right * e.width, t.bottom = e.height - t.bottom * e.height, t;
}
var Y = [
	"top",
	"left",
	"right",
	"bottom"
];
function X(e, t, n, r) {
	let i = q(t, n);
	for (let t of Y) I(e, `${r}-${t}`, i[t] * 100 + "%");
}
function Z(e, t, n, r) {
	let i = 1, a, o = { ...t };
	for (let s = 0; s < r.length; s++) {
		for (; he(e, t, r[s]) || K(e, t) && me(t, n);) G(t, r[s], 1);
		if (K(e, t)) return t;
		let c = ge(e, t);
		i > c && (a = { ...t }, i = c), t = { ...o };
	}
	return a || o;
}
var Q = Symbol(0);
function $(e, t, n, r) {
	let i = n.firstElementChild, a = ye(t), o, s = [];
	if (n[U] || (n[U] = _e(e, n)), o = J(e, { ...n[U] }), n[Q]) s = [
		n[Q] === "top" ? "+y" : "-y",
		"+x",
		"-x"
	];
	else if (t.snapToLines) {
		let n;
		switch (t.vertical) {
			case "":
				s = ["+y", "-y"], n = "height";
				break;
			case "rl":
				s = ["+x", "-x"], n = "width";
				break;
			case "lr":
				s = ["-x", "+x"], n = "width";
				break;
		}
		let r = z(i), c = r * Math.round(a), l = e[n] + r, u = s[0];
		Math.abs(c) > l && (c = c < 0 ? -1 : 1, c *= Math.ceil(l / r) * r), a < 0 && (c += t.vertical === "" ? e.height : e.width, s = s.reverse()), G(o, u, c);
	} else {
		let n = t.vertical === "", r = n ? "+y" : "+x", i = n ? o.height : o.width;
		G(o, r, (n ? e.height : e.width) * a / 100), G(o, r, t.lineAlign === "center" ? i / 2 : t.lineAlign === "end" ? i : 0), s = n ? [
			"-y",
			"+y",
			"-x",
			"+x"
		] : [
			"-x",
			"+x",
			"-y",
			"+y"
		];
	}
	return o = Z(e, o, r, s), X(n, e, o, "cue"), o;
}
function _e(e, t) {
	let n = W(t), r = ve(t);
	if (t[Q] = !1, r.top && (n.top = r.top, n.bottom = r.top + n.height, t[Q] = "top"), r.bottom) {
		let i = e.height - r.bottom;
		n.top = i - n.height, n.bottom = i, t[Q] = "bottom";
	}
	return r.left && (n.left = r.left), r.right && (n.right = e.width - r.right), q(e, n);
}
function ve(e) {
	let t = {};
	for (let n of Y) t[n] = parseFloat(e.style.getPropertyValue(`--cue-${n}`));
	return t;
}
function ye(e) {
	return e.line === "auto" ? e.snapToLines ? -1 : 100 : e.line;
}
function be(e) {
	if (e.position === "auto") switch (e.align) {
		case "start":
		case "left": return 0;
		case "right":
		case "end": return 100;
		default: return 50;
	}
	return e.position;
}
function xe(e, t) {
	if (e.positionAlign === "auto") switch (e.align) {
		case "start": return t === "ltr" ? "line-left" : "line-right";
		case "end": return t === "ltr" ? "line-right" : "line-left";
		case "center": return "center";
		default: return `line-${e.align}`;
	}
	return e.positionAlign;
}
var Se = [
	"-y",
	"+y",
	"-x",
	"+x"
];
function Ce(e, t, n, r) {
	let i = Array.from(n.querySelectorAll("[part=\"cue-display\"]")), a = 0, o = Math.max(0, i.length - t.lines);
	for (let e = i.length - 1; e >= o; e--) a += i[e].offsetHeight;
	I(n, "region-height", a + "px"), n[U] || (n[U] = q(e, W(n)));
	let s = { ...n[U] };
	return s = J(e, s), s.width = n.clientWidth, s.height = a, s.right = s.left + s.width, s.bottom = s.top + a, s = Z(e, s, r, Se), X(n, e, s, "region"), s;
}
var we = class {
	overlay;
	z;
	A = 0;
	C = "ltr";
	B = [];
	D = !1;
	E;
	h = /* @__PURE__ */ new Map();
	j = /* @__PURE__ */ new Map();
	get dir() {
		return this.C;
	}
	set dir(e) {
		this.C = e, L(this.overlay, "dir", e);
	}
	get currentTime() {
		return this.A;
	}
	set currentTime(e) {
		this.A = e, this.update();
	}
	constructor(e, t) {
		this.overlay = e, this.dir = t?.dir ?? "ltr", e.setAttribute("translate", "yes"), e.setAttribute("aria-live", "off"), e.setAttribute("aria-atomic", "true"), R(e, "captions"), this.G(), this.E = new ResizeObserver(this.I.bind(this)), this.E.observe(e);
	}
	changeTrack({ regions: e, cues: t }) {
		this.reset(), this.J(e);
		for (let e of t) this.j.set(e, null);
		this.update();
	}
	addCue(e) {
		this.j.set(e, null), this.update();
	}
	removeCue(e) {
		this.j.delete(e), this.update();
	}
	update(e = !1) {
		this.H(e);
	}
	reset() {
		this.j.clear(), this.h.clear(), this.B = [], this.overlay.textContent = "";
	}
	destroy() {
		this.reset(), this.E.disconnect();
	}
	I() {
		this.D = !0, this.K();
	}
	K = fe(() => {
		this.D = !1, this.G();
		for (let e of this.h.values()) e[U] = null;
		for (let e of this.j.values()) e && (e[U] = null);
		this.H(!0);
	}, 50);
	G() {
		this.z = W(this.overlay), I(this.overlay, "overlay-width", this.z.width + "px"), I(this.overlay, "overlay-height", this.z.height + "px");
	}
	H(e = !1) {
		if (!this.j.size || this.D) return;
		let t, n = [...this.j.keys()].filter((e) => this.A >= e.startTime && this.A <= e.endTime).sort((e, t) => e.startTime === t.startTime ? e.endTime - t.endTime : e.startTime - t.startTime), r = n.map((e) => e.region);
		for (let i = 0; i < this.B.length; i++) {
			if (t = this.B[i], n[i] === t) continue;
			if (t.region && !r.includes(t.region)) {
				let n = this.h.get(t.region.id);
				n && (n.removeAttribute("data-active"), e = !0);
			}
			let a = this.j.get(t);
			a && (a.remove(), e = !0);
		}
		for (let r = 0; r < n.length; r++) {
			t = n[r];
			let i = this.j.get(t);
			i || this.j.set(t, i = this.L(t));
			let a = this.F(t) && this.h.get(t.region.id);
			a && !a.hasAttribute("data-active") && (requestAnimationFrame(() => L(a, "active")), e = !0), i.isConnected || ((a || this.overlay).append(i), e = !0);
		}
		if (e) {
			let e = [], r = /* @__PURE__ */ new Set();
			for (let i = n.length - 1; i >= 0; i--) {
				if (t = n[i], r.has(t.region || t)) continue;
				let a = this.F(t), o = a ? this.h.get(t.region.id) : this.j.get(t);
				a ? e.push(Ce(this.z, t.region, o, e)) : e.push($(this.z, t, o, e)), r.add(a ? t.region : t);
			}
		}
		H(this.overlay, this.A), this.B = n;
	}
	J(e) {
		if (e) for (let t of e) {
			let e = this.M(t);
			this.h.set(t.id, e), this.overlay.append(e);
		}
	}
	M(e) {
		let t = document.createElement("div");
		return R(t, "region"), L(t, "id", e.id), L(t, "scroll", e.scroll), I(t, "region-width", e.width + "%"), I(t, "region-anchor-x", e.regionAnchorX), I(t, "region-anchor-y", e.regionAnchorY), I(t, "region-viewport-anchor-x", e.viewportAnchorX), I(t, "region-viewport-anchor-y", e.viewportAnchorY), I(t, "region-lines", e.lines), t;
	}
	L(e) {
		let t = document.createElement("div"), n = be(e), r = xe(e, this.C);
		if (R(t, "cue-display"), e.vertical !== "" && L(t, "vertical"), I(t, "cue-text-align", e.align), e.style) for (let n of Object.keys(e.style)) t.style.setProperty(n, e.style[n]);
		if (this.F(e)) I(t, "cue-offset", `${n - (r === "line-right" ? 100 : r === "center" ? 50 : 0)}%`);
		else if (I(t, "cue-writing-mode", e.vertical === "" ? "horizontal-tb" : e.vertical === "lr" ? "vertical-lr" : "vertical-rl"), !e.style?.["--cue-width"]) {
			let i = n;
			r === "line-left" ? i = 100 - n : r === "center" && n <= 50 ? i = n * 2 : r === "center" && n > 50 && (i = (100 - n) * 2);
			let a = e.size < i ? e.size : i;
			e.vertical === "" ? I(t, "cue-width", a + "%") : I(t, "cue-height", a + "%");
		}
		let i = document.createElement("div");
		return R(i, "cue"), e.id && L(i, "id", e.id), i.innerHTML = B(e), t.append(i), t;
	}
	F(e) {
		return e.region && e.size === 100 && e.vertical === "" && e.line === "auto";
	}
};
//#endregion
export { u as a, s as c, B as d, H as f, T as i, a as l, t as n, E as o, e as r, d as s, we as t, D as u };
