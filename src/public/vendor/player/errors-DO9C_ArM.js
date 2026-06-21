import { n as e, r as t } from "./prod-BAD6V6LA.js";
//#region node_modules/media-captions/dist/prod/errors.js
var n = {
	p() {
		return new e({
			code: t.BadSignature,
			reason: "missing WEBVTT file header",
			line: 1
		});
	},
	q(n, r) {
		return new e({
			code: t.BadTimestamp,
			reason: `cue start timestamp \`${n}\` is invalid on line ${r}`,
			line: r
		});
	},
	r(n, r) {
		return new e({
			code: t.BadTimestamp,
			reason: `cue end timestamp \`${n}\` is invalid on line ${r}`,
			line: r
		});
	},
	s(n, r, i) {
		return new e({
			code: t.BadTimestamp,
			reason: `cue end timestamp \`${r}\` is greater than start \`${n}\` on line ${i}`,
			line: i
		});
	},
	w(n, r, i) {
		return new e({
			code: t.BadSettingValue,
			reason: `invalid value for cue setting \`${n}\` on line ${i} (value: ${r})`,
			line: i
		});
	},
	v(n, r, i) {
		return new e({
			code: t.UnknownSetting,
			reason: `unknown cue setting \`${n}\` on line ${i} (value: ${r})`,
			line: i
		});
	},
	u(n, r, i) {
		return new e({
			code: t.BadSettingValue,
			reason: `invalid value for region setting \`${n}\` on line ${i} (value: ${r})`,
			line: i
		});
	},
	t(n, r, i) {
		return new e({
			code: t.UnknownSetting,
			reason: `unknown region setting \`${n}\` on line ${i} (value: ${r})`,
			line: i
		});
	},
	T(n, r) {
		return new e({
			code: t.BadFormat,
			reason: `format missing for \`${n}\` block on line ${r}`,
			line: r
		});
	}
};
//#endregion
export { n as ParseErrorBuilder };
