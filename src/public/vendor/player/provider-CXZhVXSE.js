import { t as e } from "./provider-DUZ95Sv7.js";
//#region node_modules/vidstack/dist/prod/providers/audio/provider.js
var t = class extends e {
	$$PROVIDER_TYPE = "AUDIO";
	get type() {
		return "audio";
	}
	setup(e) {
		super.setup(e), this.type === "audio" && e.delegate.p("provider-setup", { detail: this });
	}
	get audio() {
		return this.j;
	}
};
//#endregion
export { t as AudioProvider };
