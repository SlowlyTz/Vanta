import { a as e, p as t, u as n } from "./prod-yin0M9SD.js";
//#region node_modules/media-captions/dist/prod/ssa-parser.js
var r = /^Format:[\s\t]*/, i = /^Style:[\s\t]*/, a = /^Dialogue:[\s\t]*/, o = /[\s\t]*,[\s\t]*/, s = /\{[^}]+\}/g, c = /\\N/g, l = /^\[(.*)[\s\t]?Styles\]$/, u = /^\[(.*)[\s\t]?Events\]$/, d = class {
	constructor() {
		t(this, "f", void 0), t(this, "O", 0), t(this, "a", null), t(this, "j", []), t(this, "k", []), t(this, "N", null), t(this, "d", void 0), t(this, "P", {});
	}
	async init(e) {
		this.f = e, e.errors && (this.d = (await import("./errors-D8eOx1kY.js")).ParseErrorBuilder);
	}
	parse(e, t) {
		if (this.O) switch (this.O) {
			case 1:
				if (e === "") this.O = 0;
				else if (i.test(e)) if (this.N) {
					let t = e.replace(i, "").split(o);
					this.S(t);
				} else {
					var n;
					this.e((n = this.d) == null ? void 0 : n.T("Style", t));
				}
				else r.test(e) ? this.N = e.replace(r, "").split(o) : u.test(e) && (this.N = null, this.O = 2);
				break;
			case 2: if (e === "") this.Q();
			else if (a.test(e)) if (this.Q(), this.N) {
				let n = e.replace(a, "").split(o), r = this.U(n, t);
				r && (this.a = r);
			} else {
				var d;
				this.e((d = this.d) == null ? void 0 : d.T("Dialogue", t));
			}
			else this.a ? this.a.text += "\n" + e.replace(s, "").replace(c, "\n") : r.test(e) ? this.N = e.replace(r, "").split(o) : l.test(e) ? (this.N = null, this.O = 1) : u.test(e) && (this.N = null);
		}
		else e === "" || (l.test(e) ? (this.N = null, this.O = 1) : u.test(e) && (this.N = null, this.O = 2));
	}
	done() {
		return {
			metadata: {},
			cues: this.j,
			regions: [],
			errors: this.k
		};
	}
	Q() {
		var e, t;
		this.a && (this.j.push(this.a), (e = (t = this.f).onCue) == null || e.call(t, this.a), this.a = null);
	}
	S(e) {
		let t = "Default", n = {}, r, i = "center", a = "bottom", o, s = 1.2, c, l, u = 3, d = [];
		for (let p = 0; p < this.N.length; p++) {
			let m = this.N[p], h = e[p];
			switch (m) {
				case "Name":
					t = h;
					break;
				case "Fontname":
					n["font-family"] = h;
					break;
				case "Fontsize":
					n["font-size"] = `calc(${h} / var(--overlay-height))`;
					break;
				case "PrimaryColour":
					let e = f(h);
					e && (n["--cue-color"] = e);
					break;
				case "BorderStyle":
					u = parseInt(h, 10);
					break;
				case "BackColour":
					l = f(h);
					break;
				case "OutlineColour":
					let p = f(h);
					p && (c = p);
					break;
				case "Bold":
					parseInt(h) && (n["font-weight"] = "bold");
					break;
				case "Italic":
					parseInt(h) && (n["font-style"] = "italic");
					break;
				case "Underline":
					parseInt(h) && (n["text-decoration"] = "underline");
					break;
				case "StrikeOut":
					parseInt(h) && (n["text-decoration"] = "line-through");
					break;
				case "Spacing":
					n["letter-spacing"] = h + "px";
					break;
				case "AlphaLevel":
					n.opacity = parseFloat(h);
					break;
				case "ScaleX":
					d.push(`scaleX(${parseFloat(h) / 100})`);
					break;
				case "ScaleY":
					d.push(`scaleY(${parseFloat(h) / 100})`);
					break;
				case "Angle":
					d.push(`rotate(${h}deg)`);
					break;
				case "Shadow":
					s = parseInt(h, 10) * 1.2;
					break;
				case "MarginL":
					n["--cue-width"] = "auto", n["--cue-left"] = parseFloat(h) + "px";
					break;
				case "MarginR":
					n["--cue-width"] = "auto", n["--cue-right"] = parseFloat(h) + "px";
					break;
				case "MarginV":
					o = parseFloat(h);
					break;
				case "Outline":
					r = parseInt(h, 10);
					break;
				case "Alignment":
					let m = parseInt(h, 10);
					switch (m >= 4 && (a = m >= 7 ? "top" : "center"), m % 3) {
						case 1:
							i = "start";
							break;
						case 2:
							i = "center";
							break;
						case 3:
							i = "end";
							break;
					}
			}
		}
		if (n.R = a, n["--cue-white-space"] = "normal", n["--cue-line-height"] = "normal", n["--cue-text-align"] = i, a === "center" ? (n["--cue-top"] = "50%", d.push("translateY(-50%)")) : n[`--cue-${a}`] = (o || 0) + "px", u === 1 && (n["--cue-padding-y"] = "0"), (u === 1 || l) && (n["--cue-bg-color"] = u === 1 ? "none" : l), u === 3 && c && (n["--cue-outline"] = `${r}px solid ${c}`), u === 1 && typeof r == "number") {
			var m;
			let e = (m = l) == null ? "#000" : m;
			n["--cue-text-shadow"] = [c && p(r * 1.2, s * 1.2, c), c ? p(r / 2 * r, r / 2 * s, e) : p(r, s, e)].filter(Boolean).join(", ");
		}
		d.length && (n["--cue-transform"] = d.join(" ")), this.P[t] = n;
	}
	U(t, n) {
		let r = this.V(t), i = this.o(r.Start, r.End, n);
		if (!i) return;
		let a = new e(i[0], i[1], ""), o = { ...this.P[r.Style] || {} }, l = r.Name ? `<v ${r.Name}>` : "", u = o.R, d = r.MarginL && parseFloat(r.MarginL), f = r.MarginR && parseFloat(r.MarginR), p = r.MarginV && parseFloat(r.MarginV);
		return d && (o["--cue-width"] = "auto", o["--cue-left"] = d + "px"), f && (o["--cue-width"] = "auto", o["--cue-right"] = f + "px"), p && u !== "center" && (o[`--cue-${u}`] = p + "px"), a.text = l + t.slice(this.N.length - 1).join(", ").replace(s, "").replace(c, "\n"), delete o.R, Object.keys(o).length && (a.style = o), a;
	}
	V(e) {
		let t = {};
		for (let n = 0; n < this.N.length; n++) t[this.N[n]] = e[n];
		return t;
	}
	o(e, t, r) {
		let i = n(e), a = n(t);
		if (i !== null && a !== null && a > i) return [i, a];
		if (i === null) {
			var o;
			this.e((o = this.d) == null ? void 0 : o.q(e, r));
		}
		if (a === null) {
			var s;
			this.e((s = this.d) == null ? void 0 : s.r(t, r));
		}
		if (i != null && a !== null && a > i) {
			var c;
			this.e((c = this.d) == null ? void 0 : c.s(i, a, r));
		}
	}
	e(e) {
		if (e) {
			if (this.k.push(e), this.f.strict) throw this.f.cancel(), e;
			var t, n;
			(t = (n = this.f).onError) == null || t.call(n, e);
		}
	}
};
function f(e) {
	let t = parseInt(e.replace("&H", ""), 16);
	if (t >= 0) {
		let e = (t >> 24 & 255 ^ 255) / 255, n = t >> 16 & 255, r = t >> 8 & 255;
		return "rgba(" + [
			t & 255,
			r,
			n,
			e
		].join(",") + ")";
	}
	return null;
}
function p(e, t, n) {
	let r = Math.ceil(2 * Math.PI * e), i = "";
	for (let a = 0; a < r; a++) {
		let o = 2 * Math.PI * a / r;
		i += e * Math.cos(o) + "px " + t * Math.sin(o) + "px 0 " + n + (a == r - 1 ? "" : ",");
	}
	return i;
}
function m() {
	return new d();
}
//#endregion
export { m as default };
