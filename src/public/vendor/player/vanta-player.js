import { $ as e, E as t, H as n, K as r, O as i, X as a, Y as o, d as s, i as c, j as l, w as u } from "./std-Dbvq-pq2.js";
import { $ as d, A as f, C as p, D as m, E as h, H as g, N as _, O as v, P as y, Q as b, S as x, T as S, U as C, V as w, W as T, X as E, a as D, at as O, c as k, ct as A, g as j, i as M, it as N, j as P, k as F, l as ee, lt as I, n as L, o as te, ot as ne, p as re, r as ie, s as ae, st as R, t as oe, tt as se, u as ce, w as le, x as ue, z as de } from "./media-ui-U1Ki64sW.js";
import { p as z } from "./prod-yin0M9SD.js";
//#region node_modules/vidstack/dist/prod/player.js
var fe = class {
	constructor() {
		z(this, "_e", !1), z(this, "$e", c()), z(this, "Ze", /* @__PURE__ */ new Map());
	}
	get df() {
		return this.Ze.size;
	}
	get ef() {
		return this._e;
	}
	async ff() {
		this._e || await this.$e.promise;
	}
	t(e, t) {
		if (this._e) {
			t();
			return;
		}
		this.Ze.delete(e), this.Ze.set(e, t);
	}
	cf(e) {
		var t;
		(t = this.Ze.get(e)) == null || t(), this.Ze.delete(e);
	}
	O() {
		this.af(), this._e = !0, this.Ze.size > 0 && this.af();
	}
	P() {
		this._e = !1;
	}
	gf() {
		this.P(), this.Ze.clear(), this.bf();
	}
	af() {
		for (let e of this.Ze.keys()) this.cf(e);
		this.bf();
	}
	bf() {
		this.$e.resolve(), this.$e = c();
	}
}, pe = Object.defineProperty, me = Object.getOwnPropertyDescriptor, B = (e, t, n, r) => {
	for (var i = r > 1 ? void 0 : r ? me(t, n) : t, a = e.length - 1, o; a >= 0; a--) (o = e[a]) && (i = (r ? o(t, n, i) : o(i)) || i);
	return r && i && pe(t, n, i), i;
}, V = class extends O {
	get q() {
		return this.j.$provider();
	}
	constructor(e) {
		super(e), z(this, "j", void 0), z(this, "u", void 0), z(this, "r", void 0), z(this, "s", new fe()), z(this, "orientation", void 0), this.w(), new f(e);
		let t = {
			player: null,
			scope: a(),
			qualities: new C(),
			audioTracks: new re(),
			$provider: o(null),
			$props: this.$props,
			$store: this.$store
		};
		t.remote = new S(void 0), t.$iosControls = r(this.x.bind(this)), t.textTracks = new w(), t.textTracks[y] = this.$props.crossorigin, t.textRenderers = new de(t), t.ariaKeys = {}, this.j = t, n(b, t), this.orientation = new _(e), new L(e), new x(e, t), new g(e);
		let i = new h();
		this.u = new v(e, i, t), this.r = new m(e, this.u, i, t), t.delegate = new le(this.u.N.bind(this.u), t), new p(e, this.startLoading.bind(this));
	}
	onAttach(e) {
		e.setAttribute("tabindex", "0"), se(e, "role", "region"), l(this.y.bind(this)), l(this.z.bind(this)), l(this.A.bind(this)), l(this.B.bind(this)), l(this.C.bind(this)), l(this.D.bind(this)), l(this.E.bind(this)), l(this.F.bind(this)), l(this.G.bind(this)), this.H(), this.I(), this.j.player = e, this.j.remote.setTarget(e), this.j.remote.setPlayer(e), u(e, "find-media-player", this.J.bind(this));
	}
	onConnect(e) {
		j && t(e, "data-iphone", "");
		let n = window.matchMedia("(pointer: coarse)");
		this.v(n), n.onchange = this.v.bind(this);
		let r = new ResizeObserver(this.n.bind(this));
		return r.observe(e), l(this.n.bind(this)), this.dispatch("media-player-connect", {
			detail: this.el,
			bubbles: !0,
			composed: !0
		}), () => {
			r.disconnect(), n.onchange = null;
		};
	}
	w() {
		let e = {
			viewType: "providedViewType",
			streamType: "providedStreamType"
		};
		for (let r of Object.keys(this.$props)) {
			var t, n;
			(t = this.$store[(n = e[r]) == null ? r : n]) == null || t.set(this.$props[r]());
		}
		l(this.K.bind(this)), this.$store.muted.set(this.$props.muted() || this.$props.volume() === 0);
	}
	y() {
		var e;
		let { title: n } = this.$props, { live: r, viewType: a } = this.$store, o = r(), s = i(a()), c = s === "Unknown" ? o ? "Live" : "Media" : `${o ? "Live " : ""}${s}`, l = n();
		if (l) {
			var u, d;
			(u = this.el) == null || u.setAttribute("data-title", l), (d = this.el) == null || d.removeAttribute("title");
		}
		let f = ((e = this.el) == null ? void 0 : e.getAttribute("data-title")) || "";
		this.$store.title.set(f), t(this.el, "aria-label", f ? `${c} - ${f}` : c + " Player");
	}
	z() {
		let e = this.orientation.landscape ? "landscape" : "portrait";
		this.$store.orientation.set(e), t(this.el, "data-orientation", e), this.n();
	}
	A() {
		this.$store.canPlay() && this.q ? this.s.O() : this.s.P();
	}
	K() {
		this.$store.providedViewType.set(this.$props.viewType()), this.$store.providedStreamType.set(this.$props.streamType());
	}
	H() {
		let e = {
			"aspect-ratio": this.$props.aspectRatio,
			"data-captions": () => {
				let e = this.$store.textTrack();
				return !!e && E(e);
			},
			"data-ios-controls": this.j.$iosControls
		}, t = {
			canPictureInPicture: "can-pip",
			pictureInPicture: "pip"
		};
		for (let r of ue) {
			var n;
			let i = "data-" + ((n = t[r]) == null ? s(r) : n);
			e[i] = this.$store[r];
		}
		delete e.title, this.setAttributes(e);
	}
	I() {
		this.setCSSVars({ "--media-aspect-ratio": () => {
			let e = this.$props.aspectRatio();
			return e ? +e.toFixed(4) : null;
		} });
	}
	J(e) {
		e.detail(this.el);
	}
	n() {
		if (!this.el) return;
		let e = this.el.clientWidth, n = this.el.clientHeight, { smallBreakpointX: r, smallBreakpointY: i, largeBreakpointX: a, largeBreakpointY: o } = this.$props, s = e < r() ? "sm" : e < a() ? "md" : "lg", c = n < i() ? "sm" : n < o() ? "md" : "lg";
		this.$store.breakpointX.set(s), this.$store.breakpointY.set(c), t(this.el, "data-bp-x", s), t(this.el, "data-bp-y", c);
	}
	v(e) {
		let n = e.matches;
		t(this.el, "data-touch", n), this.$store.touchPointer.set(n), this.n();
	}
	x() {
		return !T() && this.$store.mediaType() === "video" && (this.$store.controls() && !this.$props.playsinline() || this.$store.fullscreen());
	}
	get provider() {
		return this.q;
	}
	get user() {
		return this.r.Q;
	}
	get qualities() {
		return this.j.qualities;
	}
	get audioTracks() {
		return this.j.audioTracks;
	}
	get textTracks() {
		return this.j.textTracks;
	}
	get textRenderers() {
		return this.j.textRenderers;
	}
	get paused() {
		var e, t;
		return (e = (t = this.q) == null ? void 0 : t.paused) == null ? !0 : e;
	}
	set paused(e) {
		e ? this.s.t("paused", () => this.r.L()) : this.s.t("paused", () => this.r.M());
	}
	C() {
		this.paused = this.$props.paused();
	}
	get muted() {
		var e, t;
		return (e = (t = this.q) == null ? void 0 : t.muted) == null ? !1 : e;
	}
	set muted(e) {
		this.s.t("muted", () => this.q.muted = e);
	}
	B() {
		this.muted = this.$props.muted();
	}
	get currentTime() {
		var e, t;
		return (e = (t = this.q) == null ? void 0 : t.currentTime) == null ? 0 : e;
	}
	set currentTime(t) {
		this.s.t("currentTime", () => {
			let n = this.q;
			t !== n.currentTime && e(() => {
				let e = Math.min(Math.max(this.$store.seekableStart() + .1, t), this.$store.seekableEnd() - .1);
				Number.isFinite(e) && (n.currentTime = e);
			});
		});
	}
	E() {
		this.currentTime = this.$props.currentTime();
	}
	get volume() {
		var e, t;
		return (e = (t = this.q) == null ? void 0 : t.volume) == null ? 1 : e;
	}
	set volume(e) {
		this.s.t("volume", () => this.q.volume = e);
	}
	D() {
		this.volume = ce(0, this.$props.volume(), 1);
	}
	get playsinline() {
		var e, t;
		return (e = (t = this.q) == null ? void 0 : t.playsinline) == null ? !1 : e;
	}
	set playsinline(e) {
		this.s.t("playsinline", () => this.q.playsinline = e);
	}
	F() {
		this.playsinline = this.$props.playsinline();
	}
	get playbackRate() {
		var e, t;
		return (e = (t = this.q) == null ? void 0 : t.playbackRate) == null ? 1 : e;
	}
	set playbackRate(e) {
		this.s.t("rate", () => this.q.playbackRate = e);
	}
	G() {
		this.playbackRate = this.$props.playbackRate();
	}
	async play() {
		return this.r.M();
	}
	async pause() {
		return this.r.L();
	}
	async enterFullscreen(e) {
		return this.r.R(e);
	}
	async exitFullscreen(e) {
		return this.r.S(e);
	}
	enterPictureInPicture() {
		return this.r.T();
	}
	exitPictureInPicture() {
		return this.r.U();
	}
	seekToLiveEdge() {
		this.r.V();
	}
	startLoading() {
		this.j.delegate.p("can-load");
	}
	destroy() {
		this.dispatch("destroy");
	}
};
//#endregion
//#region node_modules/vidstack/dist/prod/define/media-captions.js
z(V, "el", ne({
	tagName: "media-player",
	props: d,
	store: F
})), B([A], V.prototype, "provider", 1), B([A], V.prototype, "user", 1), B([A], V.prototype, "orientation", 2), B([A], V.prototype, "qualities", 1), B([A], V.prototype, "audioTracks", 1), B([A], V.prototype, "textTracks", 1), B([A], V.prototype, "textRenderers", 1), B([A], V.prototype, "paused", 1), B([A], V.prototype, "muted", 1), B([A], V.prototype, "currentTime", 1), B([A], V.prototype, "volume", 1), B([A], V.prototype, "playsinline", 1), B([A], V.prototype, "playbackRate", 1), B([R], V.prototype, "play", 1), B([R], V.prototype, "pause", 1), B([R], V.prototype, "enterFullscreen", 1), B([R], V.prototype, "exitFullscreen", 1), B([R], V.prototype, "enterPictureInPicture", 1), B([R], V.prototype, "exitPictureInPicture", 1), B([R], V.prototype, "seekToLiveEdge", 1), B([R], V.prototype, "startLoading", 1), I(V), I(P), I(P), I(k), I(te), I(ae), I(M), I(ee), I(ie), I(D), I(oe);
//#endregion
//#region src/player/src/platform.js
function he() {
	let e = navigator.userAgent || "", t = navigator.platform || "";
	return /iPad|iPhone|iPod/i.test(e) || t === "MacIntel" && navigator.maxTouchPoints > 1;
}
function ge(e = document) {
	var t;
	(t = e.querySelectorAll) == null || t.call(e, "video").forEach((e) => {
		e.setAttribute("playsinline", ""), e.setAttribute("webkit-playsinline", ""), e.playsInline = !0, e.webkitPlaysInline = !0;
	});
}
function _e(e) {
	var t, n;
	e == null || (t = e.classList) == null || t.add("is-ios-inline-fullscreen"), e == null || (n = e.setAttribute) == null || n.call(e, "data-inline-fullscreen", "true");
}
function ve(e) {
	var t, n;
	e == null || (t = e.classList) == null || t.remove("is-ios-inline-fullscreen"), e == null || (n = e.removeAttribute) == null || n.call(e, "data-inline-fullscreen");
}
function ye(e) {
	var t;
	return !!(!(e == null || (t = e.classList) == null) && t.contains("is-ios-inline-fullscreen"));
}
function be() {
	return document.pictureInPictureEnabled === !0 || !!document.createElement("video").webkitSupportsPresentationMode;
}
async function xe() {
	document.pictureInPictureElement && document.exitPictureInPicture && await document.exitPictureInPicture();
	let e = document.querySelector("video");
	(e == null ? void 0 : e.webkitPresentationMode) === "picture-in-picture" && e.webkitSetPresentationMode && e.webkitSetPresentationMode("inline");
}
function Se() {
	return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
}
async function Ce(e) {
	let t = e || document.documentElement;
	if (t.requestFullscreen) await t.requestFullscreen();
	else if (t.webkitRequestFullscreen) await t.webkitRequestFullscreen();
	else if (t.msRequestFullscreen) await t.msRequestFullscreen();
	else throw Error("Fullscreen not supported");
}
async function we() {
	document.exitFullscreen ? await document.exitFullscreen() : document.webkitExitFullscreen ? await document.webkitExitFullscreen() : document.msExitFullscreen && await document.msExitFullscreen();
}
//#endregion
//#region src/player/src/ui/playerUi.js
var Te = 3500, Ee = new Set([
	"booting",
	"ready-paused",
	"ready-playing-active",
	"ready-playing-idle",
	"seeking",
	"buffering",
	"switching-source"
]);
function De(e, t = {}) {
	let { idleTimeoutMs: n = Te } = t, r = "booting", i = null, a = !1, o = /* @__PURE__ */ new Set(), s = () => {
		a || e.setAttribute("data-ui-state", r);
	}, c = () => {
		i && (window.clearTimeout(i), i = null);
	}, l = () => {
		c(), !(r !== "ready-playing-active" || a || o.size > 0) && (i = window.setTimeout(() => {
			i = null, u("ready-playing-idle");
		}, n));
	}, u = (e) => {
		a || Ee.has(e) && (r = e, s(), r === "ready-playing-active" ? l() : c());
	}, d = () => {
		a || (r === "ready-playing-idle" ? u("ready-playing-active") : r === "ready-playing-active" && l());
	}, f = [
		"pointermove",
		"pointerdown",
		"pointerup",
		"keydown",
		"focusin"
	], p = d;
	return f.forEach((t) => e.addEventListener(t, p, { passive: !0 })), s(), {
		setState: u,
		getState: () => r,
		resetIdle: d,
		holdActive: (e) => {
			a || (o.add(e), r === "ready-playing-idle" ? u("ready-playing-active") : c());
		},
		releaseActive: (e) => {
			!o.delete(e) || a || r === "ready-playing-active" && l();
		},
		isHeld: () => o.size > 0,
		destroy: () => {
			a = !0, o.clear(), c(), f.forEach((t) => e.removeEventListener(t, p));
		}
	};
}
//#endregion
//#region src/player/src/watchParty.js
var Oe = ".vanta-player-transport", ke = "media-time-slider";
function Ae({ root: e, watchParty: t }) {
	if (!(t != null && t.enabled)) return;
	let n = !!t.canControl;
	e.classList.toggle("is-watch-party-viewer", !n);
	let r = e.querySelector(".vanta-player-party-pill");
	r && (r.hidden = n), e.querySelectorAll(Oe).forEach((e) => {
		e.inert = !n, n ? e.removeAttribute("aria-hidden") : e.setAttribute("aria-hidden", "true");
	}), e.querySelectorAll(ke).forEach((e) => {
		e.inert = !n;
	});
}
//#endregion
//#region src/player/src/syncEcho.js
var je = 3e3;
function Me({ now: e = () => performance.now(), ttlMs: t = je } = {}) {
	let n = {
		play: [],
		pause: [],
		seek: []
	}, r = (t) => {
		let r = e(), i = n[t];
		for (; i.length && i[0] <= r;) i.shift();
		return i;
	};
	return {
		expect(r) {
			n[r] && n[r].push(e() + t);
		},
		consume(e) {
			if (!n[e]) return !1;
			let t = r(e);
			return t.length ? (t.shift(), !0) : !1;
		},
		pendingCount(e) {
			return n[e] ? r(e).length : 0;
		},
		clear() {
			Object.values(n).forEach((e) => e.splice(0));
		}
	};
}
//#endregion
//#region src/player/src/html.js
function H(e) {
	return String(e == null ? "" : e).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
}
//#endregion
//#region src/player/src/player/markup.js
var Ne = 9e4, Pe = "/vendor/player/hls.worker.js", Fe = "Startet automatisch. Abbrechen oder sofort starten können nur Admins.", Ie = "radial-gradient(circle at 50% 50%, #1a1a20 0%, #050505 100%)", Le = {
	arrowBack: "<path d=\"M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z\"/>",
	play: "<path d=\"M8 5.14v13.72a1 1 0 0 0 1.53.85l10.6-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14z\"/>",
	pause: "<path d=\"M7 5h3.2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm6.8 0H17a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3.2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z\"/>",
	replay: "<path d=\"M12 5V2L7.5 6.5 12 11V7.2a5.8 5.8 0 1 1-5.8 5.8H4a8 8 0 1 0 8-8z\"/>",
	forward: "<path d=\"M12 5V2l4.5 4.5L12 11V7.2a5.8 5.8 0 1 0 5.8 5.8H20a8 8 0 1 1-8-8z\"/>",
	skipNext: "<path d=\"M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z\"/>",
	settings: "<path d=\"M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84a.484.484 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.27.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 15.6 12 3.6 3.6 0 0 1 12 15.6z\"/>",
	lock: "<path d=\"M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V7z\"/>",
	volumeMute: "<path d=\"M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z\"/>",
	volumeLow: "<path d=\"M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z\"/>",
	volumeHigh: "<path d=\"M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z\"/>",
	fullscreenEnter: "<path d=\"M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z\"/>",
	fullscreenExit: "<path d=\"M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z\"/>",
	pipEnter: "<path d=\"M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z\"/>",
	pipExit: "<path d=\"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7.02-3H19V8h-1.98v6.18L11 8v6h.98l-2-2v2.82l2 2z\"/>"
};
function U(e, t) {
	let n = Le[e];
	return n ? `<svg viewBox="0 0 24 24" aria-hidden="true"${t ? ` slot="${t}"` : ""}>${n}</svg>` : "";
}
function W(e, t) {
	let n = e < 0, r = n ? "10 Sekunden zurück" : "10 Sekunden vor";
	return `
    <button class="vanta-player-seek vanta-player-seek-${n ? "back" : "forward"} is-${t}" type="button"
      data-seek="${n ? -10 : 10}" aria-label="${r}" title="${r}">
      <span class="vanta-player-seek-icon">${U(n ? "replay" : "forward")}</span>
      <span class="vanta-player-seek-label" aria-hidden="true">10s</span>
    </button>`;
}
function Re(e) {
	return `
    <button class="vanta-player-play is-${e}" type="button" aria-label="Wiedergabe" data-state="paused">
      <span class="vanta-player-play-icon is-play">${U("play")}</span>
      <span class="vanta-player-play-icon is-pause">${U("pause")}</span>
    </button>`;
}
function ze(e, { title: t, subtitle: n, poster: r }) {
	let i = t ? H(t) : "", a = n ? H(n) : "";
	e.innerHTML = `
    <div class="vanta-player-shell">
      <media-player class="vanta-media-player" aria-label="Videoplayer">
        <media-outlet></media-outlet>
        <media-captions class="vanta-player-captions"></media-captions>

        <div class="vanta-player-tap-layer" aria-hidden="true"></div>

        <div class="vanta-player-volume-bubble" aria-hidden="true">
          <span class="vanta-player-volume-bubble-icon">
            ${U("volumeMute")}${U("volumeLow")}${U("volumeHigh")}
          </span>
          <span class="vanta-player-volume-bubble-bar"><i></i></span>
          <span class="vanta-player-volume-bubble-value"></span>
        </div>
        <button class="vanta-player-skip-segment" type="button" hidden>
          <span class="vanta-player-skip-segment-label">Intro überspringen</span>
          ${U("skipNext")}
        </button>
        <div class="vanta-player-seek-bubble is-back" aria-hidden="true"></div>
        <div class="vanta-player-seek-bubble is-forward" aria-hidden="true"></div>

        <div class="vanta-player-controls-layer">
          <div class="vanta-player-topbar">
            <button class="vanta-player-back" type="button" aria-label="Zurück">
              ${U("arrowBack")}
              <span>Zurück</span>
            </button>
            <div class="vanta-player-heading">
              <div class="vanta-player-title">${i}</div>
              <div class="vanta-player-subtitle"${a ? "" : " hidden"}>${a}</div>
            </div>
            <div class="vanta-player-topbar-end">
              <div class="vanta-player-party-pill" hidden>
                ${U("lock")}
                <span>Admin steuert</span>
              </div>
            </div>
          </div>

          <div class="vanta-player-center-controls vanta-player-transport">
            ${W(-1, "large")}
            ${Re("large")}
            ${W(1, "large")}
          </div>

          <div class="vanta-player-bottom-controls">
            <div class="vanta-player-timeline-row">
              <media-time-slider class="vanta-player-time-slider" aria-label="Zeitleiste">
                <div slot="preview" class="vanta-player-time-preview">
                  <media-slider-value type="pointer" format="time"></media-slider-value>
                </div>
              </media-time-slider>
            </div>
            <div class="vanta-player-controls-row">
              <div class="vanta-player-controls-left">
                <div class="vanta-player-transport vanta-player-transport-bar">
                  ${W(-1, "small")}
                  ${Re("small")}
                  ${W(1, "small")}
                </div>
                <div class="vanta-player-time">
                  <media-time type="current"></media-time>
                  <span class="vanta-player-time-separator">/</span>
                  <media-time type="duration"></media-time>
                </div>
              </div>
              <div class="vanta-player-controls-right">
                <div class="vanta-player-volume">
                  <media-mute-button class="vanta-player-mute-button" aria-label="Stummschalten">
                    ${U("volumeMute", "volume-muted")}
                    ${U("volumeLow", "volume-low")}
                    ${U("volumeHigh", "volume-high")}
                  </media-mute-button>
                  <div class="vanta-player-volume-reveal">
                    <media-volume-slider class="vanta-player-volume-slider" aria-label="Lautstärke"></media-volume-slider>
                  </div>
                </div>
                <button class="vanta-player-settings-button" type="button" aria-label="Einstellungen" aria-haspopup="dialog" aria-expanded="false" hidden>
                  ${U("settings")}
                </button>
                <button class="vanta-player-airplay-button" type="button" aria-label="AirPlay" hidden>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 22h12l-6-6-6 6zM21 3H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4v-2H3V5h18v12h-4v2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/></svg>
                </button>
                <media-pip-button class="vanta-player-pip-button" aria-label="Bild-in-Bild">
                  ${U("pipEnter", "enter")}
                  ${U("pipExit", "exit")}
                </media-pip-button>
                <button class="vanta-player-fullscreen-button" type="button" aria-label="Vollbild">
                  ${U("fullscreenEnter")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </media-player>

      <div class="vanta-player-loading" role="status" aria-live="polite">
        <div class="vanta-player-loading-backdrop"></div>
        <div class="vanta-player-loading-inner">
          <div class="vanta-player-spinner" aria-hidden="true"></div>
          <span class="vanta-player-loading-label">Video wird vorbereitet</span>
          <span class="vanta-player-loading-progress" hidden>
            <span class="vanta-player-loading-track" aria-hidden="true"><span class="vanta-player-loading-bar"></span></span>
            <span class="vanta-player-loading-progress-text"></span>
          </span>
          <span class="vanta-player-loading-log">
            <span aria-hidden="true">›</span>
            <span class="vanta-player-loading-status">Wiedergabequelle wird angefragt …</span>
          </span>
          <div class="vanta-player-loading-problem" hidden>
            <p class="vanta-player-loading-problem-text"></p>
            <div class="vanta-player-loading-problem-actions">
              <button type="button" class="vanta-player-loading-retry">Erneut versuchen</button>
              <button type="button" class="vanta-player-loading-leave">Zurück</button>
            </div>
          </div>
        </div>
      </div>

      <div class="vanta-player-inline-loading" role="status" aria-live="polite" hidden>
        <div class="vanta-player-inline-spinner" aria-hidden="true"></div>
        <span class="vanta-player-inline-label" hidden></span>
      </div>
    </div>`;
	let o = e.querySelector("media-player");
	o.setAttribute("aria-label", t ? `Videoplayer: ${t}` : "Videoplayer"), o.title = t || "", o.poster = r || "", o.autoplay = !0, o.playsinline = !0, o.load = "eager", o.preload = "auto", o.volume = .8, o.keyShortcuts = {};
	let s = e.querySelector(".vanta-player-loading-backdrop");
	return r ? s.style.backgroundImage = `url("${r.replaceAll("\"", "%22")}")` : s.style.backgroundImage = Ie, {
		player: o,
		playButtons: [...e.querySelectorAll(".vanta-player-play")],
		seekButtons: [...e.querySelectorAll(".vanta-player-seek")],
		seekBubbles: {
			back: e.querySelector(".vanta-player-seek-bubble.is-back"),
			forward: e.querySelector(".vanta-player-seek-bubble.is-forward")
		},
		settingsButton: e.querySelector(".vanta-player-settings-button"),
		airplayButton: e.querySelector(".vanta-player-airplay-button"),
		volumeBubble: e.querySelector(".vanta-player-volume-bubble"),
		backButton: e.querySelector(".vanta-player-back"),
		loading: e.querySelector(".vanta-player-loading"),
		loadingStatus: e.querySelector(".vanta-player-loading-status"),
		loadingLabel: e.querySelector(".vanta-player-loading-label"),
		loadingProblem: e.querySelector(".vanta-player-loading-problem"),
		loadingProblemText: e.querySelector(".vanta-player-loading-problem-text"),
		loadingRetry: e.querySelector(".vanta-player-loading-retry"),
		loadingLeave: e.querySelector(".vanta-player-loading-leave"),
		inlineLoading: e.querySelector(".vanta-player-inline-loading"),
		inlineLabel: e.querySelector(".vanta-player-inline-label"),
		loadingProgress: e.querySelector(".vanta-player-loading-progress"),
		loadingProgressBar: e.querySelector(".vanta-player-loading-bar"),
		loadingProgressText: e.querySelector(".vanta-player-loading-progress-text")
	};
}
//#endregion
//#region src/player/src/preferences.js
var Be = "vanta.player.prefs", Ve = Object.freeze({
	volume: .8,
	muted: !1,
	subtitleLanguage: null,
	audioLanguage: null,
	subtitleSize: "medium",
	subtitleBackground: "semi"
}), He = 400;
function Ue(e) {
	if (e == null || e === "") return null;
	let t = String(e).trim().toLowerCase().split(/[-_]/)[0];
	return /^[a-z]{2,3}$/.test(t) ? t : void 0;
}
function We(e) {
	try {
		return e === "session" ? globalThis.sessionStorage : globalThis.localStorage;
	} catch {
		return null;
	}
}
function Ge({ key: e = Be, storage: t = "local" } = {}, { backend: n = We(t) } = {}) {
	let r = { ...Ve };
	try {
		let t = JSON.parse((n == null ? void 0 : n.getItem(e)) || "null");
		t && typeof t == "object" && (r = {
			...r,
			...t
		});
	} catch {}
	let i = null, a = () => {
		i = null;
		try {
			n == null || n.setItem(e, JSON.stringify(r));
		} catch {}
	};
	return {
		get: () => ({ ...r }),
		update(e) {
			r = {
				...r,
				...e
			}, i === null && (i = setTimeout(a, He));
		},
		flush() {
			i !== null && (clearTimeout(i), a());
		}
	};
}
function Ke(e) {
	var t;
	let { player: n, listen: r } = e, i = Ge(e.preferencesConfig || void 0);
	e.preferences = i;
	let a = e.userPreferences;
	if (a && !((t = e.watchParty) != null && t.enabled)) {
		let t = {};
		for (let e of ["audioLanguage", "subtitleLanguage"]) typeof a[e] == "string" && a[e] && (t[e] = a[e]);
		Object.keys(t).length && i.update(t);
		let n = i.update;
		i.update = (t) => {
			var r;
			n(t);
			let i = {};
			for (let e of ["audioLanguage", "subtitleLanguage"]) {
				if (!(e in t)) continue;
				let n = Ue(t[e]);
				n !== void 0 && (i[e] = n);
			}
			Object.keys(i).length && ((r = e.onUserPreferenceChange) == null || r.call(e, i));
		};
	}
	let { volume: o, muted: s } = i.get();
	return Number.isFinite(o) && (n.volume = Math.min(1, Math.max(0, o))), n.muted = !!s, r(n, "volume-change", () => {
		i.update({
			volume: Number(n.volume),
			muted: !!n.muted
		});
	}), e.disposers.push(() => i.flush()), e;
}
//#endregion
//#region src/player/src/player/context.js
function qe(e) {
	return (e == null ? void 0 : e.code) === "STREAM_LIMIT_REACHED" || (e == null ? void 0 : e.status) === 429;
}
async function Je(e) {
	let { root: t, itemId: n, title: r, subtitle: i = "", poster: a, resumePosition: o = 0, resolvePlayback: s, reportPlayback: c, onBack: l, watchParty: u = null, episodeBrowser: d = null, preferences: f = null, loadSegments: p = null, onPlaybackError: m = null, loadTranscodeProgress: h = null, deferInitialLoad: g = !1, fullscreenTarget: _ = null, stillWatching: v = null, sleepTimer: y = null, onSleep: b = null, userPreferences: x = null, onUserPreferenceChange: S = null, tvMode: C = !1 } = e;
	await customElements.whenDefined("media-player");
	let w = he(), T = ze(t, {
		title: r,
		subtitle: i,
		poster: a
	}), { player: E } = T;
	u != null && u.enabled && (E.autoplay = !1);
	let D = {
		root: t,
		itemId: n,
		title: r,
		subtitle: i,
		poster: a,
		resumePosition: o,
		resolvePlayback: (e, t = {}) => s(e, {
			...D.streamSelection(),
			...t
		}),
		reportPlayback: c,
		onBack: l,
		watchParty: u,
		episodeBrowser: d,
		preferencesConfig: f,
		loadSegments: p,
		onPlaybackError: m,
		loadTranscodeProgress: h,
		deferInitialLoad: g,
		fullscreenTarget: _,
		stillWatching: v,
		sleepTimerOptions: y,
		onSleep: b,
		userPreferences: x,
		onUserPreferenceChange: S,
		tvMode: C,
		iosLike: w,
		dom: T,
		player: E,
		disposers: [],
		ui: De(t),
		destroyed: !1,
		fallbackAttempted: !1,
		knownDuration: 0,
		ownerEchoSuppressionDepth: 0,
		echoTokens: Me()
	};
	return D.handleFatalPlaybackError = (e) => !qe(e) || typeof D.onPlaybackError != "function" ? !1 : (D.onPlaybackError(e), !0), D.streamSelection = () => {
		var e, t, n, r, i, a, o, s;
		let c = {}, l = (e = D.audioMenu) == null || (t = e.getCurrentIndex) == null ? void 0 : t.call(e), u = (n = D.sourceSwitch) == null || (r = n.getCurrentPlayback) == null ? void 0 : r.call(n);
		if (Number.isInteger(l) && u) c.audioStreamIndex = l, u.mediaSourceId && (c.mediaSourceId = u.mediaSourceId);
		else {
			var d;
			let e = Ue((d = D.preferences) == null ? void 0 : d.get().audioLanguage);
			e && (c.audioLanguage = e);
		}
		let f = !((i = D.qualityMenu) == null || (a = i.hasUserChoice) == null) && a.call(i) ? D.qualityMenu.getCurrentId() : (x == null ? void 0 : x.defaultQuality) || ((o = D.qualityMenu) == null || (s = o.getCurrentId) == null ? void 0 : s.call(o));
		return f && f !== "auto" && (c.qualityProfile = f), c;
	}, D.listen = (e, t, n, r) => {
		e.addEventListener(t, n, r), D.disposers.push(() => e.removeEventListener(t, n, r));
	}, D.beginOwnerEchoSuppression = () => {
		D.ownerEchoSuppressionDepth += 1;
	}, D.endOwnerEchoSuppression = (e = 250) => {
		window.setTimeout(() => {
			D.ownerEchoSuppressionDepth = Math.max(0, D.ownerEchoSuppressionDepth - 1);
		}, e);
	}, D.watchPartyPhase = () => (u == null ? void 0 : u.phase) || (u != null && u.enabled ? "playback" : null), D.isDeferredReadyRoom = () => D.watchPartyPhase() === "ready-room", D.canControlWatchParty = () => u != null && u.enabled ? !!u.canControl : !0, D.canEmitOwnerControl = (e) => e && D.echoTokens.consume(e) ? !1 : !!(u != null && u.enabled) && D.canControlWatchParty() && D.watchPartyPhase() === "playback" && D.ownerEchoSuppressionDepth === 0, D.refreshWatchPartyControlAccess = () => {
		var e, n;
		u != null && u.enabled && (Ae({
			root: t,
			watchParty: u
		}), (e = D.mediaSession) == null || e.refresh(), (n = D.refreshSegmentButton) == null || n.call(D));
	}, u != null && u.enabled && (u.onParticipantsChange = D.refreshWatchPartyControlAccess), D.refreshWatchPartyControlAccess(), D.syncInlinePlayback = () => {
		w && ge(t);
	}, w && (t.classList.add("is-ios", "supports-ios-inline-fullscreen"), D.syncInlinePlayback()), be() || t.classList.add("no-pip"), D;
}
//#endregion
//#region src/player/src/orientation.js
function Ye() {
	var e, t;
	let n = navigator.userAgent || "", r = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(n), i = /iPad|Tablet|PlayBook|Silk/i.test(n) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1, a = navigator.maxTouchPoints > 0, o = Math.min(((e = window.screen) == null ? void 0 : e.width) || 0, ((t = window.screen) == null ? void 0 : t.height) || 0) < 768;
	return r && !i && a && o;
}
async function Xe() {
	if (!(!document.fullscreenElement && !document.webkitFullscreenElement)) {
		if (document.exitFullscreen) {
			await document.exitFullscreen();
			return;
		}
		if (document.webkitExitFullscreen) {
			await document.webkitExitFullscreen();
			return;
		}
	}
}
async function Ze() {
	var e;
	return (e = screen.orientation) != null && e.lock ? (await screen.orientation.lock("landscape"), !0) : !1;
}
async function Qe() {
	var e;
	return (e = screen.orientation) != null && e.unlock ? (await screen.orientation.unlock(), !0) : !1;
}
async function $e() {
	await Qe(), await Xe();
}
//#endregion
//#region src/player/src/player/fullscreenControls.js
function et(e) {
	let { root: t, iosLike: n } = e, r = t.querySelector(".vanta-player-shell"), i = t.querySelector(".vanta-player-fullscreen-button"), a = () => {
		var t;
		return ((t = e.fullscreenTarget) == null ? void 0 : t.call(e)) || r;
	}, o = () => {
		if (!i) return;
		let e = n ? ye(t) : Se();
		i.setAttribute("aria-label", e ? "Vollbild beenden" : "Vollbild"), i.innerHTML = U(e ? "fullscreenExit" : "fullscreenEnter");
	};
	if (e.toggleFullscreen = async () => {
		try {
			n ? (ye(t) ? ve(t) : _e(t), o()) : Se() ? (e.isPhone && await Qe().catch(() => {}), await we()) : (await Ce(a()), e.isPhone && await Ze().catch(() => {}));
		} catch {}
	}, i) {
		let t = () => {
			e.toggleFullscreen();
		};
		i.addEventListener("click", t), e.disposers.push(() => i.removeEventListener("click", t));
	}
	let s = () => {
		o(), e.isPhone && !Se() && Qe().catch(() => {});
	};
	return [
		"fullscreenchange",
		"webkitfullscreenchange",
		"mozfullscreenchange",
		"MSFullscreenChange"
	].forEach((t) => {
		document.addEventListener(t, s), e.disposers.push(() => document.removeEventListener(t, s));
	}), e.updateFullscreenIcon = o, e;
}
//#endregion
//#region src/player/src/player/inlineLoading.js
var tt = 2, nt = 3, rt = 100, it = .5, at = .05;
function ot({ element: e, bufferedAhead: t = 0, anchorTime: n = 0 }) {
	if (!e) return !0;
	if (e.seeking) return !1;
	if (e.paused) return e.readyState >= tt;
	let r = Number.isFinite(e.duration) && e.currentTime >= e.duration - it, i = t >= 1 || r, a = e.currentTime > n + at;
	return e.readyState >= nt && i && a;
}
function st({ getVideo: e, getBufferedAhead: t, isSwitching: n = () => !1, setVisible: r, setSlow: i = () => {} }) {
	let a = null, o = 0, s = 0, c = !1, l = () => {
		a !== null && window.clearInterval(a), a = null, c && i(!1), c = !1;
	}, u = () => {
		if (a === null) return;
		if (n()) {
			l();
			return;
		}
		let u = e();
		if ((u != null && u.seeking || u != null && u.paused) && (s = Number(u.currentTime) || 0), ot({
			element: u,
			bufferedAhead: Number(t == null ? void 0 : t()) || 0,
			anchorTime: s
		})) {
			l(), r(!1);
			return;
		}
		!c && performance.now() - o >= 6e3 && (c = !0, i(!0));
	};
	return {
		begin() {
			let t = e();
			s = Number(t == null ? void 0 : t.currentTime) || 0, a === null && (o = performance.now(), a = window.setInterval(u, rt)), r(!0);
		},
		check: u,
		end() {
			let e = a !== null;
			l(), e && r(!1);
		},
		isActive: () => a !== null
	};
}
//#endregion
//#region src/player/src/time.js
var ct = 1e7;
function lt(e) {
	return Math.max(0, Math.round((Number(e) || 0) * ct));
}
function ut(e, t, n = 0) {
	let r = Math.max(0, Number(e) || 0);
	if (!Number.isFinite(t) || t <= 0) return r;
	let i = Math.max(0, t - Math.max(0, Number(n) || 0));
	return Math.min(r, i);
}
//#endregion
//#region src/player/src/jellyfinReporter.js
var dt = 1e4, ft = 3, pt = 50, mt = (e) => Number.isInteger(e) && e >= 0 ? e : null;
function ht({ player: e, itemId: t, report: n }) {
	let r = null, i = !1, a = !1, o = !1, s = null, c = 0, l = -1, u = 0, d = !1, f = !1, p = null, m = null, h = [], g = (e, t, n, r) => {
		e.addEventListener(t, n, r), h.push(() => e.removeEventListener(t, n, r));
	}, _ = () => {
		let t = Number(e.currentTime);
		return Number.isFinite(t) && t >= 0 && (c = t), c;
	}, v = (n = _()) => {
		var i;
		return {
			itemId: t,
			mediaSourceId: (r == null ? void 0 : r.mediaSourceId) || null,
			playSessionId: (r == null ? void 0 : r.playSessionId) || null,
			positionTicks: lt(n),
			isPaused: !!e.paused,
			isMuted: !!e.muted,
			volumeLevel: Math.round((Number(e.volume) || 0) * 100),
			playbackRate: Number(e.playbackRate) || 1,
			playMethod: (r == null ? void 0 : r.playMethod) || (r != null && r.isTranscoded ? "Transcode" : "DirectPlay"),
			canSeek: !0,
			audioStreamIndex: (i = r == null ? void 0 : r.audioStreamIndex) == null ? null : i,
			subtitleStreamIndex: m
		};
	}, y = (e) => e === l ? !1 : e < l ? e > 0 || l === 0 : !0, b = async (e, t = {}) => {
		if (!(r != null && r.playSessionId) || a && e !== "start" && e !== "ended") return;
		let i = v(t.position);
		if (e === "progress" && !y(i.positionTicks)) return;
		let o = async () => {
			try {
				await n(e, i, t), l = i.positionTicks, u = 0;
			} catch (t) {
				if (u < ft) return u += 1, await new Promise((e) => setTimeout(e, pt)), o();
				console.warn(`[Player Reporting] ${e} failed after 4 attempts:`, t), u = 0;
			}
		};
		return o();
	}, x = () => {
		s && (clearInterval(s), s = null);
	}, S = () => {
		x(), s = setInterval(() => {
			!e.paused && !o && b("progress");
		}, dt);
	}, C = async () => {
		!r || o || f || (!i || a && p !== null ? (a = !1, i = !0, p = null, await b("start")) : await b("progress"), S());
	}, w = async () => {
		!r || o || !i || await b("progress");
	}, T = async () => {
		o = !0, x(), i && !a && await b("progress");
	}, E = () => {
		o = !1, a = !1;
	}, D = (e) => {
		r = e, p = null, m = mt(e == null ? void 0 : e.subtitleStreamIndex), a = !1, o = !1, i = !1;
	}, O = (e) => {
		m = mt(e);
	}, k = ({ keepalive: e = !1 } = {}) => !(r != null && r.playSessionId) || i || a ? Promise.resolve() : (a = !0, x(), Promise.resolve(n("cancel", v(_()), { keepalive: e })).catch(() => {})), A = async ({ ended: e = !1, keepalive: t = !1 } = {}) => {
		if (!(d || f)) {
			if (!i) return k({ keepalive: t });
			!r || a || (d = !0, x(), await b(e ? "ended" : "stopped", { keepalive: t }), a = !0, d = !1);
		}
	}, j = () => {
		let t = Number(e.currentTime);
		Number.isFinite(t) && t >= 0 && (c = t);
	}, M = () => {
		document.hidden && i && !a && b("progress");
	}, N = () => {
		if (!(f || a)) {
			if (!i) {
				k({ keepalive: !0 });
				return;
			}
			f = !0, x(), n("stopped", v(_()), { keepalive: !0 }).catch(() => {});
		}
	}, P = (t) => {
		!t.persisted || !f || (f = !1, i = !1, a = !1, e.paused || C());
	}, F = () => (p = Date.now(), A({ ended: !0 }));
	return e.addEventListener("time-update", j), e.addEventListener("playing", C), e.addEventListener("pause", w), e.addEventListener("seeked", w), e.addEventListener("ended", F), g(document, "visibilitychange", M), g(window, "pagehide", N, { capture: !0 }), g(window, "pageshow", P, { capture: !0 }), {
		setPlayback: D,
		setSubtitleStreamIndex: O,
		beforeSourceSwitch: T,
		afterSourceSwitch: E,
		stop: A,
		getPosition: _,
		progress: w,
		destroy: () => {
			x(), f = !0, e.removeEventListener("time-update", j), e.removeEventListener("playing", C), e.removeEventListener("pause", w), e.removeEventListener("seeked", w), e.removeEventListener("ended", F), h.splice(0).forEach((e) => e());
		}
	};
}
var gt = 4e4;
function _t({ dom: e, getLoadIndicator: t = () => null, onRetry: n = () => window.location.reload(), onLeave: r = () => window.history.back(), watchdogMs: i = gt }) {
	var a, o, s;
	let c = e.loadingStatus.textContent, l = ((a = e.loadingLabel) == null ? void 0 : a.textContent) || "", u = null, d = null, f = () => {
		!e.loadingProblem || e.loadingProblem.hidden || (e.loadingProblem.hidden = !0, e.loading.classList.remove("has-problem"), e.loadingLabel && (e.loadingLabel.textContent = l));
	}, p = (t, { fatal: n = !1 } = {}) => {
		var r;
		e.loadingProblem && (console.error("[VANTA Player]", t), e.loadingProblemText.textContent = t, e.loadingProblem.hidden = !1, e.loading.classList.add("has-problem"), e.loading.classList.toggle("is-failed", n), e.loadingLabel && (e.loadingLabel.textContent = n ? "Wiedergabe konnte nicht starten" : "Der Start dauert ungewöhnlich lange"), (r = e.loadingRetry) == null || r.focus({ preventScroll: !0 }));
	};
	(o = e.loadingRetry) == null || o.addEventListener("click", () => n()), (s = e.loadingLeave) == null || s.addEventListener("click", () => r());
	let m = () => {
		d !== null || !i || (d = window.setTimeout(() => {
			d = null, e.loading.classList.contains("is-hidden") || p(`Seit ${Math.round(i / 1e3)} Sekunden kommt kein Bild. Letzter Schritt: ${e.loadingStatus.textContent}`);
		}, i));
	}, h = () => {
		d !== null && window.clearTimeout(d), d = null;
	}, g = () => {
		u !== null && window.clearTimeout(u), u = null;
	}, _ = (t) => {
		t && (e.loadingStatus.textContent = t);
	};
	return m(), {
		setVisible: (n, r) => {
			var i;
			g(), _(r), e.loading.classList.toggle("is-hidden", !n), (i = t()) == null || i.setCoverVisible(n), n ? m() : (h(), f()), n || (u = window.setTimeout(() => {
				u = null, e.loadingStatus.textContent = c;
			}, 200));
		},
		setStatus: _,
		showProblem: p,
		dispose: () => {
			g(), h();
		}
	};
}
//#endregion
//#region src/player/src/player/reporterAndOrientation.js
function vt(e) {
	let { player: t, reportPlayback: n, itemId: r, dom: i } = e;
	e.reporter = ht({
		player: t,
		itemId: r,
		report: n
	}), e.isPhone = Ye();
	let a = _t({
		dom: i,
		getLoadIndicator: () => e.loadIndicator,
		onLeave: () => e.onBack ? e.onBack() : window.history.back()
	});
	e.disposers.push(a.dispose), e.setLoading = a.setVisible, e.setLoadingStatus = a.setStatus, e.setInlineLoading = (t) => {
		var n;
		t && !i.loading.classList.contains("is-hidden") || (i.inlineLoading.hidden = !t, (n = e.loadIndicator) == null || n.setInlineVisible(t));
	}, e.inlineLoading = st({
		getVideo: () => {
			var t, n;
			return ((t = (n = e.player).querySelector) == null ? void 0 : t.call(n, "video")) || null;
		},
		getBufferedAhead: () => {
			var t;
			return (t = e.getBufferedAhead) == null ? void 0 : t.call(e);
		},
		isSwitching: () => {
			var t;
			return ((t = e.sourceSwitch) == null ? void 0 : t.isSwitching()) === !0;
		},
		setVisible: e.setInlineLoading,
		setSlow: (t) => {
			var n;
			return (n = e.loadIndicator) == null ? void 0 : n.setSlow(t);
		}
	}), e.disposers.push(() => e.inlineLoading.end());
	let o = document.createElement("div");
	o.className = "vanta-player-notice", o.setAttribute("role", "status"), o.hidden = !0, (e.root.querySelector(".vanta-player-shell") || e.root).appendChild(o);
	let s = null;
	return e.showNotice = (e, { durationMs: t = 4e3 } = {}) => {
		o.textContent = e, o.hidden = !1, window.clearTimeout(s), s = window.setTimeout(() => {
			o.hidden = !0;
		}, t);
	}, e.disposers.push(() => window.clearTimeout(s)), e.showError = (t) => {
		e.sourceSwitch.clearSeekTimer(), e.inlineLoading.end(), e.setInlineLoading(!1), e.ui.setState("buffering"), e.setLoading(!0, "Stream wird geladen …"), a.showProblem(t || "Der Stream konnte nicht geladen werden.", { fatal: !0 });
	}, e;
}
var yt = .95, bt = .35, xt = 600, St = .5, G = (e) => Math.min(1, Math.max(0, e));
function Ct(e, t) {
	let n = e == null ? void 0 : e.stats, r = Number(e == null ? void 0 : e.duration);
	if (!n || !(n.total > 0) || !(r > 0)) return 0;
	let i = Number(e.start) + r;
	return Number.isFinite(i) && i <= t ? 0 : r * G(n.loaded / n.total);
}
function wt(e, t, n = 6) {
	let r = Math.floor(t / n) * n;
	return Number.isFinite(e) ? e >= r - 1 ? e : r + e : null;
}
function Tt({ bufferedAhead: e = 0, fragment: t = null, position: n = 0, duration: r = NaN, target: i = 4, transcode: a = null, segmentSeconds: o = 6, elapsedMs: s = 0, expectedMs: c = null }) {
	var l;
	let u = Ct(t, n), d = Math.max(0, e) + u, f = Number.isFinite(r) && r > 0 && n + d >= r - St, p = e > 0 || Number(t == null || (l = t.stats) == null ? void 0 : l.loaded) > 0;
	if (f || d >= i) return {
		fraction: 1,
		loadedSeconds: d,
		phase: "done",
		etaSeconds: null,
		approx: !1
	};
	if (p) return {
		fraction: G(d / i),
		loadedSeconds: d,
		phase: "loading",
		etaSeconds: null,
		approx: !1
	};
	let m = wt(Number(a == null ? void 0 : a.positionSeconds), n, o);
	if (m !== null) {
		let e = Math.floor(n / o) * o, t = e + o, r = Number(a.speed);
		return {
			fraction: G((m - e) / o),
			loadedSeconds: 0,
			phase: "transcoding",
			etaSeconds: r > 0 ? Math.max(1, Math.ceil((t - m) / r)) : null,
			approx: !1
		};
	}
	if (c > 0) {
		let e = s >= c;
		return {
			fraction: Math.min(yt, s / c),
			loadedSeconds: 0,
			phase: "preparing",
			etaSeconds: e ? null : Math.max(1, Math.ceil((c - s) / 1e3)),
			approx: !0,
			overdue: e
		};
	}
	return {
		fraction: 0,
		loadedSeconds: 0,
		phase: "preparing",
		etaSeconds: null,
		approx: !0
	};
}
function Et({ now: e = () => performance.now(), target: t = 4 } = {}) {
	let n = null, r = null, i = e();
	return {
		reset() {
			n = null, r = null, i = e();
		},
		elapsedMs: () => e() - i,
		update(a) {
			let o = e(), s = Tt({
				target: t,
				elapsedMs: o - i,
				...a
			});
			if (s.phase !== "loading") return n = null, r = null, s;
			if (n && o > n.at) {
				let e = s.loadedSeconds - n.loadedSeconds;
				if (e >= 0) {
					let t = e / ((o - n.at) / 1e3);
					r = r === null ? t : r + bt * (t - r);
				}
			}
			n = n ? {
				...n,
				at: o,
				loadedSeconds: s.loadedSeconds
			} : {
				at: o,
				loadedSeconds: s.loadedSeconds,
				since: o
			};
			let c = t - s.loadedSeconds, l = r > 0 && o - n.since >= xt && c > 0 ? Math.max(1, Math.ceil(c / r)) : null;
			return {
				...s,
				etaSeconds: l
			};
		}
	};
}
function Dt({ fraction: e, etaSeconds: t, phase: n, approx: r, overdue: i }) {
	let a = `${Math.round(G(e) * 100)} %`, o = t ? ` · noch ca. ${t} s` : "";
	return n === "transcoding" ? `Jellyfin transkodiert … ${a}${o}` : n === "preparing" ? i ? "Server bereitet Stream vor … dauert länger als üblich" : !r || e <= 0 ? "Server bereitet Stream vor …" : `Server bereitet Stream vor … ca. ${a}${o}` : `${a}${o}`;
}
var Ot = "vanta.player.firstByteMs", kt = 8e3, At = .3;
function jt(e = () => window.localStorage) {
	let t = () => {
		try {
			var t;
			let n = Number((t = e()) == null ? void 0 : t.getItem(Ot));
			return n > 0 ? n : null;
		} catch {
			return null;
		}
	};
	return {
		expectedMs: () => {
			var e;
			return (e = t()) == null ? kt : e;
		},
		record(n) {
			if (!(n >= 200) || n > 3e5) return;
			let r = t(), i = r === null ? n : r + At * (n - r);
			try {
				var a;
				(a = e()) == null || a.setItem(Ot, String(Math.round(i)));
			} catch {}
		}
	};
}
//#endregion
//#region src/player/src/player/loadIndicator.js
var Mt = 250, Nt = 1e3;
function Pt(e, { history: t = jt() } = {}) {
	let { dom: n, player: r, listen: i } = e, a = Et(), o = null, s = 6, c = null, l = !1, u = !1, d = !1, f = !1, p = null, m = null, h = -Infinity, g = !1, _ = !1;
	i(r, "hls-frag-loading", (e) => {
		var t;
		if (f) return;
		let n = (t = e.detail) == null ? void 0 : t.frag;
		n && (!n.type || n.type === "main") && (o = n);
	});
	let v = (e) => {
		var t;
		(!((t = e.detail) != null && t.frag) || e.detail.frag === o) && (o = null);
	};
	i(r, "hls-frag-loaded", v), i(r, "hls-frag-load-emergency-aborted", v), i(r, "hls-level-loaded", (e) => {
		var t;
		let n = Number((t = e.detail) == null || (t = t.details) == null ? void 0 : t.targetduration);
		n > 0 && (s = n);
	}), i(r, "source-change", () => {
		o = null, f = !1, p = null;
	});
	let y = () => {
		var t, n;
		if (typeof e.loadTranscodeProgress != "function" || m || ((t = e.sourceSwitch) == null || (n = t.getCurrentPlayback) == null || (n = n.call(t)) == null ? void 0 : n.isTranscoded) === !1) return;
		let r = performance.now();
		r - h < Nt || (h = r, m = Promise.resolve(e.loadTranscodeProgress()).then((e) => {
			p = e != null && e.available ? {
				positionSeconds: Number(e.transcodedMs) / 1e3,
				speed: e.speed
			} : null;
		}).catch(() => {
			p = null;
		}).finally(() => {
			m = null;
		}));
	}, b = (n) => {
		var i;
		return {
			bufferedAhead: f ? 0 : Number((i = e.getBufferedAhead) == null ? void 0 : i.call(e, n)) || 0,
			fragment: o,
			position: n,
			duration: Number(r.duration),
			transcode: p,
			segmentSeconds: s,
			expectedMs: t.expectedMs()
		};
	}, x = () => {
		let e = a.update(b(Number(r.currentTime) || 0));
		e.phase === "preparing" || e.phase === "transcoding" ? (_ = !0, y()) : _ && !g && (g = !0, t.record(a.elapsedMs()));
		let i = e.phase === "done" ? "" : Dt(e), o = e.phase === "loading" || e.phase === "transcoding" || e.approx && e.fraction > 0;
		if (n.loadingProgress && (n.loadingProgress.hidden = !u || !i, n.loadingProgressText.textContent = i, n.loadingProgressBar.style.transform = `scaleX(${o ? e.fraction : 0})`, n.loadingProgress.classList.toggle("is-preparing", !o), n.loadingProgress.classList.toggle("is-estimate", !!e.approx)), n.inlineLabel) {
			let t = e.phase === "done" ? "" : i, r = l ? ["Lädt länger als üblich …", e.phase === "loading" ? t : ""].filter(Boolean).join(" · ") : t;
			n.inlineLabel.textContent = r, n.inlineLabel.hidden = !d || !r;
		}
	}, S = () => {
		let e = u || d;
		e && c === null ? (a.reset(), p = null, h = -Infinity, g = !1, _ = !1, c = window.setInterval(x, Mt), x()) : !e && c !== null && (window.clearInterval(c), c = null, l = !1, x());
	};
	e.loadIndicator = {
		setCoverVisible(t) {
			var n, r;
			let i = !!t;
			i && !u && !((n = e.sourceSwitch) == null || (r = n.getCurrentPlayback) == null) && r.call(n) && (f = !0), i || (f = !1), u = i, S();
		},
		setInlineVisible(e) {
			d = !!e, S();
		},
		setSlow(e) {
			l = !!e, c !== null && x();
		}
	}, e.disposers.push(() => {
		c !== null && window.clearInterval(c), c = null;
	});
	let C = {
		tracker: Et(),
		position: null
	};
	e.getLoadProgress = (e = r.currentTime) => {
		C.position !== e && (C.tracker.reset(), C.position = e);
		let t = C.tracker.update(b(e));
		return (t.phase === "preparing" || t.phase === "transcoding") && y(), t;
	};
}
//#endregion
//#region src/player/src/promiseHelpers.js
function Ft(e, t, n, r = []) {
	return new Promise((i, a) => {
		let o, s = [], c = () => {
			window.clearTimeout(o), s.forEach((e) => e());
		}, l = (e) => {
			c(), i(e);
		};
		e.addEventListener(t, l, { once: !0 }), s.push(() => e.removeEventListener(t, l)), r.forEach((n) => {
			let r = (e) => {
				var n;
				c();
				let r = ((n = e.detail) == null ? void 0 : n.message) || `Playback failed while waiting for ${t}`;
				a(Error(r));
			};
			e.addEventListener(n, r, { once: !0 }), s.push(() => e.removeEventListener(n, r));
		}), Number.isFinite(n) && (o = window.setTimeout(() => {
			c(), a(/* @__PURE__ */ Error(`Playback timed out while waiting for ${t}`));
		}, n));
	});
}
//#endregion
//#region src/player/src/sourceSwitch/state.js
function It({ player: e, reporter: t, ui: n, callbacks: { setLoading: r, setLoadingStatus: i, setInlineLoading: a, showError: o }, onBeforeSourceChange: s }) {
	let c = {
		player: e,
		reporter: t,
		ui: n,
		setLoading: r,
		setLoadingStatus: i,
		setInlineLoading: a,
		showError: o,
		onBeforeSourceChange: s,
		currentPlayback: null,
		switching: !1,
		loadVersion: 0,
		lastRequestedPosition: 0,
		intendsToPlay: !0,
		autoplayBlocked: !1,
		seekTimer: null,
		seekVersion: 0
	};
	return c.isCurrentLoad = (e) => e === c.loadVersion, c.captureState = () => ({
		position: Math.max(c.reporter.getPosition(), c.lastRequestedPosition),
		shouldPlay: c.intendsToPlay,
		volume: Number(c.player.volume),
		muted: !!c.player.muted,
		playbackRate: Number(c.player.playbackRate) || 1
	}), c.restoreState = (e) => {
		Number.isFinite(e.volume) && (c.player.volume = e.volume), Number.isFinite(e.playbackRate) && e.playbackRate > 0 && (c.player.playbackRate = e.playbackRate), c.player.muted = !!e.muted;
	}, c;
}
function Lt(e) {
	return {
		getCurrentPlayback: () => e.currentPlayback,
		isSwitching: () => e.switching,
		isCurrentLoad: e.isCurrentLoad,
		getAutoplayBlocked: () => e.autoplayBlocked,
		setAutoplayBlocked: (t) => {
			e.autoplayBlocked = !!t;
		},
		getIntendsToPlay: () => e.intendsToPlay,
		setIntendsToPlay: (t) => {
			e.intendsToPlay = !!t;
		},
		getLastRequestedPosition: () => e.lastRequestedPosition,
		setLastRequestedPosition: (t) => {
			e.lastRequestedPosition = t;
		}
	};
}
//#endregion
//#region src/player/src/sourceSwitch/loadingStatus.js
var Rt = 3e4, zt = 21e4;
function Bt(e, t) {
	return new Promise((n) => {
		var r;
		let i = e.querySelector("video");
		if (!i) {
			n(!1);
			return;
		}
		let a = !1, o = null, s = null, c = window.setTimeout(() => d(!1), t), l = Number(i.currentTime) || 0, u = () => {
			!i.paused && Number(i.currentTime) > l + .05 && d(!0);
		};
		(r = i.addEventListener) == null || r.call(i, "timeupdate", u);
		function d(t) {
			var r;
			a || (a = !0, window.clearTimeout(c), (r = i.removeEventListener) == null || r.call(i, "timeupdate", u), o !== null && i.cancelVideoFrameCallback && i.cancelVideoFrameCallback(o), s && e.removeEventListener("time-update", s), n(t));
		}
		if (i.requestVideoFrameCallback) {
			o = i.requestVideoFrameCallback(() => d(!0));
			return;
		}
		s = () => {
			window.requestAnimationFrame(() => window.requestAnimationFrame(() => d(!0)));
		}, e.addEventListener("time-update", s, { once: !0 });
	});
}
async function Vt(e, { shouldPlay: t }) {
	let { player: n, setLoading: r, setLoadingStatus: i, setInlineLoading: a } = e;
	if (!t) {
		n.paused = !0;
		return;
	}
	try {
		var o;
		i("Wiedergabe wird gestartet …"), await n.play();
		let t = n.querySelector("video");
		t != null && t.paused && await t.play(), e.autoplayBlocked = !1;
		let r = ((o = e.currentPlayback) == null ? void 0 : o.delivery) === "hls";
		if (i(r ? "Erstes HLS-Segment wird transkodiert und geladen …" : "Erster Videoframe wird dargestellt …"), !await Bt(n, r ? zt : Rt)) throw Error(r ? "Das erste HLS-Segment konnte nicht rechtzeitig geladen werden." : "Der erste Videoframe konnte nicht rechtzeitig geladen werden.");
	} catch (t) {
		if ((t == null ? void 0 : t.name) === "NotAllowedError") e.autoplayBlocked = !0, r(!1), a(!1);
		else throw t;
	}
}
function K(e) {
	e.switching || e.ui.setState(e.player.paused ? "ready-paused" : "ready-playing-active");
}
//#endregion
//#region src/player/src/seek.js
var Ht = .25;
function Ut(e) {
	var t;
	if (!(!(e == null || (t = e.seekable) == null) && t.length)) return null;
	try {
		return Number(e.seekable.end(e.seekable.length - 1)) || null;
	} catch {
		return null;
	}
}
function Wt(e, t, n = Ht) {
	let r = Number(t == null ? void 0 : t.duration);
	if (!Number.isFinite(r) || r <= 0) {
		let e = Ut(t);
		Number.isFinite(e) && e > 0 && (r = e);
	}
	return Number.isFinite(r) && r > 0 ? ut(e, r, n) : Math.max(0, Number(e) || 0);
}
function q(e, t, n = {}) {
	let r = Wt(t, e, n.endEpsilon);
	return Number.isFinite(r) && (e.currentTime = r), r;
}
function Gt(e, t, n = {}) {
	return q(e, (Number(e == null ? void 0 : e.currentTime) || 0) + t, n);
}
//#endregion
//#region src/public/js/shared/time.js
function Kt(e) {
	let t = Math.max(0, Math.floor(Number(e) || 0)), n = Math.floor(t / 3600), r = Math.floor(t % 3600 / 60), i = String(t % 60).padStart(2, "0");
	return n > 0 ? `${n}:${String(r).padStart(2, "0")}:${i}` : `${r}:${i}`;
}
//#endregion
//#region src/player/src/sourceSwitch/seekRestore.js
var qt = 6e3;
function Jt(e, t) {
	return new Promise((n) => {
		let r = () => {
			var t;
			return [(t = e.querySelector) == null ? void 0 : t.call(e, "video"), e].filter(Boolean);
		}, i = () => r().some((e) => Number.isFinite(e.duration) && e.duration > 0), a = () => r().some((e) => {
			var t;
			return ((t = e.seekable) == null ? void 0 : t.length) > 0 && Number.isFinite(e.seekable.end(0));
		});
		if (i() || a()) {
			n();
			return;
		}
		let o, s = () => {
			window.clearTimeout(o), e.removeEventListener("duration-change", c), e.removeEventListener("loaded-metadata", c);
		}, c = () => {
			(i() || a()) && (s(), n());
		};
		o = window.setTimeout(() => {
			s(), n();
		}, t), e.addEventListener("duration-change", c), e.addEventListener("loaded-metadata", c);
	});
}
function J(e) {
	e.seekTimer && (window.clearTimeout(e.seekTimer), e.seekTimer = null);
}
function Yt(e) {
	J(e), e.seekTimer = window.setTimeout(() => {
		e.seekTimer = null, e.switching || e.setInlineLoading(!1);
	}, qt);
}
async function Xt(e, t, { version: n } = {}) {
	let { player: r } = e, i = Wt(t, r, Ht);
	e.lastRequestedPosition = i;
	let a = ++e.seekVersion;
	if (e.switching && i > 0 && e.setLoadingStatus(`Wiedergabeposition ${Kt(i)} wird wiederhergestellt …`), Math.abs(Number(r.currentTime) - i) < .35) {
		e.switching || (e.setInlineLoading(!1), K(e));
		return;
	}
	e.switching || (e.ui.setState("seeking"), e.setInlineLoading(!0)), Yt(e);
	let o = Ft(r, "seeked", qt);
	r.currentTime = i;
	try {
		await o;
	} catch {} finally {
		if (a !== e.seekVersion || (J(e), n !== void 0 && !e.isCurrentLoad(n))) return;
		e.switching || (e.setInlineLoading(!1), K(e));
	}
}
//#endregion
//#region src/player/src/sourceSwitch/rollback.js
function Zt(e) {
	return async function(t, n = {}) {
		let r = e.currentPlayback, i = e.captureState();
		try {
			return await e.loadPlayback(t, n), { success: !0 };
		} catch (t) {
			if (r && r !== e.currentPlayback && !n.noRollback) try {
				return await e.loadPlayback(r, {
					...n,
					position: i.position,
					shouldPlay: i.shouldPlay,
					label: "Vorherige Quelle wird wiederhergestellt …"
				}), {
					success: !1,
					error: t,
					rolledBack: !0
				};
			} catch (e) {
				return {
					success: !1,
					error: t,
					rollbackError: e
				};
			}
			throw t;
		}
	};
}
//#endregion
//#region src/player/src/sourceSwitch.js
var Qt = { webm: "video/webm" }, $t = "application/vnd.apple.mpegurl", en = 2e4, tn = (e) => e.playMethod && e.playMethod !== "DirectPlay" ? "video/mp4" : Qt[String(e.container || "").split(",")[0].trim().toLowerCase()] || "video/mp4", nn = (e) => ({
	src: e.url,
	type: e.delivery === "hls" ? $t : tn(e)
});
function rn(e) {
	let t = It(e), n = (e, { success: n = !1 } = {}) => {
		t.isCurrentLoad(e) && (t.switching = !1, n && (t.setLoading(!1), K(t)));
	}, r = async (e, r = {}) => {
		var i, a;
		let o = ++t.loadVersion, s = t.captureState(), c = {
			...s,
			position: Math.max(0, (i = Number(r.position)) == null ? s.position : i),
			shouldPlay: r.shouldPlay !== !1,
			label: r.label || "Video wird geladen …"
		};
		if (t.switching = !0, J(t), t.setLoading(!0, c.label), t.setInlineLoading(!1), t.ui.setState(r.isBoot ? "booting" : "switching-source"), t.currentPlayback && await t.reporter.beforeSourceSwitch(), t.isCurrentLoad(o)) {
			t.reporter.afterSourceSwitch(), t.currentPlayback = e, t.lastRequestedPosition = c.position, t.reporter.setPlayback(e), t.setLoadingStatus(e.delivery === "hls" ? "HLS-Stream wird verbunden …" : "Direkter Videostream wird verbunden …"), (a = t.onBeforeSourceChange) == null || a.call(t), t.player.src = nn(e);
			try {
				if (await Ft(t.player, "can-play", e.delivery === "hls" ? void 0 : en, ["error"]), !t.isCurrentLoad(o) || (t.setLoadingStatus("Medienquelle ist bereit. Laufzeit wird geprüft …"), t.restoreState(c), await Jt(t.player, 3e3), !t.isCurrentLoad(o)) || (await Xt(t, c.position, { version: o }), !t.isCurrentLoad(o)) || (await Vt(t, { shouldPlay: c.shouldPlay }), !t.isCurrentLoad(o))) return;
				n(o, { success: !0 });
			} catch (e) {
				throw n(o, { success: !1 }), e;
			}
		}
	};
	return t.loadPlayback = r, {
		loadPlayback: r,
		switchTo: Zt(t),
		startCurrentPlayback: async ({ quiet: e = !1 } = {}) => {
			if (!t.currentPlayback) {
				await t.player.play();
				return;
			}
			let n = t.loadVersion;
			t.switching = !0, J(t), e || (t.setLoading(!0, "Wiedergabe wird gestartet …"), t.ui.setState("booting")), t.setInlineLoading(!1);
			try {
				if (await Vt(t, { shouldPlay: !0 }), !t.isCurrentLoad(n)) return;
				t.switching = !1, t.autoplayBlocked || (t.setLoading(!1), K(t));
			} catch (e) {
				throw t.isCurrentLoad(n) && (t.switching = !1, t.setLoading(!1)), e;
			}
		},
		performSeek: (e, n) => Xt(t, e, n),
		captureState: t.captureState,
		restoreState: t.restoreState,
		syncPlayingState: () => K(t),
		...Lt(t),
		clearSeekTimer: () => J(t),
		startSeekTimer: () => Yt(t)
	};
}
//#endregion
//#region src/player/src/player/sourceSwitchIntegration.js
function an(e) {
	let { root: t, iosLike: n, player: r, reporter: i, ui: a, isPhone: o } = e;
	return e.sourceSwitch = rn({
		player: r,
		reporter: i,
		ui: a,
		callbacks: {
			setLoading: e.setLoading,
			setLoadingStatus: e.setLoadingStatus,
			setInlineLoading: (t) => {
				var n;
				!t && (n = e.inlineLoading) != null && n.isActive() ? e.inlineLoading.check() : e.setInlineLoading(t);
			},
			showError: e.showError
		},
		onBeforeSourceChange: () => {
			xe().catch(() => {});
		}
	}), o && (t.classList.add("is-smartphone"), n && (_e(t), e.updateFullscreenIcon())), e;
}
//#endregion
//#region src/player/src/quality.js
function on(e) {
	return e ? e >= 1e6 ? `${(e / 1e6).toFixed(0)} Mbit/s` : e >= 1e3 ? `${(e / 1e3).toFixed(0)} kbit/s` : `${e} bit/s` : "";
}
function sn(e) {
	if (e.id === "auto") return "Auto";
	if (e.id === "direct") return "Direct Play";
	let t = on(e.maxStreamingBitrate);
	return t ? `${e.label} (${t})` : e.label;
}
function cn(e) {
	let t = new Map([
		["auto", 0],
		["direct", 1],
		["1080p", 2],
		["720p", 3],
		["480p", 4],
		["360p", 5]
	]);
	return [...e].sort((e, n) => {
		var r, i;
		return ((r = t.get(e.id)) == null ? 99 : r) - ((i = t.get(n.id)) == null ? 99 : i);
	});
}
function ln({ onSelect: e }) {
	let t = "auto", n = [], r = !1;
	return {
		update(e, r) {
			n = cn(e || []), t = r || "auto";
		},
		select(n) {
			!n || n === t || (r = !0, e(n));
		},
		getOptions: () => n.map((e) => ({
			id: e.id,
			label: sn(e),
			selected: e.id === t
		})),
		getCurrentId: () => t,
		hasUserChoice: () => r,
		getCurrentLabel: () => {
			let e = n.find((e) => e.id === t);
			return e ? sn(e) : "Auto";
		},
		hasChoices: () => n.length > 1
	};
}
//#endregion
//#region src/player/src/subtitles.js
var Y = "off", un = "Keine Untertitel verfügbar";
function X(e) {
	return String(e || "").trim();
}
function dn(e) {
	if (!e) return "Aus";
	let t = e.label || e.language || `Untertitel ${e.index}`;
	return e.isForced ? `${t} · Forced` : t;
}
function fn(e) {
	return [...e || []].sort((e, t) => e.isForced === t.isForced ? e.isDefault === t.isDefault ? Number(e.index) - Number(t.index) : e.isDefault ? -1 : 1 : e.isForced ? -1 : 1);
}
var pn = (e) => X(e).toLowerCase().split(/[-_]/)[0];
function mn(e, t) {
	let n = X(t).toLowerCase();
	if (!n) return null;
	let r = (e) => e.find((e) => !e.isForced) || e[0] || null, i = (e || []).filter((e) => X(e.language).toLowerCase() === n);
	if (i.length) return r(i);
	let a = pn(n);
	return r((e || []).filter((e) => pn(e.language) === a));
}
function Z(e) {
	return `vanta-subtitle-${e.index}`;
}
function hn(e) {
	return e != null && e.length ? [{
		id: Y,
		label: "Aus",
		disabled: !1
	}, ...e.map((e) => ({
		id: Z(e),
		label: dn(e),
		disabled: !1
	}))] : [{
		id: null,
		label: un,
		disabled: !0,
		selected: !1
	}];
}
function gn({ player: e, reporter: t, onChange: n = () => {} }) {
	let r = Y, i = null, a = [], o = /* @__PURE__ */ new Set(), s = (t) => {
		var n, r;
		return ((n = e.textTracks) == null || (r = n.getById) == null ? void 0 : r.call(n, t)) || null;
	}, c = (e, t) => {
		e && (typeof e.setMode == "function" ? e.setMode(t) : e.mode = t);
	}, l = () => {
		if (!e.textTracks) {
			o = /* @__PURE__ */ new Set();
			return;
		}
		o.forEach((t) => {
			let n = s(t);
			n && typeof e.textTracks.remove == "function" ? e.textTracks.remove(n) : c(n, "disabled");
		}), o = /* @__PURE__ */ new Set();
	}, u = (t) => {
		l(), t.forEach((t) => {
			var n, r;
			let i = Z(t);
			o.add(i), (n = e.textTracks) == null || (r = n.add) == null || r.call(n, {
				id: i,
				src: t.url,
				type: t.type,
				kind: "subtitles",
				label: dn(t),
				language: X(t.language),
				default: !1
			}), c(s(i), "disabled");
		});
	}, d = (e) => {
		let l = a.find((t) => Z(t) === e);
		r = l ? e : Y, l && (i = r), o.forEach((e) => {
			c(s(e), e === r ? "showing" : "disabled");
		}), t.setSubtitleStreamIndex(l ? l.index : null), n();
	};
	return {
		update: (e, { preserveSelection: t = !0, preferredLanguage: n = null } = {}) => {
			let i = fn((e == null ? void 0 : e.subtitles) || []), o = r;
			if (a = i, u(a), t && o !== Y && a.some((e) => Z(e) === o)) {
				d(o);
				return;
			}
			let s = mn(a, n);
			d(s ? Z(s) : Y);
		},
		select: d,
		toggle: () => {
			if (!a.length) return;
			if (r !== Y) {
				d(Y);
				return;
			}
			let e = Z(a[0]);
			d(a.some((e) => Z(e) === i) ? i : e);
		},
		getOptions: () => hn(a).map((e) => ({
			...e,
			selected: e.id === r
		})),
		getCurrentLabel: () => {
			if (!a.length) return "Keine";
			let e = a.find((e) => Z(e) === r);
			return e ? dn(e) : "Aus";
		},
		getCurrentId: () => r,
		getCurrentLanguage: () => {
			let e = a.find((e) => Z(e) === r);
			return e && X(e.language) || null;
		},
		destroy: l
	};
}
//#endregion
//#region src/player/src/audio.js
function _n({ onSelect: e }) {
	let t = [], n = null;
	return {
		update(e, r) {
			var i, a;
			t = Array.isArray(e) ? e : [], n = Number.isInteger(r) ? r : (i = (a = t.find((e) => e.isDefault)) == null ? void 0 : a.index) == null ? null : i;
		},
		select(t) {
			!Number.isInteger(t) || t === n || e(t);
		},
		getOptions: () => t.map((e) => ({
			id: e.index,
			label: e.label,
			selected: e.index === n
		})),
		getCurrentLabel: () => {
			var e;
			return ((e = t.find((e) => e.index === n)) == null ? void 0 : e.label) || "Standard";
		},
		getCurrentIndex: () => n,
		getCurrentLanguage: () => {
			var e;
			return ((e = t.find((e) => e.index === n)) == null ? void 0 : e.language) || null;
		},
		hasChoices: () => t.length > 1
	};
}
//#endregion
//#region src/public/js/shared/episodeCode.js
function vn(e, t) {
	let n = (e) => String(e || 1).padStart(2, "0");
	return `S${n(e)}E${n(t)}`;
}
function yn(e) {
	return vn(e == null ? void 0 : e.ParentIndexNumber, e == null ? void 0 : e.IndexNumber);
}
//#endregion
//#region src/player/src/episodes.js
function bn(e, t) {
	for (let n of Object.values((e == null ? void 0 : e.episodesBySeason) || {})) {
		let e = n.find((e) => e.Id === t);
		if (e) return e;
	}
	return null;
}
function xn(e, t) {
	var n;
	for (let [n, r] of Object.entries((e == null ? void 0 : e.episodesBySeason) || {})) if (r.some((e) => e.Id === t)) return n;
	return (e == null || (n = e.seasons) == null || (n = n[0]) == null ? void 0 : n.Id) || null;
}
//#endregion
//#region src/player/src/settings/flyout.js
var Sn = 180, Cn = new Set([
	"checkbox",
	"radio",
	"button",
	"submit",
	"range"
]), wn = (e) => e ? e.isContentEditable || e.tagName === "TEXTAREA" ? !0 : e.tagName === "INPUT" && !Cn.has((e.getAttribute("type") || "text").toLowerCase()) : !1, Tn = 280, En = 70, Dn = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z\"/></svg>", On = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M8.6 5.4 10 4l8 8-8 8-1.4-1.4 6.6-6.6z\"/></svg>";
function kn() {
	try {
		var e, t;
		return ((e = (t = window).matchMedia) == null ? void 0 : e.call(t, "(prefers-reduced-motion: reduce)").matches) === !0;
	} catch {
		return !1;
	}
}
function An({ container: e, button: t, onOpenChange: n = () => {} }) {
	let r = /* @__PURE__ */ new Map(), i = [], a = () => [], o = null, s = "closed", c = null, l = null, u = null, d = document.createElement("div");
	d.className = "vanta-settings", d.setAttribute("role", "dialog"), d.setAttribute("aria-label", "Einstellungen"), d.dataset.state = "closed", d.hidden = !0;
	let f = document.createElement("div");
	f.className = "vanta-settings-viewport", d.appendChild(f), e.appendChild(d);
	let p = () => [...(l == null ? void 0 : l.querySelectorAll(".vanta-settings-focusable:not([disabled])")) || []], m = (e) => {
		let t = document.createElement("div");
		t.className = "vanta-settings-title", t.textContent = "Einstellungen", e.appendChild(t);
		let n = o == null ? void 0 : o();
		n && e.appendChild(n);
		let r = document.createElement("div");
		r.className = "vanta-settings-list", a().filter((e) => !e.hidden).forEach((e) => {
			let t = document.createElement("button");
			t.type = "button", t.className = "vanta-settings-row vanta-settings-focusable", t.dataset.page = e.page || e.id, t.disabled = !!e.disabled, t.innerHTML = `
        <span class="vanta-settings-row-icon" aria-hidden="true">${e.icon || ""}</span>
        <span class="vanta-settings-row-label">${H(e.label)}</span>
        <span class="vanta-settings-row-value">${H(e.value)}</span>
        <span class="vanta-settings-row-chevron">${On}</span>`, t.setAttribute("aria-label", e.value ? `${e.label}: ${e.value}` : e.label), t.addEventListener("click", () => {
				e.onSelect ? (T({ returnFocus: !1 }), e.onSelect()) : x(e.page);
			}), r.appendChild(t);
		}), e.appendChild(r);
	}, h = (e, t) => {
		let n = r.get(t), i = document.createElement("div");
		i.className = "vanta-settings-page-head";
		let a = document.createElement("button");
		a.type = "button", a.className = "vanta-settings-back vanta-settings-focusable", a.setAttribute("aria-label", "Zurück"), a.innerHTML = Dn, a.addEventListener("click", () => S());
		let o = document.createElement("div");
		o.className = "vanta-settings-title", o.textContent = n.title, i.append(a, o), e.appendChild(i);
		let s = document.createElement("div");
		s.className = "vanta-settings-body", e.appendChild(s), n.render(s, {
			close: T,
			back: S,
			refresh: C
		});
	}, g = (e) => {
		var t;
		let n = document.createElement("section");
		return n.className = "vanta-settings-page", n.dataset.page = e, e === "root" ? m(n) : h(n, e), d.classList.toggle("is-wide", !!((t = r.get(e)) != null && t.wide)), n;
	}, _ = () => {
		var e;
		let [t] = p();
		(e = (l == null ? void 0 : l.querySelector(".vanta-settings-focusable[aria-checked=\"true\"], .vanta-settings-focusable.is-current")) || t) == null || e.focus({ preventScroll: !0 });
	}, v = null, y = () => {
		if (!v) return;
		let { animations: e, previous: t, timer: n } = v;
		v = null, window.clearTimeout(n), e.forEach((e) => {
			try {
				e.finish();
			} catch {}
		}), t.remove(), f.style.height = "";
	}, b = (e, t) => {
		y();
		let n = l, r = g(e);
		l = r;
		let i = typeof r.animate == "function" && !kn();
		if (!n || t === "none" || !i) {
			f.replaceChildren(r), f.style.height = "", _();
			return;
		}
		f.style.height = `${n.offsetHeight}px`, n.classList.add("is-leaving"), f.appendChild(r), f.style.height = `${r.offsetHeight}px`;
		let a = t === "back", o = {
			duration: Tn,
			easing: "cubic-bezier(0.16, 1, 0.3, 1)"
		};
		v = {
			animations: [r.animate(a ? [{
				transform: "translateX(-30%)",
				opacity: 0
			}, {
				transform: "none",
				opacity: 1
			}] : [{ transform: "translateX(100%)" }, { transform: "none" }], o), n.animate(a ? [{ transform: "none" }, { transform: "translateX(100%)" }] : [{
				transform: "none",
				opacity: 1
			}, {
				transform: "translateX(-30%)",
				opacity: 0
			}], {
				...o,
				fill: "forwards"
			})],
			previous: n,
			timer: window.setTimeout(y, 320)
		}, _();
	};
	function x(e) {
		r.has(e) && (i.push(e), b(e, "forward"));
	}
	function S() {
		if (i.length <= 1) {
			T();
			return;
		}
		i.pop(), b(i[i.length - 1], "back");
	}
	function C() {
		var e, t, n;
		if (s !== "open" || !i.length) return;
		let r = (e = document.activeElement) == null || (t = e.closest) == null || (t = t.call(e, ".vanta-settings-row")) == null ? void 0 : t.dataset.page, a = g(i[i.length - 1]);
		f.replaceChildren(a), l = a, r && ((n = l.querySelector(`.vanta-settings-row[data-page="${r}"]`)) == null || n.focus({ preventScroll: !0 }));
	}
	function w() {
		s !== "open" && (window.clearTimeout(c), i.splice(0, i.length, "root"), l = null, b("root", "none"), d.hidden = !1, s = "open", d.offsetWidth, d.dataset.state = "open", t.setAttribute("aria-expanded", "true"), n(!0), _());
	}
	function T({ returnFocus: e = !0 } = {}) {
		s === "open" && (s = "closing", d.dataset.state = "closing", t.setAttribute("aria-expanded", "false"), n(!1), e && d.contains(document.activeElement) && t.focus({ preventScroll: !0 }), c = window.setTimeout(() => {
			y(), s = "closed", d.dataset.state = "closed", d.hidden = !0, f.replaceChildren(), l = null;
		}, kn() ? 0 : Sn));
	}
	let E = () => s === "open" ? T() : w(), D = (e) => {
		e.stopPropagation(), E();
	}, O = (e) => {
		var t;
		if (s !== "open") return;
		let n = p(), r = n.indexOf(document.activeElement);
		if (e.key === "Escape") {
			e.preventDefault(), e.stopPropagation(), i.length > 1 ? S() : T();
			return;
		}
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			if (e.preventDefault(), e.stopPropagation(), !n.length) return;
			n[(r + (e.key === "ArrowDown" ? 1 : -1) + n.length) % n.length].focus();
			return;
		}
		let a = wn(document.activeElement);
		if ((e.key === "ArrowLeft" || e.key === "Backspace") && i.length > 1 && !a) {
			e.preventDefault(), e.stopPropagation(), S();
			return;
		}
		if (a && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Backspace")) {
			e.stopPropagation();
			return;
		}
		if (e.key === "ArrowRight" && (t = document.activeElement) != null && t.classList.contains("vanta-settings-row")) {
			e.preventDefault(), e.stopPropagation(), document.activeElement.click();
			return;
		}
		(e.key === " " || e.key === "k" || e.key === "f" || e.key === "m") && e.stopPropagation();
	}, k = (e) => {
		s === "open" && (d.contains(e.target) || t.contains(e.target) || T({ returnFocus: !1 }));
	}, A = (e) => {
		e.pointerType === "touch" && (u = {
			x: e.clientX,
			y: e.clientY
		});
	}, j = (e) => {
		if (!u) return;
		let t = e.clientX - u.x, n = Math.abs(e.clientY - u.y);
		t > 0 && t > n && d.style.setProperty("--swipe", `${t}px`);
	}, M = (e) => {
		if (!u) return;
		let t = e.clientX - u.x;
		u = null, d.style.removeProperty("--swipe"), t > En && T();
	}, N = (e) => e.stopPropagation();
	return t.hidden = !1, t.addEventListener("click", D), d.addEventListener("keydown", O), d.addEventListener("click", N), d.addEventListener("pointerup", N), d.addEventListener("pointerdown", A), d.addEventListener("pointermove", j), d.addEventListener("pointerup", M), d.addEventListener("pointercancel", M), document.addEventListener("pointerdown", k, !0), {
		element: d,
		registerPage(e, t) {
			r.set(e, t);
		},
		setRows(e) {
			a = e;
		},
		setHeader(e) {
			o = e;
		},
		open: w,
		close: T,
		toggle: E,
		navigate: x,
		back: S,
		refresh: C,
		isOpen: () => s === "open",
		currentPage: () => i[i.length - 1] || null,
		destroy() {
			window.clearTimeout(c), y(), t.removeEventListener("click", D), document.removeEventListener("pointerdown", k, !0), s === "open" && n(!1), d.remove(), t.hidden = !0;
		}
	};
}
//#endregion
//#region src/public/js/shared/partyStatus.js
var jn = {
	sync: "Synchron",
	correcting: "Gleicht an …",
	buffering: "Puffert …",
	paused: "Pausiert",
	blocked: "Wiedergabe blockiert"
};
function Mn(e, t = null) {
	return e === "sync" && Number.isFinite(Number(t)) && t !== null ? `Synchron · ±${Math.abs(Math.round(Number(t)))} ms` : jn[e] || null;
}
//#endregion
//#region src/public/js/shared/members.js
function Nn(e = "") {
	let t = 0;
	for (let n of String(e)) t = t * 31 + n.charCodeAt(0) >>> 0;
	return Math.round(t * 137.508 % 360);
}
function Pn(e) {
	return String(e || "?").trim().charAt(0).toUpperCase() || "?";
}
//#endregion
//#region src/player/src/partyStatus.js
function Fn(e) {
	if (!(e != null && e.connected)) return {
		key: "offline",
		label: "Offline"
	};
	let t = Mn(e.playbackState, e.driftMs);
	return t ? {
		key: e.playbackState,
		label: t
	} : {
		key: "unknown",
		label: "Verbunden"
	};
}
//#endregion
//#region src/player/src/settings/partyCard.js
function In(e) {
	let t = document.createElement("div");
	t.className = "vanta-settings-party", t.innerHTML = "\n    <div class=\"vanta-settings-party-head\">\n      <span class=\"vanta-settings-party-title\">Watch Party</span>\n      <span class=\"vanta-settings-party-avatars\"></span>\n    </div>\n    <div class=\"vanta-settings-sync\">\n      <span class=\"vanta-settings-sync-dot\" aria-hidden=\"true\"></span>\n      <span class=\"vanta-settings-sync-label\" role=\"status\"></span>\n    </div>";
	let n = t.querySelector(".vanta-settings-party-avatars"), r = t.querySelector(".vanta-settings-sync"), i = document.createElement("div");
	i.className = "vanta-settings-toggle-row";
	let a = document.createElement("span");
	a.className = "vanta-settings-toggle-text", a.innerHTML = "<strong>Auf Puffernde warten</strong><small></small>", i.appendChild(a);
	let o = document.createElement("button");
	if (o.type = "button", o.className = "vanta-settings-switch vanta-settings-focusable", o.setAttribute("role", "switch"), o.setAttribute("aria-label", "Auf Puffernde warten"), o.innerHTML = "<span></span>", o.addEventListener("click", () => {
		var t;
		let n = o.getAttribute("aria-checked") !== "true";
		o.setAttribute("aria-checked", n ? "true" : "false"), (t = e.onSetWaitForBuffering) == null || t.call(e, n);
	}), i.appendChild(o), t.appendChild(i), e.onResync) {
		let t = document.createElement("button");
		t.type = "button", t.className = "vanta-settings-sync-button vanta-settings-focusable", t.textContent = "Neu synchronisieren", t.addEventListener("click", () => e.onResync()), r.appendChild(t);
	}
	let s = () => {
		var t;
		let i = e.waitForBuffering !== !1;
		o.hidden = !e.isHost, o.setAttribute("aria-checked", i ? "true" : "false"), a.querySelector("small").textContent = e.isHost ? "Pausiert für alle, wenn jemand hängt." : `${i ? "An" : "Aus"} · nur der Gastgeber kann das ändern.`;
		let s = ((t = e.getSyncStatus) == null ? void 0 : t.call(e)) || {
			kind: "preparing",
			label: "Wird vorbereitet"
		};
		r.dataset.status = s.kind, r.querySelector(".vanta-settings-sync-label").textContent = s.label, n.innerHTML = (e.participants || []).map((e) => {
			let t = Fn(e), n = e.username || "Unbekannt";
			return `<span class="vanta-settings-party-avatar" data-state="${t.key}" style="--member-hue:${Nn(e.userId)}"
        title="${H(`${n} · ${t.label}`)}" aria-label="${H(`${n}: ${t.label}`)}">${H(Pn(e.username))}</span>`;
		}).join("");
	};
	return s(), {
		element: t,
		update: s
	};
}
//#endregion
//#region src/player/src/watchPartyParticipants.js
function Ln(e) {
	return e === "owner" ? "Gastgeber" : e === "admin" ? "Admin" : "";
}
function Rn({ viewerRole: e, member: t, currentUserId: n }) {
	return ["owner", "admin"].includes(e) && t.userId !== n && t.role === "viewer";
}
function zn({ viewerRole: e, member: t, currentUserId: n }) {
	return e === "owner" && t.userId !== n && t.role === "admin";
}
function Bn({ viewerRole: e, member: t, currentUserId: n }) {
	return !(!["owner", "admin"].includes(e) || t.userId === n || t.role === "owner" || t.role === "admin" && e !== "owner");
}
//#endregion
//#region src/player/src/settings/pages.js
var Vn = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z\"/></svg>";
function Q(e, { options: t, onSelect: n, emptyLabel: r = "Keine Auswahl verfügbar" }, i) {
	let a = document.createElement("div");
	a.className = "vanta-settings-list", a.setAttribute("role", "radiogroup");
	let o = t.filter((e) => !e.disabled);
	if (!o.length) {
		var s;
		let n = document.createElement("div");
		n.className = "vanta-settings-empty", n.textContent = ((s = t[0]) == null ? void 0 : s.label) || r, e.appendChild(n);
		return;
	}
	o.forEach((e) => {
		let t = document.createElement("button");
		t.type = "button", t.className = `vanta-settings-option vanta-settings-focusable${e.selected ? " is-selected" : ""}`, t.setAttribute("role", "radio"), t.setAttribute("aria-checked", e.selected ? "true" : "false"), t.dataset.optionId = e.id, t.innerHTML = `
      <span class="vanta-settings-option-label">${H(e.label)}</span>
      <span class="vanta-settings-option-check">${e.selected ? Vn : ""}</span>`, t.addEventListener("click", () => {
			e.selected || n(e.id), i.back();
		}), a.appendChild(t);
	}), e.appendChild(a);
}
var Hn = [
	{
		id: "small",
		label: "Klein"
	},
	{
		id: "medium",
		label: "Mittel"
	},
	{
		id: "large",
		label: "Groß"
	}
], Un = [
	{
		id: "none",
		label: "Aus"
	},
	{
		id: "semi",
		label: "Halb"
	},
	{
		id: "solid",
		label: "Deckend"
	}
];
function Wn({ label: e, options: t, value: n, onChange: r }) {
	let i = document.createElement("div");
	i.className = "vanta-settings-field";
	let a = document.createElement("span");
	a.className = "vanta-settings-field-label", a.textContent = e;
	let o = document.createElement("div");
	return o.className = "vanta-settings-segmented", o.setAttribute("role", "radiogroup"), o.setAttribute("aria-label", e), t.forEach((e) => {
		let t = document.createElement("button");
		t.type = "button", t.className = "vanta-settings-segment vanta-settings-focusable", t.dataset.value = e.id, t.setAttribute("role", "radio"), t.setAttribute("aria-checked", e.id === n ? "true" : "false"), t.textContent = e.label, t.addEventListener("click", () => {
			o.querySelectorAll(".vanta-settings-segment").forEach((e) => {
				e.setAttribute("aria-checked", e === t ? "true" : "false");
			}), r(e.id);
		}), o.appendChild(t);
	}), i.append(a, o), i;
}
function Gn(e, { options: t, onSelect: n, style: r, onStyleChange: i }, a) {
	Q(e, {
		options: t,
		onSelect: n,
		emptyLabel: "Keine Untertitel verfügbar"
	}, a);
	let o = document.createElement("div");
	o.className = "vanta-settings-section";
	let s = document.createElement("div");
	s.className = "vanta-settings-section-title", s.textContent = "Darstellung", o.append(s, Wn({
		label: "Größe",
		options: Hn,
		value: r.size,
		onChange: (e) => i({ size: e })
	}), Wn({
		label: "Hintergrund",
		options: Un,
		value: r.background,
		onChange: (e) => i({ background: e })
	})), e.appendChild(o);
}
function Kn(e, { context: t, readonly: n, onSelectEpisode: r }, i) {
	let a = (t == null ? void 0 : t.seasons) || [], o = xn(t, t == null ? void 0 : t.currentEpisodeId), s = document.createElement("div");
	s.className = "vanta-settings-seasons", s.setAttribute("role", "tablist");
	let c = document.createElement("div");
	c.className = "vanta-settings-episodes";
	let l = () => {
		var e;
		s.querySelectorAll(".vanta-settings-season").forEach((e) => {
			let t = e.dataset.seasonId === o;
			e.classList.toggle("is-active", t), e.setAttribute("aria-selected", t ? "true" : "false");
		}), c.innerHTML = ((t == null || (e = t.episodesBySeason) == null ? void 0 : e[o]) || []).map((e) => {
			let r = e.Id === t.currentEpisodeId;
			return `
        <button type="button"
          class="vanta-settings-episode vanta-settings-focusable${r ? " is-current" : ""}"
          data-episode-id="${H(e.Id)}"
          ${r ? "aria-current=\"true\"" : ""}
          ${n ? "disabled aria-disabled=\"true\"" : ""}>
          <span class="vanta-settings-episode-code">${yn(e)}</span>
          <span class="vanta-settings-episode-title">${H(e.Name || "Unbenannte Folge")}</span>
          ${r ? "<span class=\"vanta-settings-episode-now\">Läuft</span>" : ""}
        </button>`;
		}).join("") || "<div class=\"vanta-settings-empty\">Keine Folgen in dieser Staffel</div>";
	};
	if (a.forEach((e) => {
		var t;
		let n = document.createElement("button");
		n.type = "button", n.className = "vanta-settings-season vanta-settings-focusable", n.setAttribute("role", "tab"), n.dataset.seasonId = e.Id, n.textContent = e.Name || `Staffel ${(t = e.IndexNumber) == null ? "" : t}`, n.addEventListener("click", () => {
			o = e.Id, l();
		}), s.appendChild(n);
	}), c.addEventListener("click", (e) => {
		let a = e.target.closest("[data-episode-id]");
		if (!a || n) return;
		let o = bn(t, a.dataset.episodeId);
		!o || o.Id === t.currentEpisodeId || (r == null || r(o), i.close());
	}), a.length > 1 && e.appendChild(s), n) {
		let t = document.createElement("p");
		t.className = "vanta-settings-hint", t.textContent = "Nur Admins können die Folge wechseln.", e.appendChild(t);
	}
	e.appendChild(c), l();
}
function qn(e, { watchParty: t, pendingBan: n }) {
	var r;
	let i = t.participants || [], a = ((r = i.find((e) => e.userId === t.currentUserId)) == null ? void 0 : r.role) || "viewer", o = document.createElement("div");
	o.className = "vanta-settings-participants", o.innerHTML = i.map((e) => {
		let r = Ln(e.role), i = Rn({
			viewerRole: a,
			member: e,
			currentUserId: t.currentUserId
		}), o = zn({
			viewerRole: a,
			member: e,
			currentUserId: t.currentUserId
		}), s = Bn({
			viewerRole: a,
			member: e,
			currentUserId: t.currentUserId
		}), c = n.userId === e.userId, l = e.userId === t.currentUserId, u = Fn(e);
		return `
      <div class="vanta-settings-participant" data-user-id="${H(e.userId)}">
        <span class="vanta-settings-avatar" data-state="${u.key}" style="--member-hue:${Nn(e.userId)}">${H(Pn(e.username))}</span>
        <span class="vanta-settings-participant-main">
          <span class="vanta-settings-participant-name">
            <strong>${H(e.username || "Unbekannt")}</strong>
            ${l ? "<span class=\"vanta-settings-tag\">Du</span>" : ""}
            ${r ? `<span class="vanta-settings-tag is-role">${r}</span>` : ""}
          </span>
          <span class="vanta-settings-participant-status is-${u.key}">${H(u.label)}</span>
        </span>
        <span class="vanta-settings-participant-actions">
          ${i ? `<button type="button" class="vanta-settings-action vanta-settings-focusable" data-action="promote" data-user-id="${H(e.userId)}">Admin machen</button>` : ""}
          ${o ? `<button type="button" class="vanta-settings-action vanta-settings-focusable" data-action="demote" data-user-id="${H(e.userId)}">Admin entziehen</button>` : ""}
          ${s ? `<button type="button" class="vanta-settings-action vanta-settings-focusable is-danger${c ? " is-confirming" : ""}" data-action="${c ? "confirm-ban" : "ban"}" data-user-id="${H(e.userId)}">${c ? "Wirklich bannen?" : "Bannen"}</button>` : ""}
        </span>
      </div>`;
	}).join("") || "<div class=\"vanta-settings-empty\">Keine Teilnehmer</div>", o.addEventListener("click", (e) => {
		let r = e.target.closest("button[data-action]");
		if (!r) return;
		let i = r.dataset.userId;
		if (r.dataset.action === "promote") {
			var a;
			(a = t.onPromoteMember) == null || a.call(t, i);
		} else if (r.dataset.action === "demote") {
			var o;
			(o = t.onDemoteMember) == null || o.call(t, i);
		} else if (r.dataset.action === "ban") n.userId = i, n.refresh();
		else if (r.dataset.action === "confirm-ban") {
			var s;
			n.userId = null, (s = t.onBanMember) == null || s.call(t, i), n.refresh();
		}
	}), e.appendChild(o);
}
function Jn(e, { presets: t, current: n, endLabel: r, customMin: i, customMax: a, onSelect: o, onCustom: s }, c) {
	Q(e, {
		options: t.map((e) => ({
			id: e.id,
			label: e.id === "end" ? r : e.label,
			selected: e.id === n
		})),
		onSelect: o
	}, c);
	let l = 45, u = document.createElement("div");
	u.className = "vanta-settings-section vanta-sleep-custom", u.innerHTML = `
    <div class="vanta-settings-section-title">Eigene Zeit</div>
    <div class="vanta-sleep-custom-row">
      <button type="button" class="vanta-settings-segment vanta-settings-focusable" data-step="-5" aria-label="5 Minuten weniger">−</button>
      <label class="vanta-sleep-custom-field">
        <input type="number" class="vanta-settings-focusable" inputmode="numeric" min="${i}" max="${a}" value="${l}" aria-label="Minuten">
        <span>Min.</span>
      </label>
      <button type="button" class="vanta-settings-segment vanta-settings-focusable" data-step="5" aria-label="5 Minuten mehr">+</button>
      <button type="button" class="vanta-settings-segment vanta-settings-focusable vanta-sleep-custom-start">Starten</button>
    </div>`;
	let d = u.querySelector("input"), f = (e) => Math.min(a, Math.max(i, Math.round(Number(e) || i)));
	u.querySelectorAll("[data-step]").forEach((e) => {
		e.addEventListener("click", () => {
			l = f(Number(d.value) + Number(e.dataset.step)), d.value = String(l);
		});
	}), d.addEventListener("change", () => {
		l = f(d.value), d.value = String(l);
	}), u.querySelector(".vanta-sleep-custom-start").addEventListener("click", () => {
		s(f(d.value)), c.back();
	}), e.appendChild(u);
}
//#endregion
//#region src/player/src/segments.js
var Yn = {
	intro: "Intro überspringen",
	recap: "Rückblick überspringen"
}, Xn = 1.5;
function Zn(e, t) {
	return Number.isFinite(t) && (e || []).find((e) => Yn[e.type] && t >= e.startMs / 1e3 && t < e.endMs / 1e3 - Xn) || null;
}
function Qn(e) {
	return (e || []).find((e) => e.type === "outro") || null;
}
function $n(e, { loadSegments: t }) {
	let { player: n, root: r, listen: i } = e;
	e.segments = [];
	let a = r.querySelector(".vanta-player-skip-segment"), o = null, s = () => {
		var t;
		return !((t = e.watchParty) != null && t.enabled) || e.canControlWatchParty();
	}, c = /* @__PURE__ */ new Set(), l = () => {
		var t, n;
		return !!((t = e.userPreferences) != null && t.autoSkipIntro) && !((n = e.watchParty) != null && n.enabled);
	}, u = () => {
		let t = s() ? Zn(e.segments, Number(n.currentTime)) : null;
		if ((t == null ? void 0 : t.type) === "intro" && l() && !c.has(t)) {
			c.add(t), q(n, t.endMs / 1e3, { endEpsilon: .25 });
			return;
		}
		t !== o && (o = t, a && (t ? (a.querySelector(".vanta-player-skip-segment-label").textContent = Yn[t.type], a.hidden = !1, a.offsetWidth, a.classList.add("is-visible")) : (a.classList.remove("is-visible"), a.hidden = !0)));
	};
	return a && i(a, "click", (e) => {
		e.stopPropagation(), !(!o || !s()) && (q(n, o.endMs / 1e3, { endEpsilon: .25 }), u());
	}), i(n, "time-update", u), e.refreshSegmentButton = u, typeof t == "function" && Promise.resolve().then(() => t()).then((t) => {
		e.destroyed || (e.segments = Array.isArray(t == null ? void 0 : t.segments) ? t.segments : [], u());
	}).catch(() => {}), e;
}
var er = 1e3, tr = [
	{
		id: "off",
		label: "Aus"
	},
	{
		id: "15",
		label: "15 Min.",
		minutes: 15
	},
	{
		id: "30",
		label: "30 Min.",
		minutes: 30
	},
	{
		id: "60",
		label: "1 Std.",
		minutes: 60
	},
	{
		id: "120",
		label: "2 Std.",
		minutes: 120
	},
	{
		id: "end",
		label: "Bis zum Ende"
	}
];
function nr(e) {
	let t = Math.max(0, Math.ceil(e / 1e3));
	return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
function rr(e) {
	let t = Math.max(1, Math.ceil(e / 6e4));
	if (t < 60) return `noch ${t} Min.`;
	let n = Math.floor(t / 60), r = t % 60;
	return r ? `noch ${n} Std. ${r} Min.` : `noch ${n} Std.`;
}
function ir({ getEndMs: e, initial: t = null }) {
	let n = "off", r = 0, i = {
		set(e) {
			(e == null ? void 0 : e.mode) === "duration" && Number(e.remainingMs) > 0 ? (n = "duration", r = Number(e.remainingMs)) : n = (e == null ? void 0 : e.mode) === "end" ? "end" : "off";
		},
		cancel() {
			n = "off";
		},
		mode: () => n,
		tick(e, t = er) {
			n === "duration" && e && (r = Math.max(0, r - t));
		},
		remainingMs() {
			if (n === "duration") return r;
			if (n === "end") {
				let t = Number(e());
				return Number.isFinite(t) ? Math.max(0, t) : Infinity;
			}
			return Infinity;
		},
		phase() {
			if (n === "off") return "off";
			let e = i.remainingMs();
			return e <= 0 ? "done" : e <= 6e4 ? "warning" : "running";
		},
		state: () => n === "duration" ? {
			mode: n,
			remainingMs: r
		} : { mode: n }
	};
	return i.set(t), i;
}
function ar(e, { setTimer: t = (e, t) => window.setInterval(e, t), clearTimer: n = (e) => window.clearInterval(e) } = {}) {
	var r;
	let { root: i, player: a } = e, o = e.sleepTimerOptions || {};
	if ((r = e.watchParty) != null && r.enabled) return null;
	let s = () => {
		let t = Number(e.knownDuration || a.duration), n = Qn(e.segments), r = Number(n == null ? void 0 : n.startMs) / 1e3;
		return Number.isFinite(r) && Number.isFinite(t) && r >= t * .5 && r < t ? r : t;
	}, c = ir({
		initial: o.initial,
		getEndMs: () => (s() - Number(a.currentTime)) * 1e3
	}), l = document.createElement("div");
	l.className = "vanta-sleep-notice", l.setAttribute("role", "status"), l.hidden = !0, l.innerHTML = "\n    <span class=\"vanta-sleep-notice-icon\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\"><path d=\"M12.3 2a10 10 0 1 0 9.7 12.6A8 8 0 0 1 12.3 2z\"/></svg></span>\n    <span class=\"vanta-sleep-notice-text\">Der Player wird in <strong>1:00</strong> geschlossen</span>\n    <button type=\"button\" class=\"vanta-sleep-notice-cancel\">Abbrechen</button>", (i.querySelector(".vanta-player-shell") || i).appendChild(l);
	let u = l.querySelector("strong"), d = l.querySelector(".vanta-sleep-notice-cancel");
	l.addEventListener("click", (e) => e.stopPropagation()), l.addEventListener("pointerup", (e) => e.stopPropagation());
	let f = !1, p = null, m = () => {
		var t;
		(t = o.onChange) == null || t.call(o, c.state());
		let n = _.label();
		if (n !== p) {
			var r, i;
			p = n, ((r = e.settings) == null || (i = r.currentPage) == null ? void 0 : i.call(r)) === "root" && e.settings.refresh();
		}
	}, h = () => {
		let t = c.phase() === "warning";
		if (t && l.hidden) {
			var n, r;
			l.hidden = !1;
			let t = e.settingsOpen || e.helpOpen || e.stillWatchingOpen;
			!e.tvMode && !t && !((n = document.activeElement) == null || (r = n.closest) == null) && r.call(n, ".vanta-player-controls-layer") && d.focus({ preventScroll: !0 });
		} else t || (l.hidden = !0);
		t && (u.textContent = nr(c.remainingMs()));
	}, g = () => {
		var t;
		f || (f = !0, l.hidden = !0, a.pause(), (t = e.onSleep || e.onBack) == null || t());
	}, _ = {
		set(e) {
			c.set(e), f = !1, h(), m();
		},
		cancel() {
			c.cancel(), h(), m();
		},
		mode: c.mode,
		blocksNextEpisode: () => c.mode() === "end",
		label() {
			return c.mode() === "off" ? "Aus" : c.mode() === "end" ? "Bis zum Ende" : rr(c.remainingMs());
		},
		core: c
	};
	e.sleepTimer = _, d.addEventListener("click", () => _.cancel());
	let v = t(() => {
		e.destroyed || c.mode() === "off" || (c.tick(!a.paused), c.phase() === "done" ? g() : h(), m());
	}, er);
	e.disposers.push(() => n(v));
	let y = () => {
		c.mode() === "end" && g();
	};
	return a.addEventListener("ended", y), e.disposers.push(() => a.removeEventListener("ended", y)), h(), _;
}
//#endregion
//#region src/player/src/nextEpisode.js
var or = .97, sr = .5;
function cr({ duration: e, outro: t = null, promptThreshold: n = or, countdownSeconds: r = 10 } = {}) {
	if (!Number.isFinite(e) || e <= 0) return null;
	let i = Math.max(0, e - sr), a = (e) => ({
		promptAt: e,
		skipAt: Math.max(e, Math.min(i, e + r))
	}), o = Number(t == null ? void 0 : t.startMs) / 1e3, s = Number(t == null ? void 0 : t.endMs) / 1e3;
	return Number.isFinite(o) && Number.isFinite(s) && o >= e * .5 && o < e ? {
		...a(o),
		source: "outro"
	} : {
		promptAt: Math.max(0, Math.min(e * n, i - r)),
		skipAt: i,
		source: "runtime"
	};
}
var lr = 1;
function ur(e, t, n, r = 10) {
	if (!e) return null;
	if (!Number.isFinite(t) || t <= e.promptAt + lr) return e.skipAt;
	let i = Math.max(0, n - sr);
	return Math.min(i, Math.max(e.skipAt, t + r));
}
function dr({ currentTime: e, duration: t, ...n }) {
	if (!Number.isFinite(e)) return !1;
	let r = cr({
		duration: t,
		...n
	});
	return r ? e >= r.promptAt : !1;
}
function fr(e) {
	return !(e != null && e.enabled) || !!e.canControl;
}
function pr() {
	let e = /* @__PURE__ */ new Set(), t = null;
	return {
		shouldTrigger(n) {
			return !!n && !e.has(n) && t !== n;
		},
		markShown(e) {
			t = e;
		},
		markHidden(e) {
			t === e && (t = null);
		},
		markDismissed(t) {
			t && e.add(t);
		}
	};
}
function mr(e, t = e == null ? void 0 : e.currentEpisodeId) {
	let n = [...(e == null ? void 0 : e.seasons) || []].sort((e, t) => {
		var n, r;
		return ((n = e.IndexNumber) == null ? 0 : n) - ((r = t.IndexNumber) == null ? 0 : r);
	});
	for (let a = 0; a < n.length; a += 1) {
		var r;
		let o = n[a], s = [...(e == null || (r = e.episodesBySeason) == null ? void 0 : r[o.Id]) || []].sort((e, t) => {
			var n, r;
			return ((n = e.IndexNumber) == null ? 0 : n) - ((r = t.IndexNumber) == null ? 0 : r);
		}), c = s.findIndex((e) => e.Id === t);
		if (c === -1) continue;
		let l = s[c + 1];
		if (l) return {
			kind: "next-episode",
			episode: l,
			season: o,
			fromSeason: o
		};
		for (let t = a + 1; t < n.length; t += 1) {
			var i;
			let r = n[t], a = [...(e == null || (i = e.episodesBySeason) == null ? void 0 : i[r.Id]) || []].sort((e, t) => {
				var n, r;
				return ((n = e.IndexNumber) == null ? 0 : n) - ((r = t.IndexNumber) == null ? 0 : r);
			});
			if (a[0]) return {
				kind: "next-season",
				episode: a[0],
				season: r,
				fromSeason: o
			};
		}
		return null;
	}
	return null;
}
//#endregion
//#region src/public/js/tv/keys.js
var hr = {
	ArrowUp: "up",
	Up: "up",
	ArrowDown: "down",
	Down: "down",
	ArrowLeft: "left",
	Left: "left",
	ArrowRight: "right",
	Right: "right",
	Enter: "ok",
	Accept: "ok",
	Select: "ok",
	Escape: "back",
	GoBack: "back",
	BrowserBack: "back",
	XF86Back: "back",
	MediaPlayPause: "playpause",
	MediaPlay: "play",
	MediaPause: "pause",
	MediaStop: "stop",
	MediaFastForward: "ff",
	MediaRewind: "rw",
	MediaTrackNext: "next",
	MediaTrackPrevious: "prev",
	ContextMenu: "menu",
	Apps: "menu",
	Info: "menu",
	Tools: "menu"
}, gr = {
	37: "left",
	38: "up",
	39: "right",
	40: "down",
	13: "ok",
	461: "back",
	10009: "back",
	10252: "playpause",
	179: "playpause",
	415: "play",
	19: "pause",
	413: "stop",
	417: "ff",
	412: "rw",
	176: "next",
	177: "prev",
	93: "menu",
	457: "menu",
	10135: "menu"
};
function _r(e) {
	if (!e) return null;
	if (hr[e.key]) return hr[e.key];
	if (e.key === "Backspace") {
		var t, n;
		return vr(e.target) || !((t = e.target) == null || (n = t.closest) == null) && n.call(t, ".osk") ? null : "back";
	}
	return gr[e.keyCode] || null;
}
function vr(e) {
	if (!e || typeof e.closest != "function") return !1;
	if (e.isContentEditable) return !0;
	let t = e.closest("input, textarea, select");
	if (!t) return !1;
	let n = (t.getAttribute("type") || "text").toLowerCase();
	return ![
		"checkbox",
		"radio",
		"button",
		"submit",
		"range"
	].includes(n);
}
//#endregion
//#region src/player/src/nextEpisodePrompt.js
var yr = 1e4;
function br(e) {
	var t;
	let n = e == null || (t = e.ImageTags) == null ? void 0 : t.Primary;
	return !(e != null && e.Id) || !n ? null : `/api/media/image/${e.Id}?type=Primary&tag=${encodeURIComponent(n)}&maxWidth=200`;
}
function xr({ root: e, onConfirm: t, onDismiss: n, mayTakeFocus: r = () => !0, countdownMs: i = yr }) {
	let a = null, o = null, s = 0, c = 0, l = 0, u = null, d = null, f = !0, p = !1, m = null, h = document.createElement("div");
	h.className = "vanta-player-next-episode", h.setAttribute("role", "complementary"), h.setAttribute("aria-label", "Nächste Folge"), h.hidden = !0;
	let g = document.createElement("div");
	g.className = "vanta-player-next-episode-media", g.hidden = !0;
	let _ = document.createElement("div");
	_.className = "vanta-player-next-episode-body";
	let v = document.createElement("span");
	v.className = "vanta-player-next-episode-kicker";
	let y = document.createElement("strong");
	y.className = "vanta-player-next-episode-code";
	let b = document.createElement("span");
	b.className = "vanta-player-next-episode-title";
	let x = document.createElement("span");
	x.className = "vanta-player-next-episode-series", x.hidden = !0;
	let S = document.createElement("span");
	S.className = "vanta-player-next-episode-countdown", S.setAttribute("aria-live", "off"), S.hidden = !0;
	let C = document.createElement("p");
	C.className = "vanta-player-next-episode-message", C.hidden = !0;
	let w = document.createElement("div");
	w.className = "vanta-player-next-episode-actions";
	let T = document.createElement("button");
	T.type = "button", T.className = "vanta-player-next-episode-confirm";
	let E = document.createElement("button");
	E.type = "button", E.className = "vanta-player-next-episode-dismiss", E.textContent = "Abbrechen", w.append(E, T), _.append(v, y, b, x, S, C, w), h.append(g, _), e.appendChild(h);
	function D(e) {
		T.style.setProperty("--next-episode-progress", String(Math.min(1, Math.max(0, e))));
	}
	function O(e) {
		if (!Number.isFinite(e)) {
			S.hidden = !0, S.textContent = "";
			return;
		}
		S.textContent = `Startet in ${Math.max(0, Math.ceil(e))} s`, S.hidden = !1;
	}
	function k(e) {
		let t = e - s;
		if (D(t / i), O((i - t) / 1e3), t / i >= 1) {
			M({ auto: !0 });
			return;
		}
		o = window.requestAnimationFrame(k);
	}
	function A() {
		let e = l - u();
		if (D(1 - e / (l - c)), O(e), Number.isFinite(e) && e <= 0) {
			M({ auto: !0 });
			return;
		}
		o = window.requestAnimationFrame(A);
	}
	function j() {
		a && window.clearTimeout(a), o && window.cancelAnimationFrame(o), a = null, o = null;
	}
	function M({ auto: e }) {
		if (!d) return;
		let n = d;
		F(), t == null || t(n, { auto: e });
	}
	function N() {
		f && M({ auto: !1 });
	}
	function P(e = null) {
		T.hidden = !f, E.hidden = !f, C.textContent = f ? "" : e || "Startet automatisch. Abbrechen oder sofort starten können nur Admins.", C.hidden = f;
	}
	function F() {
		j(), d = null, u = null, h.hidden = !0, D(0), O(NaN), document.activeElement && h.contains(document.activeElement) && m != null && m.isConnected && m.focus(), m = null;
	}
	function ee(e, t) {
		let n = typeof t == "function" ? t() : NaN;
		if (Number.isFinite(e) && Number.isFinite(n)) {
			if (e <= n) {
				O(NaN);
				return;
			}
			c = n, l = e, u = t, O(e - n), o = window.requestAnimationFrame(A);
			return;
		}
		s = performance.now(), O(i / 1e3), o = window.requestAnimationFrame(k);
	}
	function I(e, t = {}) {
		var n, i;
		let { controls: a = !0, message: o = null, skipAt: s = null, getCurrentTime: c = null, autoAdvance: l = !0 } = t;
		j(), d = e, f = a, m = document.activeElement, h.hidden = !1;
		let u = e.kind === "next-season";
		v.textContent = u ? "Nächste Staffel" : "Nächste Folge", y.textContent = yn(e.episode), b.textContent = ((n = e.episode) == null ? void 0 : n.Name) || "Unbenannte Folge", (i = e.episode) != null && i.SeriesName ? (x.textContent = e.episode.SeriesName, x.hidden = !1) : x.hidden = !0;
		let _ = br(e.episode);
		_ ? (g.style.backgroundImage = `url("${_.replaceAll("\"", "%22")}")`, g.hidden = !1) : (g.style.backgroundImage = "", g.hidden = !0), T.textContent = u ? "Nächste Staffel starten" : "Nächste Folge starten", P(o), D(0), l ? ee(s, c) : O(NaN), p && f && r() && T.focus();
	}
	E.addEventListener("click", () => {
		let e = d;
		F(), n == null || n(e);
	}), T.addEventListener("click", N);
	let L = (e) => {
		p = e.type === "keydown";
	};
	document.addEventListener("keydown", L, !0), document.addEventListener("pointerdown", L, !0), document.addEventListener("mousedown", L, !0);
	let te = (e) => {
		if (h.hidden || e.defaultPrevented || _r(e) !== "back") return;
		e.preventDefault(), e.stopPropagation();
		let t = d;
		F(), n == null || n(t);
	};
	return document.addEventListener("keydown", te), {
		element: h,
		confirmButton: T,
		dismissButton: E,
		show: I,
		hide: F,
		setControls(e, t) {
			f = !!e, d && P(t);
		},
		isVisible: () => !h.hidden,
		destroy: () => {
			F(), document.removeEventListener("keydown", L, !0), document.removeEventListener("pointerdown", L, !0), document.removeEventListener("mousedown", L, !0), document.removeEventListener("keydown", te), h.remove();
		}
	};
}
//#endregion
//#region src/player/src/player/nextEpisodeBinding.js
function Sr(e) {
	let { root: t, player: n, watchParty: r, episodeBrowser: i } = e, a = pr();
	e.nextEpisodePrompt = i != null && i.enabled ? xr({
		root: t.querySelector(".vanta-player-shell"),
		mayTakeFocus: () => !e.tvMode && !e.settingsOpen && !e.helpOpen && !e.stillWatchingOpen,
		onConfirm: (e, { auto: t = !1 } = {}) => {
			var n;
			(n = i.onNextEpisode) == null || n.call(i, e, { auto: t });
		},
		onDismiss: (e) => {
			var t, n;
			a.markDismissed((t = i.context) == null ? void 0 : t.currentEpisodeId), fr(r) && ((n = i.onDismissNextEpisode) == null || n.call(i, e));
		}
	}) : null, e.cancelNextEpisode = () => {
		var t, n;
		a.markDismissed(i == null || (t = i.context) == null ? void 0 : t.currentEpisodeId), (n = e.nextEpisodePrompt) == null || n.hide();
	}, e.maybeShowNextEpisodePrompt = () => {
		var t, o, s;
		if (!e.nextEpisodePrompt || !(i != null && i.context)) return;
		let c = i.context.currentEpisodeId, l = e.knownDuration || n.duration, u = Qn(e.segments), d = dr({
			currentTime: n.currentTime,
			duration: l,
			outro: u
		});
		if (!d && Number.isFinite(n.currentTime) && e.nextEpisodePrompt.isVisible()) {
			e.nextEpisodePrompt.hide(), a.markHidden(c);
			return;
		}
		if (!a.shouldTrigger(c) || r != null && r.enabled && (t = r.isNextEpisodeCancelled) != null && t.call(r) || (o = e.sleepTimer) != null && o.blocksNextEpisode() || !d) return;
		let f = mr(i.context, c);
		if (!f) return;
		a.markShown(c);
		let p = fr(r), m = (r == null ? void 0 : r.enabled) || ((s = e.userPreferences) == null ? void 0 : s.autoplayNextEpisode) !== !1;
		e.nextEpisodePrompt.show(f, {
			controls: p,
			autoAdvance: m,
			message: p ? null : Fe,
			skipAt: ur(cr({
				duration: l,
				outro: u
			}), n.currentTime, l),
			getCurrentTime: () => n.currentTime
		});
	};
}
//#endregion
//#region src/player/src/player/menus.js
var Cr = 1e3, $ = {
	subtitles: "<svg viewBox=\"0 0 24 24\"><path d=\"M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z\"/></svg>",
	quality: "<svg viewBox=\"0 0 24 24\"><path d=\"M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-8 12H9.5v-2h-2v2H6V9h1.5v2.5h2V9H11v6zm7-1a1 1 0 0 1-1 1h-4V9h4a1 1 0 0 1 1 1v4zm-3.5-.5h2v-3h-2v3z\"/></svg>",
	episodes: "<svg viewBox=\"0 0 24 24\"><path d=\"M4 6h2v2H4V6zm0 5h2v2H4v-2zm0 5h2v2H4v-2zm4-10h12v2H8V6zm0 5h12v2H8v-2zm0 5h12v2H8v-2z\"/></svg>",
	audio: "<svg viewBox=\"0 0 24 24\"><path d=\"M12 3a9 9 0 0 0-9 9v7a2 2 0 0 0 2 2h3v-8H5v-1a7 7 0 0 1 14 0v1h-3v8h3a2 2 0 0 0 2-2v-7a9 9 0 0 0-9-9z\"/></svg>",
	help: "<svg viewBox=\"0 0 24 24\"><path d=\"M11 18h2v-2h-2v2zm1-16a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm0-14a4 4 0 0 0-4 4h2a2 2 0 1 1 4 0c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5a4 4 0 0 0-4-4z\"/></svg>",
	sleep: "<svg viewBox=\"0 0 24 24\"><path d=\"M12.3 2a10 10 0 1 0 9.7 12.6A8 8 0 0 1 12.3 2z\"/></svg>",
	participants: "<svg viewBox=\"0 0 24 24\"><path d=\"M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5 1.34 3.5 3 3.5zM8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11zm0 2c-2.67 0-5 1.34-5 3v2h10v-2c0-1.66-2.33-3-5-3zm8 0c-.31 0-.62.02-.91.06 1.18.84 1.91 1.95 1.91 3.19V18h4v-2c0-1.66-2.33-3-5-3z\"/></svg>"
};
function wr(e) {
	let { root: t, player: n, reporter: r, watchParty: i, episodeBrowser: a, dom: o, ui: s } = e, c = t.querySelector(".vanta-player-shell"), l = i != null && i.disableQualityMenu ? null : ln({ onSelect: async (t) => {
		let n = e.sourceSwitch.getCurrentPlayback();
		if (n) try {
			let i = await e.resolvePlayback("auto", {
				qualityProfile: t,
				replacesPlaySessionId: n.playSessionId
			});
			if (e.destroyed) return;
			let a = await e.sourceSwitch.switchTo(i, {
				position: e.sourceSwitch.captureState().position,
				shouldPlay: e.sourceSwitch.getIntendsToPlay(),
				label: "Qualität wird gewechselt …"
			});
			if (e.destroyed) return;
			if (!(a != null && a.success)) {
				var r;
				e.updateMenus(e.sourceSwitch.getCurrentPlayback() || n), (r = e.showNotice) == null || r.call(e, "Qualität konnte nicht gewechselt werden. Die bisherige läuft weiter.");
				return;
			}
			e.updateMenus(i);
		} catch (t) {
			!e.destroyed && !e.handleFatalPlaybackError(t) && e.showError(t.message);
		}
	} });
	e.qualityMenu = l, e.audioMenu = _n({ onSelect: async (t) => {
		let n = e.sourceSwitch.getCurrentPlayback();
		if (n) try {
			var r;
			let a = await e.resolvePlayback("auto", {
				audioStreamIndex: t,
				mediaSourceId: n.mediaSourceId || void 0,
				replacesPlaySessionId: n.playSessionId
			});
			if (e.destroyed) return;
			let o = await e.sourceSwitch.switchTo(a, {
				position: e.sourceSwitch.captureState().position,
				shouldPlay: e.sourceSwitch.getIntendsToPlay(),
				label: "Tonspur wird gewechselt …"
			});
			if (e.destroyed) return;
			if (!(o != null && o.success)) {
				var i;
				e.updateMenus(e.sourceSwitch.getCurrentPlayback() || n), (i = e.showNotice) == null || i.call(e, "Tonspur konnte nicht gewechselt werden. Die bisherige läuft weiter.");
				return;
			}
			e.updateMenus(a), (r = e.preferences) == null || r.update({ audioLanguage: e.audioMenu.getCurrentLanguage() });
		} catch (t) {
			!e.destroyed && !e.handleFatalPlaybackError(t) && e.showError(t.message);
		}
	} }), e.subtitleMenu = gn({
		player: n,
		reporter: r,
		onChange: () => {
			var t;
			return (t = e.settings) == null ? void 0 : t.refresh();
		}
	});
	let u = null, d = null, f = {
		userId: null,
		refresh: () => {
			var t;
			return (t = e.settings) == null ? void 0 : t.refresh();
		}
	}, p = An({
		container: c,
		button: o.settingsButton,
		onOpenChange: (t) => {
			e.settingsOpen = t, t ? (s.holdActive("settings"), d = window.setInterval(() => u == null ? void 0 : u.update(), Cr)) : (s.releaseActive("settings"), window.clearInterval(d), f.userId = null);
		}
	});
	e.settings = p, e.disposers.push(() => window.clearInterval(d));
	let m = () => {
		var e;
		let t = bn(a == null ? void 0 : a.context, a == null || (e = a.context) == null ? void 0 : e.currentEpisodeId);
		return t ? yn(t) : "Alle Folgen";
	};
	p.setHeader(() => i != null && i.enabled ? (u = In(i), u.element) : null), p.setRows(() => {
		var t, n;
		return [
			{
				page: "subtitles",
				label: "Untertitel",
				value: e.subtitleMenu.getCurrentLabel(),
				icon: $.subtitles
			},
			{
				page: "audio",
				label: "Tonspur",
				value: e.audioMenu.getCurrentLabel(),
				icon: $.audio,
				hidden: !e.audioMenu.hasChoices()
			},
			{
				page: "quality",
				label: "Qualität",
				value: (l == null ? void 0 : l.getCurrentLabel()) || "",
				icon: $.quality,
				hidden: !l
			},
			{
				page: "episodes",
				label: "Folgen",
				value: m(),
				icon: $.episodes,
				hidden: !(a != null && a.enabled)
			},
			{
				page: "participants",
				label: "Teilnehmer",
				value: `${(i == null || (t = i.participants) == null ? void 0 : t.length) || 0}/4`,
				icon: $.participants,
				hidden: !(i != null && i.enabled)
			},
			{
				page: "sleep",
				label: "Sleep-Timer",
				value: ((n = e.sleepTimer) == null ? void 0 : n.label()) || "",
				icon: $.sleep,
				hidden: !e.sleepTimer
			},
			{
				id: "help",
				label: "Hilfe",
				value: "Tasten & Gesten",
				icon: $.help,
				onSelect: () => {
					var t;
					return (t = e.openHelp) == null ? void 0 : t.call(e);
				}
			}
		];
	});
	let h = () => {
		var t;
		let n = ((t = e.preferences) == null ? void 0 : t.get()) || {};
		return {
			size: n.subtitleSize || "medium",
			background: n.subtitleBackground || "semi"
		};
	};
	if (e.applySubtitleStyle = (n = {}) => {
		let r = {
			...h(),
			...n
		};
		if (t.dataset.subtitleSize = r.size, t.dataset.subtitleBackground = r.background, Object.keys(n).length) {
			var i;
			(i = e.preferences) == null || i.update({
				subtitleSize: r.size,
				subtitleBackground: r.background
			});
		}
	}, e.applySubtitleStyle(), p.registerPage("subtitles", {
		title: "Untertitel",
		render: (t, n) => Gn(t, {
			options: e.subtitleMenu.getOptions(),
			onSelect: (t) => e.selectSubtitle(t),
			style: h(),
			onStyleChange: (t) => e.applySubtitleStyle(t)
		}, n)
	}), p.registerPage("audio", {
		title: "Tonspur",
		render: (t, n) => Q(t, {
			options: e.audioMenu.getOptions(),
			onSelect: (t) => e.audioMenu.select(t),
			emptyLabel: "Nur eine Tonspur"
		}, n)
	}), l && p.registerPage("quality", {
		title: "Qualität",
		render: (e, t) => Q(e, {
			options: l.getOptions(),
			onSelect: (e) => l.select(e)
		}, t)
	}), a != null && a.enabled && p.registerPage("episodes", {
		title: "Folgen",
		wide: !0,
		render: (e, t) => Kn(e, {
			context: a.context,
			readonly: !!a.readonly,
			onSelectEpisode: a.onSelectEpisode
		}, t)
	}), e.sleepTimer) {
		let t = e.sleepTimer, n = !!(a != null && a.enabled);
		p.registerPage("sleep", {
			title: "Sleep-Timer",
			render: (e, r) => Jn(e, {
				presets: tr,
				current: t.mode() === "off" ? "off" : t.mode() === "end" ? "end" : null,
				endLabel: n ? "Bis zum Ende der Folge" : "Bis zum Ende des Films",
				customMin: 1,
				customMax: 480,
				onSelect: (e) => {
					let n = tr.find((t) => t.id === e);
					e === "off" ? t.cancel() : e === "end" ? t.set({ mode: "end" }) : n != null && n.minutes && t.set({
						mode: "duration",
						remainingMs: n.minutes * 6e4
					});
				},
				onCustom: (e) => t.set({
					mode: "duration",
					remainingMs: e * 6e4
				})
			}, r)
		});
	}
	if (i != null && i.enabled) {
		p.registerPage("participants", {
			title: "Teilnehmer",
			render: (e) => qn(e, {
				watchParty: i,
				pendingBan: f
			})
		});
		let t = i.onParticipantsChange, n = () => {
			t == null || t();
			let e = p.currentPage();
			(e === "root" || e === "participants") && p.refresh();
		};
		i.onParticipantsChange = n, e.disposers.push(() => {
			i.onParticipantsChange === n && (i.onParticipantsChange = t);
		});
	}
	Sr(e);
	let g = () => {
		var t;
		(t = e.preferences) == null || t.update({ subtitleLanguage: e.subtitleMenu.getCurrentLanguage() });
	};
	return e.selectSubtitle = (t) => {
		e.subtitleMenu.select(t), g();
	}, e.toggleSubtitles = () => {
		e.subtitleMenu.toggle(), g();
	}, e.updateMenus = (t, n = {}) => {
		var r, i, a;
		l == null || l.update((r = t.quality) == null ? void 0 : r.profiles, (i = t.quality) == null ? void 0 : i.current), e.audioMenu.update(t.audioTracks, t.audioStreamIndex), e.subtitleMenu.update(t, {
			preserveSelection: n.preserveSubtitleSelection !== !1,
			preferredLanguage: ((a = e.preferences) == null ? void 0 : a.get().subtitleLanguage) || null
		}), p.refresh();
	}, e;
}
//#endregion
//#region src/player/src/player/ownerControlEvents.js
function Tr(e) {
	let { player: t, listen: n, watchParty: r } = e, i = () => Math.round(t.currentTime * 1e3);
	n(t, "play", () => {
		var t;
		e.canEmitOwnerControl("play") && ((t = r.onOwnerPlay) == null || t.call(r, i()));
	}), n(t, "pause", () => {
		var t;
		e.canEmitOwnerControl("pause") && ((t = r.onOwnerPause) == null || t.call(r, i()));
	});
	let a = !1;
	n(t, "seeking", () => {
		e.echoTokens.consume("seek") && (a = !0);
	}), n(t, "seeked", () => {
		var t, n;
		let o = (t = (n = e.takePendingSeekStep) == null ? void 0 : n.call(e)) == null ? null : t;
		if (a) {
			a = !1;
			return;
		}
		if (e.canEmitOwnerControl("seek")) {
			var s;
			(s = r.onOwnerSeek) == null || s.call(r, i(), o ? { step: o } : {});
		}
	});
}
//#endregion
//#region src/player/src/player/eventBindings.js
var Er = () => import("./hls-Dg49Czpj.js");
function Dr(e) {
	let { player: t, dom: n, listen: r, onBack: i } = e, a = async (t) => {
		var n;
		if (!(e.sourceSwitch.isSwitching() || e.destroyed)) {
			if (((n = e.sourceSwitch.getCurrentPlayback()) == null ? void 0 : n.delivery) !== "hls") {
				await o(t, { silent: e.isDeferredReadyRoom() });
				return;
			}
			e.showError(t == null ? void 0 : t.message);
		}
	}, o = async (t, { silent: n = !1 } = {}) => {
		if (e.fallbackAttempted || e.destroyed) {
			n || e.showError(t == null ? void 0 : t.message);
			return;
		}
		e.fallbackAttempted = !0;
		let r = e.sourceSwitch.captureState();
		e.setLoading(!0, "HLS-Fallback wird beim Server angefragt …");
		try {
			var i;
			let t = await e.resolvePlayback("hls", { replacesPlaySessionId: ((i = e.sourceSwitch.getCurrentPlayback()) == null ? void 0 : i.playSessionId) || null });
			if (e.destroyed) return;
			await e.sourceSwitch.loadPlayback(t, {
				position: r.position,
				shouldPlay: n ? !1 : r.shouldPlay,
				label: "Stream wird gewechselt …"
			}), e.updateMenus(t);
		} catch (t) {
			if (e.destroyed || e.handleFatalPlaybackError(t)) return;
			n || e.showError(t.message);
		}
	}, s = () => {
		e.sourceSwitch.isSwitching() || e.destroyed || (e.ui.setState("buffering"), e.inlineLoading.begin());
	};
	return r(t, "provider-change", (t) => {
		e.syncInlinePlayback(), window.setTimeout(e.syncInlinePlayback, 0), N(t.detail) && (t.detail.library = Er, t.detail.config = {
			enableWorker: !0,
			workerPath: Pe,
			backBufferLength: 30,
			manifestLoadingTimeOut: 3e4,
			levelLoadingTimeOut: 3e4,
			fragLoadingTimeOut: Ne,
			fragLoadingMaxRetry: 2,
			fragLoadingRetryDelay: 1e3,
			fragLoadingMaxRetryTimeout: 1e4
		}, e.sourceSwitch.isSwitching() && e.setLoadingStatus("HLS-Wiedergabe wird initialisiert …"));
	}), r(t, "can-play", e.syncInlinePlayback), r(t, "loaded-metadata", e.syncInlinePlayback), r(t, "error", (t) => {
		if (e.sourceSwitch.isSwitching() || e.destroyed) return;
		let n = t.detail || {}, r = n.message || "Medienfehler";
		(n.code >= 2 && n.code <= 4 || /not supported|decode|network|media_err/i.test(r)) && a(Error(r));
	}), r(t, "duration-change", (t) => {
		let n = Number(t.detail);
		Number.isFinite(n) && n > 0 && (e.knownDuration = n);
	}), r(t, "time-update", e.maybeShowNextEpisodePrompt), r(t, "play", () => {
		e.sourceSwitch.isSwitching() || e.sourceSwitch.setIntendsToPlay(!0);
	}), r(t, "pause", () => {
		if (!e.sourceSwitch.isSwitching()) {
			var n;
			e.sourceSwitch.setIntendsToPlay(!1), e.sourceSwitch.clearSeekTimer(), !((n = t.querySelector) == null || (n = n.call(t, "video")) == null) && n.seeking || e.inlineLoading.end(), e.ui.setState("ready-paused");
		}
	}), r(t, "waiting", () => {
		e.sourceSwitch.isSwitching() || s();
	}), r(t, "seeking", () => {
		e.sourceSwitch.isSwitching() || (e.ui.setState("seeking"), e.inlineLoading.begin());
	}), r(t, "playing", () => {
		e.sourceSwitch.clearSeekTimer(), e.sourceSwitch.isSwitching() || (e.sourceSwitch.setAutoplayBlocked(!1), e.setLoading(!1), e.inlineLoading.isActive() ? e.inlineLoading.check() : e.setInlineLoading(!1), e.sourceSwitch.syncPlayingState());
	}), r(t, "seeked", () => {
		e.sourceSwitch.clearSeekTimer(), !e.sourceSwitch.isSwitching() && !e.destroyed && (e.inlineLoading.check(), e.sourceSwitch.syncPlayingState());
	}), Tr(e), r(t, "ended", () => {
		xe().catch(() => {}), e.reporter.stop({ ended: !0 });
	}), r(n.backButton, "click", i), e.switchToHls = o, e;
}
//#endregion
//#region src/player/src/player/syncControls.js
var Or = 3, kr = .05, Ar = class extends Error {
	constructor() {
		super("Der Browser hat die automatische Wiedergabe blockiert."), this.name = "NotAllowedError";
	}
};
function jr(e) {
	let { player: t, listen: n, echoTokens: r } = e, i = () => performance.now(), a = i(), o = () => {
		a = i();
	};
	[
		"waiting",
		"seeking",
		"pause",
		"play",
		"source-change"
	].forEach((e) => n(t, e, o));
	let s = () => {
		var e;
		return ((e = t.querySelector) == null ? void 0 : e.call(t, "video")) || null;
	}, c = () => {
		if (e.sourceSwitch.isSwitching()) return !0;
		let t = s();
		return t ? t.seeking ? !0 : !t.paused && t.readyState < Or : !1;
	};
	return e.getSyncState = () => {
		let n = c();
		return n && o(), {
			ready: !!e.sourceSwitch.getCurrentPlayback() && !e.destroyed,
			currentTime: Number(t.currentTime) || 0,
			paused: !!t.paused,
			busy: n,
			rate: Number(t.playbackRate) || 1,
			stableMs: t.paused ? 0 : Math.max(0, i() - a),
			autoplayBlocked: e.sourceSwitch.getAutoplayBlocked()
		};
	}, e.getBufferedAhead = (e = t.currentTime) => {
		var n;
		let r = (n = s()) == null ? void 0 : n.buffered;
		if (!r) return 0;
		for (let t = 0; t < r.length; t++) if (r.start(t) <= e + .25 && r.end(t) >= e) return Math.max(0, r.end(t) - e);
		return 0;
	}, e.setSyncRate = (e) => {
		let n = Number(e) || 1;
		Math.abs((Number(t.playbackRate) || 1) - n) < .001 || (t.playbackRate = n);
	}, e.syncSeek = (e) => {
		let n = Wt(e, t);
		Number.isFinite(n) && (Math.abs((Number(t.currentTime) || 0) - n) < kr || (r.expect("seek"), o(), t.currentTime = n));
	}, e.syncPlay = async ({ quiet: n = !0 } = {}) => {
		if (t.paused && (r.expect("play"), e.sourceSwitch.setIntendsToPlay(!0), await e.sourceSwitch.startCurrentPlayback({ quiet: n }), e.sourceSwitch.getAutoplayBlocked())) throw new Ar();
	}, e.syncPause = () => {
		t.paused || (r.expect("pause"), e.sourceSwitch.setIntendsToPlay(!1), t.pause());
	}, e.unlockPlayback = () => {
		let e = s();
		if (!e) return Promise.resolve(!1);
		let t = e.muted, n = e.currentTime;
		e.muted = !0;
		let r;
		try {
			r = e.play();
		} catch {
			r = Promise.reject();
		}
		return Promise.resolve(r).then(() => !0, () => !1).then((r) => (e.pause(), e.muted = t, Math.abs(e.currentTime - n) > kr && (e.currentTime = n), r));
	}, e;
}
function Mr(e, { setTimer: t = (e, t) => window.setInterval(e, t), clearTimer: n = (e) => window.clearInterval(e) } = {}) {
	let { player: r } = e, i = !1, a = () => {
		var t, n;
		let a = (t = r.querySelector) == null ? void 0 : t.call(r, "video"), o = r.$store;
		if (!a || typeof (o == null || (n = o.currentTime) == null ? void 0 : n.set) != "function" || a.paused || a.seeking || a.ended) return;
		let s = Number(a.currentTime), c = Number(o.currentTime());
		if (!(!Number.isFinite(s) || Math.abs(s - c) < 1)) {
			if (!i) {
				var l, u, d, f, p, m;
				i = !0, console.warn("[Player] Zeitleiste stand still, neu gesetzt", {
					actual: s,
					shown: c,
					storePaused: (l = o.paused) == null ? void 0 : l.call(o),
					storePlaying: (u = o.playing) == null ? void 0 : u.call(o),
					canPlay: (d = o.canPlay) == null ? void 0 : d.call(o),
					seekableEnd: (f = o.seekableEnd) == null ? void 0 : f.call(o),
					duration: (p = o.duration) == null ? void 0 : p.call(o),
					readyState: a.readyState,
					watchPartyPhase: (m = e.watchPartyPhase) == null ? void 0 : m.call(e)
				});
			}
			o.currentTime.set(s);
		}
	}, o = t(a, 500);
	return e.disposers.push(() => n(o)), { check: a };
}
var Nr = 750;
function Pr({ now: e = () => performance.now(), chainMs: t = 900 } = {}) {
	let n = {
		back: {
			at: -Infinity,
			total: 0
		},
		forward: {
			at: -Infinity,
			total: 0
		}
	};
	return { add(r, i) {
		let a = n[r], o = e();
		a.total = o - a.at <= t ? a.total + i : i, a.at = o;
		let s = r === "back" ? n.forward : n.back;
		return s.at = -Infinity, a.total;
	} };
}
function Fr(e, t, n = null) {
	let r = `${e === "back" ? "−" : "+"}${t} s`;
	return n ? `${r} · ${n}` : r;
}
function Ir(e) {
	let { player: t, dom: n, listen: r, root: i, ui: a } = e, o = Pr(), s = {
		back: null,
		forward: null
	}, c = () => {
		let e = !!t.paused;
		e ? i.setAttribute("data-paused", "") : i.removeAttribute("data-paused"), n.playButtons.forEach((t) => {
			t.dataset.state = e ? "paused" : "playing", t.setAttribute("aria-label", e ? "Wiedergabe" : "Pause"), t.title = e ? "Wiedergabe (K)" : "Pause (K)";
		});
	}, l = (e, t, r = null) => {
		let i = n.seekBubbles[e];
		i && (i.textContent = Fr(e, t, r), i.classList.remove("is-visible"), i.offsetWidth, i.classList.add("is-visible"), window.clearTimeout(s[e]), s[e] = window.setTimeout(() => i.classList.remove("is-visible"), Nr));
	}, u = (e) => {
		n.seekButtons.filter((t) => (Number(t.dataset.seek) < 0 ? "back" : "forward") === e).forEach((e) => {
			e.classList.remove("is-pressed"), e.offsetWidth, e.classList.add("is-pressed");
		});
	};
	return e.pendingSeekStep = 0, e.takePendingSeekStep = () => {
		let t = e.pendingSeekStep;
		return e.pendingSeekStep = 0, t || null;
	}, e.seekStep = (n) => {
		var r;
		if ((r = e.watchParty) != null && r.enabled && !e.canControlWatchParty()) return;
		Gt(t, n, { endEpsilon: .25 }), e.pendingSeekStep += n;
		let i = n < 0 ? "back" : "forward";
		l(i, o.add(i, Math.abs(n))), u(i), a.resetIdle();
	}, e.showSeekFeedback = (e, { by: t = null } = {}) => {
		let n = Math.round(Number(e) || 0);
		if (!n) return;
		let r = n < 0 ? "back" : "forward";
		l(r, o.add(r, Math.abs(n)), t), u(r);
	}, e.togglePlay = () => {
		var n;
		(n = e.watchParty) != null && n.enabled && !e.canControlWatchParty() || (t.paused ? t.play().catch(() => {}) : t.pause());
	}, n.playButtons.forEach((t) => r(t, "click", (t) => {
		t.stopPropagation(), e.togglePlay();
	})), n.seekButtons.forEach((t) => r(t, "click", (n) => {
		n.stopPropagation(), e.seekStep(Number(t.dataset.seek) || 0);
	})), [
		"play",
		"pause",
		"playing",
		"ended",
		"source-change"
	].forEach((e) => r(t, e, c)), c(), i.querySelectorAll(".vanta-player-topbar, .vanta-player-bottom-controls").forEach((e) => {
		r(e, "pointerenter", (e) => {
			e.pointerType === "mouse" && a.holdActive("hover");
		}), r(e, "pointerleave", () => a.releaseActive("hover"));
	}), e.disposers.push(() => {
		window.clearTimeout(s.back), window.clearTimeout(s.forward);
	}), e;
}
//#endregion
//#region src/player/src/player/shortcuts.js
var Lr = .05, Rr = 900, zr = 40, Br = 320, Vr = [
	{
		id: "toggle-play",
		keys: ["Leertaste", "K"],
		label: "Wiedergabe / Pause",
		transport: !0
	},
	{
		id: "seek-back",
		keys: ["←", "J"],
		label: "10 Sekunden zurück",
		transport: !0
	},
	{
		id: "seek-forward",
		keys: ["→", "L"],
		label: "10 Sekunden vor",
		transport: !0
	},
	{
		id: "volume-up",
		keys: ["↑"],
		label: "Lauter"
	},
	{
		id: "volume-down",
		keys: ["↓"],
		label: "Leiser"
	},
	{
		id: "mute",
		keys: ["M"],
		label: "Stumm an / aus"
	},
	{
		id: "fullscreen",
		keys: ["F"],
		label: "Vollbild"
	},
	{
		id: "subtitles",
		keys: ["C"],
		label: "Untertitel an / aus"
	},
	{
		id: "jump",
		keys: ["0 – 9"],
		label: "Zu 0 % – 90 % springen",
		transport: !0
	},
	{
		id: "help",
		keys: ["?"],
		label: "Diese Hilfe"
	},
	{
		id: "close",
		keys: ["Esc"],
		label: "Menü oder Hilfe schließen"
	}
], Hr = [
	{
		id: "click",
		input: "Klick aufs Bild",
		label: "Wiedergabe / Pause",
		transport: !0,
		pointer: "mouse"
	},
	{
		id: "dblclick",
		input: "Doppelklick aufs Bild",
		label: "Vollbild",
		pointer: "mouse"
	},
	{
		id: "wheel-volume",
		input: "Mausrad am Lautsprecher",
		label: "Lautstärke",
		pointer: "mouse"
	},
	{
		id: "wheel-timeline",
		input: "Mausrad an der Zeitleiste",
		label: "± 10 Sekunden",
		transport: !0,
		pointer: "mouse"
	},
	{
		id: "tap",
		input: "Tippen aufs Bild",
		label: "Steuerung ein- / ausblenden",
		pointer: "touch"
	},
	{
		id: "double-tap",
		input: "Doppeltippen links / rechts",
		label: "± 10 s, weiteres Tippen spult weiter",
		transport: !0,
		pointer: "touch"
	}
];
function Ur(e) {
	if (e.ctrlKey || e.metaKey || e.altKey) return null;
	let t = e.key;
	return t === " " || t === "Spacebar" || t === "k" || t === "K" ? "toggle-play" : t === "ArrowLeft" || t === "j" || t === "J" ? "seek-back" : t === "ArrowRight" || t === "l" || t === "L" ? "seek-forward" : t === "ArrowUp" ? "volume-up" : t === "ArrowDown" ? "volume-down" : t === "m" || t === "M" ? "mute" : t === "f" || t === "F" ? "fullscreen" : t === "c" || t === "C" ? "subtitles" : t === "?" ? "help" : /^[0-9]$/.test(t) ? "jump" : null;
}
function Wr(e) {
	return !e || typeof e.closest != "function" ? !1 : !!e.closest("input, textarea, select, [contenteditable=\"true\"], [role=\"dialog\"]");
}
function Gr(e) {
	let { player: t, root: n, listen: r, ui: i, dom: a } = e, o = null, s = 0, c = 0, l = () => {
		var t;
		return !((t = e.watchParty) != null && t.enabled) || e.canControlWatchParty();
	}, u = () => {
		let e = a.volumeBubble;
		if (!e) return;
		let n = t.muted ? 0 : Math.round((Number(t.volume) || 0) * 100);
		e.style.setProperty("--level", String(n / 100)), e.querySelector(".vanta-player-volume-bubble-value").textContent = t.muted ? "Stumm" : `${n} %`, e.dataset.level = t.muted || n === 0 ? "mute" : n < 50 ? "low" : "high", e.classList.add("is-visible"), window.clearTimeout(o), o = window.setTimeout(() => e.classList.remove("is-visible"), Rr);
	};
	e.adjustVolume = (e) => {
		t.volume = Math.min(1, Math.max(0, Math.round(((Number(t.volume) || 0) + e) * 100) / 100)), e > 0 && t.muted && (t.muted = !1), u();
	}, e.toggleMute = () => {
		t.muted = !t.muted, u();
	};
	let d = (t) => {
		switch (t) {
			case "toggle-play": return e.togglePlay(), !0;
			case "seek-back": return e.seekStep(-10), !0;
			case "seek-forward": return e.seekStep(10), !0;
			case "volume-up": return e.adjustVolume(Lr), !0;
			case "volume-down": return e.adjustVolume(-.05), !0;
			case "mute": return e.toggleMute(), !0;
			case "fullscreen":
				var n;
				return (n = e.toggleFullscreen) == null || n.call(e), !0;
			case "subtitles":
				var r, i;
				return (r = e.toggleSubtitles || ((i = e.subtitleMenu) == null ? void 0 : i.toggle)) == null || r(), !0;
			case "help":
				var a;
				return (a = e.toggleHelp) == null || a.call(e), !0;
			default: return !1;
		}
	};
	r(document, "keydown", (n) => {
		if (n.defaultPrevented || e.destroyed || e.settingsOpen || e.helpOpen || e.stillWatchingOpen || Wr(n.target)) return;
		let r = Ur(n);
		if (!r) return;
		let a = Vr.find((e) => e.id === r);
		if (!(a != null && a.transport && !l())) {
			if (n.preventDefault(), r === "jump") {
				let e = Number(t.duration);
				Number.isFinite(e) && e > 0 && q(t, e * Number(n.key) / 10, { endEpsilon: .25 }), i.resetIdle();
				return;
			}
			d(r), r !== "help" && i.resetIdle();
		}
	});
	let f = n.querySelector(".vanta-player-volume");
	f && r(f, "wheel", (t) => {
		t.preventDefault(), s += t.deltaY, !(Math.abs(s) < zr && Math.abs(t.deltaY) < zr) && (e.adjustVolume(s > 0 ? -.05 : Lr), s = 0);
	}, { passive: !1 });
	let p = n.querySelector(".vanta-player-timeline-row");
	return p && r(p, "wheel", (t) => {
		if (!l() || Math.abs(t.deltaY) < 4) return;
		t.preventDefault();
		let n = performance.now();
		n - c < Br || (c = n, e.seekStep(t.deltaY > 0 ? 10 : -10));
	}, { passive: !1 }), e.disposers.push(() => window.clearTimeout(o)), e;
}
function Kr({ onClick: e, onDoubleClick: t, setTimer: n = (e, t) => window.setTimeout(e, t), clearTimer: r = (e) => window.clearTimeout(e) }) {
	let i = null;
	return {
		click() {
			return i === null ? (i = n(() => {
				i = null, e();
			}, 220), "pending") : (r(i), i = null, t(), "double");
		},
		destroy() {
			i !== null && r(i);
		}
	};
}
function qr(e, t) {
	return e < t / 3 ? "back" : e > t * 2 / 3 ? "forward" : null;
}
function Jr({ onSingle: e, onSeek: t, now: n = () => performance.now(), setTimer: r = (e, t) => window.setTimeout(e, t), clearTimer: i = (e) => window.clearTimeout(e) }) {
	let a = null, o = null, s = null;
	return {
		tap({ x: c, y: l, width: u }) {
			let d = n(), f = qr(c, u);
			return o && f === o.side && d - o.at <= 650 ? (o.at = d, t(f), "seek") : (o = null, a && d - a.at <= 300 && Math.hypot(c - a.x, l - a.y) <= 40 && f ? (i(s), s = null, a = null, o = {
				side: f,
				at: d
			}, t(f), "seek") : (a = {
				x: c,
				y: l,
				at: d
			}, i(s), s = r(() => {
				s = null, a = null, e();
			}, 300), "pending"));
		},
		destroy() {
			i(s);
		}
	};
}
function Yr(e) {
	let { root: t, listen: n, ui: r } = e, i = t.querySelector(".vanta-player-tap-layer");
	if (!i) return e;
	let a = Jr({
		onSeek: (t) => e.seekStep(t === "back" ? -10 : 10),
		onSingle: () => {
			r.getState() === "ready-playing-active" ? r.setState("ready-playing-idle") : r.resetIdle();
		}
	}), o = Kr({
		onClick: () => e.togglePlay(),
		onDoubleClick: () => {
			var t;
			return (t = e.toggleFullscreen) == null ? void 0 : t.call(e);
		}
	});
	return n(i, "pointerup", (e) => {
		if (e.button > 0) return;
		if (e.pointerType === "mouse") {
			o.click();
			return;
		}
		let t = i.getBoundingClientRect();
		a.tap({
			x: e.clientX - t.left,
			y: e.clientY - t.top,
			width: t.width
		});
	}), e.disposers.push(() => {
		a.destroy(), o.destroy();
	}), e;
}
Object.freeze({
	name: "PageLeft",
	message: "The page was left"
}), [
	"a[href]",
	"area[href]",
	"button:not([disabled])",
	"input:not([disabled]):not([type=\"hidden\"])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	"iframe",
	"audio[controls]",
	"video[controls]",
	"[contenteditable]:not([contenteditable=\"false\"])",
	"[tabindex]:not([tabindex=\"-1\"])"
].join(",");
//#endregion
//#region src/public/js/tv/focusEngine.js
function Xr(e, t, n) {
	let r, i;
	if (n === "left" || n === "right") {
		if (r = n === "right" ? t.left - e.right : e.left - t.right, i = Math.max(0, Math.max(e.top, t.top) - Math.min(e.bottom, t.bottom)), r < -Math.min(e.width, t.width) / 2) return Infinity;
	} else if (r = n === "down" ? t.top - e.bottom : e.top - t.bottom, i = Math.max(0, Math.max(e.left, t.left) - Math.min(e.right, t.right)), r < -Math.min(e.height, t.height) / 2) return Infinity;
	let a = n === "left" || n === "right" ? (e.top + e.bottom) / 2 : (e.left + e.right) / 2, o = n === "left" || n === "right" ? (t.top + t.bottom) / 2 : (t.left + t.right) / 2, s = i === 0 ? 0 : 1e3;
	return Math.max(0, r) + 2 * i + s + Math.abs(a - o) * .1;
}
//#endregion
//#region src/player/src/player/tvControls.js
function Zr(e) {
	return e >= 3e3 ? 60 : e >= 1e3 ? 30 : 10;
}
function Qr(e) {
	return Number.isFinite(e) && e > 0 ? Math.max(0, e - 1) : Infinity;
}
var $r = 700, ei = [
	".vanta-player-next-episode:not([hidden]) .vanta-player-next-episode-confirm:not([hidden])",
	".vanta-sleep-notice:not([hidden]) .vanta-sleep-notice-cancel",
	".vanta-player-skip-segment:not([hidden])"
], ti = ".vanta-player-controls-layer button:not([hidden]):not([disabled]), .vanta-player-controls-layer media-mute-button, .vanta-player-skip-segment:not([hidden])", ni = (e) => {
	if (!(e != null && e.isConnected) || e.closest("[hidden]")) return !1;
	let t = e.getBoundingClientRect();
	return t.width > 0 && t.height > 0;
};
function ri(e, { doc: t = document } = {}) {
	if (!e.tvMode) return null;
	let { root: n, player: r, ui: i, listen: a } = e;
	n.classList.add("is-tv");
	let o = () => {
		var t;
		return !((t = e.watchParty) != null && t.enabled) || e.canControlWatchParty();
	}, s = t.createElement("div");
	s.className = "vanta-tv-seek-preview", s.hidden = !0, (n.querySelector(".vanta-player-shell") || n).appendChild(s);
	let c = null, l = () => {
		if (!c) return;
		let { target: e, timer: t } = c;
		window.clearTimeout(t), c = null, s.hidden = !0, q(r, e, { endEpsilon: .25 }), i.resetIdle();
	}, u = (t) => {
		if (!o()) return;
		let n = Qr(Number(e.knownDuration || r.duration)), i = performance.now();
		(!c || c.direction !== t) && (l(), c = {
			direction: t,
			startedAt: i,
			target: Number(r.currentTime) || 0,
			timer: null
		});
		let a = Zr(i - c.startedAt) * (t === "right" ? 1 : -1);
		c.target = Math.min(n, Math.max(0, c.target + a)), s.textContent = `${t === "right" ? "»" : "«"} ${Kt(c.target)}`, s.dataset.direction = t, s.hidden = !1, window.clearTimeout(c.timer), c.timer = window.setTimeout(l, $r);
	}, d = () => i.getState() !== "ready-playing-idle", f = (e) => {
		e == null || e.focus({ preventScroll: !0 }), i.resetIdle();
	}, p = () => ei.map((e) => n.querySelector(e)).find((e) => e && ni(e)) || null, m = () => {
		i.getState() === "ready-playing-idle" && i.setState("ready-playing-active");
		let e = n.querySelector(".vanta-player-play");
		f(ni(e) ? e : n.querySelector(ti));
	}, h = (e, r = n) => {
		let i = [...r.querySelectorAll(r === n ? ti : "button:not([hidden]):not([disabled])")].filter(ni), a = t.activeElement && i.includes(t.activeElement) ? t.activeElement : null;
		if (!a) return f(i[0]), i[0] || null;
		let o = a.getBoundingClientRect(), s = null, c = Infinity;
		for (let t of i) {
			if (t === a) continue;
			let n = Xr(o, t.getBoundingClientRect(), e);
			n < c && (s = t, c = n);
		}
		return s && f(s), s;
	};
	return a(t, "keydown", (n) => {
		var a, s, c, l, g, _, v;
		if (e.destroyed || (a = e.isDeferredReadyRoom) != null && a.call(e)) return;
		let y = _r(n);
		if (!y) return;
		if (e.settingsOpen || e.helpOpen) {
			if (y === "back" && n.key !== "Escape") {
				var b, x;
				n.preventDefault(), e.settingsOpen ? (b = e.settings) == null || b.close() : (x = e.toggleHelp) == null || x.call(e);
			}
			return;
		}
		if (y === "back") return;
		let S = (s = t.activeElement) == null || (c = s.closest) == null ? void 0 : c.call(s, ".vanta-player-next-episode, .vanta-still-watching, .vanta-sleep-notice");
		if (S && [
			"up",
			"down",
			"left",
			"right"
		].includes(y)) {
			n.preventDefault(), n.stopPropagation(), !h(y, S) && !e.stillWatchingOpen && (y === "up" || y === "down") && m();
			return;
		}
		if (S && y === "ok") return;
		let C = () => {
			n.preventDefault(), n.stopPropagation();
		};
		switch (y) {
			case "playpause":
			case "play":
			case "pause":
				var w, T;
				if (C(), !o()) return;
				y === "play" ? (w = r.play) == null || w.call(r) : y === "pause" ? (T = r.pause) == null || T.call(r) : e.togglePlay(), i.resetIdle();
				return;
			case "stop":
				var E;
				C(), (E = e.onBack) == null || E.call(e);
				return;
			case "ff":
			case "rw":
				var D;
				C(), (D = e.seekStep) == null || D.call(e, y === "ff" ? 30 : -30);
				return;
			default:
		}
		let O = (l = t.activeElement) == null || (g = l.closest) == null ? void 0 : g.call(l, ".vanta-player-loading-problem-actions button");
		if (O) {
			if (y === "ok") return;
			if ([
				"up",
				"down",
				"left",
				"right"
			].includes(y)) {
				C();
				let e = [...O.parentElement.querySelectorAll("button")].filter(ni), t = y === "left" || y === "up" ? -1 : 1, n = e[e.indexOf(O) + t];
				n && n.focus({ preventScroll: !0 });
			}
			return;
		}
		if (!d()) {
			if (C(), y === "ok") o() ? e.togglePlay() : m();
			else if (y === "left" || y === "right") o() ? u(y) : m();
			else {
				let e = p();
				e && t.activeElement !== e ? f(e) : m();
			}
			return;
		}
		let k = (_ = t.activeElement) == null || (v = _.matches) == null ? void 0 : v.call(_, ti);
		if ([
			"up",
			"down",
			"left",
			"right"
		].includes(y)) {
			C(), k ? h(y) : m();
			return;
		}
		y === "ok" && !k && (C(), o() && e.togglePlay(), i.resetIdle());
	}, !0), a(t, "keyup", (e) => {
		let t = _r(e);
		c && (t === "left" || t === "right") && l();
	}, !0), e.disposers.push(() => {
		c && window.clearTimeout(c.timer), s.remove();
	}), {
		stepHold: u,
		commitHold: l
	};
}
//#endregion
//#region src/player/src/mediaSession.js
var ii = [
	"play",
	"pause",
	"seekbackward",
	"seekforward"
], ai = 1e3;
function oi(e, { session: t = (() => {
	var e;
	return (e = globalThis.navigator) == null ? void 0 : e.mediaSession;
})(), MediaMetadataClass: n = globalThis.MediaMetadata } = {}) {
	if (!t) return {
		refresh() {},
		destroy() {}
	};
	let { player: r, title: i, subtitle: a, poster: o } = e, s = 0, c = (e, n) => {
		try {
			t.setActionHandler(e, n);
		} catch {}
	};
	if (typeof n == "function") try {
		t.metadata = new n({
			title: i || "",
			artist: a || "",
			album: "VANTA",
			artwork: o ? [{
				src: o,
				sizes: "1280x720",
				type: "image/webp"
			}] : []
		});
	} catch {}
	let l = () => {
		var t;
		let n = !((t = e.watchParty) != null && t.enabled) || e.canControlWatchParty(), i = (t) => () => {
			var n;
			(n = e.noteActivity) == null || n.call(e), t();
		};
		c("play", n ? i(() => r.play().catch(() => {})) : null), c("pause", n ? i(() => r.pause()) : null), c("seekbackward", n ? i(() => e.seekStep(-10)) : null), c("seekforward", n ? i(() => e.seekStep(10)) : null);
	}, u = () => {
		t.playbackState = r.paused ? "paused" : "playing";
	};
	return e.listen(r, "play", u), e.listen(r, "pause", u), e.listen(r, "time-update", () => {
		let e = performance.now();
		if (e - s < ai || typeof t.setPositionState != "function") return;
		s = e;
		let n = Number(r.duration), i = Number(r.currentTime);
		if (!(!Number.isFinite(n) || n <= 0 || !Number.isFinite(i))) try {
			t.setPositionState({
				duration: n,
				position: Math.min(i, n),
				playbackRate: Number(r.playbackRate) || 1
			});
		} catch {}
	}), l(), {
		refresh: l,
		destroy() {
			ii.forEach((e) => c(e, null));
			try {
				t.metadata = null, t.playbackState = "none";
			} catch {}
		}
	};
}
//#endregion
//#region src/player/src/help.js
var si = [
	"Admins steuern Wiedergabe, Pause und Spulen für alle. Zuschauer sehen oben „Admin steuert“.",
	"Springt jemand 10 Sekunden, zeigen alle Bildschirme eine Blase mit dem Namen.",
	"Im Zahnrad-Menü siehst du, wer synchron ist, und kannst dich mit „Neu synchronisieren“ zurückholen.",
	"Am Ende einer Folge sehen alle dasselbe „Nächste Folge“-Fenster. Admins können abbrechen oder sofort starten; die nächste Folge beginnt bei allen gleichzeitig.",
	"Hängt jemand beim Laden, pausiert die Party, bis alle wieder bereit sind. Der Gastgeber kann das im Zahnrad-Menü abschalten.",
	"Lautstärke, Untertitel, Tonspur und Vollbild stellt jeder für sich ein."
];
function ci({ party: e = !1, viewer: t = !1 } = {}) {
	let n = (e) => t && e.transport ? "Nur Admins" : null, r = [
		{
			id: "keyboard",
			title: "Tastatur",
			rows: Vr.map((e) => ({
				keys: e.keys,
				label: e.label,
				tag: n(e)
			}))
		},
		{
			id: "mouse",
			title: "Maus",
			rows: Hr.filter((e) => e.pointer === "mouse").map((e) => ({
				input: e.input,
				label: e.label,
				tag: n(e)
			}))
		},
		{
			id: "touch",
			title: "Touch",
			rows: Hr.filter((e) => e.pointer === "touch").map((e) => ({
				input: e.input,
				label: e.label,
				tag: n(e)
			}))
		}
	];
	return e && r.push({
		id: "party",
		title: "Watch Party",
		notes: si
	}), r;
}
function li(e) {
	let t = (e.rows || []).map((e) => `
    <li class="vanta-help-row${e.tag ? " is-locked" : ""}">
      <span class="vanta-help-input">${e.keys ? e.keys.map((e) => `<kbd>${H(e)}</kbd>`).join("<span class=\"vanta-help-or\">oder</span>") : H(e.input)}</span>
      <span class="vanta-help-label">${H(e.label)}${e.tag ? `<em>${H(e.tag)}</em>` : ""}</span>
    </li>`).join(""), n = (e.notes || []).map((e) => `<li class="vanta-help-note">${H(e)}</li>`).join("");
	return `
    <section class="vanta-help-section" data-section="${e.id}">
      <h3>${H(e.title)}</h3>
      <ul>${t}${n}</ul>
    </section>`;
}
function ui(e) {
	let { root: t, ui: n, listen: r } = e, i = t.querySelector(".vanta-player-shell"), a = null, o = document.createElement("div");
	o.className = "vanta-help", o.setAttribute("role", "dialog"), o.setAttribute("aria-modal", "true"), o.setAttribute("aria-label", "Hilfe"), o.hidden = !0, i.appendChild(o);
	let s = () => {
		var t;
		let n = !!((t = e.watchParty) != null && t.enabled);
		o.innerHTML = `
      <div class="vanta-help-panel">
        <div class="vanta-help-head">
          <h2>Hilfe</h2>
          <button type="button" class="vanta-help-close" aria-label="Hilfe schließen">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 5.7 17 4.3l-5 5-5-5-1.4 1.4 5 5-5 5L7 17.1l5-5 5 5 1.4-1.4-5-5z"/></svg>
          </button>
        </div>
        <div class="vanta-help-grid">${ci({
			party: n,
			viewer: n && !e.canControlWatchParty()
		}).map(li).join("")}</div>
        <p class="vanta-help-foot">Mit <kbd>?</kbd> oder <kbd>Esc</kbd> schließen.</p>
      </div>`, o.querySelector(".vanta-help-close").addEventListener("click", () => l());
	};
	function c() {
		var r, i;
		e.helpOpen || ((r = e.settings) == null || r.close({ returnFocus: !1 }), s(), a = document.activeElement, e.helpOpen = !0, o.hidden = !1, t.classList.add("is-help-open"), (i = n.releaseActive) == null || i.call(n, "help"), o.offsetWidth, o.classList.add("is-open"), o.querySelector(".vanta-help-close").focus({ preventScroll: !0 }));
	}
	function l() {
		e.helpOpen && (e.helpOpen = !1, o.classList.remove("is-open"), t.classList.remove("is-help-open"), o.hidden = !0, a && typeof a.focus == "function" && a.isConnected && a.focus({ preventScroll: !0 }));
	}
	return e.toggleHelp = () => e.helpOpen ? l() : c(), e.openHelp = c, r(o, "click", (e) => {
		e.target.closest(".vanta-help-panel") || l();
	}), r(o, "pointerup", (e) => e.stopPropagation()), r(document, "keydown", (t) => {
		e.helpOpen && (t.key === "Escape" || t.key === "?") && (t.preventDefault(), t.stopPropagation(), l());
	}, !0), {
		open: c,
		close: l,
		destroy() {
			l(), o.remove();
		}
	};
}
//#endregion
//#region src/player/src/stillWatching.js
var di = 1e3;
function fi({ limitMs: e, initialMs: t = 0 }) {
	let n = Math.max(0, Number(t) || 0);
	return {
		add(t) {
			return n += t, e > 0 && n >= e;
		},
		reset() {
			n = 0;
		},
		value: () => n
	};
}
function pi(e, { setTimer: t = (e, t) => window.setInterval(e, t), clearTimer: n = (e) => window.clearInterval(e) } = {}) {
	var r;
	let { root: i, player: a, listen: o } = e, s = e.stillWatching || {}, c = Number(s.afterMs) || 0;
	if (e.noteActivity = () => {}, (r = e.watchParty) != null && r.enabled || c <= 0) return null;
	let l = fi({
		limitMs: c,
		initialMs: s.initialIdleMs
	}), u = () => {
		var e;
		return (e = s.onIdleChange) == null ? void 0 : e.call(s, l.value());
	}, d = document.createElement("div");
	d.className = "vanta-still-watching", d.setAttribute("role", "alertdialog"), d.setAttribute("aria-modal", "true"), d.setAttribute("aria-labelledby", "vanta-still-watching-title"), d.hidden = !0, d.innerHTML = "\n    <div class=\"vanta-still-watching-panel\">\n      <h2 id=\"vanta-still-watching-title\">Schaust du noch?</h2>\n      <p>Die Wiedergabe ist pausiert, weil länger nichts bedient wurde.</p>\n      <div class=\"vanta-still-watching-actions\">\n        <button type=\"button\" class=\"vanta-still-watching-no\">Nein</button>\n        <button type=\"button\" class=\"vanta-still-watching-yes\">Ja, weiter</button>\n      </div>\n    </div>", (i.querySelector(".vanta-player-shell") || i).appendChild(d);
	let f = d.querySelector(".vanta-still-watching-yes"), p = d.querySelector(".vanta-still-watching-no"), m = () => {
		e.stillWatchingOpen || (l.reset(), u());
	};
	e.noteActivity = m;
	let h = () => {
		var t, n;
		e.stillWatchingOpen = !0, (t = e.settings) == null || (n = t.close) == null || n.call(t, { returnFocus: !1 }), a.pause(), d.hidden = !1, i.classList.add("is-still-watching"), f.focus({ preventScroll: !0 });
	}, g = () => {
		e.stillWatchingOpen = !1, d.hidden = !0, i.classList.remove("is-still-watching"), l.reset(), u();
	};
	f.addEventListener("click", () => {
		g(), Promise.resolve(a.play()).catch(() => {});
	}), p.addEventListener("click", () => {
		var t;
		g(), (t = e.onBack) == null || t.call(e);
	}), o(a, "play", () => {
		e.stillWatchingOpen && g();
	});
	for (let e of [
		"pointerdown",
		"mousemove",
		"wheel"
	]) o(i, e, m, { passive: !0 });
	o(document, "keydown", m, !0), o(document, "keydown", (t) => {
		!e.stillWatchingOpen || !e.tvMode || _r(t) !== "back" || (t.preventDefault(), t.stopPropagation(), p.click());
	}, !0), o(d, "keydown", (e) => {
		if (e.stopPropagation(), e.key !== "Tab") return;
		e.preventDefault();
		let t = [p, f];
		t[(t.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1) + t.length) % t.length].focus({ preventScroll: !0 });
	}), o(document, "focusin", (t) => {
		e.stillWatchingOpen && !d.contains(t.target) && f.focus({ preventScroll: !0 });
	});
	let _ = t(() => {
		e.destroyed || e.stillWatchingOpen || a.paused || (l.add(di) && h(), u());
	}, di);
	return e.disposers.push(() => n(_)), {
		open: h,
		close: g,
		counter: l,
		dialog: d
	};
}
//#endregion
//#region src/player/src/airplay.js
function mi(e, { win: t = window } = {}) {
	var n;
	let { player: r, dom: i, listen: a } = e, o = i.airplayButton;
	if (!o) return null;
	if ((n = e.watchParty) != null && n.enabled || t.WebKitPlaybackTargetAvailabilityEvent === void 0) return o.hidden = !0, null;
	let s = null, c = !1, l = () => !String((s == null ? void 0 : s.currentSrc) || (s == null ? void 0 : s.getAttribute("src")) || "").startsWith("blob:"), u = () => {
		o.hidden = !(c && l());
	}, d = (e) => {
		c = e.availability === "available", u();
	}, f = () => {
		let e = r.querySelector("video");
		!e || e === s || (s == null || s.removeEventListener("webkitplaybacktargetavailabilitychanged", d), s = e, s.setAttribute("x-webkit-airplay", "allow"), s.addEventListener("webkitplaybacktargetavailabilitychanged", d));
	};
	a(o, "click", (e) => {
		var t;
		e.stopPropagation(), f(), s == null || (t = s.webkitShowPlaybackTargetPicker) == null || t.call(s);
	});
	let p = () => {
		f(), u();
	};
	return a(r, "source-change", p), a(r, "can-play", p), a(r, "loaded-metadata", p), f(), e.disposers.push(() => s == null ? void 0 : s.removeEventListener("webkitplaybacktargetavailabilitychanged", d)), {
		attach: f,
		refresh: u
	};
}
//#endregion
//#region src/player/src/player/lifecycle.js
function hi(e, t) {
	!(t != null && t.playSessionId) || typeof e.reportPlayback != "function" || Promise.resolve(e.reportPlayback("cancel", {
		itemId: e.itemId,
		playSessionId: t.playSessionId,
		positionTicks: 0
	}, { keepalive: !0 })).catch(() => {});
}
async function gi(e) {
	let { watchParty: t, resumePosition: n } = e, r = !1, i = null;
	async function a({ position: a = n } = {}) {
		if (r) return;
		if (i) return i;
		let o = !!(t != null && t.enabled);
		o && e.beginOwnerEchoSuppression(), i = (async () => {
			let n = !(t != null && t.enabled);
			e.setLoading(!0, "Wiedergabequelle wird beim Server angefragt …");
			let i = await e.resolvePlayback("auto");
			e.destroyed ? hi(e, i) : (await e.sourceSwitch.loadPlayback(i, {
				position: a,
				shouldPlay: n,
				isBoot: !0
			}), e.updateMenus(i, { preserveSubtitleSelection: !1 }), r = !0);
		})();
		try {
			await i;
		} catch (t) {
			if (i = null, !e.destroyed && e.handleFatalPlaybackError(t)) throw o && e.endOwnerEchoSuppression(), t;
			if (!e.destroyed) {
				var s;
				if (((s = e.sourceSwitch.getCurrentPlayback()) == null ? void 0 : s.delivery) !== "hls" && (await e.switchToHls(t, { silent: e.isDeferredReadyRoom() }), !e.destroyed && e.sourceSwitch.getCurrentPlayback())) {
					r = !0, o && e.endOwnerEchoSuppression();
					return;
				}
				e.isDeferredReadyRoom() || e.showError(t.message);
			}
			throw o && e.endOwnerEchoSuppression(), t;
		}
		return o && e.endOwnerEchoSuppression(), i;
	}
	if (e.prepareInitialPlayback = a, e.deferInitialLoad) e.setLoading(!1);
	else try {
		await a({ position: n });
	} catch {}
	return e;
}
function _i(e) {
	let { player: t, watchParty: n, isPhone: r, root: i } = e;
	return {
		player: t,
		prepareInitialPlayback: e.prepareInitialPlayback,
		updateWatchPartyAccess: (t) => {
			var r, i;
			n != null && n.enabled && (Object.assign(n, t || {}), e.refreshWatchPartyControlAccess(), (r = e.settings) == null || r.refresh(), (i = e.nextEpisodePrompt) == null || i.setControls(!!n.canControl, "Startet automatisch. Abbrechen oder sofort starten können nur Admins."));
		},
		cancelNextEpisode: () => {
			var t;
			return (t = e.cancelNextEpisode) == null ? void 0 : t.call(e);
		},
		getSyncState: e.getSyncState,
		getBufferedAhead: e.getBufferedAhead,
		getLoadProgress: e.getLoadProgress,
		setSyncRate: e.setSyncRate,
		syncSeek: e.syncSeek,
		syncPlay: e.syncPlay,
		syncPause: e.syncPause,
		unlockPlayback: e.unlockPlayback,
		showSeekFeedback: e.showSeekFeedback,
		destroy: () => {
			var n, a, o, s, c;
			if (e.destroyed) return Promise.resolve();
			e.destroyed = !0, e.sourceSwitch.clearSeekTimer(), e.echoTokens.clear();
			let l = e.reporter.stop({ keepalive: !0 }), u = xe().catch(() => {});
			return ve(i), e.reporter.destroy(), e.subtitleMenu.destroy(), (n = e.settings) == null || n.destroy(), (a = e.mediaSession) == null || a.destroy(), (o = e.help) == null || o.destroy(), (s = e.nextEpisodePrompt) == null || s.destroy(), e.ui.destroy(), e.disposers.splice(0).forEach((e) => e()), (c = t.destroy) == null || c.call(t), i.innerHTML = "", Promise.all([
				r ? $e().catch(() => {}) : Promise.resolve(),
				u,
				l == null ? void 0 : l.catch(() => {})
			]).catch(() => {});
		}
	};
}
//#endregion
//#region src/player/src/index.js
async function vi(e) {
	let t = await Je(e);
	Ke(t), et(t), Pt(t), vt(t), an(t), ar(t), wr(t), Dr(t), Ir(t), Yr(t), ri(t), Gr(t), t.mediaSession = oi(t), t.help = ui(t), $n(t, { loadSegments: t.loadSegments }), jr(t), Mr(t), pi(t), mi(t);
	let n = gi(t), r = _i(t), { signal: i } = e, a = null, o = new Promise((e) => {
		a = () => {
			r.destroy(), e();
		};
	});
	i != null && i.aborted ? a() : i == null || i.addEventListener("abort", a, { once: !0 });
	try {
		await Promise.race([n, o]);
	} finally {
		i == null || i.removeEventListener("abort", a);
	}
	return r;
}
//#endregion
export { vi as mountVantaPlayer };
