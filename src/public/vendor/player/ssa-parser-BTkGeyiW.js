import { a as e, u as t } from "./prod-BAD6V6LA.js";
//#region node_modules/media-captions/dist/prod/ssa-parser.js
var n = /^Format:[\s\t]*/, r = /^Style:[\s\t]*/, i = /^Dialogue:[\s\t]*/, a = /[\s\t]*,[\s\t]*/, o = /\{[^}]+\}/g, s = /\\N/g, c = /^\[(.*)[\s\t]?Styles\]$/, l = /^\[(.*)[\s\t]?Events\]$/, u = class {
	f;
	O = 0;
	a = null;
	j = [];
	k = [];
	N = null;
	d;
	P = {};
	async init(e) {
		this.f = e, e.errors && (this.d = (await import("./errors-DO9C_ArM.js")).ParseErrorBuilder);
	}
	parse(e, t) {
		if (this.O) switch (this.O) {
			case 1:
				if (e === "") this.O = 0;
				else if (r.test(e)) if (this.N) {
					let t = e.replace(r, "").split(a);
					this.S(t);
				} else this.e(this.d?.T("Style", t));
				else n.test(e) ? this.N = e.replace(n, "").split(a) : l.test(e) && (this.N = null, this.O = 2);
				break;
			case 2: if (e === "") this.Q();
			else if (i.test(e)) if (this.Q(), this.N) {
				let n = e.replace(i, "").split(a), r = this.U(n, t);
				r && (this.a = r);
			} else this.e(this.d?.T("Dialogue", t));
			else this.a ? this.a.text += "\n" + e.replace(o, "").replace(s, "\n") : n.test(e) ? this.N = e.replace(n, "").split(a) : c.test(e) ? (this.N = null, this.O = 1) : l.test(e) && (this.N = null);
		}
		else e === "" || (c.test(e) ? (this.N = null, this.O = 1) : l.test(e) && (this.N = null, this.O = 2));
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
		this.a &&= (this.j.push(this.a), this.f.onCue?.(this.a), null);
	}
	S(e) {
		let t = "Default", n = {}, r, i = "center", a = "bottom", o, s = 1.2, c, l, u = 3, p = [];
		for (let f = 0; f < this.N.length; f++) {
			let m = this.N[f], h = e[f];
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
					let e = d(h);
					e && (n["--cue-color"] = e);
					break;
				case "BorderStyle":
					u = parseInt(h, 10);
					break;
				case "BackColour":
					l = d(h);
					break;
				case "OutlineColour":
					let f = d(h);
					f && (c = f);
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
					p.push(`scaleX(${parseFloat(h) / 100})`);
					break;
				case "ScaleY":
					p.push(`scaleY(${parseFloat(h) / 100})`);
					break;
				case "Angle":
					p.push(`rotate(${h}deg)`);
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
		if (n.R = a, n["--cue-white-space"] = "normal", n["--cue-line-height"] = "normal", n["--cue-text-align"] = i, a === "center" ? (n["--cue-top"] = "50%", p.push("translateY(-50%)")) : n[`--cue-${a}`] = (o || 0) + "px", u === 1 && (n["--cue-padding-y"] = "0"), (u === 1 || l) && (n["--cue-bg-color"] = u === 1 ? "none" : l), u === 3 && c && (n["--cue-outline"] = `${r}px solid ${c}`), u === 1 && typeof r == "number") {
			let e = l ?? "#000";
			n["--cue-text-shadow"] = [c && f(r * 1.2, s * 1.2, c), c ? f(r / 2 * r, r / 2 * s, e) : f(r, s, e)].filter(Boolean).join(", ");
		}
		p.length && (n["--cue-transform"] = p.join(" ")), this.P[t] = n;
	}
	U(t, n) {
		let r = this.V(t), i = this.o(r.Start, r.End, n);
		if (!i) return;
		let a = new e(i[0], i[1], ""), c = { ...this.P[r.Style] || {} }, l = r.Name ? `<v ${r.Name}>` : "", u = c.R, d = r.MarginL && parseFloat(r.MarginL), f = r.MarginR && parseFloat(r.MarginR), p = r.MarginV && parseFloat(r.MarginV);
		return d && (c["--cue-width"] = "auto", c["--cue-left"] = d + "px"), f && (c["--cue-width"] = "auto", c["--cue-right"] = f + "px"), p && u !== "center" && (c[`--cue-${u}`] = p + "px"), a.text = l + t.slice(this.N.length - 1).join(", ").replace(o, "").replace(s, "\n"), delete c.R, Object.keys(c).length && (a.style = c), a;
	}
	V(e) {
		let t = {};
		for (let n = 0; n < this.N.length; n++) t[this.N[n]] = e[n];
		return t;
	}
	o(e, n, r) {
		let i = t(e), a = t(n);
		if (i !== null && a !== null && a > i) return [i, a];
		i === null && this.e(this.d?.q(e, r)), a === null && this.e(this.d?.r(n, r)), i != null && a !== null && a > i && this.e(this.d?.s(i, a, r));
	}
	e(e) {
		if (e) {
			if (this.k.push(e), this.f.strict) throw this.f.cancel(), e;
			this.f.onError?.(e);
		}
	}
};
function d(e) {
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
function f(e, t, n) {
	let r = Math.ceil(2 * Math.PI * e), i = "";
	for (let a = 0; a < r; a++) {
		let o = 2 * Math.PI * a / r;
		i += e * Math.cos(o) + "px " + t * Math.sin(o) + "px 0 " + n + (a == r - 1 ? "" : ",");
	}
	return i;
}
function p() {
	return new u();
}
//#endregion
export { p as default };
