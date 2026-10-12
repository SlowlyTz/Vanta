//#region \0@oxc-project+runtime@0.133.0/helpers/esm/typeof.js
function e(t) {
	"@babel/helpers - typeof";
	return e = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
		return typeof e;
	} : function(e) {
		return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
	}, e(t);
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/toPrimitive.js
function t(t, n) {
	if (e(t) != "object" || !t) return t;
	var r = t[Symbol.toPrimitive];
	if (r !== void 0) {
		var i = r.call(t, n || "default");
		if (e(i) != "object") return i;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (n === "string" ? String : Number)(t);
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/toPropertyKey.js
function n(n) {
	var r = t(n, "string");
	return e(r) == "symbol" ? r : r + "";
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/defineProperty.js
function r(e, t, r) {
	return (t = n(t)) in e ? Object.defineProperty(e, t, {
		value: r,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = r, e;
}
//#endregion
//#region node_modules/media-captions/dist/prod/index.js
var i = {
	LoadFail: 0,
	BadSignature: 1,
	BadTimestamp: 2,
	BadSettingValue: 3,
	BadFormat: 4,
	UnknownSetting: 5
}, a = class extends Error {
	constructor(e) {
		super(e.reason), r(this, "code", void 0), r(this, "line", void 0), this.code = e.code, this.line = e.line;
	}
}, o = /\r?\n|\r/gm, s = class {
	constructor(e) {
		r(this, "writable", void 0), r(this, "readable", void 0);
		let t = new c(e);
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
}, c = class {
	constructor(e) {
		r(this, "x", ""), r(this, "y", void 0), r(this, "onLine", void 0), r(this, "onClose", void 0), this.y = new TextDecoder(e);
	}
	transform(e) {
		this.x += this.y.decode(e, { stream: !0 });
		let t = this.x.split(o);
		this.x = t.pop() || "";
		for (let e = 0; e < t.length; e++) this.onLine(t[e].trim());
	}
	close() {
		this.x && this.onLine(this.x.trim()), this.x = "", this.onClose();
	}
};
async function l(e, t) {
	return u(new ReadableStream({ start(t) {
		let n = e.split(o);
		for (let e of n) t.enqueue(e);
		t.close();
	} }), t);
}
async function u(e, t) {
	var n;
	let r = (n = t == null ? void 0 : t.type) == null ? "vtt" : n, i;
	if (typeof r == "string") switch (r) {
		case "srt":
			i = (await import("./srt-parser-BHHSq12g.js")).default;
			break;
		case "ssa":
		case "ass":
			i = (await import("./ssa-parser-DBPQcH-1.js")).default;
			break;
		default: i = (await Promise.resolve().then(function() {
			return pe;
		})).default;
	}
	else i = r;
	let a, o = e.getReader(), s = i(), c = !!(t != null && t.strict) || !!(t != null && t.errors);
	await s.init({
		strict: !1,
		...t,
		errors: c,
		type: r,
		cancel() {
			o.cancel(), a = s.done(!0);
		}
	});
	let l = 1;
	for (;;) {
		let { value: e, done: t } = await o.read();
		if (t) {
			s.parse("", l), a = s.done(!1);
			break;
		}
		s.parse(e, l), l++;
	}
	return a;
}
async function d(e, t) {
	var n, r;
	let i = await e;
	if (!i.ok || !i.body) return {
		metadata: {},
		cues: [],
		regions: [],
		errors: [void 0]
	};
	let a = i.headers.get("content-type") || "", o = (n = a.match(/text\/(.*?)(?:;|$)/)) == null ? void 0 : n[1], s = (r = a.match(/charset=(.*?)(?:;|$)/)) == null ? void 0 : r[1];
	return ee(i.body, {
		type: o,
		encoding: s,
		...t
	});
}
async function ee(e, { encoding: t = "utf-8", ...n } = {}) {
	return u(e.pipeThrough(new s(t)), n);
}
var te = window.VTTCue, f = class extends te {
	constructor(...e) {
		super(...e), r(this, "region", null), r(this, "vertical", ""), r(this, "snapToLines", !0), r(this, "line", "auto"), r(this, "lineAlign", "start"), r(this, "position", "auto"), r(this, "positionAlign", "auto"), r(this, "size", 100), r(this, "align", "center"), r(this, "style", void 0);
	}
}, p = class {
	constructor() {
		r(this, "id", ""), r(this, "width", 100), r(this, "lines", 3), r(this, "regionAnchorX", 0), r(this, "regionAnchorY", 100), r(this, "viewportAnchorX", 0), r(this, "viewportAnchorY", 100), r(this, "scroll", "");
	}
}, m = ",", h = "%";
function g(e) {
	let t = parseInt(e, 10);
	return Number.isNaN(t) ? null : t;
}
function _(e) {
	let t = parseInt(e.replace(h, ""), 10);
	return !Number.isNaN(t) && t >= 0 && t <= 100 ? t : null;
}
function v(e) {
	if (!e.includes(m)) return null;
	let [t, n] = e.split(m).map(_);
	return t !== null && n !== null ? [t, n] : null;
}
function ne(e) {
	let t = parseFloat(e);
	return Number.isNaN(t) ? null : t;
}
var re = "WEBVTT", y = ",", b = "%", x = /[:=]/, S = /^[\s\t]*(region|vertical|line|position|size|align)[:=]/, C = "NOTE", ie = "REGION", ae = /^REGION:?[\s\t]+/, w = /[\s\t]+/, oe = "-->", se = /[\s\t]*-->[\s\t]+/, ce = /start|center|end|left|right/, le = /start|center|end/, ue = /line-(?:left|right)|center|auto/, de = /^(?:(\d{1,2}):)?(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/, T = /* @__PURE__ */ ((e) => (e[e.None = 0] = "None", e[e.Header = 1] = "Header", e[e.Cue = 2] = "Cue", e[e.Region = 3] = "Region", e[e.Note = 4] = "Note", e))(T || {}), E = class {
	constructor() {
		r(this, "f", void 0), r(this, "c", 0), r(this, "g", {}), r(this, "h", {}), r(this, "j", []), r(this, "a", null), r(this, "b", null), r(this, "k", []), r(this, "d", void 0), r(this, "l", "");
	}
	async init(e) {
		this.f = e, e.strict && (this.c = 1), e.errors && (this.d = (await import("./errors-D8eOx1kY.js")).ParseErrorBuilder);
	}
	parse(e, t) {
		if (e === "") {
			if (this.a) {
				var n, r;
				this.j.push(this.a), (n = (r = this.f).onCue) == null || n.call(r, this.a), this.a = null;
			} else if (this.b) {
				var i, a;
				this.h[this.b.id] = this.b, (i = (a = this.f).onRegion) == null || i.call(a, this.b), this.b = null;
			} else if (this.c === 1) {
				var o, s;
				this.i(e, t), (o = (s = this.f).onHeaderMetadata) == null || o.call(s, this.g);
			}
			this.c = 0;
		} else if (this.c) switch (this.c) {
			case 1:
				this.i(e, t);
				break;
			case 2:
				if (this.a) {
					let n = this.a.text.length > 0;
					!n && S.test(e) ? this.m(e.split(w), t) : this.a.text += (n ? "\n" : "") + e;
				}
				break;
			case 3:
				this.n(e.split(w), t);
				break;
		}
		else if (e.startsWith(C)) this.c = 4;
		else if (e.startsWith(ie)) this.c = 3, this.b = new p(), this.n(e.replace(ae, "").split(w), t);
		else if (e.includes(oe)) {
			let n = this.o(e, t);
			n && (this.a = new f(n[0], n[1], ""), this.a.id = this.l, this.m(n[2], t)), this.c = 2;
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
			if (x.test(e)) {
				let [t, n] = e.split(x);
				t && (this.g[t] = (n || "").replace(w, ""));
			}
		} else if (e.startsWith(re)) this.c = 1;
		else {
			var n;
			this.e((n = this.d) == null ? void 0 : n.p());
		}
	}
	o(e, t) {
		let [n, r = ""] = e.split(se), [i, ...a] = r.split(w), o = D(n), s = D(i);
		if (o !== null && s !== null && s > o) return [
			o,
			s,
			a
		];
		if (o === null) {
			var c;
			this.e((c = this.d) == null ? void 0 : c.q(n, t));
		}
		if (s === null) {
			var l;
			this.e((l = this.d) == null ? void 0 : l.r(i, t));
		}
		if (o != null && s !== null && s > o) {
			var u;
			this.e((u = this.d) == null ? void 0 : u.s(o, s, t));
		}
	}
	n(e, t) {
		let n;
		for (let a = 0; a < e.length; a++) if (x.test(e[a])) {
			n = !1;
			let [o, s] = e[a].split(x);
			switch (o) {
				case "id":
					this.b.id = s;
					break;
				case "width":
					let e = _(s);
					e === null ? n = !0 : this.b.width = e;
					break;
				case "lines":
					let i = g(s);
					i === null ? n = !0 : this.b.lines = i;
					break;
				case "regionanchor":
					let a = v(s);
					a === null ? n = !0 : (this.b.regionAnchorX = a[0], this.b.regionAnchorY = a[1]);
					break;
				case "viewportanchor":
					let c = v(s);
					c === null ? n = !0 : (this.b.viewportAnchorX = c[0], this.b.viewportAnchorY = c[1]);
					break;
				case "scroll":
					s === "up" ? this.b.scroll = "up" : n = !0;
					break;
				default:
					var r;
					this.e((r = this.d) == null ? void 0 : r.t(o, s, t));
			}
			if (n) {
				var i;
				this.e((i = this.d) == null ? void 0 : i.u(o, s, t));
			}
		}
	}
	m(e, t) {
		let n;
		for (let a = 0; a < e.length; a++) if (n = !1, x.test(e[a])) {
			let [o, s] = e[a].split(x);
			switch (o) {
				case "region":
					let e = this.h[s];
					e && (this.a.region = e);
					break;
				case "vertical":
					s === "lr" || s === "rl" ? (this.a.vertical = s, this.a.region = null) : n = !0;
					break;
				case "line":
					let [i, a] = s.split(y);
					if (i.includes(b)) {
						let e = _(i);
						e === null ? n = !0 : (this.a.line = e, this.a.snapToLines = !1);
					} else {
						let e = ne(i);
						e === null ? n = !0 : this.a.line = e;
					}
					le.test(a) ? this.a.lineAlign = a : a && (n = !0), this.a.line !== "auto" && (this.a.region = null);
					break;
				case "position":
					let [c, l] = s.split(y), u = _(c);
					u === null ? n = !0 : this.a.position = u, l && ue.test(l) ? this.a.positionAlign = l : l && (n = !0);
					break;
				case "size":
					let d = _(s);
					d === null ? n = !0 : (this.a.size = d, d < 100 && (this.a.region = null));
					break;
				case "align":
					ce.test(s) ? this.a.align = s : n = !0;
					break;
				default:
					var r;
					this.e((r = this.d) == null ? void 0 : r.v(o, s, t));
			}
			if (n) {
				var i;
				this.e((i = this.d) == null ? void 0 : i.w(o, s, t));
			}
		}
	}
	e(e) {
		if (e) {
			if (this.k.push(e), this.f.strict) throw this.f.cancel(), e;
			var t, n;
			(t = (n = this.f).onError) == null || t.call(n, e);
		}
	}
};
function D(e) {
	let t = e.match(de);
	if (!t) return null;
	let n = t[1] ? parseInt(t[1], 10) : 0, r = parseInt(t[2], 10), i = parseInt(t[3], 10), a = t[4] ? parseInt(t[4].padEnd(3, "0"), 10) : 0, o = n * 3600 + r * 60 + i + a / 1e3;
	return n < 0 || r < 0 || i < 0 || a < 0 || r > 59 || i > 59 ? null : o;
}
function fe() {
	return new E();
}
var pe = /*#__PURE__*/ Object.freeze({
	__proto__: null,
	VTTBlock: T,
	VTTParser: E,
	default: fe,
	parseVTTTimestamp: D
}), me = /[0-9]/, O = /[\s\t]+/, k = {
	c: "span",
	i: "i",
	b: "b",
	u: "u",
	ruby: "ruby",
	rt: "rt",
	v: "span",
	lang: "span",
	timestamp: "span"
}, A = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": "\"",
	"&#39;": "'",
	"&nbsp;": "\xA0",
	"&lrm;": "‎",
	"&rlm;": "‏"
}, j = /&(?:amp|lt|gt|quot|#(0+)?39|nbsp|lrm|rlm);/g, M = /* @__PURE__ */ new Set([
	"white",
	"lime",
	"cyan",
	"red",
	"yellow",
	"magenta",
	"blue",
	"black"
]), N = /* @__PURE__ */ new Set(Object.keys(k));
function P(e) {
	let t = "", n = 1, r = [], i = [], a;
	for (let r = 0; r < e.text.length; r++) {
		let d = e.text[r];
		switch (n) {
			case 1:
				d === "<" ? (u(), n = 2) : t += d;
				break;
			case 2:
				switch (d) {
					case "\n":
					case "	":
					case " ":
						c(), n = 4;
						break;
					case ".":
						c(), n = 3;
						break;
					case "/":
						n = 5;
						break;
					case ">":
						c(), n = 1;
						break;
					default:
						!t && me.test(d) && (n = 6), t += d;
						break;
				}
				break;
			case 3:
				switch (d) {
					case "	":
					case " ":
					case "\n":
						var o;
						l(), a && ((o = a.class) == null || o.trim()), n = 4;
						break;
					case ".":
						l();
						break;
					case ">":
						var s;
						l(), a && ((s = a.class) == null || s.trim()), n = 1;
						break;
					default: t += d;
				}
				break;
			case 4:
				d === ">" ? (t = t.replace(O, " "), (a == null ? void 0 : a.type) === "v" ? a.voice = I(t) : (a == null ? void 0 : a.type) === "lang" && (a.lang = I(t)), t = "", n = 1) : t += d;
				break;
			case 5:
				d === ">" && (t = "", a = i.pop(), n = 1);
				break;
			case 6:
				if (d === ">") {
					let r = D(t);
					r !== null && r >= e.startTime && r <= e.endTime && (t = "timestamp", c(), a.time = r), t = "", n = 1;
				} else t += d;
				break;
		}
	}
	function c() {
		if (N.has(t)) {
			let e = a;
			a = F(t), e ? (i[i.length - 1] !== e && i.push(e), e.children.push(a)) : r.push(a);
		}
		t = "", n = 1;
	}
	function l() {
		if (a && t) {
			let e = t.replace("bg_", "");
			M.has(e) ? a[t.startsWith("bg_") ? "bgColor" : "color"] = e : a.class = a.class ? a.class + " " + t : t;
		}
		t = "";
	}
	function u() {
		if (!t) return;
		let e = {
			type: "text",
			data: I(t)
		};
		a ? a.children.push(e) : r.push(e), t = "";
	}
	return n === 1 && u(), r;
}
function F(e) {
	return {
		tagName: k[e],
		type: e,
		children: []
	};
}
function I(e) {
	return e.replace(j, (e) => A[e] || "'");
}
function L(e, t, n) {
	e.style.setProperty(`--${t}`, n + "");
}
function R(e, t, n = !0) {
	e.setAttribute(`data-${t}`, n === !0 ? "" : n + "");
}
function z(e, t) {
	e.setAttribute("part", t);
}
function he(e) {
	return parseFloat(getComputedStyle(e).lineHeight) || 0;
}
function B(e, t = 0) {
	return V(P(e), t);
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
		Number.isNaN(e) || (e > t ? R(n, "future") : n.removeAttribute("data-future"), e < t ? R(n, "past") : n.removeAttribute("data-past"));
	}
}
function ge(e, t) {
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
function _e(e, t) {
	return e.left <= t.right && e.right >= t.left && e.top <= t.bottom && e.bottom >= t.top;
}
function ve(e, t) {
	for (let n = 0; n < t.length; n++) if (_e(e, t[n])) return t[n];
	return null;
}
function K(e, t) {
	return t.top >= 0 && t.bottom <= e.height && t.left >= 0 && t.right <= e.width;
}
function ye(e, t, n) {
	switch (n) {
		case "+x": return t.left < 0;
		case "-x": return t.right > e.width;
		case "+y": return t.top < 0;
		case "-y": return t.bottom > e.height;
	}
}
function be(e, t) {
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
	for (let t of Y) L(e, `${r}-${t}`, i[t] * 100 + "%");
}
function Z(e, t, n, r) {
	let i = 1, a, o = { ...t };
	for (let s = 0; s < r.length; s++) {
		for (; ye(e, t, r[s]) || K(e, t) && ve(t, n);) G(t, r[s], 1);
		if (K(e, t)) return t;
		let c = be(e, t);
		i > c && (a = { ...t }, i = c), t = { ...o };
	}
	return a || o;
}
var Q = Symbol(0);
function xe(e, t, n, r) {
	let i = n.firstElementChild, a = $(t), o, s = [];
	if (n[U] || (n[U] = Se(e, n)), o = J(e, { ...n[U] }), n[Q]) s = [
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
		let r = he(i), c = r * Math.round(a), l = e[n] + r, u = s[0];
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
function Se(e, t) {
	let n = W(t), r = Ce(t);
	if (t[Q] = !1, r.top && (n.top = r.top, n.bottom = r.top + n.height, t[Q] = "top"), r.bottom) {
		let i = e.height - r.bottom;
		n.top = i - n.height, n.bottom = i, t[Q] = "bottom";
	}
	return r.left && (n.left = r.left), r.right && (n.right = e.width - r.right), q(e, n);
}
function Ce(e) {
	let t = {};
	for (let n of Y) t[n] = parseFloat(e.style.getPropertyValue(`--cue-${n}`));
	return t;
}
function $(e) {
	return e.line === "auto" ? e.snapToLines ? -1 : 100 : e.line;
}
function we(e) {
	if (e.position === "auto") switch (e.align) {
		case "start":
		case "left": return 0;
		case "right":
		case "end": return 100;
		default: return 50;
	}
	return e.position;
}
function Te(e, t) {
	if (e.positionAlign === "auto") switch (e.align) {
		case "start": return t === "ltr" ? "line-left" : "line-right";
		case "end": return t === "ltr" ? "line-right" : "line-left";
		case "center": return "center";
		default: return `line-${e.align}`;
	}
	return e.positionAlign;
}
var Ee = [
	"-y",
	"+y",
	"-x",
	"+x"
];
function De(e, t, n, r) {
	let i = Array.from(n.querySelectorAll("[part=\"cue-display\"]")), a = 0, o = Math.max(0, i.length - t.lines);
	for (let e = i.length - 1; e >= o; e--) a += i[e].offsetHeight;
	L(n, "region-height", a + "px"), n[U] || (n[U] = q(e, W(n)));
	let s = { ...n[U] };
	return s = J(e, s), s.width = n.clientWidth, s.height = a, s.right = s.left + s.width, s.bottom = s.top + a, s = Z(e, s, r, Ee), X(n, e, s, "region"), s;
}
var Oe = class {
	get dir() {
		return this.C;
	}
	set dir(e) {
		this.C = e, R(this.overlay, "dir", e);
	}
	get currentTime() {
		return this.A;
	}
	set currentTime(e) {
		this.A = e, this.update();
	}
	constructor(e, t) {
		var n;
		r(this, "overlay", void 0), r(this, "z", void 0), r(this, "A", 0), r(this, "C", "ltr"), r(this, "B", []), r(this, "D", !1), r(this, "E", void 0), r(this, "h", /* @__PURE__ */ new Map()), r(this, "j", /* @__PURE__ */ new Map()), r(this, "K", ge(() => {
			this.D = !1, this.G();
			for (let e of this.h.values()) e[U] = null;
			for (let e of this.j.values()) e && (e[U] = null);
			this.H(!0);
		}, 50)), this.overlay = e, this.dir = (n = t == null ? void 0 : t.dir) == null ? "ltr" : n, e.setAttribute("translate", "yes"), e.setAttribute("aria-live", "off"), e.setAttribute("aria-atomic", "true"), z(e, "captions"), this.G(), this.E = new ResizeObserver(this.I.bind(this)), this.E.observe(e);
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
	G() {
		this.z = W(this.overlay), L(this.overlay, "overlay-width", this.z.width + "px"), L(this.overlay, "overlay-height", this.z.height + "px");
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
			a && !a.hasAttribute("data-active") && (requestAnimationFrame(() => R(a, "active")), e = !0), i.isConnected || ((a || this.overlay).append(i), e = !0);
		}
		if (e) {
			let e = [], r = /* @__PURE__ */ new Set();
			for (let i = n.length - 1; i >= 0; i--) {
				if (t = n[i], r.has(t.region || t)) continue;
				let a = this.F(t), o = a ? this.h.get(t.region.id) : this.j.get(t);
				a ? e.push(De(this.z, t.region, o, e)) : e.push(xe(this.z, t, o, e)), r.add(a ? t.region : t);
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
		return z(t, "region"), R(t, "id", e.id), R(t, "scroll", e.scroll), L(t, "region-width", e.width + "%"), L(t, "region-anchor-x", e.regionAnchorX), L(t, "region-anchor-y", e.regionAnchorY), L(t, "region-viewport-anchor-x", e.viewportAnchorX), L(t, "region-viewport-anchor-y", e.viewportAnchorY), L(t, "region-lines", e.lines), t;
	}
	L(e) {
		let t = document.createElement("div"), n = we(e), r = Te(e, this.C);
		if (z(t, "cue-display"), e.vertical !== "" && R(t, "vertical"), L(t, "cue-text-align", e.align), e.style) for (let n of Object.keys(e.style)) t.style.setProperty(n, e.style[n]);
		if (this.F(e)) L(t, "cue-offset", `${n - (r === "line-right" ? 100 : r === "center" ? 50 : 0)}%`);
		else {
			var i;
			if (L(t, "cue-writing-mode", e.vertical === "" ? "horizontal-tb" : e.vertical === "lr" ? "vertical-lr" : "vertical-rl"), !((i = e.style) != null && i["--cue-width"])) {
				let i = n;
				r === "line-left" ? i = 100 - n : r === "center" && n <= 50 ? i = n * 2 : r === "center" && n > 50 && (i = (100 - n) * 2);
				let a = e.size < i ? e.size : i;
				e.vertical === "" ? L(t, "cue-width", a + "%") : L(t, "cue-height", a + "%");
			}
		}
		let a = document.createElement("div");
		return z(a, "cue"), e.id && R(a, "id", e.id), a.innerHTML = B(e), t.append(a), t;
	}
	F(e) {
		return e.region && e.size === 100 && e.vertical === "" && e.line === "auto";
	}
};
//#endregion
export { f as a, d as c, B as d, H as f, T as i, l, a as n, E as o, r as p, i as r, p as s, Oe as t, D as u };
