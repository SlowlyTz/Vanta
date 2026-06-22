import { $ as e, B as t, F as n, c as r, z as i } from "./std-EJr84HPl.js";
import { Q as a, X as o, Y as s, tt as c } from "./media-ui-Nu-6_9GI.js";
import { n as l } from "./provider-sVMN4fkX.js";
import { VideoProvider as u } from "./provider-DEhMb_t9.js";
//#region node_modules/vidstack/dist/prod/providers/hls/lib-loader.js
var d = class {
	constructor(e, t, n) {
		this.Bh = e, this.ph = t, this.jf = n, this.Ch();
	}
	async Ch() {
		let e = {
			onLoadStart: this.ge.bind(this),
			onLoaded: this.ue.bind(this),
			onLoadError: this.Dh.bind(this)
		}, n = await p(this.Bh, e);
		return t(n) && !i(this.Bh) && (n = await f(this.Bh, e)), n ? n.isSupported() ? n : (this.ph.player.dispatchEvent(new r("hls-unsupported")), this.ph.delegate.p("error", { detail: {
			message: "[vidstack]: `hls.js` is not supported in this environment",
			code: 4
		} }), null) : null;
	}
	ge() {
		this.ph.player.dispatchEvent(new r("hls-lib-load-start"));
	}
	ue(e) {
		this.ph.player.dispatchEvent(new r("hls-lib-loaded", { detail: e })), this.jf(e);
	}
	Dh(e) {
		let t = s(e);
		this.ph.player.dispatchEvent(new r("hls-lib-load-error", { detail: t })), this.ph.delegate.p("error", { detail: {
			message: t.message,
			code: 4
		} });
	}
};
async function f(e, n = {}) {
	if (!t(e)) {
		if (n.onLoadStart?.(), e.prototype && e.prototype !== Function) return n.onLoaded?.(e), e;
		try {
			let t = (await e())?.default;
			if (t && t.isSupported) n.onLoaded?.(t);
			else throw Error("");
			return t;
		} catch (e) {
			n.onLoadError?.(e);
		}
	}
}
async function p(e, t = {}) {
	if (i(e)) {
		t.onLoadStart?.();
		try {
			if (await a(e), !n(window.Hls)) throw Error("");
			let r = window.Hls;
			return t.onLoaded?.(r), r;
		} catch (e) {
			t.onLoadError?.(e);
		}
	}
}
//#endregion
//#region node_modules/vidstack/dist/prod/providers/hls/provider.js
var m = "https://cdn.jsdelivr.net", h = class extends u {
	$$PROVIDER_TYPE = "HLS";
	mh = null;
	od = new l(this.video);
	get ctor() {
		return this.mh;
	}
	get instance() {
		return this.od.instance;
	}
	static supported = o();
	get type() {
		return "hls";
	}
	get canLiveSync() {
		return !0;
	}
	lh = `${m}/npm/hls.js@^1.0.0/dist/hls.min.js`;
	get config() {
		return this.od.nh;
	}
	set config(e) {
		this.od.nh = e;
	}
	get library() {
		return this.lh;
	}
	set library(e) {
		this.lh = e;
	}
	preconnect() {
		i(this.lh) && c(this.lh);
	}
	setup(t) {
		super.setup(t), new d(this.lh, t, (n) => {
			this.mh = n, this.od.setup(n, t), t.delegate.p("provider-setup", { detail: this });
			let r = e(t.$store.source);
			r && this.loadSource(r);
		});
	}
	async loadSource({ src: e }) {
		i(e) && this.od.instance?.loadSource(e);
	}
	onInstance(e) {
		let t = this.od.instance;
		return t && e(t), this.od.oh.add(e), () => this.od.oh.delete(e);
	}
	destroy() {
		this.od.Jg();
	}
};
//#endregion
export { h as HLSProvider };
