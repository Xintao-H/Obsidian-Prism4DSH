// DSH adaptation, 2026-11-25. The upstream interactive renderer is mounted by a DSH slot.
// Source: RMvdesi/obsidian-prism, vendor/effort-slider/upstream-client.js (MIT notice in THIRD_PARTY_NOTICES.md).
"use strict";
/**
* Antigravity Codex 风格推理等级滑条 (antigravity-codex-effort-slider)
*/
(function (root, factory) {
try {
var exportsObj = factory(root);
if (typeof module === "object" && module && typeof module.exports === "object") {
module.exports = exportsObj;
}

} catch (err) {
// Factory error handled silently
}
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function (globalRoot) {
// ── 常量与默认几何参数 ──────────────────────────────────────────────────────
var STYLE_ELEMENT_ID = "dsh-obsidian-prism-effort-styles";
var KNOB_RADIUS = 14;
var ENERGY_START = 0;
var ENERGY_END = 0.5;
// Antigravity 官方推理档位枚举与展示名映射（对应 main.js 中的 DXb / EXb / GXb）
var AG_EFFORT_ORDER = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
var AG_EFFORT_LABELS = {
off: "Off",
minimal: "Minimal",
low: "Low",
medium: "Medium",
high: "High",
xhigh: "Extra",
max: "Max"
};
var AG_MODEL_LABEL_RE = /^(.*?)\s*\((off|minimal|low|medium|high|xhigh|extra|max)(?:\s+thinking)?\)\s*$/i;
var _EFF_ALIAS = Object.create(null);
"xhigh:xhigh|extra|extra high|超高|极高|極高|特高|很高;high:high|高;medium:medium|med|中|中等;low:low|低;minimal:minimal|极低|極低|最小|最低|极简|極簡;max:max|最高|最大|极限|極限;off:off|关闭|關閉|关|關|不推理|无|無|none|disabled;auto:auto|自动|自動;adaptive:adaptive|自适应|自適應;thinking:thinking|深度思考|思考中|思考;fixed:fixed|固定".split(";").forEach(function (g) {
var p = g.split(":"), k = p[0], vs = p[1].split("|");
for (var i = 0; i < vs.length; i += 1) _EFF_ALIAS[vs[i]] = k;
});
function _normEffTxt(raw) {
var s = String(raw || "").trim().replace(/^[(\uff08]+|[)\uff09]+$/g, "").trim().replace(/\s+thinking$/i, "").toLowerCase();
return _EFF_ALIAS[s] || _EFF_ALIAS[s.replace(/(.+?)(?:思考|推理|强度|強度)$/, "$1")] || "";
}
function _sameEffTxt(a, b) {
if (a === b) return true;
var ka = _normEffTxt(a), kb = _normEffTxt(b);
return ka && kb ? ka === kb : Boolean(a && b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase());
}
var _NO_TR_A = { "data-ag-i18n-skip": "1", "data-ag-no-tr": "1", "data-no-translate": "1", "data-translate": "no", translate: "no", "data-ag-localization-skip": "true", "data-agy-no-translate": "true", "data-antigravity-zh-skip": "1", "data-ag-no-i18n": "" };
function markNoTranslate(el) {
if (!el) return el;
var hc = el.classList && el.classList.contains ? el.classList.contains("notranslate") : (typeof el.className === "string" && /(?:^|\s)notranslate(?:\s|$)/.test(el.className));
if (hc && el.getAttribute && el.getAttribute("data-ag-i18n-skip") === "1" && el.getAttribute("data-antigravity-zh-skip") === "1" && el.getAttribute("data-ag-no-i18n") === "") return el;
if (el.setAttribute) {
for (var k in _NO_TR_A) if (!el.getAttribute || el.getAttribute(k) !== _NO_TR_A[k]) el.setAttribute(k, _NO_TR_A[k]);
}
if (!hc) {
if (el.classList && el.classList.add) el.classList.add("notranslate");
else if (typeof el.className === "string") el.className += (el.className ? " " : "") + "notranslate";
}
return el;
}
var CLAUDE_CELL = 28 / 6;
var CLAUDE_SWEEP_MS = 1600;
function isClaudeModel(name) {
if (!name || typeof name !== "string") return false;
return /claude/i.test(name);
}
// ── 连续物理运动参数 ────────────────────────────────────────────────────────
// full: 完整星云阻尼变速动画；fast: 快速 ~70ms 跟手吸附（默认）；quick: 0 动画直接跳格
var _F = Object.freeze;
var MOTION = _F({ maxSpeed: 3.2, accel: 28, decel: 18, snapEps: 0.0015, velEps: 0.01 });
var MOTION_REDUCED = _F({ maxSpeed: 1e6, accel: 1e9, decel: 1e9, snapEps: 1e-4, velEps: 1e6 });
var MOTION_FAST = _F({ maxSpeed: 18, accel: 260, decel: 180, snapEps: 0.002, velEps: 0.04 });
var _REL_PRJ = 0.09, _PS_EMA = 0.45, _PS_STL = 0.05, _PS_TAU = 0.035;
var SETTINGS_KEY = "ag.codexEffortSlider.settings.v1";
var LEGACY_SETTINGS_KEY = "dsh.codexEffortSlider.settings.v1";
var SETTINGS_EVENT = "ag:codex-effort-slider:settings";
var SETTINGS_VERSION = 1;
var SETTINGS_SCHEMA = _F([
_F({ key: "motion", label: "动画效果", labelEn: "Animation", defaultValue: "fast", options: _F([
_F({ value: "fast", label: "快速动画", labelEn: "Fast", hint: "拨过 1/3 即切档 · ~70ms 快速吸附", hintEn: "Snaps after 1/3 travel (~70ms)" }),
_F({ value: "quick", label: "简洁动画", labelEn: "Instant", hint: "无过渡 · 直接跳档", hintEn: "No transition, immediate jump" }),
_F({ value: "full", label: "完整动画", labelEn: "Full", hint: "匀变速追赶 + 星尘渐亮", hintEn: "Smooth physics catch-up + starfield" })
]) }),
_F({ key: "ticks", label: "已到达档位的刻度点", labelEn: "Reached Tick Marks", defaultValue: "highlight", options: _F([
_F({ value: "highlight", label: "亮白显示", labelEn: "Bright", hint: "默认 · 已滑过档位高亮", hintEn: "Default: highlight reached ticks" }),
_F({ value: "dim", label: "与未到达同色", labelEn: "Muted", hint: "所有刻度点保持柔和半透明", hintEn: "Keep all ticks softly muted" }),
_F({ value: "hidden", label: "隐藏", labelEn: "Hidden", hint: "不显示任何刻度点", hintEn: "Hide all tick marks" })
]) })
]);
function schemaDefaults() {
var out = { v: SETTINGS_VERSION };
for (var i = 0; i < SETTINGS_SCHEMA.length; i += 1) out[SETTINGS_SCHEMA[i].key] = SETTINGS_SCHEMA[i].defaultValue;
return out;
}
function normalizeSettings(raw) {
var base = schemaDefaults();
if (!raw || typeof raw !== "object") return base;
for (var i = 0; i < SETTINGS_SCHEMA.length; i += 1) {
var it = SETTINGS_SCHEMA[i], c = raw[it.key];
for (var j = 0; j < it.options.length; j += 1) if (it.options[j].value === c) { base[it.key] = c; break; }
}
if (!raw.motion && raw.reducedMotion === true) base.motion = "quick";
return base;
}
function _win(w) { return w || (typeof window !== "undefined" ? window : globalRoot); }
function resolveStorage(win) { try { var w = _win(win); return w && w.localStorage || null; } catch (e) { return null; } }
var _cfgCache = null, _cfgStorage = null;
function _invCfg() { _cfgCache = _cfgStorage = null; }
function readSettings(win) {
var s = resolveStorage(win);
if (!s) return schemaDefaults();
if (_cfgCache && _cfgStorage === s) return _cfgCache;
try { var t = s.getItem(SETTINGS_KEY) || s.getItem(LEGACY_SETTINGS_KEY); _cfgStorage = s; return (_cfgCache = t ? normalizeSettings(JSON.parse(t)) : schemaDefaults()); }
catch (e) { return schemaDefaults(); }
}
function writeSettings(patch, win) {
var w = _win(win), next = normalizeSettings(Object.assign({}, readSettings(w), patch || {})), s = resolveStorage(w);
if (s) { try { s.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch (e) {} }
_cfgCache = s ? next : null; _cfgStorage = s;
try { if (w && w.dispatchEvent && w.CustomEvent) w.dispatchEvent(new w.CustomEvent(SETTINGS_EVENT, { detail: next })); } catch (e) {}
return next;
}
function resetSettings(win) { return writeSettings(schemaDefaults(), win); }
function onSettingsChange(fn, win) {
var w = _win(win);
if (!w || typeof w.addEventListener !== "function") return function () {};
var hC = function (ev) { _invCfg(); fn(ev && ev.detail ? normalizeSettings(ev.detail) : readSettings(w)); };
var hS = function (ev) { if (ev && (ev.key === SETTINGS_KEY || ev.key === LEGACY_SETTINGS_KEY)) { _invCfg(); fn(readSettings(w)); } };
w.addEventListener(SETTINGS_EVENT, hC); w.addEventListener("storage", hS);
return function () { w.removeEventListener(SETTINGS_EVENT, hC); w.removeEventListener("storage", hS); };
}
function prefersReducedMotion(win) {
try { var w = _win(win); return Boolean(w && w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
}
function getPrismRootAttr(doc, win, attr) {
try { var d = doc || (win && win.document) || (typeof document !== "undefined" ? document : null), r = d && d.documentElement; return (r && r.getAttribute && r.getAttribute(attr)) || ""; } catch (e) { return ""; }
}
function isPrismMotionOff(doc, win) { return getPrismRootAttr(doc, win, "data-ag-cs-motion") === "off" || prefersReducedMotion(win); }
function resolvePrismAccentTone(doc, win) { var ac = getPrismRootAttr(doc, win, "data-ag-cs-accent"); return ac === "mono" || ac === "amber" || ac === "iris" || ac === "cobalt" ? ac : "follow"; }
function motionMode(win, explicitSettings, doc) { return isPrismMotionOff(doc, win) ? "quick" : (explicitSettings ? normalizeSettings(explicitSettings) : readSettings(win)).motion || "fast"; }
function motionParamsForMode(mode) { return mode === "quick" ? MOTION_REDUCED : mode === "full" ? MOTION : MOTION_FAST; }
// ── 诊断环形缓冲区 ──────────────────────────────────────────────────────────
var _tr = [];
function tracePush(type, detail) {
var e = Object.assign({ t: Date.now(), type: String(type || "event") }, detail && typeof detail === "object" ? detail : null);
_tr.push(e);
if (_tr.length > 200) _tr.splice(0, _tr.length - 200);
}
function dumpTrace(win) {
var w = _win(win);
return { plugin: "antigravity-codex-effort-slider@1.2.1", time: new Date().toISOString(), ua: w && w.navigator ? w.navigator.userAgent : "node", settings: readSettings(w), events: _tr.slice() };
}
function clamp01(v) { var n = Number(v); return !Number.isFinite(n) || n <= 0 ? 0 : n >= 1 ? 1 : n; }
function clampAbs(v, l) { var m = Math.max(0, Number(l) || 0), n = Number(v) || 0; return n > m ? m : n < -m ? -m : n; }
function pctFromIndex(i, c) { var n = Number(c) || 0; return n <= 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round(Number(i) || 0))) / (n - 1); }
function indexFromPct(p, c) { var n = Number(c) || 0; return n <= 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round(clamp01(p) * (n - 1)))); }
// 迟滞棘轮分档器（推进 1/3 切档，回退 2/3 防抖）
function detentTargetIndex(currentIndex, ptrPct, count) {
var n = Number(count) || 0, p = clamp01(ptrPct);
if (n <= 1) return 0;
if (typeof currentIndex !== "number" || currentIndex < 0 || currentIndex >= n) return indexFromPct(p, n);
var step = 1 / (n - 1), idx = currentIndex;
if (p >= idx * step) { while (idx < n - 1 && p >= (idx + 1 / 3) * step - 1e-9) idx += 1; }
else { while (idx > 0 && p <= (idx - 1 / 3) * step + 1e-9) idx -= 1; }
return idx;
}
function knobOffsetOf(pct, radiusPx) {
var p = clamp01(pct);
var r = typeof radiusPx === "number" && Number.isFinite(radiusPx) ? radiusPx : KNOB_RADIUS;
return "calc(" + r + "px + (100% - " + (r * 2) + "px) * " + p + ")";
}
function motionSettled(state, params) {
if (!state) return true;
var cfg = params || MOTION;
var dist = Math.abs((Number(state.target) || 0) - (Number(state.x) || 0));
var vel = Math.abs(Number(state.v) || 0);
return dist <= cfg.snapEps && vel <= cfg.velEps;
}
/**
* 连续物理步进器：基于刹车距离 v^2 / (2 * decel) 平滑追赶 target，无过冲回弹
*/
function motionStep(state, dtSeconds, params) {
if (!state) return;
var cfg = params || MOTION, dt = Number(dtSeconds);
if (!Number.isFinite(dt) || dt <= 0) return;
if (dt > 0.05) dt = 0.05;
var target = clamp01(state.target), x = clamp01(state.x), v = Number(state.v) || 0, diff = target - x, dist = Math.abs(diff);
if (dist <= cfg.snapEps && Math.abs(v) <= cfg.velEps) { state.x = target; state.v = state.a = 0; return; }
var dir = diff >= 0 ? 1 : -1;
var a = (v * dir >= 0 && (v * v) / (2 * cfg.decel) >= dist) ? -dir * cfg.decel : dir * cfg.accel;
var nextV = clampAbs(v + a * dt, cfg.maxSpeed), nextX = x + nextV * dt;
if ((target - x) * (target - nextX) <= 0 && Math.abs(nextV) <= cfg.maxSpeed) { state.x = target; state.v = state.a = 0; return; }
state.a = a;
state.x = nextX <= 0 ? (state.v = Math.max(0, nextV), 0) : nextX >= 1 ? (state.v = Math.min(0, nextV), 1) : (state.v = nextV, nextX);
}
function decayPointerSpeed(rawSpeed, idleSeconds) {
var v = Number(rawSpeed) || 0;
var idle = Number(idleSeconds) || 0;
if (idle <= _PS_STL) return v;
var decay = Math.exp(-(idle - _PS_STL) / _PS_TAU);
var out = v * decay;
return Math.abs(out) < 1e-4 ? 0 : out;
}
function releaseIndexFor(ptrPct, rawSpeed, idleSeconds, count) {
var v = decayPointerSpeed(rawSpeed, idleSeconds);
var projected = clamp01((Number(ptrPct) || 0) + v * _REL_PRJ);
return indexFromPct(projected, count);
}
// ── 22 颗黄金分割确定性星尘与色彩引擎（对齐 dsh-codex-effort-slider 右向左横穿星空） ──
var PARTICLE_COUNT = 22;
var _SF_MEAN = 1.5;
var _SF_SPR = 0.08;
var STARFIELD_MIN = 0.5;
var GOLDEN_RATIO = 0.6180339887498949;
var MAX_SPEED_FACTOR = 2;
var _RM_SLOW = 2.6;
/** 确定性伪随机 [0,1)：不用 Math.random，每次渲染完全一致且可离线断言 */
function starHash01(index, salt) {
var value = ((index + 1) * (salt || 1) * 2654435761) % 4294967296;
return ((value >>> 8) % 1000) / 1000;
}
// 22 颗黄金比确定性星尘粒子（右向左横穿）
var PARTICLES = (function () {
var count = PARTICLE_COUNT, out = [], byPhase = [], i;
for (i = 0; i < count; i += 1) {
var b = STARFIELD_MIN + (1 - STARFIELD_MIN) * starHash01(i, 61);
out.push({ id: i, y: 0, phase: ((i + 1) * GOLDEN_RATIO) % 1, threshold: i / count, brightness: Math.round(b * 1000) / 1000 });
byPhase.push(i);
}
byPhase.sort(function (a, b) { return out[a].phase - out[b].phase; });
var slots = [10, 21, 1, 8, 19, 6, 17, 4, 15, 2, 13, 20, 0, 11, 18, 9, 16, 7, 14, 5, 12, 3];
for (var r = 0; r < count; r += 1) out[byPhase[r]].y = Math.round((8 + (slots[r] / (count - 1)) * 84) * 100) / 100;
for (i = 0; i < count; i += 1) _F(out[i]);
return _F(out);
})();
function isOffLevel(text) {
if (text === null || text === undefined) return false;
if (typeof text === "object") return isOffLevel(text.id || text.name || text.effort || text.label || "");
return /^(?:off|none|disabled|0|关闭|关|不推理|无)$/.test(String(text).trim().toLowerCase());
}
/* ── Claude Ultracode 像素点阵抖动引擎 ──────────────────────────────── */
function hash01(a, b, c) {
var h = (a | 0) * 374761393 + (b | 0) * 668265263 + (c | 0) * 1274126177;
h = (h ^ (h >>> 13)) * 1274126177;
h = h ^ (h >>> 16);
return ((h >>> 0) % 100000) / 100000;
}
function ditherAlphaAt(x, w, col, row) {
var t = clamp01(x / Math.max(1, w));
var ramp = 0.92 + 0.08 * t;
var jitter = 0.25 + 0.75 * hash01(col, row, 7);
return clamp01(ramp * jitter);
}
var _DRW = [];
for (var _r = 0; _r < 6; _r += 1) {
var _w1 = 3 + ((hash01(0, _r, 47) * 5) | 0), _s1 = (5 + 10 * hash01(0, _r, 43)) / 6.2831853, _w2 = 2 + ((hash01(0, _r, 61) * 4) | 0);
_DRW.push([_w1, _s1, hash01(0, _r, 53), _w2, _s1 * (_w2 / _w1), hash01(0, _r, 71)]);
}
var _ditherLightLut = null;
function _getLightLut() {
if (_ditherLightLut) return _ditherLightLut;
var lut = [], cl = function (v, a, b) { return v < a ? a : v > b ? b : (v + 0.5) | 0; };
for (var i = 0; i < 256; i += 1) {
var tv = (i >> 5) / 7, ov = -40 + (((i >> 2) & 7) / 7) * 96, pv = (i & 3) / 3;
lut.push("rgb(" + cl(187 - 32 * tv + ov + 12 * pv, 124, 240) + "," + cl(184 - 46 * tv + (ov < 0 ? ov : ov * 1.05) + 12 * pv, 100, 232) + "," + cl(206 + 4 * tv + (ov < 0 ? ov : ov * 0.65) + 8 * pv, 180, 252) + ")");
}
return (_ditherLightLut = lut);
}
function valueNoise(col, row, timeSec, speed, seed) {
var tt = timeSec * speed + hash01(col, row, seed) * 17;
var step = Math.floor(tt);
var f = tt - step;
var e = f * f * (3 - 2 * f);
var a = hash01(col, row, (step % 997) + seed * 11);
var b = hash01(col, row, ((step + 1) % 997) + seed * 11);
return a + (b - a) * e;
}
var mergeCache = null;
var mergeCacheKey = "";
function getMergeMap(cols, rows) {
var key = cols + "x" + rows;
if (mergeCache && mergeCacheKey === key) return mergeCache;
var map = new Uint8Array(cols * rows);
for (var r = 0; r < rows; r += 1) {
for (var c = 0; c < cols; c += 1) {
var i = r * cols + c;
if (map[i]) continue;
var h = hash01(c, r, 91);
if (h < 0.02 && c + 1 < cols && r + 1 < rows && !map[i + 1] && !map[i + cols] && !map[i + cols + 1]) {
map[i] = 1; map[i + 1] = 2; map[i + cols] = 2; map[i + cols + 1] = 2;
} else if (h < 0.06 && c + 1 < cols && !map[i + 1]) {
map[i] = 3; map[i + 1] = 2;
} else if (h < 0.08 && r + 1 < rows && !map[i + cols]) {
map[i] = 4; map[i + cols] = 2;
}
}
}
mergeCache = map;
mergeCacheKey = key;
return map;
}
function surfaceIsDark(win, doc) {
try {
var d = doc || (typeof document !== "undefined" ? document : null), w = win || (typeof window !== "undefined" ? window : globalRoot), r = d && d.documentElement;
if (!d || !d.body || !w) return true;
var pt = r && r.getAttribute ? r.getAttribute("data-ag-cs-theme") : "";
if (pt === "dark" || pt === "light") return pt === "dark";
if ((r && r.classList.contains("dark")) || d.body.classList.contains("dark")) return true;
var ps = ((w.getComputedStyle && w.getComputedStyle(d.body).backgroundColor) || "").match(/[\d.]+/g);
return !ps || ps.length < 3 || (ps.length > 3 && +ps[3] < 0.5) || (0.2126 * ps[0] + 0.7152 * ps[1] + 0.0722 * ps[2]) / 255 < 0.5;
} catch (e) { return true; }
}
// Claude 点阵绘制（intensity ∈ [0,1] 连续控制底晕/密度/亮度）
var _ditherWashCache = typeof WeakMap === "function" ? new WeakMap() : null;
function paintDither(ctx, w, h, dark, progress, timeSec, intensity) {
if (!ctx) return;
var _mx = Math.max, _mn = Math.min, _pw = Math.pow;
var strength = typeof intensity === "number" ? clamp01(intensity) : 1;
ctx.clearRect(0, 0, w, h);
if (strength <= 0 || w <= 0) return;
var keepRatio = strength >= 1 ? 1 : 0.25 + 0.75 * strength, alphaMul = 0.45 + 0.55 * strength;
var wash = null, wKey = progress >= 1 ? w + "|" + (dark ? 1 : 0) : "";
if (wKey && _ditherWashCache) {
var _wc = _ditherWashCache.get(ctx);
if (_wc && _wc.k === wKey) wash = _wc.g;
}
if (!wash) {
var k = 1 - progress, s1 = _mx(0, _mn(1, k - 0.08)), s2 = _mx(s1, _mn(1, k + 0.18));
wash = ctx.createLinearGradient(0, 0, w, 0);
var stops = dark
? [[0, "rgba(112,78,162,0)"], [s1, "rgba(112,78,162,0)"], [s2, "rgba(118,84,169,0.3)"], [1, "rgba(116,84,170,0.75)"]]
: [[0, "rgba(142,118,192,0)"], [s1, "rgba(142,118,192,0)"], [s2, "rgba(142,118,192,0.45)"], [1, "rgba(142,118,192,1)"]];
for (var si = 0; si < 4; si += 1) wash.addColorStop(stops[si][0], stops[si][1]);
if (wKey && _ditherWashCache) _ditherWashCache.set(ctx, { k: wKey, g: wash });
}
ctx.globalAlpha = strength;
ctx.fillStyle = wash;
ctx.fillRect(0, 0, w, h);
var purple = dark ? "rgb(208,192,246)" : "rgb(150,130,205)";
var cell = h / 6 > 0 ? h / 6 : CLAUDE_CELL, cols = Math.ceil(w / cell), rows = 6, front = 1 - progress;
var lmap = !dark ? getMergeMap(cols, rows) : null;
var lightLut = !dark ? _getLightLut() : null;
var size = cell * 0.72;
for (var col = 0; col < cols; col += 1) {
var x = col * cell, t = clamp01(x / _mx(1, w)), fade = clamp01((t - 0.02) / 0.48);
for (var row = 0; row < rows; row += 1) {
if (keepRatio < 1 && hash01(col, row, 101) > keepRatio) continue;
var base = ditherAlphaAt(x, w, col, row) * alphaMul;
if (base < 0.05) continue;
var edgeJit = (hash01(col, row, 31) - 0.5) * 0.05;
if (t < front + edgeJit) continue;
var appear = (0.35 + 0.65 * clamp01((t - front - edgeJit) / 0.04)) * (dark ? 1 : alphaMul);
var rw = _DRW[row];
var u1 = (t * rw[0] + timeSec * rw[1] + rw[2]) % 1;
if (u1 < 0) u1 += 1;
var u2 = (t * rw[3] + timeSec * rw[4] + rw[5]) % 1;
if (u2 < 0) u2 += 1;
var p1 = _pw(1 - u1, 2.6 + 3.4 * hash01(col, row, 17)), p2 = _pw(1 - u2, 3.4);
var pulse = _mx(p1, p2 * (0.55 + 0.45 * hash01(col, row, 19))) * 0.85;
var wAmt = clamp01(pulse * (0.35 + 0.65 * t)) * (0.55 + 0.45 * hash01(col, row, 71));
if (progress < 0.999) wAmt = _mx(wAmt, clamp01(1 - (t - front) / 0.16) * (0.55 + 0.45 * hash01(col, row, 73)));
if (!dark) {
var lt = clamp01((t - 0.05) / 0.2);
if (lt <= 0) continue;
var mv = lmap[row * cols + col];
if (mv === 2 || hash01(col, row, 95) < 0.03) continue;
var y2 = row * cell, off = (hash01(col, row, 93) - 0.42) * (22 + 66 * t);
if (off > 0) off *= 1.1;
var lw = cell * (mv === 3 || mv === 1 ? 2 : 1) * 0.88, lh = cell * (mv === 4 || mv === 1 ? 2 : 1) * 0.88;
var flicker = valueNoise(col, row, timeSec, 0.9, 83), density = clamp01((t - 0.12) / 0.35);
var presence = density > 0.9 ? 1 : clamp01((0.2 + 0.8 * density - flicker) / 0.2);
if (presence <= 0.01) continue;
var lAlpha = clamp01(lt * appear * presence * (0.7 + 0.3 * (1 - flicker)) * (0.85 + 0.15 * hash01(col, row, 29)));
ctx.globalAlpha = lAlpha;
ctx.fillStyle = lightLut[(_mn(7, (t * 7.99) | 0) << 5) | (_mx(0, _mn(7, (((off + 40) / 96) * 7.99) | 0)) << 2) | _mn(3, (pulse * 3.99) | 0)];
ctx.fillRect(x + 0.5, y2 + 0.5, lw, lh);
if (wAmt > 0.03) {
ctx.globalAlpha = _mn(1, (lAlpha / alphaMul) * (0.12 + 0.88 * wAmt));
ctx.fillStyle = "rgb(247,243,255)";
var ins = lw * 0.14;
ctx.fillRect(x + 0.5 + ins, y2 + 0.5 + ins, lw - ins * 2, lh - ins * 2);
}
continue;
}
var flick = valueNoise(col, row, timeSec, 1.5, 5), gap = 0.6 + 0.4 * clamp01((flick - (1 - fade) * 0.5) / 0.3);
var vis = clamp01((t - 0.2) / 0.18), baseAlpha = 0.04 + 0.96 * vis + 0.06 * clamp01((flick - 0.5) / 0.5) * (1 - vis);
var gridAlpha = clamp01(base * baseAlpha * gap * appear * 1.15 * (0.9 + 0.1 * hash01(col, row, 29)));
if (gridAlpha < 0.008) continue;
var y = row * cell;
ctx.globalAlpha = _mn(1, gridAlpha * 0.55);
ctx.fillStyle = purple;
ctx.fillRect(x + 0.5, y + 0.5, size, size);
if (wAmt > 0.03) {
ctx.globalAlpha = _mn(1, (gridAlpha / alphaMul) * (0.1 + 0.72 * wAmt));
ctx.fillStyle = "rgb(220, 204, 255)";
ctx.fillRect(x + 0.5, y + 0.5, size, size);
}
}
}
ctx.globalAlpha = 1;
}
function energyStopsFor(levels) {
var list = Array.isArray(levels) ? levels : [];
var n = list.length;
if (n <= 1) return { start: 0, end: 0.5, hasOffFirst: false };
var first = list[0];
var firstLabel = first && typeof first === "object" ? (first.effort || first.label || first.id || "") : String(first || "");
var hasOffFirst = isOffLevel(firstLabel);
var start = hasOffFirst ? 1 / (n - 1) : 0;
var end = (start + 1) / 2;
return { start: start, end: end, hasOffFirst: hasOffFirst };
}
function energyForPct(pct, startOverride) {
var p = clamp01(pct);
var start = typeof startOverride === "number" && Number.isFinite(startOverride) ? clamp01(startOverride) : ENERGY_START;
if (p <= start || start >= 1) return 0;
return clamp01((p - start) / (1 - start));
}
function speedFor(pct, startOverride) {
var e = energyForPct(pct, startOverride);
return Math.min(MAX_SPEED_FACTOR, Math.max(0.35, 2 * e));
}
function claudeIntensityFor(pct, startOverride) {
var e = energyForPct(pct, startOverride);
if (e <= 0) return 0;
return Math.round(Math.pow(e, 1.5) * 1000) / 1000;
}
function claudeSpeedFor(pct, startOverride) {
return speedFor(pct, startOverride) / MAX_SPEED_FACTOR;
}
function starDurationFor(starOrIndex, speedFactor) {
var idx = typeof starOrIndex === "number" ? starOrIndex : (starOrIndex && typeof starOrIndex.id === "number" ? starOrIndex.id : 0);
var speed = Math.min(MAX_SPEED_FACTOR, Math.max(0.35, typeof speedFactor === "number" && Number.isFinite(speedFactor) ? speedFactor : MAX_SPEED_FACTOR));
return ((_SF_MEAN * MAX_SPEED_FACTOR) / speed) * (1 - _SF_SPR + 2 * _SF_SPR * starHash01(idx, 29));
}
function starDelayFor(starOrIndex, duration) {
var idx = typeof starOrIndex === "number" ? starOrIndex : (starOrIndex && typeof starOrIndex.id === "number" ? starOrIndex.id : 0);
var p = PARTICLES[idx], ph = p && typeof p.phase === "number" ? p.phase : 0;
return -((ph + starHash01(idx, 53) * 0.03) % 1) * (typeof duration === "number" && duration > 0 ? duration : starDurationFor(idx, MAX_SPEED_FACTOR));
}
function starLayerOpacityFor(energyOrPct, startOverride) {
var e = typeof startOverride === "number" ? energyForPct(energyOrPct, startOverride) : clamp01(energyOrPct);
return e <= 0 ? 0 : Math.round((0.6 + 0.4 * e) * 1000) / 1000;
}
function parseHexRgb(hex) {
var n = parseInt(String(hex || "").replace(/^#/, ""), 16);
return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(hexA, hexB, t) {
var k = clamp01(t), a = parseHexRgb(hexA), b = parseHexRgb(hexB), m = function (i) { return Math.round(a[i] + (b[i] - a[i]) * k); };
return "#" + ((1 << 24) | (m(0) << 16) | (m(1) << 8) | m(2)).toString(16).slice(1);
}
var TONE_PAL = {
mono: ["#71717a", "#a1a1aa", "#d4d4d8", ""],
amber: ["#b45309", "#d97706", "#f59e0b", "#f59e0b"],
iris: ["#6d28d9", "#8b5cf6", "#a855f7", "#a78bfa"],
cobalt: ["#1d4ed8", "#2563eb", "#0284c7", "#38bdf8"]
};
function fillColorFor(pct, startOverride, endOverride, isClaude, accentOverride) {
var p = clamp01(pct);
var start = typeof startOverride === "number" && Number.isFinite(startOverride) ? startOverride : ENERGY_START;
var end = typeof endOverride === "number" && Number.isFinite(endOverride) ? endOverride : ENERGY_END;
var tone = accentOverride || resolvePrismAccentTone(null, null);
var tp = tone === "mono" || (!isClaude && TONE_PAL[tone]) ? TONE_PAL[tone] : isClaude ? ["#71717a", "#a78bfa", "#704ea2"] : ["#4d93f8", "#9333ea", "#4c1d95"];
if (p <= start + 1e-6) return tp[0];
if (p <= end + 1e-6) return mixHex(tp[0], tp[1], (p - start) / Math.max(1e-6, end - start));
return mixHex(tp[1], tp[2], (p - end) / Math.max(1e-6, 1 - end));
}
function fillBackgroundFor(pct, startOverride, endOverride, isClaude, accentOverride) {
var p = clamp01(pct);
var start = typeof startOverride === "number" && Number.isFinite(startOverride) ? startOverride : ENERGY_START;
var end = typeof endOverride === "number" && Number.isFinite(endOverride) ? endOverride : ENERGY_END;
var tone = accentOverride || resolvePrismAccentTone(null, null), lg = "linear-gradient(90deg,";
if (tone === "mono") return p <= 0.05 ? "rgba(161, 161, 170, 0.22)" : lg + " rgba(113, 113, 122, 0.45) 0%, " + fillColorFor(p, start, end, false, "mono") + " 100%)";
if (isClaude) return p <= 0.05 ? "rgba(142, 118, 192, 0.15)" : lg + " rgba(142, 118, 192, 0.25) 0%, " + fillColorFor(p, start, end, true, "follow") + " 100%)";
if (TONE_PAL[tone]) return lg + " " + TONE_PAL[tone][0] + " 0%, " + fillColorFor(p, start, end, false, tone) + " 100%)";
if (p <= start + 1e-6) return "#4d93f8";
var ec = fillColorFor(p, start, end, false, "follow"), sb = start > 0 ? Math.round((start / p) * 100) : 0;
var pre = lg + " #4d93f8 0%," + (sb > 0 ? " #4d93f8 " + sb + "%," : "");
return p <= end + 1e-6 ? pre + " " + ec + " 100%)" : pre + " #9333ea " + Math.round((end / p) * 100) + "%, " + ec + " 100%)";
}
function valueColorFor(label, index, count, isMax, hasOffFirst, isClaude, accentOverride) {
if (isOffLevel(label)) return "";
var n = Number(count) || 0;
if (n <= 1) return "";
var tone = accentOverride || resolvePrismAccentTone(null, null);
if (tone === "mono") return "";
var tp = !isClaude && TONE_PAL[tone];
var lo = isClaude ? "#94a3b8" : tp ? tp[1] : "#4d93f8";
var hi = isClaude ? "#c4b5fd" : tp ? tp[3] : "#8b5cf6";
if (isMax || index === n - 1) return hi;
var idx = typeof index === "number" && index >= 0 ? index : 0;
var first = hasOffFirst ? 1 : 0;
if (!tp && idx <= first) return lo;
if (isClaude && n === 3 && idx === 1) return "#a78bfa";
return mixHex(lo, hi, clamp01((idx - first) / Math.max(1, n - 1 - first)));
}
// ── 样式表注入（对齐 dsh-codex-effort-slider 右向左星尘横穿 + 星云扫光 + Antigravity 面板适配） ──
// ── 右键设置面板 ────────────────────────────────────────────────────────────
var SET_TITLE_I18N = { "zh-CN": "推理等级滑条设置", "zh-TW": "推理等級滑桿設定", en: "Effort Slider", ja: "推論スライダー設定", ko: "추론 슬라이더 설정", es: "Ajustes de esfuerzo", fr: "Réglages d’effort", de: "Aufwandsregler-Einstellungen" };
var SET_HEAD_I18N = { "zh-CN": "推理等级滑条", "zh-TW": "推理等級滑桿", en: "Effort Slider", ja: "推論スライダー", ko: "추론 슬라이더", es: "Nivel de esfuerzo", fr: "Niveau d’effort", de: "Aufwandsregler" };
var FIXED_I18N = { "zh-CN": "固定", "zh-TW": "固定", en: "Fixed", ja: "固定", ko: "고정", es: "Fijo", fr: "Fixe", de: "Fest" };
function _normSliderLang(raw, win) {
var v = String(raw || "").trim();
if (!v || v.toLowerCase() === "auto") {
var w = _win(win);
var navObj = w && "navigator" in w ? w.navigator : (typeof navigator !== "undefined" ? navigator : null);
v = String(navObj?.language || "").trim();
}
var s = v.toLowerCase().replace(/_/g, "-");
if (!s || s === "auto") return "en";
if (s === "yue" || s.startsWith("yue-") || s === "zh-yue" || s.includes("cantonese")) return "zh-CN";
if (/^zh-(tw|hant|hk|mo)/.test(s) || s === "tw" || s === "hant") return "zh-TW";
if (/^zh/.test(s)) return "zh-CN";
if (/^(ja|jp)/.test(s) || s === "japanese") return "ja";
if (/^(ko|kr)/.test(s) || s === "korean") return "ko";
if (/^es/.test(s) || s === "spanish") return "es";
if (/^fr/.test(s) || s === "french") return "fr";
if (/^de/.test(s) || s === "german") return "de";
return "en";
}
function _isZhLang(lk) { var n = _normSliderLang(lk); return n === "zh-CN" || n === "zh-TW"; }
function openSettingsPanel(options) {
var o = options || {}, d = o.document || (typeof document !== "undefined" ? document : null);
var w = o.window || d?.defaultView || (typeof window !== "undefined" ? window : globalRoot);
if (!d?.body) return () => {};

var lk = _normSliderLang(getPrismRootAttr(d, w, "data-ag-cs-lang"), w);
var zh = lk === "zh-CN" || lk === "zh-TW";
d.querySelector(".ces-set")?.remove?.();
var mk = (t, c, tx) => { var e = d.createElement(t); if (c) e.className = c; if (tx) e.textContent = tx; return e; };
var p = markNoTranslate(mk("div", "ces-set"));
p.setAttribute("role", "dialog");
p.setAttribute("aria-label", SET_TITLE_I18N[lk] || SET_TITLE_I18N.en);
p.style.left = Math.max(8, Math.min((w?.innerWidth || 800) - 276, typeof o.x === "number" ? o.x : 120)) + "px";
p.style.top = Math.max(8, Math.min((w?.innerHeight || 600) - 230, typeof o.y === "number" ? o.y : 120)) + "px";
var hd = mk("div", "ces-set-head");
hd.appendChild(mk("span", "", SET_HEAD_I18N[lk] || SET_HEAD_I18N.en));
hd.appendChild(mk("span", "ces-set-ver", "v1.2.1"));
p.appendChild(hd);
var obs = [];
var ref = () => {
var cur = readSettings(w);
for (var it of obs) {
var on = cur[it.k] === it.v;
if (it.b.classList) it.b.classList.toggle ? it.b.classList.toggle("is-on", on) : it.b.classList[on ? "add" : "remove"]("is-on");
else it.b.className = on ? "ces-set-opt is-on" : "ces-set-opt";
it.b.setAttribute("aria-pressed", String(on));
}
};
for (var sc of SETTINGS_SCHEMA) {
var g = mk("div", "ces-set-group"), r = mk("div", "ces-set-opts");
g.appendChild(mk("div", "ces-set-label", zh ? sc.label : (sc.labelEn || sc.label)));
for (var op of sc.options) {
let k = sc.key, v = op.value;
var b = mk("button", "ces-set-opt", zh ? op.label : (op.labelEn || op.label));
b.type = "button";
var hTxt = zh ? op.hint : (op.hintEn || op.hint);
if (hTxt) b.title = hTxt;
b.addEventListener("click", (ev) => { ev.stopPropagation(); writeSettings({ [k]: v }, w); ref(); });
obs.push({ k, v, b });
r.appendChild(b);
}
g.appendChild(r); p.appendChild(g);
}
var acts = mk("div", "ces-set-actions");
var mb = (tx, fn) => {
var b = mk("button", "ces-set-btn", tx);
b.type = "button";
b.addEventListener("click", (ev) => { ev.stopPropagation(); fn(b); });
acts.appendChild(b);
};
mb(zh ? "复制诊断" : "Copy Debug", (b) => { try { w?.navigator?.clipboard?.writeText?.(JSON.stringify(dumpTrace(w), null, 2)); } catch {} b.textContent = zh ? "已复制" : "Copied"; });
mb(zh ? "恢复默认" : "Reset", () => { resetSettings(w); ref(); });
mb(zh ? "关闭" : "Close", () => cls());
p.appendChild(acts);
ref();
var offS = onSettingsChange(ref, w);
var onPd = (ev) => { if (!p.contains(ev.target)) cls(); };
var onKd = (ev) => { if (ev?.key === "Escape") { ev.stopPropagation(); cls(); } };
function cls() { offS(); d.removeEventListener("pointerdown", onPd, true); d.removeEventListener("keydown", onKd, true); p.parentNode?.removeChild(p); }
d.addEventListener("pointerdown", onPd, true);
d.addEventListener("keydown", onKd, true);
(o.parent || d.body).appendChild(p);
return cls;
}
function extractEffortKey(item) {
return item == null ? "" : typeof item === "object" ? String(item.effort || item.id || item.value || item.key || item.label || "") : String(item);
}
function _extEffLbl(item, effortKey, seat) {
if (typeof item?.label === "string" && item.label) return item.label;
if (typeof seat?.formatEffortLabel === "function") { try { var f = seat.formatEffortLabel(effortKey); if (f) return String(f); } catch {} }
return AG_EFFORT_LABELS[String(effortKey || "").toLowerCase()] || String(effortKey || "");
}
var EFFORT_TITLE_I18N = { "zh-CN": "推理等级", "zh-TW": "推理等級", en: "Reasoning Effort", ja: "推論レベル", ko: "추론 수준", es: "Nivel de razonamiento", fr: "Niveau de raisonnement", de: "Denkaufwand" };
function resolveEffortTitle(doc, win) {
var lang = _normSliderLang(getPrismRootAttr(doc, win, "data-ag-cs-lang"), win);
try {
var ui = (win?.__agCsLocales || globalRoot?.__agCsLocales)?.getUiStrings?.(lang);
if (ui?.effortTitle) return String(ui.effortTitle);
} catch {}
return EFFORT_TITLE_I18N[lang] || EFFORT_TITLE_I18N.en;
}
function mountCodexEffortSlider(options) {
var opts = options || {};
var container = opts.container;
var seat = opts.seat;
var doc = opts.document || (container && container.ownerDocument) || (typeof document !== "undefined" ? document : null);
var win = opts.window || (doc && doc.defaultView) || (typeof window !== "undefined" ? window : globalRoot);
if (!container || !doc) {
return { unmount: function () {}, refresh: function () {} };
}

// 清空宿主容器并构建 DOM 树（对齐 dsh-codex-effort-slider 四层结构：fill / energy+sweep / stars+dot / knob）
container.innerHTML = "";
var _sa = function (el, k, v) { if (el && typeof el.setAttribute === "function" && el.getAttribute(k) !== v) el.setAttribute(k, v); };
function _ce(tag, cls, part, parent) {
var el = doc.createElement(tag);
if (cls) el.className = cls;
if (part) el.setAttribute("data-ces-part", part);
if (parent) parent.appendChild(el);
return el;
}
var rootEl = markNoTranslate(_ce("div", "ces-root"));
rootEl.setAttribute("role", "slider");
rootEl.setAttribute("aria-label", resolveEffortTitle(doc, win));
var trackEl = _ce("div", "ces-track", "track", rootEl);
var fillEl = _ce("div", "ces-fill", "fill", trackEl);
var energyEl = _ce("div", "ces-energy", "energy", trackEl);
_ce("div", "ces-energy__sweep", "sweep", energyEl);
var starsEl = _ce("div", "ces-stars", "stars", trackEl);
var starNodes = [];
for (var sIdx = 0; sIdx < PARTICLES.length; sIdx += 1) {
var p = PARTICLES[sIdx];
var starEl = _ce("span", "ces-star", "star", starsEl);
starEl.style.top = p.y + "%";
starEl.style.display = "none";
var dotEl = _ce("span", "ces-star__dot", "particle", starEl);
var bStr = p.brightness.toFixed(3);
dotEl.setAttribute("data-brightness", bStr);
dotEl.style.setProperty("--ces-b", bStr);
starNodes.push({ el: starEl, dot: dotEl, meta: p });
}
var ticksEl = _ce("div", "ces-ticks", "ticks", trackEl);
var claudeCanvasEl = _ce("canvas", "ces-claude-canvas", "claude-canvas", fillEl);
claudeCanvasEl.width = 280;
claudeCanvasEl.height = 28;
var knobEl = _ce("div", "ces-knob", "knob", trackEl);
_ce("div", "ces-knob-notch", null, knobEl);
container.appendChild(rootEl);
// ── 内部状态机 ──────────────────────────────────────────────────────────
var destroyed = false;
var rafId = null;
var lastFrameMs = 0;
var claudeRafId = null;
var _clTm = null;
var _dLW = 0;
var claudeAnimStart = 0;
// 点阵流动相位（秒）：按「帧间隔 × 当前速度倍率」累加，而不是 elapsed × 倍率，
// 这样拖动中速度连续变化时波纹不会因倍率突变而跳帧/倒退
var claudeFlowTime = 0;
var claudeLastTs = 0;
// 当前位置对应的强度与速度（由 applyVisualPct 每次刷新，RAF 循环读取）
var claudeIntensity = 0;
var claudeSpeed = 0;
var dragging = false;
var buttonDown = false;
var draftPct = null;
var draftIndex = null;
var snapIndex = null;
var detentIndex = -1;
var _lastCmtIdx = -1;
var lastPtrPct = null;
var lastPtrMs = 0;
var ptrSpeed = 0;
var motionState = null;
var tickNodes = [];
var _lastTicks = -1;
var _lastEng = -1;
var _lastSlow = -1;
var dragTrackRect = null;
var dragSnap = null;
var dragRafId = null;
var lastSnap = null;
var _lastShownIdx = -1;
var _lastFillCss = "";
var _lastFillBg = "";
var _knobTf = false;
var _rAF = function (f) { return win && win.requestAnimationFrame ? win.requestAnimationFrame(f) : null; };
var _cAF = function (id) { if (id !== null && win && win.cancelAnimationFrame) win.cancelAnimationFrame(id); };
var _st = function (f, ms) { return (win && win.setTimeout || setTimeout)(f, ms); }, _ct = function (id) { if (id) (win && win.clearTimeout || clearTimeout)(id); };
var _cT = function () { if (_clTm !== null) { _ct(_clTm); _clTm = null; } };
function nowMs() {
return win && win.performance && typeof win.performance.now === "function" ? win.performance.now() : Date.now();
}
function readSeatSnapshot() {
var _p = seat && typeof seat._read === "function" ? seat._read() : null, _s = _p || seat;
var rawLevels = (_s && (Array.isArray(_s.effortLevels) ? _s.effortLevels : Array.isArray(_s.levels) ? _s.levels : []) || []).slice();
var levels = rawLevels.map(function (item) {
var key = extractEffortKey(item);
return { raw: item, effort: key, label: _extEffLbl(item, key, _s) };
});
var count = levels.length, curEffort = extractEffortKey(_s && _s.currentEffort), officialIndex = 0;
for (var i = 0; i < count; i += 1) {
if (String(levels[i].effort).toLowerCase() === String(curEffort).toLowerCase()) { officialIndex = i; break; }
}
var locked = Boolean((_s && _s.locked) || count <= 1), stops = energyStopsFor(levels);
var baseName = (_s && (_s.baseName || _s.modelName)) || "", isClaude = Boolean((_s && _s.isClaude) || isClaudeModel(baseName));
return {
baseName: baseName, isClaude: isClaude, theme: (_s && _s.theme) || (isClaude ? "claude" : "codex"),
levels: levels, count: count, officialIndex: officialIndex, locked: locked, pending: Boolean(_s && _s.pending),
energyStart: stops.start, energyEnd: stops.end, hasOffFirst: stops.hasOffFirst
};
}
function currentShownIndex(snap) {
if (dragging && draftIndex !== null) return draftIndex;
if (snapIndex !== null) return snapIndex;
return snap.officialIndex;
}
function ensureMotion(snap) {
if (!motionState) {
var initPct = pctFromIndex(currentShownIndex(snap), snap.count);
motionState = {
x: initPct,
v: 0,
a: 0,
target: initPct
};
}
return motionState;
}
function _rowEl() {
return opts.row || (container.closest && container.closest('.ces-ag-effort-row,[data-ces-effort-row="true"],[role="menuitem"]'));
}
function _reAnim(el, cls, k, ms) {
if (!el || !el.classList || destroyed) return;
var cl = el.classList, tk = k + "t", rk = k + "r", had = false;
_ct(el[tk]); el[tk] = null;
if (el[rk]) { _cAF(el[rk]); el[rk] = null; }
cls.forEach(function (c) { if (cl.contains(c)) { had = true; cl.remove(c); } });
var run = function () {
el[rk] = null;
if (destroyed || !el.classList) return;
cls.forEach(function (c) { cl.add(c); });
el[tk] = _st(function () { if (el.classList) cls.forEach(function (c) { cl.remove(c); }); el[tk] = null; }, ms);
};
var r = had ? _rAF(run) : null;
if (r !== null) el[rk] = r; else run();
}
function _syncValOnly(snap, safeIdx) {
var count = snap.count, levelItem = snap.levels[safeIdx], label = levelItem ? levelItem.label : "";
var isMax = !snap.locked && count > 1 && safeIdx === count - 1 && !isOffLevel(label), rowEl = _rowEl();
if (rowEl) {
_sa(rowEl, "data-ces-effort-row", "true");
if (isMax) _sa(rowEl, "data-ces-max", "true");
else if (rowEl.hasAttribute("data-ces-max")) rowEl.removeAttribute("data-ces-max");
}
var valEl = opts.valueElement;
if (valEl) {
var had = typeof valEl.__cesLastLabel === "string", curVal = valEl.textContent || "", eff = levelItem && levelItem.effort;
var nk = _normEffTxt(label) || _normEffTxt(eff) || String(label || eff || "").trim().toLowerCase();
var chg = Boolean(label) && !(had && (_sameEffTxt(valEl.__cesLastLabel, label) || (valEl.__cesLastKey && nk && valEl.__cesLastKey === nk)));
var ka = _normEffTxt(curVal);
if (chg || (label && (!curVal.trim() || (ka && !_sameEffTxt(curVal, label))))) {
valEl.__cesLastLabel = label; valEl.__cesLastKey = nk;
if (!_sameEffTxt(curVal, label)) valEl.textContent = label;
if (had && chg && !isPrismMotionOff(doc, win)) _reAnim(valEl, ["ces-text-rise", "is-claude-changing"], "_c", 260);
}
var vColor = snap.locked ? "" : valueColorFor(label, safeIdx, count, isMax, snap.hasOffFirst, snap.isClaude, resolvePrismAccentTone(doc, win)) || "";
if (valEl.style && valEl.style.color !== vColor) valEl.style.color = vColor;
}
return { label: label, isMax: isMax, levelItem: levelItem };
}
function _syncHeadTrig(snap, showIdx) {
var count = snap.count;
var safeIdx = Math.max(0, Math.min(Math.max(0, count - 1), showIdx));
if (dragging) {
if (safeIdx === _lastShownIdx) return;
_lastShownIdx = safeIdx;
_syncValOnly(snap, safeIdx);
return;
}
_lastShownIdx = safeIdx;
var st = _syncValOnly(snap, safeIdx);

if (typeof opts.onVisualChange === "function") {
try {
opts.onVisualChange({
index: safeIdx,
count: count,
label: st.label,
effort: st.levelItem ? st.levelItem.effort : "",
isMax: st.isMax,
locked: snap.locked
});
} catch (err) {}
}
}
function renderTicks(snap, effectivePct) {
var tickMode = readSettings(win).ticks || "highlight", count = snap.count;
if (tickMode === "hidden" || count <= 1) { if (ticksEl.style.display !== "none") ticksEl.style.display = "none"; return; }
if (ticksEl.style.display !== "") ticksEl.style.display = "";
if (_lastTicks !== count) {
ticksEl.innerHTML = ""; tickNodes = [];
for (var i = 0; i < count; i += 1) {
var tick = _ce("span", "ces-tick", "tick", ticksEl), tp = pctFromIndex(i, count);
tick.style.left = knobOffsetOf(tp, KNOB_RADIUS);
tickNodes.push({ el: tick, pct: tp });
}
_lastTicks = count;
}
for (var j = 0; j < tickNodes.length; j += 1) {
var node = tickNodes[j], nc = tickMode === "dim" ? "ces-tick is-dim" : effectivePct + 1e-4 >= node.pct ? "ces-tick is-on" : "ces-tick";
if (node.el.className !== nc) node.el.className = nc;
}
}
var cachedTrackRect = null;
var cachedTrackRectAt = 0;
var cachedSurfaceDark = true;
var cachedSurfaceDarkAt = 0;
var lastClaudePaintAt = 0;
var cachedClaudeCtx = null;
function _stopClRaf() { _cAF(claudeRafId); _cT(); claudeRafId = cachedTrackRect = null; cachedTrackRectAt = lastClaudePaintAt = 0; }
function _clOff() { return destroyed || _isBgWin() || isPrismMotionOff(doc, win); }
function _schedCl(ms) {
if (_clTm === null && claudeRafId === null) _clTm = _st(function () { _clTm = null; if (!_clOff() && claudeIntensity > 0) _startClRaf(); }, ms);
}
function _isBgWin() {
var r = doc && doc.documentElement, k = "data-ag-cs-win-blur", v = r && r.getAttribute && r.getAttribute(k);
return !!(doc && (doc.hidden || v === "1" || (r && r.hasAttribute && r.hasAttribute(k) && v !== "0")));
}
function _trkRect(now) {
var r = dragging && dragTrackRect && dragTrackRect.width > 0 ? dragTrackRect : cachedTrackRect;
if (!r || (!dragging && now && now - cachedTrackRectAt > 250)) {
r = trackEl.getBoundingClientRect ? trackEl.getBoundingClientRect() : null;
if (r && r.width > 0) { cachedTrackRect = r; cachedTrackRectAt = now || nowMs(); if (dragging) dragTrackRect = r; }
}
return r;
}
function stepClaudeCanvas(nowTs) {
claudeRafId = null;
if (_clOff()) { _stopClRaf(); return; }
var snap = (dragging && dragSnap) || lastSnap || readSeatSnapshot();
if (!snap.isClaude || snap.locked || claudeIntensity <= 0) { _stopClRaf(); return; }
var now = typeof nowTs === "number" && nowTs > 0 ? nowTs : nowMs(), X = Math.max, N = Math.min, R = Math.round;
var pr = N(1, X(0, now - claudeAnimStart) / CLAUDE_SWEEP_MS), iq = motionMode(win, null, doc) === "quick", idle = !dragging && pr >= 1, gap = idle ? (claudeIntensity >= 0.7 ? 32 : 50) : 15.5;
if (lastClaudePaintAt > 0 && now - lastClaudePaintAt < gap) {
if (idle && !iq) _schedCl(X(1, Math.ceil(gap - (now - lastClaudePaintAt))));
else claudeRafId = _rAF(stepClaudeCanvas);
return;
}
lastClaudePaintAt = now;
claudeFlowTime += (claudeLastTs > 0 ? N(0.05, X(0, (now - claudeLastTs) / 1000)) : 0) * claudeSpeed;
claudeLastTs = now;
if (now - cachedSurfaceDarkAt > 300 || !cachedSurfaceDarkAt) { cachedSurfaceDark = surfaceIsDark(win, doc); cachedSurfaceDarkAt = now; }
var rect = _trkRect(now), tW = trackEl.clientWidth || (rect && rect.width > 0 ? rect.width : 280), th = trackEl.clientHeight || (rect && rect.height > 0 ? R(rect.height) : 28);
var dpr = X(1, N(3, (win && +win.devicePixelRatio) || 1)), fw = X(1, R(tW)), bw = X(1, R(fw * dpr)), bh = X(1, R(th * dpr)), cv = claudeCanvasEl, cs = cv.style;
var tw = X(1, N(fw, R(KNOB_RADIUS + (tW - KNOB_RADIUS * 2) * (motionState ? clamp01(motionState.x) : 0))));
if (cv.width !== bw) cv.width = bw;
if (cv.height !== bh) cv.height = bh;
if (cs.width !== fw + "px") cs.width = fw + "px";
if (cs.height !== th + "px") cs.height = th + "px";
var cctx = cachedClaudeCtx || (cv.getContext && (cachedClaudeCtx = cv.getContext("2d")));
if (cctx) {
if (cctx.setTransform) cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
var clp = tw < fw && cctx.save && cctx.rect && cctx.clip;
if (tw < fw) cctx.clearRect(tw, 0, fw - tw + 1, th + 1);
if (clp) { cctx.save(); cctx.beginPath(); cctx.rect(0, 0, tw, th); cctx.clip(); }
paintDither(cctx, tw, th, cachedSurfaceDark, pr, claudeFlowTime, claudeIntensity);
if (clp) cctx.restore();
}
if (idle) { if (iq) _stopClRaf(); else _schedCl(gap); return; }
claudeRafId = _rAF(stepClaudeCanvas);
}
function _startClRaf() {
if (_clOff()) { _stopClRaf(); return; }
if (dragging) _cT();
if (claudeRafId !== null || _clTm !== null) return;
claudeRafId = _rAF(stepClaudeCanvas);
if (claudeRafId === null) stepClaudeCanvas(nowMs());
}
function applyVisualPct(snap, effectivePct, showIdx) {
lastSnap = snap;
var p = clamp01(effectivePct), count = snap.count, safeIdx = Math.max(0, Math.min(Math.max(0, count - 1), showIdx));
var levelItem = snap.levels[safeIdx], label = levelItem ? levelItem.label : "", theme = snap.theme || "codex";
_sa(rootEl, "data-theme", theme);
_sa(trackEl, "data-theme", theme);
_sa(rootEl, "tabindex", snap.locked ? "-1" : "0");
_sa(rootEl, "aria-valuemin", "0");
_sa(rootEl, "aria-valuemax", String(Math.max(0, count - 1)));
_sa(rootEl, "aria-valuenow", String(safeIdx));
_sa(rootEl, "aria-valuetext", label);
_sa(rootEl, "aria-disabled", snap.locked || snap.pending ? "true" : "false");
if (snap.locked) { if (!trackEl.classList.contains("is-locked")) trackEl.classList.add("is-locked"); }
else if (trackEl.classList.contains("is-locked")) trackEl.classList.remove("is-locked");
var curTone = resolvePrismAccentTone(doc, win), motOff = isPrismMotionOff(doc, win);
if (opts.onVisualRatio) opts.onVisualRatio(p);
var offsetCss = knobOffsetOf(p, KNOB_RADIUS), fillBg = fillBackgroundFor(p, snap.energyStart, snap.energyEnd, snap.isClaude, curTone);
if (offsetCss !== _lastFillCss) { _lastFillCss = offsetCss; trackEl.style.setProperty("--ces-fill", offsetCss); }
if (fillBg !== _lastFillBg) { _lastFillBg = fillBg; trackEl.style.setProperty("--ces-fill-bg", fillBg); }
var kW = dragging ? (_dLW || trackEl.clientWidth || (dragTrackRect && dragTrackRect.width) || 0) : 0;
if (kW > 0) {
if (!_knobTf) { knobEl.style.left = "0px"; _knobTf = true; }
knobEl.style.transform = "translate3d(" + (KNOB_RADIUS + (kW - KNOB_RADIUS * 2) * p).toFixed(1) + "px,0,0)";
} else if (_knobTf) { knobEl.style.left = knobEl.style.transform = ""; _knobTf = false; }
claudeIntensity = !motOff && curTone !== "mono" && snap.isClaude && !snap.locked && count > 1 ? claudeIntensityFor(p, snap.energyStart) : 0;
claudeSpeed = claudeSpeedFor(p, snap.energyStart);
if (claudeIntensity > 0) {
if (claudeCanvasEl.style.display !== "block") { claudeCanvasEl.style.display = "block"; claudeAnimStart = nowMs(); claudeLastTs = 0; }
_startClRaf();
} else {
if (claudeCanvasEl.style.display !== "none") claudeCanvasEl.style.display = "none";
_stopClRaf();
}
var energy = snap.locked || motOff ? 0 : energyForPct(p, snap.energyStart), slowdown = motionMode(win, null, doc) === "quick" ? _RM_SLOW : 1;
if (Math.abs(energy - _lastEng) > 1e-5 || slowdown !== _lastSlow) {
_lastEng = energy; _lastSlow = slowdown;
_sa(rootEl, "data-energy", energy > 0 ? "1" : "0");
rootEl.style.setProperty("--ces-energy", String(Math.round(energy * 1000) / 1000));
var slo = String(starLayerOpacityFor(energy)), vc = Math.round(energy * PARTICLES.length), sf = speedFor(p, snap.energyStart);
trackEl.style.setProperty("--ces-star-opacity", slo);
starsEl.style.opacity = slo;
starsEl.setAttribute("data-count", String(vc));
for (var i = 0; i < starNodes.length; i += 1) {
var st = starNodes[i].el.style, dur = starDurationFor(i, sf) * slowdown;
st.display = i < vc ? "" : "none";
st.animationDuration = dur.toFixed(3) + "s";
st.animationDelay = starDelayFor(i, dur).toFixed(3) + "s";
}
}
renderTicks(snap, p);
_syncHeadTrig(snap, safeIdx);
}
function stopFrames() { _cAF(rafId); rafId = null; lastFrameMs = 0; }
function stepFrame(ts) {
rafId = null;
if (destroyed) return;
var snap = readSeatSnapshot(), m = ensureMotion(snap), params = motionParamsForMode(motionMode(win, null, doc));
var now = typeof ts === "number" && ts > 0 ? ts : nowMs();
motionStep(m, lastFrameMs > 0 ? (now - lastFrameMs) / 1000 : 1 / 60, params);
lastFrameMs = now;
applyVisualPct(snap, m.x, currentShownIndex(snap));
if (!motionSettled(m, params)) startFrames();
else {
m.x = clamp01(m.target); m.v = m.a = 0;
if (!dragging) snapIndex = null;
applyVisualPct(snap, m.x, currentShownIndex(snap));
}
}
function startFrames() {
if (destroyed || rafId !== null) return;
rafId = _rAF(stepFrame);
if (rafId === null) stepFrame(nowMs());
}
function clearMaxEffects() {
var valEl = opts.valueElement;
if (valEl) {
_ct(valEl._gt); valEl._gt = null;
if (valEl._gr) { _cAF(valEl._gr); valEl._gr = null; }
if (valEl.classList) valEl.classList.remove("is-glowing");
}
}
function triggerMaxEffects(isClaude) {
if (isPrismMotionOff(doc, win)) return;
var valEl = opts.valueElement;
if (valEl && valEl.classList) {
if (valEl.style && valEl.style.setProperty) valEl.style.setProperty("--ces-glow-color", isClaude ? "rgba(196, 181, 253, 0.9)" : "rgba(168, 85, 247, 0.9)");
_reAnim(valEl, ["is-glowing"], "_g", 450);
}
}
/**
* 立即把目标档位写回宿主（Antigravity React Fiber 或 Seat）：
* 拖过档位边界时同步触发，无需等待 pointerup 松手。
*/
function commitAtIndex(targetIndex, reason) {
var snap = readSeatSnapshot();
if (snap.locked || snap.pending || snap.count <= 1) return;
var idx = Math.max(0, Math.min(snap.count - 1, targetIndex)), item = snap.levels[idx];
if (!item) return;
var isNowMax = idx === snap.count - 1 && !isOffLevel(item.label), wasMax = _lastCmtIdx === snap.count - 1;
_lastCmtIdx = idx;
tracePush("commit", { reason: reason || "drag", index: idx, effort: item.effort, label: item.label });
if (isNowMax && !wasMax) triggerMaxEffects(snap.isClaude);
else if (!isNowMax && wasMax) clearMaxEffects();
if (seat && typeof seat.selectEffort === "function") {
try { seat.selectEffort(item.raw !== undefined ? item.raw : item.effort, idx); }
catch (err) { tracePush("commit-error", { message: String(err && err.message ? err.message : err) }); }
}
if (typeof opts.onCommit === "function") try { opts.onCommit(item, idx, reason || "drag"); } catch (err) {}
}
function _cancelDragRaf() { _cAF(dragRafId); dragRafId = null; }
function pctAtClientX(clientX) {
var rect = _trkRect(0);
return rect && rect.width > 0 ? clamp01((clientX - rect.left - KNOB_RADIUS) / Math.max(1, rect.width - KNOB_RADIUS * 2)) : null;
}
function _flushDragVisual() {
dragRafId = null;
if (destroyed || !dragging) return;
var ds = dragSnap || readSeatSnapshot(), dm = ensureMotion(ds);
applyVisualPct(ds, dm.x, draftIndex !== null ? draftIndex : ds.officialIndex);
}
function moveToClientX(clientX, isInitialDown) {
var snap = (dragging && dragSnap) || readSeatSnapshot();
if (snap.locked || snap.count <= 0) return;
var ptrPct = pctAtClientX(clientX);
if (ptrPct === null) ptrPct = pctFromIndex(snap.officialIndex, snap.count);
var now = nowMs();
if (lastPtrPct !== null && lastPtrMs > 0) {
var dt = (now - lastPtrMs) / 1000;
if (dt > 1e-4 && dt < 0.25) ptrSpeed = ptrSpeed * (1 - _PS_EMA) + ((ptrPct - lastPtrPct) / dt) * _PS_EMA;
} else ptrSpeed = 0;
lastPtrPct = ptrPct; lastPtrMs = now;
var nowIndex;
if (motionMode(win, null, doc) === "fast") {
nowIndex = isInitialDown ? indexFromPct(ptrPct, snap.count) : detentTargetIndex(detentIndex >= 0 && detentIndex < snap.count ? detentIndex : snap.officialIndex, ptrPct, snap.count);
detentIndex = detentTargetIndex(nowIndex, ptrPct, snap.count) === nowIndex ? nowIndex : ptrPct < pctFromIndex(nowIndex, snap.count) ? Math.max(0, nowIndex - 1) : Math.min(snap.count - 1, nowIndex + 1);
} else nowIndex = indexFromPct(ptrPct, snap.count);
draftPct = ptrPct; draftIndex = nowIndex;
var m = ensureMotion(snap);
m.x = m.target = ptrPct; m.v = m.a = 0;
stopFrames();
if (isInitialDown || !win || typeof win.requestAnimationFrame !== "function") {
_cancelDragRaf();
applyVisualPct(snap, ptrPct, nowIndex);
} else {
if (nowIndex !== _lastShownIdx) { _lastShownIdx = nowIndex; _syncValOnly(snap, nowIndex); }
if (dragRafId === null) dragRafId = _rAF(_flushDragVisual);
}
}
function _settle(snap, idx, imm, startX) {
var m = ensureMotion(snap), tgt = pctFromIndex(idx, snap.count);
m.target = tgt;
if (imm) {
m.x = tgt; m.v = m.a = 0; snapIndex = null; stopFrames();
applyVisualPct(snap, m.x, idx);
} else {
if (typeof startX === "number") { m.x = startX; m.v = m.a = 0; }
applyVisualPct(snap, m.x, idx);
startFrames();
}
}
function endDrag(clientX) {
if (!dragging) return;
_cancelDragRaf();
var snap = dragSnap || readSeatSnapshot();
var ptrPct = draftPct !== null ? draftPct : pctFromIndex(snap.officialIndex, snap.count);
if (typeof clientX === "number") {
var p = pctAtClientX(clientX);
if (p !== null) ptrPct = p;
}
var mode = motionMode(win, null, doc), finalIndex;
if (mode === "fast") finalIndex = detentTargetIndex(detentIndex >= 0 && detentIndex < snap.count ? detentIndex : snap.officialIndex, ptrPct, snap.count);
else if (mode === "quick") finalIndex = indexFromPct(ptrPct, snap.count);
else finalIndex = releaseIndexFor(ptrPct, ptrSpeed, lastPtrMs > 0 ? Math.max(0, (nowMs() - lastPtrMs) / 1000) : 1, snap.count);
dragging = buttonDown = false;
dragTrackRect = dragSnap = draftPct = draftIndex = lastPtrPct = null;
_dLW = 0;
detentIndex = _lastShownIdx = -1;
ptrSpeed = 0;
snapIndex = finalIndex;
if (finalIndex !== snap.officialIndex) commitAtIndex(finalIndex, "release");
_settle(readSeatSnapshot(), finalIndex, mode === "quick", ptrPct);
}
function swallowEvent(ev) { if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation(); }
function onPointerDown(ev) {
if (ev && typeof ev.button === "number" && ev.button !== 0) return;
var snap = readSeatSnapshot();
if (snap.locked || snap.pending || snap.count <= 1) return;
swallowEvent(ev);
if (typeof ev.preventDefault === "function") ev.preventDefault();
dragging = buttonDown = true;
dragSnap = snap;
dragTrackRect = trackEl.getBoundingClientRect ? trackEl.getBoundingClientRect() : null;
_dLW = trackEl.clientWidth || (dragTrackRect && dragTrackRect.width) || 0;
if (dragTrackRect && dragTrackRect.width > 0) { cachedTrackRect = dragTrackRect; cachedTrackRectAt = nowMs(); }
_lastCmtIdx = detentIndex = snap.officialIndex;
snapIndex = lastPtrPct = null;
try { if (trackEl.setPointerCapture && ev.pointerId !== undefined) trackEl.setPointerCapture(ev.pointerId); } catch (err) {}
moveToClientX(ev.clientX, true);
}
function onPointerMove(ev) {
if (!dragging || (ev && ev.buttons === 0 && !buttonDown)) return;
swallowEvent(ev);
moveToClientX(ev.clientX, false);
}
function onPointerUp(ev) {
if (!dragging) return;
swallowEvent(ev);
buttonDown = false;
try { if (trackEl.releasePointerCapture && ev && ev.pointerId !== undefined) trackEl.releasePointerCapture(ev.pointerId); } catch (err) {}
endDrag(ev && typeof ev.clientX === "number" ? ev.clientX : undefined);
}
function onPointerCancel(ev) {
if (!dragging) return;
if (!ev || ev.type !== "blur") swallowEvent(ev);
buttonDown = false;
endDrag();
}
function onKeyDown(ev) {
var snap = readSeatSnapshot();
if (snap.locked || snap.count <= 1) return;
var key = ev && ev.key, curIdx = currentShownIndex(snap), nextIdx = null;
if (key === "ArrowLeft" || key === "ArrowDown") nextIdx = Math.max(0, curIdx - 1);
else if (key === "ArrowRight" || key === "ArrowUp") nextIdx = Math.min(snap.count - 1, curIdx + 1);
else if (key === "Home") nextIdx = 0;
else if (key === "End") nextIdx = snap.count - 1;
else return;
swallowEvent(ev);
if (typeof ev.preventDefault === "function") ev.preventDefault();
if (snap.pending) return;
snapIndex = nextIdx;
commitAtIndex(nextIdx, "key");
_settle(readSeatSnapshot(), nextIdx, motionMode(win, null, doc) === "quick");
}
function onBlockMenuClose(ev) { swallowEvent(ev); }
var _trkEvs = [["pointerdown", onPointerDown], ["pointermove", onPointerMove], ["pointerup", onPointerUp], ["pointercancel", onPointerCancel], ["lostpointercapture", onPointerCancel], ["click", onBlockMenuClose], ["mouseup", onBlockMenuClose]];
for (var _ei = 0; _ei < _trkEvs.length; _ei += 1) trackEl.addEventListener(_trkEvs[_ei][0], _trkEvs[_ei][1]);
rootEl.addEventListener("keydown", onKeyDown);
function onWinResize() { dragTrackRect = cachedTrackRect = null; _dLW = cachedTrackRectAt = 0; }
function _wEv(m) { if (win && win[m]) { win[m]("resize", onWinResize); win[m]("blur", onPointerCancel); } }
_wEv("addEventListener");
function syncFromExternal() {
if (destroyed || dragging) return;
var snap = readSeatSnapshot(), m = ensureMotion(snap), idx = snap.officialIndex, mode = motionMode(win, null, doc);
if (snapIndex !== null) snapIndex=idx;
m.target = pctFromIndex(idx, snap.count);
_settle(snap, idx, snap.locked || mode === "quick" || motionSettled(m, motionParamsForMode(mode)));
}
var offSeat =
seat && typeof seat.subscribe === "function"
? seat.subscribe(function () {
syncFromExternal();
})
: function () {};
var offSettings = onSettingsChange(function () {
var snap = readSeatSnapshot();
var m = ensureMotion(snap);
applyVisualPct(snap, m.x, currentShownIndex(snap));
}, win);
// 首次同步渲染
var initSnap = readSeatSnapshot();
var initMotion = ensureMotion(initSnap);
initMotion.x = pctFromIndex(initSnap.officialIndex, initSnap.count);
initMotion.target = initMotion.x;
applyVisualPct(initSnap, initMotion.x, initSnap.officialIndex);
return {
unmount: function () {
destroyed = true;
stopFrames();
_cancelDragRaf();
_stopClRaf();
cachedClaudeCtx = null;
dragTrackRect = dragSnap = lastSnap = null;
_dLW = 0;
clearMaxEffects();
var valEl = opts.valueElement;
if (valEl) {
_ct(valEl._ct); valEl._ct = null;
if (valEl._cr) { _cAF(valEl._cr); valEl._cr = null; }
if (valEl.classList) { valEl.classList.remove("ces-text-rise", "is-claude-changing"); }
delete valEl.__cesLastLabel;
delete valEl.__cesLastKey;
}
if (typeof offSeat === "function") offSeat();
if (typeof offSettings === "function") offSettings();
_wEv("removeEventListener");
for (var _ri = 0; _ri < _trkEvs.length; _ri += 1) trackEl.removeEventListener(_trkEvs[_ri][0], _trkEvs[_ri][1]);
rootEl.removeEventListener("keydown", onKeyDown);
if (rootEl.parentNode === container) {
container.removeChild(rootEl);
}
},
refresh: function () {
syncFromExternal();
}
};
}
return {mountCodexEffortSlider,openSettingsPanel,surfaceIsDark};
});
