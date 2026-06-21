import { Q as e, c as t, w as n } from "./std-EJr84HPl.js";
import { B as r, F as i, G as a, I as o, K as s, R as c, f as l, q as u } from "./media-ui-ZHU-o_6p.js";
import { t as d } from "./provider-DUZ95Sv7.js";
//#region node_modules/vidstack/dist/prod/providers/video/native-hls-text-tracks.js
var f = class {
	constructor(t, n) {
		this.qa = t, this.ph = n, t.textTracks.onaddtrack = this.va.bind(this), e(this.Eh.bind(this));
	}
	va(e) {
		let t = e.track;
		if (!t || p(this.qa, t)) return;
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
		for (let e of this.ph.textTracks) {
			let t = e[i]?.track;
			t?.oncuechange && (t.oncuechange = null);
		}
	}
};
function p(e, t) {
	return Array.from(e.children).find((e) => e.track === t);
}
//#endregion
//#region node_modules/vidstack/dist/prod/providers/video/picture-in-picture.js
var m = class {
	constructor(e, t) {
		this.qa = e, this.j = t, n(this.qa, "enterpictureinpicture", this.Fh.bind(this)), n(this.qa, "leavepictureinpicture", this.Gh.bind(this));
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
	Hc = (e, t) => {
		this.j.delegate.p("picture-in-picture-change", {
			detail: e,
			trigger: t
		});
	};
}, h = class {
	constructor(e, t) {
		this.qa = e, this.j = t, n(this.qa, "webkitpresentationmodechanged", this.Kh.bind(this));
	}
	Ga = "inline";
	get Jh() {
		return u(this.qa);
	}
	async Ih(e) {
		this.Ga !== e && this.qa.webkitSetPresentationMode(e);
	}
	Kh() {
		let e = this.Ga;
		this.Ga = this.qa.webkitPresentationMode, this.j.player?.dispatchEvent(new t("video-presentation-change", {
			detail: this.Ga,
			trigger: event
		})), ["fullscreen", "picture-in-picture"].forEach((t) => {
			(this.Ga === t || e === t) && this.j.delegate.p(`${t}-change`, {
				detail: this.Ga === t,
				trigger: event
			});
		});
	}
}, g = class {
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
}, _ = class {
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
}, v = class extends d {
	$$PROVIDER_TYPE = "VIDEO";
	get type() {
		return "video";
	}
	fullscreen;
	pictureInPicture;
	constructor(e, t) {
		if (super(e), u(e)) {
			let n = new h(e, t);
			this.fullscreen = new g(n), this.pictureInPicture = new _(n);
		} else s(e) && (this.pictureInPicture = new m(e, t));
	}
	setup(t) {
		super.setup(t), a(this.video) && new f(this.video, t), t.textRenderers[l](this.video), e(() => {
			t.textRenderers[l](null);
		}), this.type === "video" && t.delegate.p("provider-setup", { detail: this });
	}
	get video() {
		return this.j;
	}
};
//#endregion
export { v as VideoProvider };
