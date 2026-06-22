import { Q as e, c as t, w as n } from "./std-EJr84HPl.js";
import { I as r, J as i, K as a, L as o, V as s, p as c, q as l, z as u } from "./media-ui-Nu-6_9GI.js";
import { t as d } from "./provider-sVMN4fkX.js";
//#region node_modules/vidstack/dist/prod/providers/video/native-hls-text-tracks.js
var f = class {
	constructor(t, n) {
		this.qa = t, this.ph = n, t.textTracks.onaddtrack = this.va.bind(this), e(this.Eh.bind(this));
	}
	va(e) {
		let t = e.track;
		if (!t || p(this.qa, t)) return;
		let n = new s({
			id: t.id,
			kind: t.kind,
			label: t.label,
			language: t.language,
			type: "vtt"
		});
		n[r] = { track: t }, n[u] = 2, n[o] = !0;
		let i = 0, a = (e) => {
			if (t.cues) for (let r = i; r < t.cues.length; r++) n.addCue(t.cues[r], e), i++;
		};
		a(e), t.oncuechange = a, this.ph.textTracks.add(n, e), n.setMode(t.mode, e);
	}
	Eh() {
		this.qa.textTracks.onaddtrack = null;
		for (let e of this.ph.textTracks) {
			let t = e[r]?.track;
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
		return l(this.qa);
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
		return i(this.qa);
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
		if (super(e), i(e)) {
			let n = new h(e, t);
			this.fullscreen = new g(n), this.pictureInPicture = new _(n);
		} else l(e) && (this.pictureInPicture = new m(e, t));
	}
	setup(t) {
		super.setup(t), a(this.video) && new f(this.video, t), t.textRenderers[c](this.video), e(() => {
			t.textRenderers[c](null);
		}), this.type === "video" && t.delegate.p("provider-setup", { detail: this });
	}
	get video() {
		return this.j;
	}
};
//#endregion
export { v as VideoProvider };
