import { $ as e, B as t, E as n, I as r, Q as i, R as a, c as o, d as s, j as c, o as l, w as u, z as d } from "./std-EJr84HPl.js";
import { N as f, R as p, V as m, b as h, f as g, g as _, h as v, it as y, rt as b, v as x, x as S, y as C, z as w } from "./media-ui-Nu-6_9GI.js";
//#region node_modules/vidstack/dist/prod/providers/hls/hls.js
var T = class {
	constructor(e) {
		this.jf = e;
	}
	xi;
	O() {
		t(this.xi) && this.yi();
	}
	P() {
		a(this.xi) && window.cancelAnimationFrame(this.xi), this.xi = void 0;
	}
	yi() {
		this.xi = window.requestAnimationFrame(() => {
			t(this.xi) || (this.jf(), this.yi());
		});
	}
}, E = (e) => s(e), D = class {
	constructor(e) {
		this.qa = e;
	}
	ph;
	za = null;
	qh = null;
	nh = {};
	oh = /* @__PURE__ */ new Set();
	get instance() {
		return this.za;
	}
	setup(t, n) {
		this.ph = n;
		let r = e(n.$store.streamType).includes("live"), i = e(n.$store.streamType).includes("ll-");
		this.za = new t({
			lowLatencyMode: i,
			backBufferLength: i ? 4 : r ? 8 : void 0,
			renderTextTracksNatively: !1,
			...this.nh
		});
		let a = this.rh.bind(this);
		for (let e of Object.values(t.Events)) this.za.on(e, a);
		this.za.on(t.Events.ERROR, this.Wb.bind(this));
		for (let e of this.oh) e(this.za);
		n.player.dispatchEvent(new o("hls-instance", { detail: this.za })), this.za.attachMedia(this.qa), this.za.on(t.Events.AUDIO_TRACK_SWITCHED, this.sh.bind(this)), this.za.on(t.Events.LEVEL_SWITCHED, this.th.bind(this)), this.za.on(t.Events.LEVEL_LOADED, this.uh.bind(this)), this.za.on(t.Events.NON_NATIVE_TEXT_TRACKS_FOUND, this.vh.bind(this)), this.za.on(t.Events.CUES_PARSED, this.wh.bind(this)), n.qualities[v] = this.xh.bind(this), u(n.qualities, "change", this.Pf.bind(this)), u(n.audioTracks, "change", this.yh.bind(this)), this.qh = c(this.zh.bind(this));
	}
	zh() {
		if (!this.ph.$store.live()) return;
		let e = new T(this.Ah.bind(this));
		return e.O(), e.P.bind(e);
	}
	Ah() {
		this.ph.$store.liveSyncPosition.set(this.za?.liveSyncPosition ?? Infinity);
	}
	rh(e, t) {
		this.ph.player.dispatchEvent(new o(E(e), { detail: t }));
	}
	vh(e, t) {
		let n = new o(e, { detail: t }), r = -1;
		for (let e = 0; e < t.tracks.length; e++) {
			let i = t.tracks[e], a = i.subtitleTrack ?? i.closedCaptions, o = new m({
				id: `hls-${i.kind}${e}`,
				src: a?.url,
				label: i.label,
				language: a?.lang,
				kind: i.kind
			});
			o[w] = 2, o[p] = () => {
				o.mode === "showing" ? (this.za.subtitleTrack = e, r = e) : r === e && (this.za.subtitleTrack = -1, r = -1);
			}, i.default && o.setMode("showing", n), this.ph.textTracks.add(o, n);
		}
	}
	wh(e, t) {
		let n = this.ph.textTracks.getById(`hls-${t.track}`);
		if (!n) return;
		let r = new o(e, { detail: t });
		for (let e of t.cues) e.positionAlign = "auto", n.addCue(e, r);
	}
	sh(e, t) {
		let n = this.ph.audioTracks[t.id];
		n && this.ph.audioTracks[S](n, !0, new o(e, { detail: t }));
	}
	th(e, t) {
		let n = this.ph.qualities[t.level];
		n && this.ph.qualities[S](n, !0, new o(e, { detail: t }));
	}
	uh(e, t) {
		if (this.ph.$store.canPlay()) return;
		let { type: n, live: r, totalduration: i } = t.details, a = new o(e, { detail: t });
		this.ph.delegate.p("stream-type-change", {
			detail: r ? n === "EVENT" && Number.isFinite(i) ? "live:dvr" : "live" : "on-demand",
			trigger: a
		}), this.ph.delegate.p("duration-change", {
			detail: i,
			trigger: a
		});
		let s = this.za.media;
		this.za.currentLevel === -1 && this.ph.qualities[f](!0, a);
		for (let e of this.za.audioTracks) this.ph.audioTracks[C]({
			id: e.id + "",
			label: e.name,
			language: e.lang || "",
			kind: "main"
		}, a);
		for (let e of this.za.levels) this.ph.qualities[C]({
			width: e.width,
			height: e.height,
			codec: e.codecSet,
			bitrate: e.bitrate
		}, a);
		s.dispatchEvent(new o("canplay", { trigger: a }));
	}
	Wb(e, t) {
		if (t.fatal) switch (t.type) {
			case "networkError":
				this.za?.startLoad();
				break;
			case "mediaError":
				this.za?.recoverMediaError();
				break;
			default:
				this.za?.destroy(), this.za = null;
				break;
		}
	}
	xh() {
		this.za && (this.za.currentLevel = -1);
	}
	Pf() {
		let { qualities: e } = this.ph;
		!this.za || e.auto || (this.za[e.switch + "Level"] = e.selectedIndex, _ && (this.qa.currentTime = this.qa.currentTime));
	}
	yh() {
		let { audioTracks: e } = this.ph;
		this.za && this.za.audioTrack !== e.selectedIndex && (this.za.audioTrack = e.selectedIndex);
	}
	Jg() {
		this.ph && (this.ph.qualities[v] = void 0), this.za?.destroy(), this.za = null, this.qh?.(), this.qh = null;
	}
}, O = class {
	constructor(e, t) {
		this.q = e, this.ph = t, this.Uh(), c(this.Vh.bind(this)), i(this.Eh.bind(this));
	}
	ih = l();
	Nh = !1;
	Qh = !1;
	Rh = !1;
	Oh = new T(this.Wh.bind(this));
	get j() {
		return this.q.media;
	}
	get jg() {
		return this.ph.delegate;
	}
	Eh() {
		this.Oh.P(), this.ih.empty();
	}
	Wh() {
		let e = this.q.currentTime;
		this.ph.$store.currentTime() !== e && this.Mh(e);
	}
	Uh() {
		this.Lh("loadstart", this.ge), this.Lh("abort", this.Sh), this.Lh("emptied", this.Xh), this.Lh("error", this.Wb);
	}
	Yh() {
		this.Qh ||= (this.ih.add(this.Lh("loadeddata", this.Zh), this.Lh("loadedmetadata", this._h), this.Lh("canplay", this.Rb), this.Lh("canplaythrough", this.$h), this.Lh("durationchange", this.ai), this.Lh("play", this.bi), this.Lh("progress", this.ci), this.Lh("stalled", this.di), this.Lh("suspend", this.ei)), !0);
	}
	fi() {
		this.Rh ||= (this.ih.add(this.Lh("pause", this.gi), this.Lh("playing", this.hi), this.Lh("ratechange", this.ii), this.Lh("seeked", this.ji), this.Lh("seeking", this.ki), this.Lh("ended", this.li), this.Lh("volumechange", this.ac), this.Lh("waiting", this.mi)), !0);
	}
	ni = void 0;
	pi = void 0;
	Lh(e, t) {
		return u(this.j, e, t.bind(this));
	}
	qi(e) {}
	Mh(e, t) {
		this.jg.p("time-update", {
			detail: {
				currentTime: Math.min(e, this.ph.$store.seekableEnd()),
				played: this.j.played
			},
			trigger: t
		});
	}
	ge(e) {
		if (this.j.networkState === 3) {
			this.Sh(e);
			return;
		}
		this.Yh(), this.jg.p("load-start", { trigger: e });
	}
	Sh(e) {
		this.jg.p("abort", { trigger: e });
	}
	Xh() {
		this.jg.p("emptied", { trigger: event });
	}
	Zh(e) {
		this.jg.p("loaded-data", { trigger: e });
	}
	_h(e) {
		this.Th(), this.fi(), this.jg.p("volume-change", { detail: {
			volume: this.j.volume,
			muted: this.j.muted
		} }), this.jg.p("loaded-metadata", { trigger: e }), x && b(this.ph.$store.source()) && this.jg.lf(this.Ph(), e);
	}
	Ph() {
		return {
			duration: this.j.duration,
			buffered: this.j.buffered,
			seekable: this.j.seekable
		};
	}
	Th() {
		let e = !Number.isFinite(this.j.duration);
		this.jg.p("stream-type-change", { detail: e ? "live" : "on-demand" });
	}
	bi(e) {
		this.ph.$store.canPlay && this.jg.p("play", { trigger: e });
	}
	gi(e) {
		this.j.readyState === 1 && !this.Nh || (this.Nh = !1, this.Oh.P(), this.jg.p("pause", { trigger: e }));
	}
	Rb(e) {
		this.jg.lf(this.Ph(), e);
	}
	$h(e) {
		this.ph.$store.started() || this.jg.p("can-play-through", {
			trigger: e,
			detail: this.Ph()
		});
	}
	hi(e) {
		this.Nh = !1, this.jg.p("playing", { trigger: e }), this.Oh.O();
	}
	di(e) {
		this.jg.p("stalled", { trigger: e }), this.j.readyState < 3 && (this.Nh = !0, this.jg.p("waiting", { trigger: e }));
	}
	mi(e) {
		this.j.readyState < 3 && (this.Nh = !0, this.jg.p("waiting", { trigger: e }));
	}
	li(e) {
		this.Oh.P(), this.Mh(this.j.duration, e), this.jg.p("end", { trigger: e }), this.ph.$store.loop() ? this.oi() : this.jg.p("ended", { trigger: e });
	}
	Vh() {
		this.ph.$store.paused() && u(this.j, "timeupdate", this.Vb.bind(this));
	}
	Vb(e) {
		this.Mh(this.j.currentTime, e);
	}
	ai(e) {
		this.Th(), this.ph.$store.ended() && this.Mh(this.j.duration, e), this.jg.p("duration-change", {
			detail: this.j.duration,
			trigger: e
		});
	}
	ac(e) {
		this.jg.p("volume-change", {
			detail: {
				volume: this.j.volume,
				muted: this.j.muted
			},
			trigger: e
		});
	}
	ji(e) {
		this.Mh(this.j.currentTime, e), this.jg.p("seeked", {
			detail: this.j.currentTime,
			trigger: e
		}), Math.trunc(this.j.currentTime) === Math.trunc(this.j.duration) && g(this.j.duration) > g(this.j.currentTime) && (this.Mh(this.j.duration, e), this.j.ended || this.ph.player.dispatchEvent(new o("media-play-request", { trigger: e })));
	}
	ki(e) {
		this.jg.p("seeking", {
			detail: this.j.currentTime,
			trigger: e
		});
	}
	ci(e) {
		this.jg.p("progress", {
			detail: {
				buffered: this.j.buffered,
				seekable: this.j.seekable
			},
			trigger: e
		});
	}
	oi() {
		r(this.j.controls) && (this.j.controls = !1), this.ph.player.dispatchEvent(new o("media-loop-request"));
	}
	ei(e) {
		this.jg.p("suspend", { trigger: e });
	}
	ii(e) {
		this.jg.p("rate-change", {
			detail: this.j.playbackRate,
			trigger: e
		});
	}
	Wb(e) {
		let t = this.j.error;
		t && this.jg.p("error", {
			detail: {
				message: t.message,
				code: t.code,
				mediaError: t
			},
			trigger: e
		});
	}
}, k = class {
	constructor(e, t) {
		this.q = e, this.ph = t, this.ri.onaddtrack = this.ti.bind(this), this.ri.onremovetrack = this.ui.bind(this), this.ri.onchange = this.vi.bind(this), u(this.ph.audioTracks, "change", this.wi.bind(this));
	}
	get ri() {
		return this.q.media.audioTracks;
	}
	ti(e) {
		let t = e.track;
		if (t.label === "") return;
		let n = {
			id: t.id + "",
			label: t.label,
			language: t.language,
			kind: t.kind,
			selected: !1
		};
		this.ph.audioTracks[C](n, e), t.enabled && (n.selected = !0);
	}
	ui(e) {
		let t = this.ph.audioTracks.getById(e.track.id);
		t && this.ph.audioTracks[h](t, e);
	}
	vi(e) {
		let t = this.si();
		if (!t) return;
		let n = this.ph.audioTracks.getById(t.id);
		n && this.ph.audioTracks[S](n, !0, e);
	}
	si() {
		return Array.from(this.ri).find((e) => e.enabled);
	}
	wi(e) {
		let { current: t } = e.detail;
		if (!t) return;
		let n = this.ri.getTrackById(t.id);
		if (n) {
			let e = this.si();
			e && (e.enabled = !1), n.enabled = !0;
		}
	}
}, A = class {
	constructor(e) {
		this.j = e;
	}
	setup(e) {
		new O(this, e), "audioTracks" in this.media && new k(this, e);
	}
	get type() {
		return "";
	}
	get media() {
		return this.j;
	}
	get paused() {
		return this.j.paused;
	}
	get muted() {
		return this.j.muted;
	}
	set muted(e) {
		this.j.muted = e;
	}
	get volume() {
		return this.j.volume;
	}
	set volume(e) {
		this.j.volume = e;
	}
	get currentTime() {
		return this.j.currentTime;
	}
	set currentTime(e) {
		this.j.currentTime = e;
	}
	get playsinline() {
		return this.j.hasAttribute("playsinline");
	}
	set playsinline(e) {
		n(this.j, "playsinline", e);
	}
	get playbackRate() {
		return this.j.playbackRate;
	}
	set playbackRate(e) {
		this.j.playbackRate = e;
	}
	async play() {
		return this.j.play();
	}
	async pause() {
		return this.j.pause();
	}
	async loadSource({ src: e }, t) {
		this.j.preload = t, y(e) ? this.j.srcObject = e : (this.j.srcObject = null, this.j.src = d(e) ? e : window.URL.createObjectURL(e)), this.j.load();
	}
};
//#endregion
export { D as n, A as t };
