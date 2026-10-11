import { $ as e, E as t, H as n, K as r, O as i, X as a, Y as o, d as s, i as c, j as l, w as u } from "./std-EJr84HPl.js";
import { $ as d, A as f, C as p, D as m, E as h, H as g, N as _, O as v, P as y, Q as b, S as x, T as S, U as C, V as w, W as T, X as E, a as D, at as O, c as k, ct as A, g as j, i as M, it as N, j as P, k as ee, l as te, lt as F, n as I, o as ne, ot as re, p as ie, r as ae, s as oe, st as L, t as se, tt as ce, u as le, w as ue, x as de, z as fe } from "./media-ui-BvPw5eNe.js";
//#region node_modules/vidstack/dist/prod/player.js
var pe = class {
	_e = !1;
	$e = c();
	Ze = /* @__PURE__ */ new Map();
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
		this.Ze.get(e)?.(), this.Ze.delete(e);
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
}, me = Object.defineProperty, he = Object.getOwnPropertyDescriptor, R = (e, t, n, r) => {
	for (var i = r > 1 ? void 0 : r ? he(t, n) : t, a = e.length - 1, o; a >= 0; a--) (o = e[a]) && (i = (r ? o(t, n, i) : o(i)) || i);
	return r && i && me(t, n, i), i;
}, z = class extends O {
	static el = re({
		tagName: "media-player",
		props: d,
		store: ee
	});
	j;
	u;
	r;
	s = new pe();
	get q() {
		return this.j.$provider();
	}
	constructor(e) {
		super(e), this.w(), new f(e);
		let t = {
			player: null,
			scope: a(),
			qualities: new C(),
			audioTracks: new ie(),
			$provider: o(null),
			$props: this.$props,
			$store: this.$store
		};
		t.remote = new S(void 0), t.$iosControls = r(this.x.bind(this)), t.textTracks = new w(), t.textTracks[y] = this.$props.crossorigin, t.textRenderers = new fe(t), t.ariaKeys = {}, this.j = t, n(b, t), this.orientation = new _(e), new I(e), new x(e, t), new g(e);
		let i = new h();
		this.u = new v(e, i, t), this.r = new m(e, this.u, i, t), t.delegate = new ue(this.u.N.bind(this.u), t), new p(e, this.startLoading.bind(this));
	}
	onAttach(e) {
		e.setAttribute("tabindex", "0"), ce(e, "role", "region"), l(this.y.bind(this)), l(this.z.bind(this)), l(this.A.bind(this)), l(this.B.bind(this)), l(this.C.bind(this)), l(this.D.bind(this)), l(this.E.bind(this)), l(this.F.bind(this)), l(this.G.bind(this)), this.H(), this.I(), this.j.player = e, this.j.remote.setTarget(e), this.j.remote.setPlayer(e), u(e, "find-media-player", this.J.bind(this));
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
		for (let t of Object.keys(this.$props)) this.$store[e[t] ?? t]?.set(this.$props[t]());
		l(this.K.bind(this)), this.$store.muted.set(this.$props.muted() || this.$props.volume() === 0);
	}
	y() {
		let { title: e } = this.$props, { live: n, viewType: r } = this.$store, a = n(), o = i(r()), s = o === "Unknown" ? a ? "Live" : "Media" : `${a ? "Live " : ""}${o}`, c = e();
		c && (this.el?.setAttribute("data-title", c), this.el?.removeAttribute("title"));
		let l = this.el?.getAttribute("data-title") || "";
		this.$store.title.set(l), t(this.el, "aria-label", l ? `${s} - ${l}` : s + " Player");
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
		for (let n of de) {
			let r = "data-" + (t[n] ?? s(n));
			e[r] = this.$store[n];
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
	orientation;
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
		return this.q?.paused ?? !0;
	}
	set paused(e) {
		e ? this.s.t("paused", () => this.r.L()) : this.s.t("paused", () => this.r.M());
	}
	C() {
		this.paused = this.$props.paused();
	}
	get muted() {
		return this.q?.muted ?? !1;
	}
	set muted(e) {
		this.s.t("muted", () => this.q.muted = e);
	}
	B() {
		this.muted = this.$props.muted();
	}
	get currentTime() {
		return this.q?.currentTime ?? 0;
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
		return this.q?.volume ?? 1;
	}
	set volume(e) {
		this.s.t("volume", () => this.q.volume = e);
	}
	D() {
		this.volume = le(0, this.$props.volume(), 1);
	}
	get playsinline() {
		return this.q?.playsinline ?? !1;
	}
	set playsinline(e) {
		this.s.t("playsinline", () => this.q.playsinline = e);
	}
	F() {
		this.playsinline = this.$props.playsinline();
	}
	get playbackRate() {
		return this.q?.playbackRate ?? 1;
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
R([A], z.prototype, "provider", 1), R([A], z.prototype, "user", 1), R([A], z.prototype, "orientation", 2), R([A], z.prototype, "qualities", 1), R([A], z.prototype, "audioTracks", 1), R([A], z.prototype, "textTracks", 1), R([A], z.prototype, "textRenderers", 1), R([A], z.prototype, "paused", 1), R([A], z.prototype, "muted", 1), R([A], z.prototype, "currentTime", 1), R([A], z.prototype, "volume", 1), R([A], z.prototype, "playsinline", 1), R([A], z.prototype, "playbackRate", 1), R([L], z.prototype, "play", 1), R([L], z.prototype, "pause", 1), R([L], z.prototype, "enterFullscreen", 1), R([L], z.prototype, "exitFullscreen", 1), R([L], z.prototype, "enterPictureInPicture", 1), R([L], z.prototype, "exitPictureInPicture", 1), R([L], z.prototype, "seekToLiveEdge", 1), R([L], z.prototype, "startLoading", 1), F(z), F(P), F(P), F(k), F(ne), F(oe), F(M), F(te), F(ae), F(D), F(se);
//#endregion
//#region src/player/src/platform.js
function ge() {
	let e = navigator.userAgent || "", t = navigator.platform || "";
	return /iPad|iPhone|iPod/i.test(e) || t === "MacIntel" && navigator.maxTouchPoints > 1;
}
function _e(e = document) {
	e.querySelectorAll?.("video").forEach((e) => {
		e.setAttribute("playsinline", ""), e.setAttribute("webkit-playsinline", ""), e.playsInline = !0, e.webkitPlaysInline = !0;
	});
}
function ve(e) {
	e?.classList?.add("is-ios-inline-fullscreen"), e?.setAttribute?.("data-inline-fullscreen", "true");
}
function ye(e) {
	e?.classList?.remove("is-ios-inline-fullscreen"), e?.removeAttribute?.("data-inline-fullscreen");
}
function be(e) {
	return !!e?.classList?.contains("is-ios-inline-fullscreen");
}
function xe() {
	return document.pictureInPictureEnabled === !0 || !!document.createElement("video").webkitSupportsPresentationMode;
}
async function B() {
	document.pictureInPictureElement && document.exitPictureInPicture && await document.exitPictureInPicture();
	let e = document.querySelector("video");
	e?.webkitPresentationMode === "picture-in-picture" && e.webkitSetPresentationMode && e.webkitSetPresentationMode("inline");
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
		i &&= (window.clearTimeout(i), null);
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
	if (!t?.enabled) return;
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
function V(e) {
	return String(e ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
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
function H(e, t) {
	let n = Le[e];
	return n ? `<svg viewBox="0 0 24 24" aria-hidden="true"${t ? ` slot="${t}"` : ""}>${n}</svg>` : "";
}
function U(e, t) {
	let n = e < 0, r = n ? "10 Sekunden zurück" : "10 Sekunden vor";
	return `
    <button class="vanta-player-seek vanta-player-seek-${n ? "back" : "forward"} is-${t}" type="button"
      data-seek="${n ? -10 : 10}" aria-label="${r}" title="${r}">
      <span class="vanta-player-seek-icon">${H(n ? "replay" : "forward")}</span>
      <span class="vanta-player-seek-label" aria-hidden="true">10s</span>
    </button>`;
}
function Re(e) {
	return `
    <button class="vanta-player-play is-${e}" type="button" aria-label="Wiedergabe" data-state="paused">
      <span class="vanta-player-play-icon is-play">${H("play")}</span>
      <span class="vanta-player-play-icon is-pause">${H("pause")}</span>
    </button>`;
}
function ze(e, { title: t, subtitle: n, poster: r }) {
	let i = t ? V(t) : "", a = n ? V(n) : "";
	e.innerHTML = `
    <div class="vanta-player-shell">
      <media-player class="vanta-media-player" aria-label="Videoplayer">
        <media-outlet></media-outlet>
        <media-captions class="vanta-player-captions"></media-captions>

        <div class="vanta-player-tap-layer" aria-hidden="true"></div>

        <div class="vanta-player-volume-bubble" aria-hidden="true">
          <span class="vanta-player-volume-bubble-icon">
            ${H("volumeMute")}${H("volumeLow")}${H("volumeHigh")}
          </span>
          <span class="vanta-player-volume-bubble-bar"><i></i></span>
          <span class="vanta-player-volume-bubble-value"></span>
        </div>
        <button class="vanta-player-skip-segment" type="button" hidden>
          <span class="vanta-player-skip-segment-label">Intro überspringen</span>
          ${H("skipNext")}
        </button>
        <div class="vanta-player-seek-bubble is-back" aria-hidden="true"></div>
        <div class="vanta-player-seek-bubble is-forward" aria-hidden="true"></div>

        <div class="vanta-player-controls-layer">
          <div class="vanta-player-topbar">
            <button class="vanta-player-back" type="button" aria-label="Zurück">
              ${H("arrowBack")}
              <span>Zurück</span>
            </button>
            <div class="vanta-player-heading">
              <div class="vanta-player-title">${i}</div>
              <div class="vanta-player-subtitle"${a ? "" : " hidden"}>${a}</div>
            </div>
            <div class="vanta-player-topbar-end">
              <div class="vanta-player-party-pill" hidden>
                ${H("lock")}
                <span>Admin steuert</span>
              </div>
            </div>
          </div>

          <div class="vanta-player-center-controls vanta-player-transport">
            ${U(-1, "large")}
            ${Re("large")}
            ${U(1, "large")}
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
                  ${U(-1, "small")}
                  ${Re("small")}
                  ${U(1, "small")}
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
                    ${H("volumeMute", "volume-muted")}
                    ${H("volumeLow", "volume-low")}
                    ${H("volumeHigh", "volume-high")}
                  </media-mute-button>
                  <div class="vanta-player-volume-reveal">
                    <media-volume-slider class="vanta-player-volume-slider" aria-label="Lautstärke"></media-volume-slider>
                  </div>
                </div>
                <button class="vanta-player-settings-button" type="button" aria-label="Einstellungen" aria-haspopup="dialog" aria-expanded="false" hidden>
                  ${H("settings")}
                </button>
                <media-pip-button class="vanta-player-pip-button" aria-label="Bild-in-Bild">
                  ${H("pipEnter", "enter")}
                  ${H("pipExit", "exit")}
                </media-pip-button>
                <button class="vanta-player-fullscreen-button" type="button" aria-label="Vollbild">
                  ${H("fullscreenEnter")}
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
		volumeBubble: e.querySelector(".vanta-player-volume-bubble"),
		backButton: e.querySelector(".vanta-player-back"),
		loading: e.querySelector(".vanta-player-loading"),
		loadingStatus: e.querySelector(".vanta-player-loading-status"),
		inlineLoading: e.querySelector(".vanta-player-inline-loading"),
		inlineLabel: e.querySelector(".vanta-player-inline-label"),
		loadingProgress: e.querySelector(".vanta-player-loading-progress"),
		loadingProgressBar: e.querySelector(".vanta-player-loading-bar"),
		loadingProgressText: e.querySelector(".vanta-player-loading-progress-text")
	};
}
//#endregion
//#region src/player/src/player/context.js
function Be(e) {
	return e?.code === "STREAM_LIMIT_REACHED" || e?.status === 429;
}
async function Ve(e) {
	let { root: t, itemId: n, title: r, subtitle: i = "", poster: a, resumePosition: o = 0, resolvePlayback: s, reportPlayback: c, onBack: l, watchParty: u = null, episodeBrowser: d = null, preferences: f = null, loadSegments: p = null, onPlaybackError: m = null, loadTranscodeProgress: h = null, deferInitialLoad: g = !1, fullscreenTarget: _ = null } = e;
	await customElements.whenDefined("media-player");
	let v = ge(), y = ze(t, {
		title: r,
		subtitle: i,
		poster: a
	}), { player: b } = y;
	u?.enabled && (b.autoplay = !1);
	let x = {
		root: t,
		itemId: n,
		title: r,
		subtitle: i,
		poster: a,
		resumePosition: o,
		resolvePlayback: (e, t = {}) => s(e, {
			...x.streamSelection(),
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
		iosLike: v,
		dom: y,
		player: b,
		disposers: [],
		ui: De(t),
		destroyed: !1,
		fallbackAttempted: !1,
		knownDuration: 0,
		ownerEchoSuppressionDepth: 0,
		echoTokens: Me()
	};
	return x.handleFatalPlaybackError = (e) => !Be(e) || typeof x.onPlaybackError != "function" ? !1 : (x.onPlaybackError(e), !0), x.streamSelection = () => {
		let e = {}, t = x.audioMenu?.getCurrentIndex?.(), n = x.sourceSwitch?.getCurrentPlayback?.();
		Number.isInteger(t) && n ? (e.audioStreamIndex = t, n.mediaSourceId && (e.mediaSourceId = n.mediaSourceId)) : x.preferences?.get().audioLanguage && (e.audioLanguage = x.preferences.get().audioLanguage);
		let r = x.qualityMenu?.getCurrentId?.();
		return r && r !== "auto" && (e.qualityProfile = r), e;
	}, x.listen = (e, t, n, r) => {
		e.addEventListener(t, n, r), x.disposers.push(() => e.removeEventListener(t, n, r));
	}, x.beginOwnerEchoSuppression = () => {
		x.ownerEchoSuppressionDepth += 1;
	}, x.endOwnerEchoSuppression = (e = 250) => {
		window.setTimeout(() => {
			x.ownerEchoSuppressionDepth = Math.max(0, x.ownerEchoSuppressionDepth - 1);
		}, e);
	}, x.watchPartyPhase = () => u?.phase || (u?.enabled ? "playback" : null), x.isDeferredReadyRoom = () => x.watchPartyPhase() === "ready-room", x.canControlWatchParty = () => u?.enabled ? !!u.canControl : !0, x.canEmitOwnerControl = (e) => e && x.echoTokens.consume(e) ? !1 : !!u?.enabled && x.canControlWatchParty() && x.watchPartyPhase() === "playback" && x.ownerEchoSuppressionDepth === 0, x.refreshWatchPartyControlAccess = () => {
		u?.enabled && (Ae({
			root: t,
			watchParty: u
		}), x.mediaSession?.refresh(), x.refreshSegmentButton?.());
	}, u?.enabled && (u.onParticipantsChange = x.refreshWatchPartyControlAccess), x.refreshWatchPartyControlAccess(), x.syncInlinePlayback = () => {
		v && _e(t);
	}, v && (t.classList.add("is-ios", "supports-ios-inline-fullscreen"), x.syncInlinePlayback()), xe() || t.classList.add("no-pip"), x;
}
//#endregion
//#region src/player/src/orientation.js
function He() {
	let e = navigator.userAgent || "", t = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(e), n = /iPad|Tablet|PlayBook|Silk/i.test(e) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1, r = navigator.maxTouchPoints > 0, i = Math.min(window.screen?.width || 0, window.screen?.height || 0) < 768;
	return t && !n && r && i;
}
async function Ue() {
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
async function We() {
	return screen.orientation?.lock ? (await screen.orientation.lock("landscape"), !0) : !1;
}
async function W() {
	return screen.orientation?.unlock ? (await screen.orientation.unlock(), !0) : !1;
}
async function Ge() {
	await W(), await Ue();
}
//#endregion
//#region src/player/src/player/fullscreenControls.js
function Ke(e) {
	let { root: t, iosLike: n } = e, r = t.querySelector(".vanta-player-shell"), i = t.querySelector(".vanta-player-fullscreen-button"), a = () => e.fullscreenTarget?.() || r, o = () => {
		if (!i) return;
		let e = n ? be(t) : Se();
		i.setAttribute("aria-label", e ? "Vollbild beenden" : "Vollbild"), i.innerHTML = H(e ? "fullscreenExit" : "fullscreenEnter");
	};
	if (e.toggleFullscreen = async () => {
		try {
			n ? (be(t) ? ye(t) : ve(t), o()) : Se() ? (e.isPhone && await W().catch(() => {}), await we()) : (await Ce(a()), e.isPhone && await We().catch(() => {}));
		} catch {}
	}, i) {
		let t = () => {
			e.toggleFullscreen();
		};
		i.addEventListener("click", t), e.disposers.push(() => i.removeEventListener("click", t));
	}
	let s = () => {
		o(), e.isPhone && !Se() && W().catch(() => {});
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
var qe = 2, Je = 3, Ye = 100, Xe = .5, Ze = .05;
function Qe({ element: e, bufferedAhead: t = 0, anchorTime: n = 0 }) {
	if (!e) return !0;
	if (e.seeking) return !1;
	if (e.paused) return e.readyState >= qe;
	let r = Number.isFinite(e.duration) && e.currentTime >= e.duration - Xe, i = t >= 1 || r, a = e.currentTime > n + Ze;
	return e.readyState >= Je && i && a;
}
function $e({ getVideo: e, getBufferedAhead: t, isSwitching: n = () => !1, setVisible: r, setSlow: i = () => {} }) {
	let a = null, o = 0, s = 0, c = !1, l = () => {
		a !== null && window.clearInterval(a), a = null, c && i(!1), c = !1;
	}, u = () => {
		if (a === null) return;
		if (n()) {
			l();
			return;
		}
		let u = e();
		if ((u?.seeking || u?.paused) && (s = Number(u.currentTime) || 0), Qe({
			element: u,
			bufferedAhead: Number(t?.()) || 0,
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
			s = Number(t?.currentTime) || 0, a === null && (o = performance.now(), a = window.setInterval(u, Ye)), r(!0);
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
var et = 1e7;
function tt(e) {
	return Math.max(0, Math.round((Number(e) || 0) * et));
}
function nt(e, t, n = 0) {
	let r = Math.max(0, Number(e) || 0);
	if (!Number.isFinite(t) || t <= 0) return r;
	let i = Math.max(0, t - Math.max(0, Number(n) || 0));
	return Math.min(r, i);
}
//#endregion
//#region src/player/src/jellyfinReporter.js
var rt = 1e4, it = 3, at = 50, ot = (e) => Number.isInteger(e) && e >= 0 ? e : null;
function st({ player: e, itemId: t, report: n }) {
	let r = null, i = !1, a = !1, o = !1, s = null, c = 0, l = -1, u = 0, d = !1, f = !1, p = null, m = [], h = (e, t, n, r) => {
		e.addEventListener(t, n, r), m.push(() => e.removeEventListener(t, n, r));
	}, g = () => {
		let t = Number(e.currentTime);
		return Number.isFinite(t) && t >= 0 && (c = t), c;
	}, _ = (n = g()) => ({
		itemId: t,
		mediaSourceId: r?.mediaSourceId || null,
		playSessionId: r?.playSessionId || null,
		positionTicks: tt(n),
		isPaused: !!e.paused,
		isMuted: !!e.muted,
		volumeLevel: Math.round((Number(e.volume) || 0) * 100),
		playbackRate: Number(e.playbackRate) || 1,
		playMethod: r?.playMethod || (r?.isTranscoded ? "Transcode" : "DirectPlay"),
		canSeek: !0,
		audioStreamIndex: r?.audioStreamIndex ?? null,
		subtitleStreamIndex: p
	}), v = (e) => e === l ? !1 : e < l ? e > 0 || l === 0 : !0, y = async (e, t = {}) => {
		if (!r?.playSessionId || a && e !== "start" && e !== "ended") return;
		let i = _(t.position);
		if (e === "progress" && !v(i.positionTicks)) return;
		let o = async () => {
			try {
				await n(e, i, t), l = i.positionTicks, u = 0;
			} catch (t) {
				if (u < it) return u += 1, await new Promise((e) => setTimeout(e, at)), o();
				console.warn(`[Player Reporting] ${e} failed after 4 attempts:`, t), u = 0;
			}
		};
		return o();
	}, b = () => {
		s &&= (clearInterval(s), null);
	}, x = () => {
		b(), s = setInterval(() => {
			!e.paused && !o && y("progress");
		}, rt);
	}, S = async () => {
		!r || o || (i ? await y("progress") : (a = !1, i = !0, await y("start")), x());
	}, C = async () => {
		!r || o || !i || await y("progress");
	}, w = async () => {
		o = !0, b(), i && !a && await y("progress");
	}, T = () => {
		o = !1, a = !1;
	}, E = (e) => {
		r = e, p = ot(e?.subtitleStreamIndex), a = !1, o = !1, i = !1;
	}, D = (e) => {
		p = ot(e);
	}, O = async ({ ended: e = !1, keepalive: t = !1 } = {}) => {
		d || !r || !i || a || f || (d = !0, b(), await y(e ? "ended" : "stopped", { keepalive: t }), a = !0, d = !1);
	}, k = () => {
		let t = Number(e.currentTime);
		Number.isFinite(t) && t >= 0 && (c = t);
	}, A = () => {
		document.hidden && i && !a && y("progress");
	}, j = (e) => {
		if (f || !i || a) return;
		f = !0, b();
		let t = e.persisted !== !1;
		n("stopped", _(g()), { keepalive: t }).catch(() => {});
	}, M = () => O({ ended: !0 });
	return e.addEventListener("time-update", k), e.addEventListener("playing", S), e.addEventListener("pause", C), e.addEventListener("seeked", C), e.addEventListener("ended", M), h(document, "visibilitychange", A), h(window, "pagehide", j, { capture: !0 }), {
		setPlayback: E,
		setSubtitleStreamIndex: D,
		beforeSourceSwitch: w,
		afterSourceSwitch: T,
		stop: O,
		getPosition: g,
		progress: C,
		destroy: () => {
			b(), f = !0, e.removeEventListener("time-update", k), e.removeEventListener("playing", S), e.removeEventListener("pause", C), e.removeEventListener("seeked", C), e.removeEventListener("ended", M), m.splice(0).forEach((e) => e());
		}
	};
}
//#endregion
//#region src/player/src/player/reporterAndOrientation.js
function ct(e) {
	let { player: t, reportPlayback: n, itemId: r, dom: i } = e;
	return e.reporter = st({
		player: t,
		itemId: r,
		report: n
	}), e.isPhone = He(), e.setLoading = (t, n) => {
		n && (i.loadingStatus.textContent = n), i.loading.classList.toggle("is-hidden", !t), e.loadIndicator?.setCoverVisible(t);
	}, e.setLoadingStatus = (e) => {
		e && (i.loadingStatus.textContent = e);
	}, e.setInlineLoading = (t) => {
		t && !i.loading.classList.contains("is-hidden") || (i.inlineLoading.hidden = !t, e.loadIndicator?.setInlineVisible(t));
	}, e.inlineLoading = $e({
		getVideo: () => e.player.querySelector?.("video") || null,
		getBufferedAhead: () => e.getBufferedAhead?.(),
		isSwitching: () => e.sourceSwitch?.isSwitching() === !0,
		setVisible: e.setInlineLoading,
		setSlow: (t) => e.loadIndicator?.setSlow(t)
	}), e.disposers.push(() => e.inlineLoading.end()), e.showError = () => {
		e.sourceSwitch.clearSeekTimer(), e.inlineLoading.end(), e.setInlineLoading(!1), e.ui.setState("buffering"), e.setLoading(!0, "Stream wird geladen …");
	}, e;
}
var lt = .95, ut = .35, dt = 600, ft = .5, G = (e) => Math.min(1, Math.max(0, e));
function pt(e, t) {
	let n = e?.stats, r = Number(e?.duration);
	if (!n || !(n.total > 0) || !(r > 0)) return 0;
	let i = Number(e.start) + r;
	return Number.isFinite(i) && i <= t ? 0 : r * G(n.loaded / n.total);
}
function mt(e, t, n = 6) {
	let r = Math.floor(t / n) * n;
	return Number.isFinite(e) ? e >= r - 1 ? e : r + e : null;
}
function ht({ bufferedAhead: e = 0, fragment: t = null, position: n = 0, duration: r = NaN, target: i = 4, transcode: a = null, segmentSeconds: o = 6, elapsedMs: s = 0, expectedMs: c = null }) {
	let l = pt(t, n), u = Math.max(0, e) + l, d = Number.isFinite(r) && r > 0 && n + u >= r - ft, f = e > 0 || Number(t?.stats?.loaded) > 0;
	if (d || u >= i) return {
		fraction: 1,
		loadedSeconds: u,
		phase: "done",
		etaSeconds: null,
		approx: !1
	};
	if (f) return {
		fraction: G(u / i),
		loadedSeconds: u,
		phase: "loading",
		etaSeconds: null,
		approx: !1
	};
	let p = mt(Number(a?.positionSeconds), n, o);
	if (p !== null) {
		let e = Math.floor(n / o) * o, t = e + o, r = Number(a.speed);
		return {
			fraction: G((p - e) / o),
			loadedSeconds: 0,
			phase: "transcoding",
			etaSeconds: r > 0 ? Math.max(1, Math.ceil((t - p) / r)) : null,
			approx: !1
		};
	}
	if (c > 0) {
		let e = s >= c;
		return {
			fraction: Math.min(lt, s / c),
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
function gt({ now: e = () => performance.now(), target: t = 4 } = {}) {
	let n = null, r = null, i = e();
	return {
		reset() {
			n = null, r = null, i = e();
		},
		elapsedMs: () => e() - i,
		update(a) {
			let o = e(), s = ht({
				target: t,
				elapsedMs: o - i,
				...a
			});
			if (s.phase !== "loading") return n = null, r = null, s;
			if (n && o > n.at) {
				let e = s.loadedSeconds - n.loadedSeconds;
				if (e >= 0) {
					let t = e / ((o - n.at) / 1e3);
					r = r === null ? t : r + ut * (t - r);
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
			let c = t - s.loadedSeconds, l = r > 0 && o - n.since >= dt && c > 0 ? Math.max(1, Math.ceil(c / r)) : null;
			return {
				...s,
				etaSeconds: l
			};
		}
	};
}
function _t({ fraction: e, etaSeconds: t, phase: n, approx: r, overdue: i }) {
	let a = `${Math.round(G(e) * 100)} %`, o = t ? ` · noch ca. ${t} s` : "";
	return n === "transcoding" ? `Jellyfin transkodiert … ${a}${o}` : n === "preparing" ? i ? "Server bereitet Stream vor … dauert länger als üblich" : !r || e <= 0 ? "Server bereitet Stream vor …" : `Server bereitet Stream vor … ca. ${a}${o}` : `${a}${o}`;
}
var vt = "vanta.player.firstByteMs", yt = .3;
function bt(e = () => window.localStorage) {
	let t = () => {
		try {
			let t = Number(e()?.getItem(vt));
			return t > 0 ? t : null;
		} catch {
			return null;
		}
	};
	return {
		expectedMs: () => t() ?? 8e3,
		record(n) {
			if (!(n >= 200) || n > 3e5) return;
			let r = t(), i = r === null ? n : r + yt * (n - r);
			try {
				e()?.setItem(vt, String(Math.round(i)));
			} catch {}
		}
	};
}
//#endregion
//#region src/player/src/player/loadIndicator.js
var xt = 250, St = 1e3;
function Ct(e, { history: t = bt() } = {}) {
	let { dom: n, player: r, listen: i } = e, a = gt(), o = null, s = 6, c = null, l = !1, u = !1, d = !1, f = !1, p = null, m = null, h = -Infinity, g = !1, _ = !1;
	i(r, "hls-frag-loading", (e) => {
		if (f) return;
		let t = e.detail?.frag;
		t && (!t.type || t.type === "main") && (o = t);
	});
	let v = (e) => {
		(!e.detail?.frag || e.detail.frag === o) && (o = null);
	};
	i(r, "hls-frag-loaded", v), i(r, "hls-frag-load-emergency-aborted", v), i(r, "hls-level-loaded", (e) => {
		let t = Number(e.detail?.details?.targetduration);
		t > 0 && (s = t);
	}), i(r, "source-change", () => {
		o = null, f = !1, p = null;
	});
	let y = () => {
		if (typeof e.loadTranscodeProgress != "function" || m || e.sourceSwitch?.getCurrentPlayback?.()?.isTranscoded === !1) return;
		let t = performance.now();
		t - h < St || (h = t, m = Promise.resolve(e.loadTranscodeProgress()).then((e) => {
			p = e?.available ? {
				positionSeconds: Number(e.transcodedMs) / 1e3,
				speed: e.speed
			} : null;
		}).catch(() => {
			p = null;
		}).finally(() => {
			m = null;
		}));
	}, b = (n) => ({
		bufferedAhead: f ? 0 : Number(e.getBufferedAhead?.(n)) || 0,
		fragment: o,
		position: n,
		duration: Number(r.duration),
		transcode: p,
		segmentSeconds: s,
		expectedMs: t.expectedMs()
	}), x = () => {
		let e = a.update(b(Number(r.currentTime) || 0));
		e.phase === "preparing" || e.phase === "transcoding" ? (_ = !0, y()) : _ && !g && (g = !0, t.record(a.elapsedMs()));
		let i = e.phase === "done" ? "" : _t(e), o = e.phase === "loading" || e.phase === "transcoding" || e.approx && e.fraction > 0;
		if (n.loadingProgress && (n.loadingProgress.hidden = !u || !i, n.loadingProgressText.textContent = i, n.loadingProgressBar.style.transform = `scaleX(${o ? e.fraction : 0})`, n.loadingProgress.classList.toggle("is-preparing", !o), n.loadingProgress.classList.toggle("is-estimate", !!e.approx)), n.inlineLabel) {
			let t = e.phase === "done" ? "" : i, r = l ? ["Lädt länger als üblich …", e.phase === "loading" ? t : ""].filter(Boolean).join(" · ") : t;
			n.inlineLabel.textContent = r, n.inlineLabel.hidden = !d || !r;
		}
	}, S = () => {
		let e = u || d;
		e && c === null ? (a.reset(), p = null, h = -Infinity, g = !1, _ = !1, c = window.setInterval(x, xt), x()) : !e && c !== null && (window.clearInterval(c), c = null, l = !1, x());
	};
	e.loadIndicator = {
		setCoverVisible(t) {
			let n = !!t;
			n && !u && e.sourceSwitch?.getCurrentPlayback?.() && (f = !0), n || (f = !1), u = n, S();
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
		tracker: gt(),
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
function wt(e, t, n, r = []) {
	return new Promise((i, a) => {
		let o, s = [], c = () => {
			window.clearTimeout(o), s.forEach((e) => e());
		}, l = (e) => {
			c(), i(e);
		};
		e.addEventListener(t, l, { once: !0 }), s.push(() => e.removeEventListener(t, l)), r.forEach((n) => {
			let r = (e) => {
				c();
				let n = e.detail?.message || `Playback failed while waiting for ${t}`;
				a(Error(n));
			};
			e.addEventListener(n, r, { once: !0 }), s.push(() => e.removeEventListener(n, r));
		}), Number.isFinite(n) && (o = window.setTimeout(() => {
			c(), a(/* @__PURE__ */ Error(`Playback timed out while waiting for ${t}`));
		}, n));
	});
}
//#endregion
//#region src/player/src/sourceSwitch/state.js
function Tt({ player: e, reporter: t, ui: n, callbacks: { setLoading: r, setLoadingStatus: i, setInlineLoading: a, showError: o }, onBeforeSourceChange: s }) {
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
function Et(e) {
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
var Dt = 3e4, Ot = 21e4;
function kt(e, t) {
	return new Promise((n) => {
		let r = e.querySelector("video");
		if (!r) {
			n(!1);
			return;
		}
		let i = !1, a = null, o = null, s = window.setTimeout(() => u(!1), t), c = Number(r.currentTime) || 0, l = () => {
			!r.paused && Number(r.currentTime) > c + .05 && u(!0);
		};
		r.addEventListener?.("timeupdate", l);
		function u(t) {
			i || (i = !0, window.clearTimeout(s), r.removeEventListener?.("timeupdate", l), a !== null && r.cancelVideoFrameCallback && r.cancelVideoFrameCallback(a), o && e.removeEventListener("time-update", o), n(t));
		}
		if (r.requestVideoFrameCallback) {
			a = r.requestVideoFrameCallback(() => u(!0));
			return;
		}
		o = () => {
			window.requestAnimationFrame(() => window.requestAnimationFrame(() => u(!0)));
		}, e.addEventListener("time-update", o, { once: !0 });
	});
}
async function At(e, { shouldPlay: t }) {
	let { player: n, setLoading: r, setLoadingStatus: i, setInlineLoading: a } = e;
	if (!t) {
		n.paused = !0;
		return;
	}
	try {
		i("Wiedergabe wird gestartet …"), await n.play();
		let t = n.querySelector("video");
		t?.paused && await t.play(), e.autoplayBlocked = !1;
		let r = e.currentPlayback?.delivery === "hls";
		if (i(r ? "Erstes HLS-Segment wird transkodiert und geladen …" : "Erster Videoframe wird dargestellt …"), !await kt(n, r ? Ot : Dt)) throw Error(r ? "Das erste HLS-Segment konnte nicht rechtzeitig geladen werden." : "Der erste Videoframe konnte nicht rechtzeitig geladen werden.");
	} catch (t) {
		if (t?.name === "NotAllowedError") e.autoplayBlocked = !0, r(!1), a(!1);
		else throw t;
	}
}
function K(e) {
	e.switching || e.ui.setState(e.player.paused ? "ready-paused" : "ready-playing-active");
}
//#endregion
//#region src/player/src/seek.js
var jt = .25;
function Mt(e) {
	if (!e?.seekable?.length) return null;
	try {
		return Number(e.seekable.end(e.seekable.length - 1)) || null;
	} catch {
		return null;
	}
}
function q(e, t, n = jt) {
	let r = Number(t?.duration);
	if (!Number.isFinite(r) || r <= 0) {
		let e = Mt(t);
		Number.isFinite(e) && e > 0 && (r = e);
	}
	return Number.isFinite(r) && r > 0 ? nt(e, r, n) : Math.max(0, Number(e) || 0);
}
function J(e, t, n = {}) {
	let r = q(t, e, n.endEpsilon);
	return Number.isFinite(r) && (e.currentTime = r), r;
}
function Nt(e, t, n = {}) {
	return J(e, (Number(e?.currentTime) || 0) + t, n);
}
//#endregion
//#region src/public/js/shared/time.js
function Pt(e) {
	let t = Math.max(0, Math.floor(Number(e) || 0)), n = Math.floor(t / 3600), r = Math.floor(t % 3600 / 60), i = String(t % 60).padStart(2, "0");
	return n > 0 ? `${n}:${String(r).padStart(2, "0")}:${i}` : `${r}:${i}`;
}
//#endregion
//#region src/player/src/sourceSwitch/seekRestore.js
var Ft = 6e3;
function It(e, t) {
	return new Promise((n) => {
		let r = () => [e.querySelector?.("video"), e].filter(Boolean), i = () => r().some((e) => Number.isFinite(e.duration) && e.duration > 0), a = () => r().some((e) => e.seekable?.length > 0 && Number.isFinite(e.seekable.end(0)));
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
function Y(e) {
	e.seekTimer &&= (window.clearTimeout(e.seekTimer), null);
}
function Lt(e) {
	Y(e), e.seekTimer = window.setTimeout(() => {
		e.seekTimer = null, e.switching || e.setInlineLoading(!1);
	}, Ft);
}
async function Rt(e, t, { version: n } = {}) {
	let { player: r } = e, i = q(t, r, jt);
	e.lastRequestedPosition = i;
	let a = ++e.seekVersion;
	if (e.switching && i > 0 && e.setLoadingStatus(`Wiedergabeposition ${Pt(i)} wird wiederhergestellt …`), Math.abs(Number(r.currentTime) - i) < .35) {
		e.switching || (e.setInlineLoading(!1), K(e));
		return;
	}
	e.switching || (e.ui.setState("seeking"), e.setInlineLoading(!0)), Lt(e);
	let o = wt(r, "seeked", Ft);
	r.currentTime = i;
	try {
		await o;
	} catch {} finally {
		if (a !== e.seekVersion || (Y(e), n !== void 0 && !e.isCurrentLoad(n))) return;
		e.switching || (e.setInlineLoading(!1), K(e));
	}
}
//#endregion
//#region src/player/src/sourceSwitch/rollback.js
function zt(e) {
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
var Bt = (e) => ({
	src: e.url,
	type: e.delivery === "hls" ? "application/vnd.apple.mpegurl" : "video/mp4"
});
function Vt(e) {
	let t = Tt(e), n = (e, { success: n = !1 } = {}) => {
		t.isCurrentLoad(e) && (t.switching = !1, n && (t.setLoading(!1), K(t)));
	}, r = async (e, r = {}) => {
		let i = ++t.loadVersion, a = t.captureState(), o = {
			...a,
			position: Math.max(0, Number(r.position) ?? a.position),
			shouldPlay: r.shouldPlay !== !1,
			label: r.label || "Video wird geladen …"
		};
		if (t.switching = !0, Y(t), t.setLoading(!0, o.label), t.setInlineLoading(!1), t.ui.setState(r.isBoot ? "booting" : "switching-source"), t.currentPlayback && await t.reporter.beforeSourceSwitch(), t.isCurrentLoad(i)) {
			t.reporter.afterSourceSwitch(), t.currentPlayback = e, t.lastRequestedPosition = o.position, t.reporter.setPlayback(e), t.setLoadingStatus(e.delivery === "hls" ? "HLS-Stream wird verbunden …" : "Direkter Videostream wird verbunden …"), t.onBeforeSourceChange?.(), t.player.src = Bt(e);
			try {
				if (await wt(t.player, "can-play", void 0, ["error"]), !t.isCurrentLoad(i) || (t.setLoadingStatus("Medienquelle ist bereit. Laufzeit wird geprüft …"), t.restoreState(o), await It(t.player, 3e3), !t.isCurrentLoad(i)) || (await Rt(t, o.position, { version: i }), !t.isCurrentLoad(i)) || (await At(t, { shouldPlay: o.shouldPlay }), !t.isCurrentLoad(i))) return;
				n(i, { success: !0 });
			} catch (e) {
				throw n(i, { success: !1 }), e;
			}
		}
	};
	return t.loadPlayback = r, {
		loadPlayback: r,
		switchTo: zt(t),
		startCurrentPlayback: async ({ quiet: e = !1 } = {}) => {
			if (!t.currentPlayback) {
				await t.player.play();
				return;
			}
			let n = t.loadVersion;
			t.switching = !0, Y(t), e || (t.setLoading(!0, "Wiedergabe wird gestartet …"), t.ui.setState("booting")), t.setInlineLoading(!1);
			try {
				if (await At(t, { shouldPlay: !0 }), !t.isCurrentLoad(n)) return;
				t.switching = !1, t.autoplayBlocked || (t.setLoading(!1), K(t));
			} catch (e) {
				throw t.isCurrentLoad(n) && (t.switching = !1, t.setLoading(!1)), e;
			}
		},
		performSeek: (e, n) => Rt(t, e, n),
		captureState: t.captureState,
		restoreState: t.restoreState,
		syncPlayingState: () => K(t),
		...Et(t),
		clearSeekTimer: () => Y(t),
		startSeekTimer: () => Lt(t)
	};
}
//#endregion
//#region src/player/src/player/sourceSwitchIntegration.js
function Ht(e) {
	let { root: t, iosLike: n, player: r, reporter: i, ui: a, isPhone: o } = e;
	return e.sourceSwitch = Vt({
		player: r,
		reporter: i,
		ui: a,
		callbacks: {
			setLoading: e.setLoading,
			setLoadingStatus: e.setLoadingStatus,
			setInlineLoading: (t) => {
				!t && e.inlineLoading?.isActive() ? e.inlineLoading.check() : e.setInlineLoading(t);
			},
			showError: e.showError
		},
		onBeforeSourceChange: () => {
			B().catch(() => {});
		}
	}), o && (t.classList.add("is-smartphone"), n && (ve(t), e.updateFullscreenIcon())), e;
}
//#endregion
//#region src/player/src/quality.js
function Ut(e) {
	return e ? e >= 1e6 ? `${(e / 1e6).toFixed(0)} Mbit/s` : e >= 1e3 ? `${(e / 1e3).toFixed(0)} kbit/s` : `${e} bit/s` : "";
}
function Wt(e) {
	if (e.id === "auto") return "Auto";
	if (e.id === "direct") return "Direct Play";
	let t = Ut(e.maxStreamingBitrate);
	return t ? `${e.label} (${t})` : e.label;
}
function Gt(e) {
	let t = new Map([
		["auto", 0],
		["direct", 1],
		["1080p", 2],
		["720p", 3],
		["480p", 4],
		["360p", 5]
	]);
	return [...e].sort((e, n) => (t.get(e.id) ?? 99) - (t.get(n.id) ?? 99));
}
function Kt({ onSelect: e }) {
	let t = "auto", n = [];
	return {
		update(e, r) {
			n = Gt(e || []), t = r || "auto";
		},
		select(n) {
			!n || n === t || e(n);
		},
		getOptions: () => n.map((e) => ({
			id: e.id,
			label: Wt(e),
			selected: e.id === t
		})),
		getCurrentId: () => t,
		getCurrentLabel: () => {
			let e = n.find((e) => e.id === t);
			return e ? Wt(e) : "Auto";
		},
		hasChoices: () => n.length > 1
	};
}
//#endregion
//#region src/player/src/subtitles.js
var X = "off", qt = "Keine Untertitel verfügbar";
function Z(e) {
	return String(e || "").trim();
}
function Jt(e) {
	if (!e) return "Aus";
	let t = e.label || e.language || `Untertitel ${e.index}`;
	return e.isForced ? `${t} · Forced` : t;
}
function Yt(e) {
	return [...e || []].sort((e, t) => e.isForced === t.isForced ? e.isDefault === t.isDefault ? Number(e.index) - Number(t.index) : e.isDefault ? -1 : 1 : e.isForced ? -1 : 1);
}
function Xt(e, t) {
	let n = Z(t).toLowerCase();
	if (!n) return null;
	let r = (e || []).filter((e) => Z(e.language).toLowerCase() === n);
	return r.find((e) => !e.isForced) || r[0] || null;
}
function Q(e) {
	return `vanta-subtitle-${e.index}`;
}
function Zt(e) {
	return e?.length ? [{
		id: X,
		label: "Aus",
		disabled: !1
	}, ...e.map((e) => ({
		id: Q(e),
		label: Jt(e),
		disabled: !1
	}))] : [{
		id: null,
		label: qt,
		disabled: !0,
		selected: !1
	}];
}
function Qt({ player: e, reporter: t, onChange: n = () => {} }) {
	let r = X, i = null, a = [], o = /* @__PURE__ */ new Set(), s = (t) => e.textTracks?.getById?.(t) || null, c = (e, t) => {
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
			let n = Q(t);
			o.add(n), e.textTracks?.add?.({
				id: n,
				src: t.url,
				type: t.type,
				kind: "subtitles",
				label: Jt(t),
				language: Z(t.language),
				default: !1
			}), c(s(n), "disabled");
		});
	}, d = (e) => {
		let l = a.find((t) => Q(t) === e);
		r = l ? e : X, l && (i = r), o.forEach((e) => {
			c(s(e), e === r ? "showing" : "disabled");
		}), t.setSubtitleStreamIndex(l ? l.index : null), n();
	};
	return {
		update: (e, { preserveSelection: t = !0, preferredLanguage: n = null } = {}) => {
			let i = Yt(e?.subtitles || []), o = r;
			if (a = i, u(a), t && o !== X && a.some((e) => Q(e) === o)) {
				d(o);
				return;
			}
			let s = Xt(a, n);
			d(s ? Q(s) : X);
		},
		select: d,
		toggle: () => {
			if (!a.length) return;
			if (r !== X) {
				d(X);
				return;
			}
			let e = Q(a[0]);
			d(a.some((e) => Q(e) === i) ? i : e);
		},
		getOptions: () => Zt(a).map((e) => ({
			...e,
			selected: e.id === r
		})),
		getCurrentLabel: () => {
			if (!a.length) return "Keine";
			let e = a.find((e) => Q(e) === r);
			return e ? Jt(e) : "Aus";
		},
		getCurrentId: () => r,
		getCurrentLanguage: () => {
			let e = a.find((e) => Q(e) === r);
			return e && Z(e.language) || null;
		},
		destroy: l
	};
}
//#endregion
//#region src/player/src/audio.js
function $t({ onSelect: e }) {
	let t = [], n = null;
	return {
		update(e, r) {
			t = Array.isArray(e) ? e : [], n = Number.isInteger(r) ? r : t.find((e) => e.isDefault)?.index ?? null;
		},
		select(t) {
			!Number.isInteger(t) || t === n || e(t);
		},
		getOptions: () => t.map((e) => ({
			id: e.index,
			label: e.label,
			selected: e.index === n
		})),
		getCurrentLabel: () => t.find((e) => e.index === n)?.label || "Standard",
		getCurrentIndex: () => n,
		getCurrentLanguage: () => t.find((e) => e.index === n)?.language || null,
		hasChoices: () => t.length > 1
	};
}
//#endregion
//#region src/public/js/shared/episodeCode.js
function en(e, t) {
	let n = (e) => String(e || 1).padStart(2, "0");
	return `S${n(e)}E${n(t)}`;
}
function tn(e) {
	return en(e?.ParentIndexNumber, e?.IndexNumber);
}
//#endregion
//#region src/player/src/episodes.js
function nn(e, t) {
	for (let n of Object.values(e?.episodesBySeason || {})) {
		let e = n.find((e) => e.Id === t);
		if (e) return e;
	}
	return null;
}
function rn(e, t) {
	for (let [n, r] of Object.entries(e?.episodesBySeason || {})) if (r.some((e) => e.Id === t)) return n;
	return e?.seasons?.[0]?.Id || null;
}
//#endregion
//#region src/player/src/settings/flyout.js
var an = 180, on = 280, sn = 70, cn = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z\"/></svg>", ln = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M8.6 5.4 10 4l8 8-8 8-1.4-1.4 6.6-6.6z\"/></svg>";
function un() {
	try {
		return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === !0;
	} catch {
		return !1;
	}
}
function dn({ container: e, button: t, onOpenChange: n = () => {} }) {
	let r = /* @__PURE__ */ new Map(), i = [], a = () => [], o = null, s = "closed", c = null, l = null, u = null, d = document.createElement("div");
	d.className = "vanta-settings", d.setAttribute("role", "dialog"), d.setAttribute("aria-label", "Einstellungen"), d.dataset.state = "closed", d.hidden = !0;
	let f = document.createElement("div");
	f.className = "vanta-settings-viewport", d.appendChild(f), e.appendChild(d);
	let p = () => [...l?.querySelectorAll(".vanta-settings-focusable:not([disabled])") || []], m = (e) => {
		let t = document.createElement("div");
		t.className = "vanta-settings-title", t.textContent = "Einstellungen", e.appendChild(t);
		let n = o?.();
		n && e.appendChild(n);
		let r = document.createElement("div");
		r.className = "vanta-settings-list", a().filter((e) => !e.hidden).forEach((e) => {
			let t = document.createElement("button");
			t.type = "button", t.className = "vanta-settings-row vanta-settings-focusable", t.dataset.page = e.page || e.id, t.disabled = !!e.disabled, t.innerHTML = `
        <span class="vanta-settings-row-icon" aria-hidden="true">${e.icon || ""}</span>
        <span class="vanta-settings-row-label">${V(e.label)}</span>
        <span class="vanta-settings-row-value">${V(e.value)}</span>
        <span class="vanta-settings-row-chevron">${ln}</span>`, t.setAttribute("aria-label", e.value ? `${e.label}: ${e.value}` : e.label), t.addEventListener("click", () => {
				e.onSelect ? (T({ returnFocus: !1 }), e.onSelect()) : x(e.page);
			}), r.appendChild(t);
		}), e.appendChild(r);
	}, h = (e, t) => {
		let n = r.get(t), i = document.createElement("div");
		i.className = "vanta-settings-page-head";
		let a = document.createElement("button");
		a.type = "button", a.className = "vanta-settings-back vanta-settings-focusable", a.setAttribute("aria-label", "Zurück"), a.innerHTML = cn, a.addEventListener("click", () => S());
		let o = document.createElement("div");
		o.className = "vanta-settings-title", o.textContent = n.title, i.append(a, o), e.appendChild(i);
		let s = document.createElement("div");
		s.className = "vanta-settings-body", e.appendChild(s), n.render(s, {
			close: T,
			back: S,
			refresh: C
		});
	}, g = (e) => {
		let t = document.createElement("section");
		return t.className = "vanta-settings-page", t.dataset.page = e, e === "root" ? m(t) : h(t, e), d.classList.toggle("is-wide", !!r.get(e)?.wide), t;
	}, _ = () => {
		let [e] = p();
		(l?.querySelector(".vanta-settings-focusable[aria-checked=\"true\"], .vanta-settings-focusable.is-current") || e)?.focus({ preventScroll: !0 });
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
		let i = typeof r.animate == "function" && !un();
		if (!n || t === "none" || !i) {
			f.replaceChildren(r), f.style.height = "", _();
			return;
		}
		f.style.height = `${n.offsetHeight}px`, n.classList.add("is-leaving"), f.appendChild(r), f.style.height = `${r.offsetHeight}px`;
		let a = t === "back", o = {
			duration: on,
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
		if (s !== "open" || !i.length) return;
		let e = document.activeElement?.closest?.(".vanta-settings-row")?.dataset.page, t = g(i[i.length - 1]);
		f.replaceChildren(t), l = t, e && l.querySelector(`.vanta-settings-row[data-page="${e}"]`)?.focus({ preventScroll: !0 });
	}
	function w() {
		s !== "open" && (window.clearTimeout(c), i.splice(0, i.length, "root"), l = null, b("root", "none"), d.hidden = !1, s = "open", d.offsetWidth, d.dataset.state = "open", t.setAttribute("aria-expanded", "true"), n(!0), _());
	}
	function T({ returnFocus: e = !0 } = {}) {
		s === "open" && (s = "closing", d.dataset.state = "closing", t.setAttribute("aria-expanded", "false"), n(!1), e && d.contains(document.activeElement) && t.focus({ preventScroll: !0 }), c = window.setTimeout(() => {
			y(), s = "closed", d.dataset.state = "closed", d.hidden = !0, f.replaceChildren(), l = null;
		}, un() ? 0 : an));
	}
	let E = () => s === "open" ? T() : w(), D = (e) => {
		e.stopPropagation(), E();
	}, O = (e) => {
		if (s !== "open") return;
		let t = p(), n = t.indexOf(document.activeElement);
		if (e.key === "Escape") {
			e.preventDefault(), e.stopPropagation(), i.length > 1 ? S() : T();
			return;
		}
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			if (e.preventDefault(), e.stopPropagation(), !t.length) return;
			t[(n + (e.key === "ArrowDown" ? 1 : -1) + t.length) % t.length].focus();
			return;
		}
		if ((e.key === "ArrowLeft" || e.key === "Backspace") && i.length > 1) {
			e.preventDefault(), e.stopPropagation(), S();
			return;
		}
		if (e.key === "ArrowRight" && document.activeElement?.classList.contains("vanta-settings-row")) {
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
		u = null, d.style.removeProperty("--swipe"), t > sn && T();
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
var fn = {
	sync: "Synchron",
	correcting: "Gleicht an …",
	buffering: "Puffert …",
	paused: "Pausiert",
	blocked: "Wiedergabe blockiert"
};
function pn(e, t = null) {
	return e === "sync" && Number.isFinite(Number(t)) && t !== null ? `Synchron · ±${Math.abs(Math.round(Number(t)))} ms` : fn[e] || null;
}
//#endregion
//#region src/public/js/shared/members.js
function mn(e = "") {
	let t = 0;
	for (let n of String(e)) t = t * 31 + n.charCodeAt(0) >>> 0;
	return Math.round(t * 137.508 % 360);
}
function hn(e) {
	return String(e || "?").trim().charAt(0).toUpperCase() || "?";
}
//#endregion
//#region src/player/src/partyStatus.js
function gn(e) {
	if (!e?.connected) return {
		key: "offline",
		label: "Offline"
	};
	let t = pn(e.playbackState, e.driftMs);
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
function _n(e) {
	let t = document.createElement("div");
	t.className = "vanta-settings-party", t.innerHTML = "\n    <div class=\"vanta-settings-party-head\">\n      <span class=\"vanta-settings-party-title\">Watch Party</span>\n      <span class=\"vanta-settings-party-avatars\"></span>\n    </div>\n    <div class=\"vanta-settings-sync\">\n      <span class=\"vanta-settings-sync-dot\" aria-hidden=\"true\"></span>\n      <span class=\"vanta-settings-sync-label\" role=\"status\"></span>\n    </div>";
	let n = t.querySelector(".vanta-settings-party-avatars"), r = t.querySelector(".vanta-settings-sync"), i = document.createElement("div");
	i.className = "vanta-settings-toggle-row";
	let a = document.createElement("span");
	a.className = "vanta-settings-toggle-text", a.innerHTML = "<strong>Auf Puffernde warten</strong><small></small>", i.appendChild(a);
	let o = document.createElement("button");
	if (o.type = "button", o.className = "vanta-settings-switch vanta-settings-focusable", o.setAttribute("role", "switch"), o.setAttribute("aria-label", "Auf Puffernde warten"), o.innerHTML = "<span></span>", o.addEventListener("click", () => {
		let t = o.getAttribute("aria-checked") !== "true";
		o.setAttribute("aria-checked", t ? "true" : "false"), e.onSetWaitForBuffering?.(t);
	}), i.appendChild(o), t.appendChild(i), e.onResync) {
		let t = document.createElement("button");
		t.type = "button", t.className = "vanta-settings-sync-button vanta-settings-focusable", t.textContent = "Neu synchronisieren", t.addEventListener("click", () => e.onResync()), r.appendChild(t);
	}
	let s = () => {
		let t = e.waitForBuffering !== !1;
		o.hidden = !e.isHost, o.setAttribute("aria-checked", t ? "true" : "false"), a.querySelector("small").textContent = e.isHost ? "Pausiert für alle, wenn jemand hängt." : `${t ? "An" : "Aus"} · nur der Gastgeber kann das ändern.`;
		let i = e.getSyncStatus?.() || {
			kind: "preparing",
			label: "Wird vorbereitet"
		};
		r.dataset.status = i.kind, r.querySelector(".vanta-settings-sync-label").textContent = i.label, n.innerHTML = (e.participants || []).map((e) => {
			let t = gn(e), n = e.username || "Unbekannt";
			return `<span class="vanta-settings-party-avatar" data-state="${t.key}" style="--member-hue:${mn(e.userId)}"
        title="${V(`${n} · ${t.label}`)}" aria-label="${V(`${n}: ${t.label}`)}">${V(hn(e.username))}</span>`;
		}).join("");
	};
	return s(), {
		element: t,
		update: s
	};
}
//#endregion
//#region src/player/src/watchPartyParticipants.js
function vn(e) {
	return e === "owner" ? "Gastgeber" : e === "admin" ? "Admin" : "";
}
function yn({ viewerRole: e, member: t, currentUserId: n }) {
	return ["owner", "admin"].includes(e) && t.userId !== n && t.role === "viewer";
}
function bn({ viewerRole: e, member: t, currentUserId: n }) {
	return e === "owner" && t.userId !== n && t.role === "admin";
}
function xn({ viewerRole: e, member: t, currentUserId: n }) {
	return !(!["owner", "admin"].includes(e) || t.userId === n || t.role === "owner" || t.role === "admin" && e !== "owner");
}
//#endregion
//#region src/player/src/settings/pages.js
var Sn = "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z\"/></svg>";
function Cn(e, { options: t, onSelect: n, emptyLabel: r = "Keine Auswahl verfügbar" }, i) {
	let a = document.createElement("div");
	a.className = "vanta-settings-list", a.setAttribute("role", "radiogroup");
	let o = t.filter((e) => !e.disabled);
	if (!o.length) {
		let n = document.createElement("div");
		n.className = "vanta-settings-empty", n.textContent = t[0]?.label || r, e.appendChild(n);
		return;
	}
	o.forEach((e) => {
		let t = document.createElement("button");
		t.type = "button", t.className = `vanta-settings-option vanta-settings-focusable${e.selected ? " is-selected" : ""}`, t.setAttribute("role", "radio"), t.setAttribute("aria-checked", e.selected ? "true" : "false"), t.dataset.optionId = e.id, t.innerHTML = `
      <span class="vanta-settings-option-label">${V(e.label)}</span>
      <span class="vanta-settings-option-check">${e.selected ? Sn : ""}</span>`, t.addEventListener("click", () => {
			e.selected || n(e.id), i.back();
		}), a.appendChild(t);
	}), e.appendChild(a);
}
var wn = [
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
], Tn = [
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
function En({ label: e, options: t, value: n, onChange: r }) {
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
function Dn(e, { options: t, onSelect: n, style: r, onStyleChange: i }, a) {
	Cn(e, {
		options: t,
		onSelect: n,
		emptyLabel: "Keine Untertitel verfügbar"
	}, a);
	let o = document.createElement("div");
	o.className = "vanta-settings-section";
	let s = document.createElement("div");
	s.className = "vanta-settings-section-title", s.textContent = "Darstellung", o.append(s, En({
		label: "Größe",
		options: wn,
		value: r.size,
		onChange: (e) => i({ size: e })
	}), En({
		label: "Hintergrund",
		options: Tn,
		value: r.background,
		onChange: (e) => i({ background: e })
	})), e.appendChild(o);
}
function On(e, { context: t, readonly: n, onSelectEpisode: r }, i) {
	let a = t?.seasons || [], o = rn(t, t?.currentEpisodeId), s = document.createElement("div");
	s.className = "vanta-settings-seasons", s.setAttribute("role", "tablist");
	let c = document.createElement("div");
	c.className = "vanta-settings-episodes";
	let l = () => {
		s.querySelectorAll(".vanta-settings-season").forEach((e) => {
			let t = e.dataset.seasonId === o;
			e.classList.toggle("is-active", t), e.setAttribute("aria-selected", t ? "true" : "false");
		}), c.innerHTML = (t?.episodesBySeason?.[o] || []).map((e) => {
			let r = e.Id === t.currentEpisodeId;
			return `
        <button type="button"
          class="vanta-settings-episode vanta-settings-focusable${r ? " is-current" : ""}"
          data-episode-id="${V(e.Id)}"
          ${r ? "aria-current=\"true\"" : ""}
          ${n ? "disabled aria-disabled=\"true\"" : ""}>
          <span class="vanta-settings-episode-code">${tn(e)}</span>
          <span class="vanta-settings-episode-title">${V(e.Name || "Unbenannte Folge")}</span>
          ${r ? "<span class=\"vanta-settings-episode-now\">Läuft</span>" : ""}
        </button>`;
		}).join("") || "<div class=\"vanta-settings-empty\">Keine Folgen in dieser Staffel</div>";
	};
	if (a.forEach((e) => {
		let t = document.createElement("button");
		t.type = "button", t.className = "vanta-settings-season vanta-settings-focusable", t.setAttribute("role", "tab"), t.dataset.seasonId = e.Id, t.textContent = e.Name || `Staffel ${e.IndexNumber ?? ""}`, t.addEventListener("click", () => {
			o = e.Id, l();
		}), s.appendChild(t);
	}), c.addEventListener("click", (e) => {
		let a = e.target.closest("[data-episode-id]");
		if (!a || n) return;
		let o = nn(t, a.dataset.episodeId);
		!o || o.Id === t.currentEpisodeId || (r?.(o), i.close());
	}), a.length > 1 && e.appendChild(s), n) {
		let t = document.createElement("p");
		t.className = "vanta-settings-hint", t.textContent = "Nur Admins können die Folge wechseln.", e.appendChild(t);
	}
	e.appendChild(c), l();
}
function kn(e, { watchParty: t, pendingBan: n }) {
	let r = t.participants || [], i = r.find((e) => e.userId === t.currentUserId)?.role || "viewer", a = document.createElement("div");
	a.className = "vanta-settings-participants", a.innerHTML = r.map((e) => {
		let r = vn(e.role), a = yn({
			viewerRole: i,
			member: e,
			currentUserId: t.currentUserId
		}), o = bn({
			viewerRole: i,
			member: e,
			currentUserId: t.currentUserId
		}), s = xn({
			viewerRole: i,
			member: e,
			currentUserId: t.currentUserId
		}), c = n.userId === e.userId, l = e.userId === t.currentUserId, u = gn(e);
		return `
      <div class="vanta-settings-participant" data-user-id="${V(e.userId)}">
        <span class="vanta-settings-avatar" data-state="${u.key}" style="--member-hue:${mn(e.userId)}">${V(hn(e.username))}</span>
        <span class="vanta-settings-participant-main">
          <span class="vanta-settings-participant-name">
            <strong>${V(e.username || "Unbekannt")}</strong>
            ${l ? "<span class=\"vanta-settings-tag\">Du</span>" : ""}
            ${r ? `<span class="vanta-settings-tag is-role">${r}</span>` : ""}
          </span>
          <span class="vanta-settings-participant-status is-${u.key}">${V(u.label)}</span>
        </span>
        <span class="vanta-settings-participant-actions">
          ${a ? `<button type="button" class="vanta-settings-action vanta-settings-focusable" data-action="promote" data-user-id="${V(e.userId)}">Admin machen</button>` : ""}
          ${o ? `<button type="button" class="vanta-settings-action vanta-settings-focusable" data-action="demote" data-user-id="${V(e.userId)}">Admin entziehen</button>` : ""}
          ${s ? `<button type="button" class="vanta-settings-action vanta-settings-focusable is-danger${c ? " is-confirming" : ""}" data-action="${c ? "confirm-ban" : "ban"}" data-user-id="${V(e.userId)}">${c ? "Wirklich bannen?" : "Bannen"}</button>` : ""}
        </span>
      </div>`;
	}).join("") || "<div class=\"vanta-settings-empty\">Keine Teilnehmer</div>", a.addEventListener("click", (e) => {
		let r = e.target.closest("button[data-action]");
		if (!r) return;
		let i = r.dataset.userId;
		r.dataset.action === "promote" ? t.onPromoteMember?.(i) : r.dataset.action === "demote" ? t.onDemoteMember?.(i) : r.dataset.action === "ban" ? (n.userId = i, n.refresh()) : r.dataset.action === "confirm-ban" && (n.userId = null, t.onBanMember?.(i), n.refresh());
	}), e.appendChild(a);
}
//#endregion
//#region src/player/src/nextEpisode.js
var An = .97, jn = .985;
function Mn({ duration: e, outro: t = null, promptThreshold: n = An, skipThreshold: r = jn, minPromptSeconds: i = 25 } = {}) {
	if (!Number.isFinite(e) || e <= 0) return null;
	let a = Number(t?.startMs) / 1e3, o = Number(t?.endMs) / 1e3;
	if (Number.isFinite(a) && Number.isFinite(o) && a >= e * .5 && a < e) {
		let t = a, n = Math.min(e - .5, Math.max(o, t + 10));
		return {
			promptAt: t,
			skipAt: Math.max(t, n),
			source: "outro"
		};
	}
	let s = e * r;
	return {
		promptAt: Math.max(0, Math.min(e * n, s - i)),
		skipAt: s,
		source: "runtime"
	};
}
function Nn({ currentTime: e, duration: t, ...n }) {
	if (!Number.isFinite(e)) return !1;
	let r = Mn({
		duration: t,
		...n
	});
	return r ? e >= r.promptAt : !1;
}
function Pn(e) {
	return !e?.enabled || !!e.canControl;
}
function Fn() {
	let e = /* @__PURE__ */ new Set(), t = null;
	return {
		shouldTrigger(n) {
			return !!n && !e.has(n) && t !== n;
		},
		markShown(e) {
			t = e;
		},
		markDismissed(t) {
			t && e.add(t);
		}
	};
}
function In(e, t = e?.currentEpisodeId) {
	let n = [...e?.seasons || []].sort((e, t) => (e.IndexNumber ?? 0) - (t.IndexNumber ?? 0));
	for (let r = 0; r < n.length; r += 1) {
		let i = n[r], a = [...e?.episodesBySeason?.[i.Id] || []].sort((e, t) => (e.IndexNumber ?? 0) - (t.IndexNumber ?? 0)), o = a.findIndex((e) => e.Id === t);
		if (o === -1) continue;
		let s = a[o + 1];
		if (s) return {
			kind: "next-episode",
			episode: s,
			season: i,
			fromSeason: i
		};
		for (let t = r + 1; t < n.length; t += 1) {
			let r = n[t], a = [...e?.episodesBySeason?.[r.Id] || []].sort((e, t) => (e.IndexNumber ?? 0) - (t.IndexNumber ?? 0));
			if (a[0]) return {
				kind: "next-season",
				episode: a[0],
				season: r,
				fromSeason: i
			};
		}
		return null;
	}
	return null;
}
//#endregion
//#region src/player/src/nextEpisodePrompt.js
var Ln = 1e4;
function Rn(e) {
	let t = e?.ImageTags?.Primary;
	return !e?.Id || !t ? null : `/api/media/image/${e.Id}?type=Primary&tag=${encodeURIComponent(t)}&maxWidth=200`;
}
function zn({ root: e, onConfirm: t, onDismiss: n, countdownMs: r = Ln }) {
	let i = null, a = null, o = 0, s = 0, c = 0, l = null, u = null, d = !0, f = !1, p = null, m = document.createElement("div");
	m.className = "vanta-player-next-episode", m.setAttribute("role", "complementary"), m.setAttribute("aria-label", "Nächste Folge"), m.hidden = !0;
	let h = document.createElement("div");
	h.className = "vanta-player-next-episode-media", h.hidden = !0;
	let g = document.createElement("div");
	g.className = "vanta-player-next-episode-body";
	let _ = document.createElement("span");
	_.className = "vanta-player-next-episode-kicker";
	let v = document.createElement("strong");
	v.className = "vanta-player-next-episode-code";
	let y = document.createElement("span");
	y.className = "vanta-player-next-episode-title";
	let b = document.createElement("span");
	b.className = "vanta-player-next-episode-series", b.hidden = !0;
	let x = document.createElement("span");
	x.className = "vanta-player-next-episode-countdown", x.setAttribute("aria-live", "off"), x.hidden = !0;
	let S = document.createElement("p");
	S.className = "vanta-player-next-episode-message", S.hidden = !0;
	let C = document.createElement("div");
	C.className = "vanta-player-next-episode-actions";
	let w = document.createElement("button");
	w.type = "button", w.className = "vanta-player-next-episode-confirm";
	let T = document.createElement("button");
	T.type = "button", T.className = "vanta-player-next-episode-dismiss", T.textContent = "Abbrechen", C.append(T, w), g.append(_, v, y, b, x, S, C), m.append(h, g), e.appendChild(m);
	function E(e) {
		w.style.setProperty("--next-episode-progress", String(Math.min(1, Math.max(0, e))));
	}
	function D(e) {
		if (!Number.isFinite(e)) {
			x.hidden = !0, x.textContent = "";
			return;
		}
		x.textContent = `Startet in ${Math.max(0, Math.ceil(e))} s`, x.hidden = !1;
	}
	function O(e) {
		let t = e - o;
		if (E(t / r), D((r - t) / 1e3), t / r >= 1) {
			j({ auto: !0 });
			return;
		}
		a = window.requestAnimationFrame(O);
	}
	function k() {
		let e = c - l();
		if (E(1 - e / (c - s)), D(e), Number.isFinite(e) && e <= 0) {
			j({ auto: !0 });
			return;
		}
		a = window.requestAnimationFrame(k);
	}
	function A() {
		i && window.clearTimeout(i), a && window.cancelAnimationFrame(a), i = null, a = null;
	}
	function j({ auto: e }) {
		if (!u) return;
		let n = u;
		P(), t?.(n, { auto: e });
	}
	function M() {
		d && j({ auto: !1 });
	}
	function N(e = null) {
		w.hidden = !d, T.hidden = !d, S.textContent = d ? "" : e || "Startet automatisch. Abbrechen oder sofort starten können nur Admins.", S.hidden = d;
	}
	function P() {
		A(), u = null, l = null, m.hidden = !0, E(0), D(NaN), document.activeElement && m.contains(document.activeElement) && p?.isConnected && p.focus(), p = null;
	}
	function ee(e, t) {
		let n = typeof t == "function" ? t() : NaN;
		if (Number.isFinite(e) && Number.isFinite(n)) {
			if (e <= n) {
				D(NaN);
				return;
			}
			s = n, c = e, l = t, D(e - n), a = window.requestAnimationFrame(k);
			return;
		}
		o = performance.now(), D(r / 1e3), a = window.requestAnimationFrame(O);
	}
	function te(e, t = {}) {
		let { controls: n = !0, message: r = null, skipAt: i = null, getCurrentTime: a = null } = t;
		A(), u = e, d = n, p = document.activeElement, m.hidden = !1;
		let o = e.kind === "next-season";
		_.textContent = o ? "Nächste Staffel" : "Nächste Folge", v.textContent = tn(e.episode), y.textContent = e.episode?.Name || "Unbenannte Folge", e.episode?.SeriesName ? (b.textContent = e.episode.SeriesName, b.hidden = !1) : b.hidden = !0;
		let s = Rn(e.episode);
		s ? (h.style.backgroundImage = `url("${s.replaceAll("\"", "%22")}")`, h.hidden = !1) : (h.style.backgroundImage = "", h.hidden = !0), w.textContent = o ? "Nächste Staffel starten" : "Nächste Folge starten", N(r), E(0), ee(i, a), f && d && w.focus();
	}
	T.addEventListener("click", () => {
		let e = u;
		P(), n?.(e);
	}), w.addEventListener("click", M);
	let F = (e) => {
		f = e.type === "keydown";
	};
	document.addEventListener("keydown", F, !0), document.addEventListener("pointerdown", F, !0), document.addEventListener("mousedown", F, !0);
	let I = (e) => {
		if (e.key !== "Escape" || m.hidden) return;
		e.stopPropagation();
		let t = u;
		P(), n?.(t);
	};
	return document.addEventListener("keydown", I), {
		element: m,
		confirmButton: w,
		dismissButton: T,
		show: te,
		hide: P,
		setControls(e, t) {
			d = !!e, u && N(t);
		},
		isVisible: () => !m.hidden,
		destroy: () => {
			P(), document.removeEventListener("keydown", F, !0), document.removeEventListener("pointerdown", F, !0), document.removeEventListener("mousedown", F, !0), document.removeEventListener("keydown", I), m.remove();
		}
	};
}
//#endregion
//#region src/player/src/segments.js
var Bn = {
	intro: "Intro überspringen",
	recap: "Rückblick überspringen"
}, Vn = 1.5;
function Hn(e, t) {
	return Number.isFinite(t) && (e || []).find((e) => Bn[e.type] && t >= e.startMs / 1e3 && t < e.endMs / 1e3 - Vn) || null;
}
function Un(e) {
	return (e || []).find((e) => e.type === "outro") || null;
}
function Wn(e, { loadSegments: t }) {
	let { player: n, root: r, listen: i } = e;
	e.segments = [];
	let a = r.querySelector(".vanta-player-skip-segment"), o = null, s = () => !e.watchParty?.enabled || e.canControlWatchParty(), c = () => {
		let t = s() ? Hn(e.segments, Number(n.currentTime)) : null;
		t !== o && (o = t, a && (t ? (a.querySelector(".vanta-player-skip-segment-label").textContent = Bn[t.type], a.hidden = !1, a.offsetWidth, a.classList.add("is-visible")) : (a.classList.remove("is-visible"), a.hidden = !0)));
	};
	return a && i(a, "click", (e) => {
		e.stopPropagation(), !(!o || !s()) && (J(n, o.endMs / 1e3, { endEpsilon: .25 }), c());
	}), i(n, "time-update", c), e.refreshSegmentButton = c, typeof t == "function" && Promise.resolve().then(() => t()).then((t) => {
		e.destroyed || (e.segments = Array.isArray(t?.segments) ? t.segments : [], c());
	}).catch(() => {}), e;
}
//#endregion
//#region src/player/src/player/nextEpisodeBinding.js
function Gn(e) {
	let { root: t, player: n, watchParty: r, episodeBrowser: i } = e, a = Fn();
	e.nextEpisodePrompt = i?.enabled ? zn({
		root: t.querySelector(".vanta-player-shell"),
		onConfirm: (e, { auto: t = !1 } = {}) => {
			i.onNextEpisode?.(e, { auto: t });
		},
		onDismiss: (e) => {
			a.markDismissed(i.context?.currentEpisodeId), Pn(r) && i.onDismissNextEpisode?.(e);
		}
	}) : null, e.cancelNextEpisode = () => {
		a.markDismissed(i?.context?.currentEpisodeId), e.nextEpisodePrompt?.hide();
	}, e.maybeShowNextEpisodePrompt = () => {
		if (!e.nextEpisodePrompt || !i?.context) return;
		let t = i.context.currentEpisodeId;
		if (!a.shouldTrigger(t) || r?.enabled && r.isNextEpisodeCancelled?.()) return;
		let o = e.knownDuration || n.duration, s = Un(e.segments);
		if (!Nn({
			currentTime: n.currentTime,
			duration: o,
			outro: s
		})) return;
		let c = In(i.context, t);
		if (!c) return;
		a.markShown(t);
		let l = Pn(r);
		e.nextEpisodePrompt.show(c, {
			controls: l,
			message: l ? null : Fe,
			skipAt: Mn({
				duration: o,
				outro: s
			})?.skipAt,
			getCurrentTime: () => n.currentTime
		});
	};
}
//#endregion
//#region src/player/src/player/menus.js
var Kn = 1e3, $ = {
	subtitles: "<svg viewBox=\"0 0 24 24\"><path d=\"M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z\"/></svg>",
	quality: "<svg viewBox=\"0 0 24 24\"><path d=\"M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-8 12H9.5v-2h-2v2H6V9h1.5v2.5h2V9H11v6zm7-1a1 1 0 0 1-1 1h-4V9h4a1 1 0 0 1 1 1v4zm-3.5-.5h2v-3h-2v3z\"/></svg>",
	episodes: "<svg viewBox=\"0 0 24 24\"><path d=\"M4 6h2v2H4V6zm0 5h2v2H4v-2zm0 5h2v2H4v-2zm4-10h12v2H8V6zm0 5h12v2H8v-2zm0 5h12v2H8v-2z\"/></svg>",
	audio: "<svg viewBox=\"0 0 24 24\"><path d=\"M12 3a9 9 0 0 0-9 9v7a2 2 0 0 0 2 2h3v-8H5v-1a7 7 0 0 1 14 0v1h-3v8h3a2 2 0 0 0 2-2v-7a9 9 0 0 0-9-9z\"/></svg>",
	help: "<svg viewBox=\"0 0 24 24\"><path d=\"M11 18h2v-2h-2v2zm1-16a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm0-14a4 4 0 0 0-4 4h2a2 2 0 1 1 4 0c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5a4 4 0 0 0-4-4z\"/></svg>",
	participants: "<svg viewBox=\"0 0 24 24\"><path d=\"M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5 1.34 3.5 3 3.5zM8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11zm0 2c-2.67 0-5 1.34-5 3v2h10v-2c0-1.66-2.33-3-5-3zm8 0c-.31 0-.62.02-.91.06 1.18.84 1.91 1.95 1.91 3.19V18h4v-2c0-1.66-2.33-3-5-3z\"/></svg>"
};
function qn(e) {
	let { root: t, player: n, reporter: r, watchParty: i, episodeBrowser: a, dom: o, ui: s } = e, c = t.querySelector(".vanta-player-shell"), l = i?.disableQualityMenu ? null : Kt({ onSelect: async (t) => {
		let n = e.sourceSwitch.getCurrentPlayback();
		if (n) try {
			let r = await e.resolvePlayback("auto", {
				qualityProfile: t,
				replacesPlaySessionId: n.playSessionId
			});
			if (e.destroyed || (await e.sourceSwitch.switchTo(r, {
				position: e.sourceSwitch.captureState().position,
				shouldPlay: e.sourceSwitch.getIntendsToPlay(),
				label: "Qualität wird gewechselt …"
			}), e.destroyed)) return;
			e.updateMenus(r);
		} catch (t) {
			!e.destroyed && !e.handleFatalPlaybackError(t) && e.showError(t.message);
		}
	} });
	e.qualityMenu = l, e.audioMenu = $t({ onSelect: async (t) => {
		let n = e.sourceSwitch.getCurrentPlayback();
		if (n) try {
			let r = await e.resolvePlayback("auto", {
				audioStreamIndex: t,
				mediaSourceId: n.mediaSourceId || void 0,
				replacesPlaySessionId: n.playSessionId
			});
			if (e.destroyed || (await e.sourceSwitch.switchTo(r, {
				position: e.sourceSwitch.captureState().position,
				shouldPlay: e.sourceSwitch.getIntendsToPlay(),
				label: "Tonspur wird gewechselt …"
			}), e.destroyed)) return;
			e.updateMenus(r), e.preferences?.update({ audioLanguage: e.audioMenu.getCurrentLanguage() });
		} catch (t) {
			!e.destroyed && !e.handleFatalPlaybackError(t) && e.showError(t.message);
		}
	} }), e.subtitleMenu = Qt({
		player: n,
		reporter: r,
		onChange: () => e.settings?.refresh()
	});
	let u = null, d = null, f = {
		userId: null,
		refresh: () => e.settings?.refresh()
	}, p = dn({
		container: c,
		button: o.settingsButton,
		onOpenChange: (t) => {
			e.settingsOpen = t, t ? (s.holdActive("settings"), d = window.setInterval(() => u?.update(), Kn)) : (s.releaseActive("settings"), window.clearInterval(d), f.userId = null);
		}
	});
	e.settings = p, e.disposers.push(() => window.clearInterval(d));
	let m = () => {
		let e = nn(a?.context, a?.context?.currentEpisodeId);
		return e ? tn(e) : "Alle Folgen";
	};
	p.setHeader(() => i?.enabled ? (u = _n(i), u.element) : null), p.setRows(() => [
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
			value: l?.getCurrentLabel() || "",
			icon: $.quality,
			hidden: !l
		},
		{
			page: "episodes",
			label: "Folgen",
			value: m(),
			icon: $.episodes,
			hidden: !a?.enabled
		},
		{
			page: "participants",
			label: "Teilnehmer",
			value: `${i?.participants?.length || 0}/4`,
			icon: $.participants,
			hidden: !i?.enabled
		},
		{
			id: "help",
			label: "Hilfe",
			value: "Tasten & Gesten",
			icon: $.help,
			onSelect: () => e.openHelp?.()
		}
	]);
	let h = () => {
		let t = e.preferences?.get() || {};
		return {
			size: t.subtitleSize || "medium",
			background: t.subtitleBackground || "semi"
		};
	};
	if (e.applySubtitleStyle = (n = {}) => {
		let r = {
			...h(),
			...n
		};
		t.dataset.subtitleSize = r.size, t.dataset.subtitleBackground = r.background, Object.keys(n).length && e.preferences?.update({
			subtitleSize: r.size,
			subtitleBackground: r.background
		});
	}, e.applySubtitleStyle(), p.registerPage("subtitles", {
		title: "Untertitel",
		render: (t, n) => Dn(t, {
			options: e.subtitleMenu.getOptions(),
			onSelect: (t) => e.selectSubtitle(t),
			style: h(),
			onStyleChange: (t) => e.applySubtitleStyle(t)
		}, n)
	}), p.registerPage("audio", {
		title: "Tonspur",
		render: (t, n) => Cn(t, {
			options: e.audioMenu.getOptions(),
			onSelect: (t) => e.audioMenu.select(t),
			emptyLabel: "Nur eine Tonspur"
		}, n)
	}), l && p.registerPage("quality", {
		title: "Qualität",
		render: (e, t) => Cn(e, {
			options: l.getOptions(),
			onSelect: (e) => l.select(e)
		}, t)
	}), a?.enabled && p.registerPage("episodes", {
		title: "Folgen",
		wide: !0,
		render: (e, t) => On(e, {
			context: a.context,
			readonly: !!a.readonly,
			onSelectEpisode: a.onSelectEpisode
		}, t)
	}), i?.enabled) {
		p.registerPage("participants", {
			title: "Teilnehmer",
			render: (e) => kn(e, {
				watchParty: i,
				pendingBan: f
			})
		});
		let t = i.onParticipantsChange, n = () => {
			t?.();
			let e = p.currentPage();
			(e === "root" || e === "participants") && p.refresh();
		};
		i.onParticipantsChange = n, e.disposers.push(() => {
			i.onParticipantsChange === n && (i.onParticipantsChange = t);
		});
	}
	Gn(e);
	let g = () => {
		e.preferences?.update({ subtitleLanguage: e.subtitleMenu.getCurrentLanguage() });
	};
	return e.selectSubtitle = (t) => {
		e.subtitleMenu.select(t), g();
	}, e.toggleSubtitles = () => {
		e.subtitleMenu.toggle(), g();
	}, e.updateMenus = (t, n = {}) => {
		l?.update(t.quality?.profiles, t.quality?.current), e.audioMenu.update(t.audioTracks, t.audioStreamIndex), e.subtitleMenu.update(t, {
			preserveSelection: n.preserveSubtitleSelection !== !1,
			preferredLanguage: e.preferences?.get().subtitleLanguage || null
		}), p.refresh();
	}, e;
}
//#endregion
//#region src/player/src/player/ownerControlEvents.js
function Jn(e) {
	let { player: t, listen: n, watchParty: r } = e, i = () => Math.round(t.currentTime * 1e3);
	n(t, "play", () => {
		e.canEmitOwnerControl("play") && r.onOwnerPlay?.(i());
	}), n(t, "pause", () => {
		e.canEmitOwnerControl("pause") && r.onOwnerPause?.(i());
	});
	let a = !1;
	n(t, "seeking", () => {
		e.echoTokens.consume("seek") && (a = !0);
	}), n(t, "seeked", () => {
		let t = e.takePendingSeekStep?.() ?? null;
		if (a) {
			a = !1;
			return;
		}
		e.canEmitOwnerControl("seek") && r.onOwnerSeek?.(i(), t ? { step: t } : {});
	});
}
//#endregion
//#region src/player/src/player/eventBindings.js
var Yn = () => import("./hls-BrN2xaGc.js");
function Xn(e) {
	let { player: t, dom: n, listen: r, onBack: i } = e, a = async (t) => {
		if (!(e.sourceSwitch.isSwitching() || e.destroyed)) {
			if (e.sourceSwitch.getCurrentPlayback()?.delivery !== "hls") {
				await o(t, { silent: e.isDeferredReadyRoom() });
				return;
			}
			e.showError(t?.message);
		}
	}, o = async (t, { silent: n = !1 } = {}) => {
		if (e.fallbackAttempted || e.destroyed) {
			n || e.showError(t?.message);
			return;
		}
		e.fallbackAttempted = !0;
		let r = e.sourceSwitch.captureState();
		e.setLoading(!0, "HLS-Fallback wird beim Server angefragt …");
		try {
			let t = await e.resolvePlayback("hls", { replacesPlaySessionId: e.sourceSwitch.getCurrentPlayback()?.playSessionId || null });
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
		e.syncInlinePlayback(), window.setTimeout(e.syncInlinePlayback, 0), N(t.detail) && (t.detail.library = Yn, t.detail.config = {
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
		e.sourceSwitch.isSwitching() || (e.sourceSwitch.setIntendsToPlay(!1), e.sourceSwitch.clearSeekTimer(), t.querySelector?.("video")?.seeking || e.inlineLoading.end(), e.ui.setState("ready-paused"));
	}), r(t, "waiting", () => {
		e.sourceSwitch.isSwitching() || s();
	}), r(t, "seeking", () => {
		e.sourceSwitch.isSwitching() || (e.ui.setState("seeking"), e.inlineLoading.begin());
	}), r(t, "playing", () => {
		e.sourceSwitch.clearSeekTimer(), e.sourceSwitch.isSwitching() || (e.sourceSwitch.setAutoplayBlocked(!1), e.setLoading(!1), e.inlineLoading.isActive() ? e.inlineLoading.check() : e.setInlineLoading(!1), e.sourceSwitch.syncPlayingState());
	}), r(t, "seeked", () => {
		e.sourceSwitch.clearSeekTimer(), !e.sourceSwitch.isSwitching() && !e.destroyed && (e.inlineLoading.check(), e.sourceSwitch.syncPlayingState());
	}), Jn(e), r(t, "ended", () => {
		B().catch(() => {}), e.reporter.stop({ ended: !0 });
	}), r(n.backButton, "click", i), e.switchToHls = o, e;
}
//#endregion
//#region src/player/src/player/syncControls.js
var Zn = 3, Qn = .05, $n = class extends Error {
	constructor() {
		super("Der Browser hat die automatische Wiedergabe blockiert."), this.name = "NotAllowedError";
	}
};
function er(e) {
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
	let s = () => t.querySelector?.("video") || null, c = () => {
		if (e.sourceSwitch.isSwitching()) return !0;
		let t = s();
		return t ? t.seeking ? !0 : !t.paused && t.readyState < Zn : !1;
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
		let n = s()?.buffered;
		if (!n) return 0;
		for (let t = 0; t < n.length; t++) if (n.start(t) <= e + .25 && n.end(t) >= e) return Math.max(0, n.end(t) - e);
		return 0;
	}, e.setSyncRate = (e) => {
		let n = Number(e) || 1;
		Math.abs((Number(t.playbackRate) || 1) - n) < .001 || (t.playbackRate = n);
	}, e.syncSeek = (e) => {
		let n = q(e, t);
		Number.isFinite(n) && (Math.abs((Number(t.currentTime) || 0) - n) < Qn || (r.expect("seek"), o(), t.currentTime = n));
	}, e.syncPlay = async ({ quiet: n = !0 } = {}) => {
		if (t.paused && (r.expect("play"), e.sourceSwitch.setIntendsToPlay(!0), await e.sourceSwitch.startCurrentPlayback({ quiet: n }), e.sourceSwitch.getAutoplayBlocked())) throw new $n();
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
		return Promise.resolve(r).then(() => !0, () => !1).then((r) => (e.pause(), e.muted = t, Math.abs(e.currentTime - n) > Qn && (e.currentTime = n), r));
	}, e;
}
function tr(e, { setTimer: t = (e, t) => window.setInterval(e, t), clearTimer: n = (e) => window.clearInterval(e) } = {}) {
	let { player: r } = e, i = !1, a = () => {
		let t = r.querySelector?.("video"), n = r.$store;
		if (!t || typeof n?.currentTime?.set != "function" || t.paused || t.seeking || t.ended) return;
		let a = Number(t.currentTime), o = Number(n.currentTime());
		!Number.isFinite(a) || Math.abs(a - o) < 1 || (i || (i = !0, console.warn("[Player] Zeitleiste stand still, neu gesetzt", {
			actual: a,
			shown: o,
			storePaused: n.paused?.(),
			storePlaying: n.playing?.(),
			canPlay: n.canPlay?.(),
			seekableEnd: n.seekableEnd?.(),
			duration: n.duration?.(),
			readyState: t.readyState,
			watchPartyPhase: e.watchPartyPhase?.()
		})), n.currentTime.set(a));
	}, o = t(a, 500);
	return e.disposers.push(() => n(o)), { check: a };
}
var nr = 750;
function rr({ now: e = () => performance.now(), chainMs: t = 900 } = {}) {
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
function ir(e, t, n = null) {
	let r = `${e === "back" ? "−" : "+"}${t} s`;
	return n ? `${r} · ${n}` : r;
}
function ar(e) {
	let { player: t, dom: n, listen: r, root: i, ui: a } = e, o = rr(), s = {
		back: null,
		forward: null
	}, c = () => {
		let e = !!t.paused;
		i.toggleAttribute("data-paused", e), n.playButtons.forEach((t) => {
			t.dataset.state = e ? "paused" : "playing", t.setAttribute("aria-label", e ? "Wiedergabe" : "Pause"), t.title = e ? "Wiedergabe (K)" : "Pause (K)";
		});
	}, l = (e, t, r = null) => {
		let i = n.seekBubbles[e];
		i && (i.textContent = ir(e, t, r), i.classList.remove("is-visible"), i.offsetWidth, i.classList.add("is-visible"), window.clearTimeout(s[e]), s[e] = window.setTimeout(() => i.classList.remove("is-visible"), nr));
	}, u = (e) => {
		n.seekButtons.filter((t) => (Number(t.dataset.seek) < 0 ? "back" : "forward") === e).forEach((e) => {
			e.classList.remove("is-pressed"), e.offsetWidth, e.classList.add("is-pressed");
		});
	};
	return e.pendingSeekStep = 0, e.takePendingSeekStep = () => {
		let t = e.pendingSeekStep;
		return e.pendingSeekStep = 0, t || null;
	}, e.seekStep = (n) => {
		if (e.watchParty?.enabled && !e.canControlWatchParty()) return;
		Nt(t, n, { endEpsilon: .25 }), e.pendingSeekStep += n;
		let r = n < 0 ? "back" : "forward";
		l(r, o.add(r, Math.abs(n))), u(r), a.resetIdle();
	}, e.showSeekFeedback = (e, { by: t = null } = {}) => {
		let n = Math.round(Number(e) || 0);
		if (!n) return;
		let r = n < 0 ? "back" : "forward";
		l(r, o.add(r, Math.abs(n)), t), u(r);
	}, e.togglePlay = () => {
		e.watchParty?.enabled && !e.canControlWatchParty() || (t.paused ? t.play().catch(() => {}) : t.pause());
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
var or = .05, sr = 900, cr = 40, lr = 320, ur = [
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
], dr = [
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
function fr(e) {
	if (e.ctrlKey || e.metaKey || e.altKey) return null;
	let t = e.key;
	return t === " " || t === "Spacebar" || t === "k" || t === "K" ? "toggle-play" : t === "ArrowLeft" || t === "j" || t === "J" ? "seek-back" : t === "ArrowRight" || t === "l" || t === "L" ? "seek-forward" : t === "ArrowUp" ? "volume-up" : t === "ArrowDown" ? "volume-down" : t === "m" || t === "M" ? "mute" : t === "f" || t === "F" ? "fullscreen" : t === "c" || t === "C" ? "subtitles" : t === "?" ? "help" : /^[0-9]$/.test(t) ? "jump" : null;
}
function pr(e) {
	return !e || typeof e.closest != "function" ? !1 : !!e.closest("input, textarea, select, [contenteditable=\"true\"], [role=\"dialog\"]");
}
function mr(e) {
	let { player: t, root: n, listen: r, ui: i, dom: a } = e, o = null, s = 0, c = 0, l = () => !e.watchParty?.enabled || e.canControlWatchParty(), u = () => {
		let e = a.volumeBubble;
		if (!e) return;
		let n = t.muted ? 0 : Math.round((Number(t.volume) || 0) * 100);
		e.style.setProperty("--level", String(n / 100)), e.querySelector(".vanta-player-volume-bubble-value").textContent = t.muted ? "Stumm" : `${n} %`, e.dataset.level = t.muted || n === 0 ? "mute" : n < 50 ? "low" : "high", e.classList.add("is-visible"), window.clearTimeout(o), o = window.setTimeout(() => e.classList.remove("is-visible"), sr);
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
			case "volume-up": return e.adjustVolume(or), !0;
			case "volume-down": return e.adjustVolume(-.05), !0;
			case "mute": return e.toggleMute(), !0;
			case "fullscreen": return e.toggleFullscreen?.(), !0;
			case "subtitles": return (e.toggleSubtitles || e.subtitleMenu?.toggle)?.(), !0;
			case "help": return e.toggleHelp?.(), !0;
			default: return !1;
		}
	};
	r(document, "keydown", (n) => {
		if (n.defaultPrevented || e.destroyed || e.settingsOpen || e.helpOpen || pr(n.target)) return;
		let r = fr(n);
		if (r && !(ur.find((e) => e.id === r)?.transport && !l())) {
			if (n.preventDefault(), r === "jump") {
				let e = Number(t.duration);
				Number.isFinite(e) && e > 0 && J(t, e * Number(n.key) / 10, { endEpsilon: .25 }), i.resetIdle();
				return;
			}
			d(r), r !== "help" && i.resetIdle();
		}
	});
	let f = n.querySelector(".vanta-player-volume");
	f && r(f, "wheel", (t) => {
		t.preventDefault(), s += t.deltaY, !(Math.abs(s) < cr && Math.abs(t.deltaY) < cr) && (e.adjustVolume(s > 0 ? -.05 : or), s = 0);
	}, { passive: !1 });
	let p = n.querySelector(".vanta-player-timeline-row");
	return p && r(p, "wheel", (t) => {
		if (!l() || Math.abs(t.deltaY) < 4) return;
		t.preventDefault();
		let n = performance.now();
		n - c < lr || (c = n, e.seekStep(t.deltaY > 0 ? 10 : -10));
	}, { passive: !1 }), e.disposers.push(() => window.clearTimeout(o)), e;
}
function hr({ onClick: e, onDoubleClick: t, setTimer: n = (e, t) => window.setTimeout(e, t), clearTimer: r = (e) => window.clearTimeout(e) }) {
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
function gr(e, t) {
	return e < t / 3 ? "back" : e > t * 2 / 3 ? "forward" : null;
}
function _r({ onSingle: e, onSeek: t, now: n = () => performance.now(), setTimer: r = (e, t) => window.setTimeout(e, t), clearTimer: i = (e) => window.clearTimeout(e) }) {
	let a = null, o = null, s = null;
	return {
		tap({ x: c, y: l, width: u }) {
			let d = n(), f = gr(c, u);
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
function vr(e) {
	let { root: t, listen: n, ui: r } = e, i = t.querySelector(".vanta-player-tap-layer");
	if (!i) return e;
	let a = _r({
		onSeek: (t) => e.seekStep(t === "back" ? -10 : 10),
		onSingle: () => {
			r.getState() === "ready-playing-active" ? r.setState("ready-playing-idle") : r.resetIdle();
		}
	}), o = hr({
		onClick: () => e.togglePlay(),
		onDoubleClick: () => e.toggleFullscreen?.()
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
//#endregion
//#region src/player/src/mediaSession.js
var yr = [
	"play",
	"pause",
	"seekbackward",
	"seekforward"
], br = 1e3;
function xr(e, { session: t = globalThis.navigator?.mediaSession, MediaMetadataClass: n = globalThis.MediaMetadata } = {}) {
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
		let t = !e.watchParty?.enabled || e.canControlWatchParty();
		c("play", t ? () => r.play().catch(() => {}) : null), c("pause", t ? () => r.pause() : null), c("seekbackward", t ? () => e.seekStep(-10) : null), c("seekforward", t ? () => e.seekStep(10) : null);
	}, u = () => {
		t.playbackState = r.paused ? "paused" : "playing";
	};
	return e.listen(r, "play", u), e.listen(r, "pause", u), e.listen(r, "time-update", () => {
		let e = performance.now();
		if (e - s < br || typeof t.setPositionState != "function") return;
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
			yr.forEach((e) => c(e, null));
			try {
				t.metadata = null, t.playbackState = "none";
			} catch {}
		}
	};
}
//#endregion
//#region src/player/src/preferences.js
var Sr = "vanta.player.prefs", Cr = Object.freeze({
	volume: .8,
	muted: !1,
	subtitleLanguage: null,
	audioLanguage: null,
	subtitleSize: "medium",
	subtitleBackground: "semi"
}), wr = 400;
function Tr(e) {
	try {
		return e === "session" ? globalThis.sessionStorage : globalThis.localStorage;
	} catch {
		return null;
	}
}
function Er({ key: e = Sr, storage: t = "local" } = {}, { backend: n = Tr(t) } = {}) {
	let r = { ...Cr };
	try {
		let t = JSON.parse(n?.getItem(e) || "null");
		t && typeof t == "object" && (r = {
			...r,
			...t
		});
	} catch {}
	let i = null, a = () => {
		i = null;
		try {
			n?.setItem(e, JSON.stringify(r));
		} catch {}
	};
	return {
		get: () => ({ ...r }),
		update(e) {
			r = {
				...r,
				...e
			}, i === null && (i = setTimeout(a, wr));
		},
		flush() {
			i !== null && (clearTimeout(i), a());
		}
	};
}
function Dr(e) {
	let { player: t, listen: n } = e, r = Er(e.preferencesConfig || void 0);
	e.preferences = r;
	let { volume: i, muted: a } = r.get();
	return Number.isFinite(i) && (t.volume = Math.min(1, Math.max(0, i))), t.muted = !!a, n(t, "volume-change", () => {
		r.update({
			volume: Number(t.volume),
			muted: !!t.muted
		});
	}), e.disposers.push(() => r.flush()), e;
}
//#endregion
//#region src/player/src/help.js
var Or = [
	"Admins steuern Wiedergabe, Pause und Spulen für alle. Zuschauer sehen oben „Admin steuert“.",
	"Springt jemand 10 Sekunden, zeigen alle Bildschirme eine Blase mit dem Namen.",
	"Im Zahnrad-Menü siehst du, wer synchron ist, und kannst dich mit „Neu synchronisieren“ zurückholen.",
	"Am Ende einer Folge sehen alle dasselbe „Nächste Folge“-Fenster. Admins können abbrechen oder sofort starten; die nächste Folge beginnt bei allen gleichzeitig.",
	"Hängt jemand beim Laden, pausiert die Party, bis alle wieder bereit sind. Der Gastgeber kann das im Zahnrad-Menü abschalten.",
	"Lautstärke, Untertitel, Tonspur und Vollbild stellt jeder für sich ein."
];
function kr({ party: e = !1, viewer: t = !1 } = {}) {
	let n = (e) => t && e.transport ? "Nur Admins" : null, r = [
		{
			id: "keyboard",
			title: "Tastatur",
			rows: ur.map((e) => ({
				keys: e.keys,
				label: e.label,
				tag: n(e)
			}))
		},
		{
			id: "mouse",
			title: "Maus",
			rows: dr.filter((e) => e.pointer === "mouse").map((e) => ({
				input: e.input,
				label: e.label,
				tag: n(e)
			}))
		},
		{
			id: "touch",
			title: "Touch",
			rows: dr.filter((e) => e.pointer === "touch").map((e) => ({
				input: e.input,
				label: e.label,
				tag: n(e)
			}))
		}
	];
	return e && r.push({
		id: "party",
		title: "Watch Party",
		notes: Or
	}), r;
}
function Ar(e) {
	let t = (e.rows || []).map((e) => `
    <li class="vanta-help-row${e.tag ? " is-locked" : ""}">
      <span class="vanta-help-input">${e.keys ? e.keys.map((e) => `<kbd>${V(e)}</kbd>`).join("<span class=\"vanta-help-or\">oder</span>") : V(e.input)}</span>
      <span class="vanta-help-label">${V(e.label)}${e.tag ? `<em>${V(e.tag)}</em>` : ""}</span>
    </li>`).join(""), n = (e.notes || []).map((e) => `<li class="vanta-help-note">${V(e)}</li>`).join("");
	return `
    <section class="vanta-help-section" data-section="${e.id}">
      <h3>${V(e.title)}</h3>
      <ul>${t}${n}</ul>
    </section>`;
}
function jr(e) {
	let { root: t, ui: n, listen: r } = e, i = t.querySelector(".vanta-player-shell"), a = null, o = document.createElement("div");
	o.className = "vanta-help", o.setAttribute("role", "dialog"), o.setAttribute("aria-modal", "true"), o.setAttribute("aria-label", "Hilfe"), o.hidden = !0, i.appendChild(o);
	let s = () => {
		let t = !!e.watchParty?.enabled;
		o.innerHTML = `
      <div class="vanta-help-panel">
        <div class="vanta-help-head">
          <h2>Hilfe</h2>
          <button type="button" class="vanta-help-close" aria-label="Hilfe schließen">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 5.7 17 4.3l-5 5-5-5-1.4 1.4 5 5-5 5L7 17.1l5-5 5 5 1.4-1.4-5-5z"/></svg>
          </button>
        </div>
        <div class="vanta-help-grid">${kr({
			party: t,
			viewer: t && !e.canControlWatchParty()
		}).map(Ar).join("")}</div>
        <p class="vanta-help-foot">Mit <kbd>?</kbd> oder <kbd>Esc</kbd> schließen.</p>
      </div>`, o.querySelector(".vanta-help-close").addEventListener("click", () => l());
	};
	function c() {
		e.helpOpen || (e.settings?.close({ returnFocus: !1 }), s(), a = document.activeElement, e.helpOpen = !0, o.hidden = !1, t.classList.add("is-help-open"), n.releaseActive?.("help"), o.offsetWidth, o.classList.add("is-open"), o.querySelector(".vanta-help-close").focus({ preventScroll: !0 }));
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
//#region src/player/src/player/lifecycle.js
async function Mr(e) {
	let { watchParty: t, resumePosition: n } = e, r = !1, i = null;
	async function a({ position: a = n } = {}) {
		if (r) return;
		if (i) return i;
		let o = !!t?.enabled;
		o && e.beginOwnerEchoSuppression(), i = (async () => {
			let n = !t?.enabled;
			e.setLoading(!0, "Wiedergabequelle wird beim Server angefragt …");
			let i = await e.resolvePlayback("auto");
			e.destroyed || (await e.sourceSwitch.loadPlayback(i, {
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
				if (e.sourceSwitch.getCurrentPlayback()?.delivery !== "hls" && (await e.switchToHls(t, { silent: e.isDeferredReadyRoom() }), !e.destroyed && e.sourceSwitch.getCurrentPlayback())) {
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
function Nr(e) {
	let { player: t, watchParty: n, isPhone: r, root: i } = e;
	return {
		player: t,
		prepareInitialPlayback: e.prepareInitialPlayback,
		updateWatchPartyAccess: (t) => {
			n?.enabled && (Object.assign(n, t || {}), e.refreshWatchPartyControlAccess(), e.settings?.refresh(), e.nextEpisodePrompt?.setControls(!!n.canControl, Fe));
		},
		cancelNextEpisode: () => e.cancelNextEpisode?.(),
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
			if (e.destroyed) return Promise.resolve();
			e.destroyed = !0, e.sourceSwitch.clearSeekTimer(), e.echoTokens.clear();
			let n = e.reporter.stop({ keepalive: !0 }), a = B().catch(() => {});
			return ye(i), e.reporter.destroy(), e.subtitleMenu.destroy(), e.settings?.destroy(), e.mediaSession?.destroy(), e.help?.destroy(), e.nextEpisodePrompt?.destroy(), e.ui.destroy(), e.disposers.splice(0).forEach((e) => e()), t.destroy?.(), i.innerHTML = "", Promise.all([
				r ? Ge().catch(() => {}) : Promise.resolve(),
				a,
				n?.catch(() => {})
			]).catch(() => {});
		}
	};
}
//#endregion
//#region src/player/src/index.js
async function Pr(e) {
	let t = await Ve(e);
	return Dr(t), Ke(t), Ct(t), ct(t), Ht(t), qn(t), Xn(t), ar(t), vr(t), mr(t), t.mediaSession = xr(t), t.help = jr(t), Wn(t, { loadSegments: t.loadSegments }), er(t), tr(t), await Mr(t), Nr(t);
}
//#endregion
export { Pr as mountVantaPlayer };
