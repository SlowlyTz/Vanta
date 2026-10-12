import { Q as e, c as t, w as n } from "./std-Dbvq-pq2.js";
import { B as r, F as i, G as a, I as o, K as s, R as c, f as l, q as u } from "./media-ui-U1Ki64sW.js";
import { p as d } from "./prod-yin0M9SD.js";
import { t as f } from "./provider-43H0hsgT.js";
//#region node_modules/vidstack/dist/prod/providers/video/native-hls-text-tracks.js
var p = class {
	constructor(t, n) {
		this.qa = t, this.ph = n, t.textTracks.onaddtrack = this.va.bind(this), e(this.Eh.bind(this));
	}
	va(e) {
		let t = e.track;
		if (!t || m(this.qa, t)) return;
		let n = new r({
			id: t.id,
			kind: t.kind,
			label: t.label,
			language: t.language,
			type: "vtt"
		});
		n[i] = { track: t }, n[c] = 2, n[o] = !0;
		let a = 0, s = (e) => {
			if (t.cues) for (let r = a; r < t.cues.length; r++) n.addCue(t.cues[r], e), a++;
		};
		s(e), t.oncuechange = s, this.ph.textTracks.add(n, e), n.setMode(t.mode, e);
	}
	Eh() {
		this.qa.textTracks.onaddtrack = null;
		for (let t of this.ph.textTracks) {
			var e;
			let n = (e = t[i]) == null ? void 0 : e.track;
			n != null && n.oncuechange && (n.oncuechange = null);
		}
	}
};
function m(e, t) {
	return Array.from(e.children).find((e) => e.track === t);
}
//#endregion
//#region node_modules/vidstack/dist/prod/providers/video/picture-in-picture.js
var h = class {
	constructor(e, t) {
		d(this, "Hc", (e, t) => {
			this.j.delegate.p("picture-in-picture-change", {
				detail: e,
				trigger: t
			});
		}), this.qa = e, this.j = t, n(this.qa, "enterpictureinpicture", this.Fh.bind(this)), n(this.qa, "leavepictureinpicture", this.Gh.bind(this));
	}
	get active() {
		return document.pictureInPictureElement === this.qa;
	}
	get supported() {
		return s(this.qa);
	}
	async enter() {
		return this.qa.requestPictureInPicture();
	}
	exit() {
		return document.exitPictureInPicture();
	}
	Fh(e) {
		this.Hc(!0, e);
	}
	Gh(e) {
		this.Hc(!1, e);
	}
}, g = class {
	constructor(e, t) {
		d(this, "Ga", "inline"), this.qa = e, this.j = t, n(this.qa, "webkitpresentationmodechanged", this.Kh.bind(this));
	}
	get Jh() {
		return u(this.qa);
	}
	async Ih(e) {
		this.Ga !== e && this.qa.webkitSetPresentationMode(e);
	}
	Kh() {
		var e;
		let n = this.Ga;
		this.Ga = this.qa.webkitPresentationMode, (e = this.j.player) == null || e.dispatchEvent(new t("video-presentation-change", {
			detail: this.Ga,
			trigger: event
		})), ["fullscreen", "picture-in-picture"].forEach((e) => {
			(this.Ga === e || n === e) && this.j.delegate.p(`${e}-change`, {
				detail: this.Ga === e,
				trigger: event
			});
		});
	}
}, _ = class {
	constructor(e) {
		this.Hh = e;
	}
	get active() {
		return this.Hh.Ga === "fullscreen";
	}
	get supported() {
		return this.Hh.Jh;
	}
	async enter() {
		this.Hh.Ih("fullscreen");
	}
	async exit() {
		this.Hh.Ih("inline");
	}
}, v = class {
	constructor(e) {
		this.Hh = e;
	}
	get active() {
		return this.Hh.Ga === "picture-in-picture";
	}
	get supported() {
		return this.Hh.Jh;
	}
	async enter() {
		this.Hh.Ih("picture-in-picture");
	}
	async exit() {
		this.Hh.Ih("inline");
	}
}, y = class extends f {
	get type() {
		return "video";
	}
	constructor(e, t) {
		if (super(e), d(this, "$$PROVIDER_TYPE", "VIDEO"), d(this, "fullscreen", void 0), d(this, "pictureInPicture", void 0), u(e)) {
			let n = new g(e, t);
			this.fullscreen = new _(n), this.pictureInPicture = new v(n);
		} else s(e) && (this.pictureInPicture = new h(e, t));
	}
	setup(t) {
		super.setup(t), a(this.video) && new p(this.video, t), t.textRenderers[l](this.video), e(() => {
			t.textRenderers[l](null);
		}), this.type === "video" && t.delegate.p("provider-setup", { detail: this });
	}
	get video() {
		return this.j;
	}
};
//#endregion
export { y as VideoProvider };
