import { a as e, i as t, o as n } from "./prod-BAD6V6LA.js";
//#region node_modules/media-captions/dist/prod/srt-parser.js
var r = /,/g, i = "-->", a = class extends n {
	parse(n, r) {
		if (n === "") this.a &&= (this.j.push(this.a), this.f.onCue?.(this.a), null), this.c = t.None;
		else if (this.c === t.Cue) this.a.text += (this.a.text ? "\n" : "") + n;
		else if (n.includes(i)) {
			let i = this.o(n, r);
			i && (this.a = new e(i[0], i[1], i[2].join(" ")), this.a.id = this.l, this.c = t.Cue);
		}
		this.l = n;
	}
	o(e, t) {
		return super.o(e.replace(r, "."), t);
	}
};
function o() {
	return new a();
}
//#endregion
export { o as default };
