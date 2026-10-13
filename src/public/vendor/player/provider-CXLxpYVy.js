import { p as e } from "./prod-yin0M9SD.js";
import { t } from "./provider-43H0hsgT.js";
//#region node_modules/vidstack/dist/prod/providers/audio/provider.js
var n = class extends t {
	constructor(...t) {
		super(...t), e(this, "$$PROVIDER_TYPE", "AUDIO");
	}
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
export { n as AudioProvider };
