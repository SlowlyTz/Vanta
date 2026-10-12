import { $ as e, B as t, F as n, c as r, z as i } from "./std-Dbvq-pq2.js";
import { J as a, Y as o, Z as s, et as c } from "./media-ui-U1Ki64sW.js";
import { p as l } from "./prod-yin0M9SD.js";
import { n as u } from "./provider-43H0hsgT.js";
import { VideoProvider as d } from "./provider-lJBTWfPA.js";
//#region node_modules/vidstack/dist/prod/providers/hls/lib-loader.js
var f = class {
	constructor(e, t, n) {
		this.Bh = e, this.ph = t, this.jf = n, this.Ch();
	}
	async Ch() {
		let e = {
			onLoadStart: this.ge.bind(this),
			onLoaded: this.ue.bind(this),
			onLoadError: this.Dh.bind(this)
		}, n = await m(this.Bh, e);
		return t(n) && !i(this.Bh) && (n = await p(this.Bh, e)), n ? n.isSupported() ? n : (this.ph.player.dispatchEvent(new r("hls-unsupported")), this.ph.delegate.p("error", { detail: {
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
		let t = a(e);
		this.ph.player.dispatchEvent(new r("hls-lib-load-error", { detail: t })), this.ph.delegate.p("error", { detail: {
			message: t.message,
			code: 4
		} });
	}
};
async function p(e, n = {}) {
	var r;
	if (!t(e)) {
		if ((r = n.onLoadStart) == null || r.call(n), e.prototype && e.prototype !== Function) {
			var i;
			return (i = n.onLoaded) == null || i.call(n, e), e;
		}
		try {
			var a;
			let t = (a = await e()) == null ? void 0 : a.default;
			if (t && t.isSupported) {
				var o;
				(o = n.onLoaded) == null || o.call(n, t);
			} else throw Error("");
			return t;
		} catch (e) {
			var s;
			(s = n.onLoadError) == null || s.call(n, e);
		}
	}
}
async function m(e, t = {}) {
	var r;
	if (i(e)) {
		(r = t.onLoadStart) == null || r.call(t);
		try {
			var a;
			if (await s(e), !n(window.Hls)) throw Error("");
			let r = window.Hls;
			return (a = t.onLoaded) == null || a.call(t, r), r;
		} catch (e) {
			var o;
			(o = t.onLoadError) == null || o.call(t, e);
		}
	}
}
//#endregion
//#region node_modules/vidstack/dist/prod/providers/hls/provider.js
var h = "https://cdn.jsdelivr.net", g = class extends d {
	constructor(...e) {
		super(...e), l(this, "$$PROVIDER_TYPE", "HLS"), l(this, "mh", null), l(this, "od", new u(this.video)), l(this, "lh", `${h}/npm/hls.js@^1.0.0/dist/hls.min.js`);
	}
	get ctor() {
		return this.mh;
	}
	get instance() {
		return this.od.instance;
	}
	get type() {
		return "hls";
	}
	get canLiveSync() {
		return !0;
	}
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
		super.setup(t), new f(this.lh, t, (n) => {
			this.mh = n, this.od.setup(n, t), t.delegate.p("provider-setup", { detail: this });
			let r = e(t.$store.source);
			r && this.loadSource(r);
		});
	}
	async loadSource({ src: e }) {
		var t;
		i(e) && ((t = this.od.instance) == null || t.loadSource(e));
	}
	onInstance(e) {
		let t = this.od.instance;
		return t && e(t), this.od.oh.add(e), () => this.od.oh.delete(e);
	}
	destroy() {
		this.od.Jg();
	}
};
l(g, "supported", o());
//#endregion
export { g as HLSProvider };
