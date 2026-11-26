// Obsidian Prism v1.0.8-beta.2, settings-panel.js: original HD-2D casting stage.
// DSH adaptation, 2026-11-25. Use the bundled mascot rig and injected WebGL renderer.
const prismCastingStage = (() => {
  const O = Object;
  const isFn = value => typeof value === 'function';
  const {parseMascotSpec, encodeMascotSpec} = actors;
  const resolveMascotArt = () => actors.mascotArt;
  const SPOTLIGHT_ICON_SVG =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="M5.5 2.5h5l-.8 2.6H6.3L5.5 2.5Z" fill="currentColor"/>' +
    '<path d="M6.2 5.4h3.6L13.5 14h-11L6.2 5.4Z" fill="currentColor" opacity="0.28"/>' +
    '<path d="M7.2 5.4h1.6L10.4 14H5.6L7.2 5.4Z" fill="currentColor" opacity="0.55"/>' +
    '<ellipse cx="8" cy="14" rx="5.2" ry="1.1" fill="currentColor" opacity="0.45"/>' +
    '</svg>';

  // ── 《八方旅人》黑曜石星辰酒馆 HD-2D WebGL2 3D 视差选角子面板（仅打开且可见时渲染，关闭/隐藏/脱离 DOM 立即停帧并 0×0 + WEBGL_lose_context 回收显存）──
  const STAGE_SLOTS = O.freeze([
    { key: 'c', toggleId: 'c', kind: 'clawd', cx: 72, i18nKey: 'mascotSpeciesCrab', fb: 'Claude Crab', hex: '#d97757', rayA: '249,115,22', rayB: '251,146,60', cheerPose: 'happy', cheerSym: 'spark' },
    { key: 'k', toggleId: 'k', kind: 'cat', cx: 196, i18nKey: 'mascotSpeciesCat', fb: 'Gemini Cat', hex: '#947fd6', rayA: '139,92,246', rayB: '56,189,248', cheerPose: 'happy', cheerSym: 'heart' },
    { key: 'd', toggleId: 'd', kind: 'dragon', cx: 320, i18nKey: 'mascotSpeciesDragon', fb: 'GPT Dragon', hex: '#d7dfef', rayA: '226,232,240', rayB: '45,212,191', cheerPose: 'dragonFlame', cheerSym: 'spark' },
    { key: 'w', toggleId: 'w', kind: 'whale', cx: 444, i18nKey: 'mascotSpeciesWhale', fb: 'DeepSeek Whale', hex: '#4e6fff', rayA: '59,130,246', rayB: '56,189,248', cheerPose: 'whaleSpout', cheerSym: 'spark' },
    { key: 'm', toggleId: 'minis', kind: 'minis', cx: 566, i18nKey: 'mascotStageMinisSlot', fb: 'Mini Crab Corner', hex: '#fb923c', rayA: '251,146,60', rayB: '245,158,11', cheerPose: 'trick', cheerSym: 'spark' },
  ]);

  const createMascotCastingStage = ({
    doc,
    sec,
    foldBody,
    getMainBlocks,
    getLang,
    uiText,
    getCurMascot,
    setMascotValue,
    isLightThemeNow,
    syncRoot,
    handledGroupClicks,
    BTN,
  }) => {
    const STAGE_W = 640;
    const STAGE_H = 360;
    const FRAME_GAP_MS = 33; // WebGL2 丝滑 30fps / 2.5D 轻量降级
    const win = doc.defaultView || window;
    const sa = (e, k, v = '') => e.setAttribute(k, String(v));
    const ra = (e, k) => e.removeAttribute(k);
    const ap = (p, ...cs) => { for (const c of cs) if (c) p.appendChild(c); return p; };
    const mk = (tag, cls, txt) => {
      const el = doc.createElement(tag);
      if (cls) el.className = cls;
      if (txt !== undefined) el.textContent = txt;
      return el;
    };
    const nowMs = () => (typeof performance !== 'undefined' && isFn(performance.now) ? performance.now() : Date.now());
    const reqAF = (fn) => (win && isFn(win.requestAnimationFrame) ? win.requestAnimationFrame(fn) : typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(() => fn(nowMs()), 33));
    const canAF = (id) => {
      if (!id) return;
      if (win && isFn(win.cancelAnimationFrame)) win.cancelAnimationFrame(id);
      else if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
      else clearTimeout(id);
    };
    const isReducedMotion = () => {
      try { return !prefs.motion || Boolean(win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches); } catch { return false; }
    };

    const view = mk('div', 'ag-cs-mascot-stage-view');
    sa(view, 'data-ag-mascot-stage-view', '1');
    sa(view, 'hidden', '');
    view.hidden = true;
    if (view.style) {
      O.assign(view.style, {
        display: 'none',
        flexDirection: 'column',
        gap: '10px',
        padding: '4px 0 6px',
      });
    }

    // 1. 顶栏：「← 返回设置」+ 舞台标题 + 实时计数/迷你蟹状态
    const hdr = mk('div');
    sa(hdr, 'data-ag-stage-header', '1');
    if (hdr.style) O.assign(hdr.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' });
    const hdrLeft = mk('div');
    if (hdrLeft.style) O.assign(hdrLeft.style, { display: 'flex', alignItems: 'center', gap: '8px' });
    const backBtn = mk('button', BTN);
    backBtn.type = 'button';
    sa(backBtn, 'data-ag-mascot-stage-back', '1');
    if (backBtn.style) {
      O.assign(backBtn.style, {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '4px 10px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '600',
        border: '1px solid var(--ag-cs-border, rgba(148,163,184,0.28))',
        cursor: 'pointer',
      });
    }
    const titleEl = mk('span', '');
    sa(titleEl, 'data-ag-stage-title', '1');
    if (titleEl.style) O.assign(titleEl.style, { fontSize: '13.5px', fontWeight: '700', letterSpacing: '0.01em' });
    ap(hdrLeft, backBtn, titleEl);

    const hdrRight = mk('div');
    if (hdrRight.style) O.assign(hdrRight.style, { display: 'flex', alignItems: 'center', gap: '6px' });
    const countPill = mk('span', '');
    sa(countPill, 'data-ag-mascot-count', '1');
    if (countPill.style) {
      O.assign(countPill.style, {
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '11.5px',
        fontWeight: '600',
        fontVariantNumeric: 'tabular-nums',
        border: '1px solid var(--ag-cs-border, rgba(148,163,184,0.26))',
        background: 'var(--ag-cs-surface-2, rgba(148,163,184,0.1))',
      });
    }
    const minisPill = mk('span', '');
    sa(minisPill, 'data-ag-stage-minis-pill', '1');
    if (minisPill.style) {
      O.assign(minisPill.style, {
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: '600',
        border: '1px solid var(--ag-cs-border, rgba(148,163,184,0.24))',
      });
    }
    ap(hdrRight, countPill, minisPill);
    ap(hdr, hdrLeft, hdrRight);

    const hintEl = mk('div', '');
    sa(hintEl, 'data-ag-stage-hint', '1');
    if (hintEl.style) O.assign(hintEl.style, { fontSize: '11.5px', opacity: '0.72', lineHeight: '1.4' });

    // 2. 16:9 电影画幅 HD-2D 微缩酒馆舞台容器
    const stageFrame = mk('div');
    sa(stageFrame, 'data-ag-stage-frame', '1');
    if (stageFrame.style) {
      O.assign(stageFrame.style, {
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--ag-cs-border, rgba(148,163,184,0.32))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 28px rgba(0,0,0,0.32)',
        lineHeight: '0',
      });
    }

    const createStageCanvas = () => {
      const cv = mk('canvas');
      sa(cv, 'data-ag-mascot-stage-canvas', '1');
      sa(cv, 'aria-label', 'Mascot Casting Stage');
      cv.width = 0;
      cv.height = 0;
      if (cv.style) {
        O.assign(cv.style, {
          width: '100%',
          height: '100%',
          aspectRatio: '16 / 9',
          display: 'block',
          imageRendering: 'pixelated',
          cursor: 'pointer',
        });
      }
      return cv;
    };

    let canvas = createStageCanvas();
    ap(stageFrame, canvas);

    // 3. 与 5 站位严格垂直对齐的 5 张精致像素阵营名牌开关按钮
    const dockGrid = mk('div');
    sa(dockGrid, 'data-ag-stage-dock', '1');
    if (dockGrid.style) {
      O.assign(dockGrid.style, {
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: '6px',
      });
    }

    // 4. 底部 4 枚快捷预设胶囊（双宠经典 / 四宠同台 / 全员上场 / 全员休息）
    const presetRow = mk('div');
    sa(presetRow, 'data-ag-stage-presets', '1');
    if (presetRow.style) {
      O.assign(presetRow.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '6px',
        paddingTop: '2px',
      });
    }

    ap(view, hdr, hintEl, stageFrame, dockGrid, presetRow);

    // ── 舞台实时物理、3D 视差与光影状态（5 个固定单只纯开关站位）──
    let isOpen = false;
    let disposed = false;
    let rafId = 0;
    let lastDrawAt = 0;
    let lastStepAt = 0;
    let frameCount = 0;
    let tickIdx = 0;
    let hoveredSlot = -1;
    let lastArtSource = '';
    let webglStage = null;
    let webglBlocked = false;
    let renderBackend = 'canvas2d';
    let ptrNormX = 0;
    let ptrNormY = 0;
    let ptrInside = false;

    const slotStates = STAGE_SLOTS.map((s, i) => ({
      key: s.key,
      light: 0,
      cheerUntil: 0,
      cheerStart: 0,
      farewellUntil: 0,
      rippleStart: 0,
      motes: Array.from({ length: 7 }, (_, j) => ({
        x: (j * 17 + i * 11) % 72 - 36,
        y: (j * 23 + i * 19) % 210,
        spd: 0.24 + ((j + i) % 4) * 0.11,
        ph: j * 1.1 + i * 0.7,
      })),
      burst: [],
    }));
    const dockRefs = {};
    const presetBtns = [];

    const readRoster = () => parseMascotSpec(getCurMascot()) || { c: 1, k: 1, d: 0, w: 0, minis: false };
    const slotCountOf = (r, key) => (key === 'm' ? (r.minis ? 1 : 0) : r[key] > 0 ? 1 : 0);

    const triggerSlotAnim = (idx, kind, now = nowMs()) => {
      const st = slotStates[idx];
      if (!st) return;
      if (kind === 'cheer') {
        st.cheerStart = now;
        st.cheerUntil = now + 1150;
        st.farewellUntil = 0;
        st.rippleStart = now;
        st.burst = Array.from({ length: 9 }, (_, j) => ({
          dx: (j - 4) * 5.8 + ((j % 2) ? 2 : -2),
          vy: 0.85 + (j % 3) * 0.35,
          t: 0,
        }));
      } else if (kind === 'farewell') {
        st.farewellUntil = now + 520;
        st.cheerUntil = 0;
      }
    };

    const applyRosterChange = (nextRoster, ev) => {
      if (ev && typeof ev === 'object' && handledGroupClicks) handledGroupClicks.add(ev);
      const prevR = readRoster();
      const encoded = encodeMascotSpec(nextRoster);
      const cleanNext = parseMascotSpec(encoded) || { c: 0, k: 0, d: 0, w: 0, minis: false };
      const now = nowMs();
      STAGE_SLOTS.forEach((sl, idx) => {
        const before = slotCountOf(prevR, sl.key);
        const after = slotCountOf(cleanNext, sl.key);
        if (after > before) triggerSlotAnim(idx, 'cheer', now);
        else if (after === 0 && before > 0) triggerSlotAnim(idx, 'farewell', now);
      });
      setMascotValue(encoded);
      syncStageControls();
      syncRoot();
      if (isOpen) drawStageFrame(now, true);
    };

    const toggleStageSlot = (idx, ev) => {
      const sl = STAGE_SLOTS[idx];
      if (!sl) return;
      const cur = readRoster();
      const next = { ...cur };
      if (sl.key === 'm') {
        next.minis = !next.minis;
      } else {
        next[sl.key] = next[sl.key] > 0 ? 0 : 1;
      }
      applyRosterChange(next, ev);
    };

    // 构建 5 张精致像素阵营名牌开关按钮（零步进器、零 ×2 徽章，一键点亮/熄灯）
    STAGE_SLOTS.forEach((sl, idx) => {
      const btn = mk('button', BTN);
      btn.type = 'button';
      sa(btn, 'data-ag-stage-slot', sl.key);
      sa(btn, 'data-ag-mascot-toggle', sl.toggleId);
      if (sl.key === 'm') sa(btn, 'data-ag-mascot-minis', '1');
      if (btn.style) {
        O.assign(btn.style, {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          padding: '7px 6px',
          borderRadius: '10px',
          border: '1px solid var(--ag-cs-border, rgba(148,163,184,0.22))',
          background: 'var(--ag-cs-surface-2, rgba(148,163,184,0.06))',
          cursor: 'pointer',
          transition: 'border-color 140ms ease, background 140ms ease, box-shadow 140ms ease',
          minWidth: '0',
        });
      }
      btn.addEventListener('pointerenter', () => {
        hoveredSlot = idx;
        if (isOpen && isReducedMotion()) drawStageFrame(nowMs(), true);
      });
      btn.addEventListener('pointerleave', () => {
        if (hoveredSlot === idx) hoveredSlot = -1;
        if (isOpen && isReducedMotion()) drawStageFrame(nowMs(), true);
      });
      btn.addEventListener('click', (ev) => {
        ev?.stopPropagation?.();
        toggleStageSlot(idx, ev);
      });

      const topRow = mk('div');
      if (topRow.style) O.assign(topRow.style, { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', width: '100%', minWidth: '0' });
      const dot = mk('span');
      sa(dot, 'aria-hidden', 'true');
      if (dot.style) {
        O.assign(dot.style, {
          width: '7px',
          height: '7px',
          borderRadius: '2px',
          background: sl.hex,
          flexShrink: '0',
          boxShadow: sl.key === 'd' ? 'inset 0 0 0 1px rgba(30,25,54,0.32)' : 'none',
        });
      }
      const nameEl = mk('span', '');
      sa(nameEl, 'data-ag-mascot-label', sl.key);
      if (nameEl.style) O.assign(nameEl.style, { fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
      ap(topRow, dot, nameEl);

      const statePill = mk('span', '');
      sa(statePill, 'data-ag-stage-state', sl.key);
      if (statePill.style) {
        O.assign(statePill.style, {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1px 8px',
          borderRadius: '999px',
          fontSize: '10px',
          fontWeight: '600',
          lineHeight: '1.45',
          border: '1px solid var(--ag-cs-border, rgba(148,163,184,0.24))',
          whiteSpace: 'nowrap',
        });
      }

      ap(btn, topRow, statePill);
      dockRefs[sl.key] = { btn, dot, nameEl, statePill };
      ap(dockGrid, btn);
    });

    // 构建底部 4 枚快捷预设胶囊（双宠经典 / 四宠同台 / 全员上场 / 全员休息）
    const STAGE_PRESETS = [
      ['crab', 'mascotStagePresetDual', 'Classic Dual'],
      ['quad', 'mascotStagePresetQuad', 'All Four'],
      ['quad-minis', 'optMascotQuadMinis', 'Quad + Crabs'],
      ['off', 'mascotStagePresetOff', 'All Resting'],
    ];
    for (const [val, i18nKey, fb] of STAGE_PRESETS) {
      const pb = mk('button', BTN);
      pb.type = 'button';
      sa(pb, 'data-ag-stage-preset', val);
      if (pb.style) {
        O.assign(pb.style, {
          padding: '4px 10px',
          fontSize: '11px',
          fontWeight: '600',
          borderRadius: '999px',
          border: '1px solid var(--ag-cs-border, rgba(148,163,184,0.28))',
          cursor: 'pointer',
          flex: '1 1 auto',
          textAlign: 'center',
        });
      }
      pb.addEventListener('click', (ev) => {
        ev?.stopPropagation?.();
        const nextR = parseMascotSpec(val) || { c: 0, k: 0, d: 0, w: 0, minis: false };
        applyRosterChange(nextR, ev);
      });
      presetBtns.push({ btn: pb, val, i18nKey, fb });
      ap(presetRow, pb);
    }

    // 同步舞台所有 DOM 文本、阵营名牌开关态与预设高亮
    const syncStageControls = () => {
      const l = getLang();
      const u = uiText(l) || {};
      const r = readRoster();
      const encoded = encodeMascotSpec(r);
      const total = r.c + r.k + r.d + r.w;
      sa(view, 'data-mascot-val', encoded);
      backBtn.textContent = `← ${u.mascotStageBackBtn || 'Back to Settings'}`;
      titleEl.textContent = u.mascotStageTitle || 'Mascot Casting Stage';
      hintEl.textContent = u.mascotStageHint || 'Click mascots in the tavern or badges below to toggle spotlights; move pointer for 3D parallax';
      countPill.textContent = String(u.mascotRosterCount || 'Main {n}/4').replace('{n}', String(total));
      sa(countPill, 'data-total', total);
      if (countPill.style) countPill.style.borderColor = total >= 4 ? 'var(--ag-cs-accent, #60a5fa)' : 'var(--ag-cs-border, rgba(148,163,184,0.26))';
      minisPill.textContent = `${u.mascotRosterMinis || '+3 Mini Crabs'}: ${r.minis ? (u.mascotStageActiveOn || 'On Stage') : (u.mascotStageActiveOff || 'Resting')}`;
      sa(minisPill, 'data-active', r.minis ? '1' : '0');
      if (minisPill.style) {
        minisPill.style.borderColor = r.minis ? 'rgba(251,146,60,0.65)' : 'var(--ag-cs-border, rgba(148,163,184,0.24))';
        minisPill.style.background = r.minis ? 'rgba(251,146,60,0.16)' : 'transparent';
      }

      for (const sl of STAGE_SLOTS) {
        const ref = dockRefs[sl.key];
        if (!ref) continue;
        const on = slotCountOf(r, sl.key) > 0;
        ref.nameEl.textContent = u[sl.i18nKey] || sl.fb;
        ref.statePill.textContent = on ? (u.mascotStageActiveOn || 'On Stage') : (u.mascotStageActiveOff || 'Resting');
        sa(ref.btn, 'aria-pressed', on);
        sa(ref.btn, 'data-active', on ? '1' : '0');
        if (on) sa(ref.btn, 'data-pressed');
        else ra(ref.btn, 'data-pressed');
        if (ref.btn.style) {
          ref.btn.style.borderColor = on ? `rgba(${sl.rayA}, 0.68)` : 'var(--ag-cs-border, rgba(148,163,184,0.2))';
          ref.btn.style.background = on ? `rgba(${sl.rayA}, 0.14)` : 'var(--ag-cs-surface-2, rgba(148,163,184,0.04))';
          ref.btn.style.boxShadow = on ? `inset 0 1px 0 rgba(${sl.rayB}, 0.28), 0 0 12px rgba(${sl.rayA}, 0.14)` : 'none';
        }
        if (ref.statePill.style) {
          ref.statePill.style.borderColor = on ? `rgba(${sl.rayB}, 0.65)` : 'var(--ag-cs-border, rgba(148,163,184,0.2))';
          ref.statePill.style.background = on ? `rgba(${sl.rayA}, 0.24)` : 'transparent';
          ref.statePill.style.opacity = on ? '1' : '0.68';
        }
      }

      for (const p of presetBtns) {
        p.btn.textContent = u[p.i18nKey] || p.fb;
        const act = encoded === p.val;
        sa(p.btn, 'aria-pressed', act);
        if (act) sa(p.btn, 'data-pressed');
        else ra(p.btn, 'data-pressed');
        if (p.btn.style) {
          p.btn.style.borderColor = act ? 'var(--ag-cs-accent, #60a5fa)' : 'var(--ag-cs-border, rgba(148,163,184,0.26))';
          p.btn.style.background = act ? 'color-mix(in srgb, var(--ag-cs-accent, #60a5fa) 18%, transparent)' : 'transparent';
        }
      }
    };

    // Canvas 鼠标归一化坐标映射（WebGL2 3D 精确射线拾取 + 2.5D 区域拾取双兼容）
    const pointerToNdc = (ev) => {
      if (!ev || !isFn(canvas.getBoundingClientRect)) return null;
      const rect = canvas.getBoundingClientRect();
      if (!rect || !rect.width || !rect.height) return null;
      const u = (ev.clientX - rect.left) / rect.width;
      const v = (ev.clientY - rect.top) / rect.height;
      if (u < 0 || u > 1 || v < 0 || v > 1) return null;
      return { u, v, nx: u * 2 - 1, ny: 1 - v * 2 };
    };
    const hitSlotFromEvent = (ev) => {
      const pt = pointerToNdc(ev);
      if (!pt) return -1;
      if (webglStage && isFn(webglStage.pickSlot)) {
        const hit3d = webglStage.pickSlot(pt.nx, pt.ny);
        if (hit3d >= 0) return hit3d;
      }
      if (pt.v < 0.08) return -1;
      return Math.max(0, Math.min(4, Math.floor(pt.u * 5)));
    };
    const onCanvasPointerMove = (ev) => {
      if (!isOpen) return;
      const pt = pointerToNdc(ev);
      if (pt) {
        ptrNormX = pt.nx;
        ptrNormY = pt.ny;
        ptrInside = true;
        webglStage?.setPointer?.(pt.nx, pt.ny, true);
      }
      const hit = hitSlotFromEvent(ev);
      if (hit !== hoveredSlot) {
        hoveredSlot = hit;
        if (isReducedMotion()) drawStageFrame(nowMs(), true);
      }
    };
    const onCanvasPointerLeave = () => {
      hoveredSlot = -1;
      ptrInside = false;
      ptrNormX = 0;
      ptrNormY = 0;
      webglStage?.setPointer?.(0, 0, false);
      if (isOpen && isReducedMotion()) drawStageFrame(nowMs(), true);
    };
    const onCanvasClick = (ev) => {
      ev?.stopPropagation?.();
      if (!isOpen) return;
      const hit = hitSlotFromEvent(ev);
      if (hit >= 0) toggleStageSlot(hit, ev);
    };
    const bindCanvasEvents = (cv) => {
      cv.addEventListener('pointermove', onCanvasPointerMove);
      cv.addEventListener('pointerleave', onCanvasPointerLeave);
      cv.addEventListener('click', onCanvasClick);
    };
    const unbindCanvasEvents = (cv) => {
      cv.removeEventListener?.('pointermove', onCanvasPointerMove);
      cv.removeEventListener?.('pointerleave', onCanvasPointerLeave);
      cv.removeEventListener?.('click', onCanvasClick);
    };
    bindCanvasEvents(canvas);

    const swapToFreshCanvas = () => {
      unbindCanvasEvents(canvas);
      const nextCv = createStageCanvas();
      if (canvas.parentNode) {
        if (isFn(canvas.parentNode.insertBefore)) canvas.parentNode.insertBefore(nextCv, canvas);
        else ap(stageFrame, nextCv);
        canvas.remove?.();
      } else {
        ap(stageFrame, nextCv);
      }
      canvas = nextCv;
      api.canvas = nextCv;
      bindCanvasEvents(canvas);
    };

    const handleWebglFallback = () => {
      webglBlocked = true;
      if (webglStage) {
        try { webglStage.dispose(); } catch {}
        webglStage = null;
      }
      renderBackend = 'canvas2d';
      swapToFreshCanvas();
      if (isOpen && !doc.hidden) drawStageFrame(nowMs(), true);
    };

    const ensureWebglStage = () => {
      if (webglStage || webglBlocked || disposed) return webglStage;
      const glEngine = prismTavern;
      if (!glEngine || !isFn(glEngine.createStage)) return null;
      try {
        const inst = glEngine.createStage({
          canvas,
          doc,
          onContextLost: handleWebglFallback,
          onAtlasReady: () => { if (isOpen && !doc.hidden) drawStageFrame(nowMs(), true); },
        });
        if (inst) {
          webglStage = inst;
          renderBackend = 'webgl2';
          webglStage.setPointer(ptrNormX, ptrNormY, ptrInside);
          return webglStage;
        }
      } catch {}
      renderBackend = 'canvas2d';
      return null;
    };

    // ── HD-2D 像素剧场单帧渲染管线（优先 WebGL2 3D 视差引擎，自动无损降级 2.5D Canvas）──
    const ensureCanvasBacking = () => {
      const dpr = Math.min((win?.devicePixelRatio) || 1, 1.5);
      const tw = Math.round(STAGE_W * dpr);
      const th = Math.round(STAGE_H * dpr);
      if (canvas.width !== tw || canvas.height !== th) {
        canvas.width = tw;
        canvas.height = th;
      }
      return dpr;
    };

    const drawStageFrame = (now, force = false) => {
      if (!isOpen || disposed || doc.hidden || view.isConnected === false) {
        reclaimStageVram();
        return;
      }
      if (!force && now - lastDrawAt < FRAME_GAP_MS) return;
      const dt = lastStepAt ? Math.min(80, Math.max(8, now - lastStepAt)) : 33;
      lastStepAt = now;
      lastDrawAt = now;
      frameCount += 1;
      tickIdx = Math.floor(now / 150);

      const light = Boolean(isLightThemeNow());
      const reduced = isReducedMotion();
      const r = readRoster();
      const art = resolveMascotArt();
      lastArtSource = art?.source || 'unknown';

      // 1. 统一推进 5 槽位聚光灯插值、欢呼/告别/涟漪与姿态状态
      const smoothK = Math.min(1, dt / 110);
      const slotInfos = [];
      for (let i = 0; i < STAGE_SLOTS.length; i++) {
        const sl = STAGE_SLOTS[i];
        const st = slotStates[i];
        const cnt = slotCountOf(r, sl.key);
        const isHov = hoveredSlot === i;
        const targetLight = cnt > 0 ? 1 : isHov ? 0.45 : 0;
        st.light += (targetLight - st.light) * (reduced ? 1 : smoothK);
        if (Math.abs(targetLight - st.light) < 0.01) st.light = targetLight;

        const cheering = st.cheerUntil > now;
        const farewell = !cheering && st.farewellUntil > now;
        const cheerProg = cheering ? Math.max(0, Math.min(1, (now - st.cheerStart) / 1150)) : 0;
        const rippleProg = st.rippleStart && now - st.rippleStart < 780 ? (now - st.rippleStart) / 780 : 0;
        let pose = 'idle';
        let jumpPx = 0;
        let jumpWorld = 0;
        let sym = null;
        if (cheering) {
          pose = sl.cheerPose;
          sym = sl.cheerSym;
          const arc = Math.abs(Math.sin(cheerProg * Math.PI * 2));
          jumpPx = -Math.round(arc * 16);
          jumpWorld = arc * 0.36;
        } else if (farewell) {
          pose = 'wave';
        } else if (cnt === 0) {
          pose = isHov ? 'tilt' : 'sleep';
          if (pose === 'sleep') sym = (tickIdx + i) % 6 < 3 ? 'z1' : 'z2';
        } else {
          pose = isHov ? 'tilt' : 'idle';
        }
        const breath = pose === 'idle' && (tickIdx + i * 3) % 14 === 0;
        const blink = pose === 'idle' && (tickIdx + i * 5) % 22 === 0;
        slotInfos.push({
          sl, st, cnt, isHov, light: st.light,
          cheering, farewell, cheerProg, rippleProg,
          kind: sl.kind, pose, sym, jumpPx, jumpWorld, breath, blink,
          animTick: tickIdx + i,
          clipTick: cheering ? Math.floor((now - st.cheerStart) / 120) : tickIdx + i,
        });
      }

      // 2. 优先走 WebGL2 HD-2D 3D 视差像素舞台引擎
      const glInst = ensureWebglStage();
      if (glInst && !glInst.isContextLost()) {
        const ok = glInst.render(now, { dt, light, reducedMotion: reduced, art, tickIdx, slotInfos });
        if (ok) {
          renderBackend = 'webgl2';
          return;
        }
        handleWebglFallback();
        return;
      }

      // 3. 优雅降级：16:9 多层视差 2.5D 星夜酒馆 Canvas 引擎（兼容无 WebGL2 / Mock 测试环境）
      renderBackend = 'canvas2d';
      const dpr = ensureCanvasBacking();
      const ctx = canvas.getContext?.('2d');
      if (!ctx) return;

      const hasGrad = isFn(ctx.createLinearGradient);
      const hasRad = isFn(ctx.createRadialGradient);
      const hasPoly = isFn(ctx.moveTo) && isFn(ctx.lineTo) && isFn(ctx.fill);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, STAGE_W, STAGE_H);

      const parX = reduced || !ptrInside ? 0 : Math.round(ptrNormX * 8);

      // 3a) HD-2D 黑曜石星夜酒馆后墙（拱窗星月 + 书架 + 壁炉微光）
      if (hasGrad) {
        const bg = ctx.createLinearGradient(0, 0, 0, 248);
        if (light) {
          bg.addColorStop(0, '#efe7d6');
          bg.addColorStop(0.55, '#f6efe2');
          bg.addColorStop(1, '#e6d8be');
        } else {
          bg.addColorStop(0, '#080b14');
          bg.addColorStop(0.55, '#121829');
          bg.addColorStop(1, '#1d2438');
        }
        ctx.fillStyle = bg;
      } else {
        ctx.fillStyle = light ? '#f2eadc' : '#121726';
      }
      ctx.fillRect(0, 0, STAGE_W, 248);

      // 石砖纹理 + 哥特拱窗星月
      ctx.fillStyle = light ? 'rgba(138,108,72,0.06)' : 'rgba(255,255,255,0.025)';
      for (let y = 32; y < 238; y += 20) ctx.fillRect(0, y, STAGE_W, 1);
      for (const wx of [146, 494]) {
        const x0 = wx + Math.round(parX * 0.35);
        ctx.fillStyle = light ? '#cbb899' : '#252d44';
        ctx.fillRect(x0 - 38, 34, 76, 134);
        ctx.fillStyle = light ? '#b8d1eb' : '#102454';
        ctx.fillRect(x0 - 32, 42, 64, 120);
        ctx.fillStyle = light ? '#fff8dc' : '#dceeff';
        ctx.fillRect(x0 - 12, 60, 10, 10);
        ctx.fillRect(x0 + 12, 82, 3, 3);
        ctx.fillRect(x0 - 16, 108, 3, 3);
      }

      // 居中暖光壁炉
      const hx = 320 + Math.round(parX * 0.5);
      ctx.fillStyle = light ? '#a58d70' : '#2e3246';
      ctx.fillRect(hx - 40, 152, 80, 96);
      ctx.fillStyle = '#181116';
      ctx.fillRect(hx - 26, 174, 52, 72);
      ctx.fillStyle = '#e85d22';
      ctx.fillRect(hx - 18, 212, 36, 30);
      ctx.fillStyle = '#ffbc42';
      ctx.fillRect(hx - 10, 200 + (tickIdx % 2) * 3, 20, 34);

      // 散景暖光点
      const bokeh = [[52, 72, 16], [164, 54, 12], [274, 82, 18], [392, 60, 14], [510, 74, 16], [596, 56, 12]];
      for (let i = 0; i < bokeh.length; i++) {
        const [bx, by, br] = bokeh[i];
        const drift = Math.sin(now / 2600 + i * 1.4) * 4;
        if (hasRad) {
          const g = ctx.createRadialGradient(bx + parX * 0.5, by + drift, 1, bx + parX * 0.5, by + drift, br);
          g.addColorStop(0, light ? 'rgba(245,180,92,0.18)' : 'rgba(251,191,36,0.14)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(bx + parX * 0.5 - br, by + drift - br, br * 2, br * 2);
        }
      }

      // 顶部木石横梁
      ctx.fillStyle = light ? '#8c6d4f' : '#0f1320';
      ctx.fillRect(0, 0, STAGE_W, 14);
      ctx.fillStyle = light ? '#b08e68' : '#232c44';
      ctx.fillRect(0, 14, STAGE_W, 3);

      // 3b) 透视拼花木石舞台地板 + 阶梯台沿厚度
      if (hasGrad) {
        const fl = ctx.createLinearGradient(0, 244, 0, 330);
        if (light) {
          fl.addColorStop(0, '#d8c5a5');
          fl.addColorStop(1, '#c4ad89');
        } else {
          fl.addColorStop(0, '#2a2029');
          fl.addColorStop(1, '#18141f');
        }
        ctx.fillStyle = fl;
      } else {
        ctx.fillStyle = light ? '#d2be9c' : '#1b1822';
      }
      ctx.fillRect(0, 244, STAGE_W, 86);

      ctx.fillStyle = light ? 'rgba(92,66,38,0.18)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, 244, STAGE_W, 2);
      for (const py of [266, 288, 310]) ctx.fillRect(0, py, STAGE_W, 1);
      if (hasPoly && isFn(ctx.stroke)) {
        ctx.save();
        ctx.strokeStyle = light ? 'rgba(92,66,38,0.14)' : 'rgba(255,255,255,0.045)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
          const topX = 32 + i * 57.6;
          const botX = (topX - STAGE_W / 2) * 1.26 + STAGE_W / 2;
          ctx.beginPath();
          ctx.moveTo(Math.round(topX), 245);
          ctx.lineTo(Math.round(botX), 328);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 立体舞台前缘与台阶深影
      ctx.fillStyle = light ? '#b59971' : '#322b3e';
      ctx.fillRect(0, 328, STAGE_W, 4);
      ctx.fillStyle = light ? '#8d704c' : '#120f18';
      ctx.fillRect(0, 332, STAGE_W, 16);
      ctx.fillStyle = light ? 'rgba(72,52,32,0.22)' : 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 348, STAGE_W, 12);

      // 第 5 站位（右侧抬高苔藓迷你蟹专属双层石台）
      const mPlatX = 502;
      const mPlatW = 126;
      const mPlatY = 232;
      ctx.fillStyle = light ? 'rgba(78,56,34,0.18)' : 'rgba(0,0,0,0.46)';
      ctx.fillRect(mPlatX - 6, mPlatY + 12, mPlatW + 10, 68);
      ctx.fillStyle = light ? '#e2d0b2' : '#312b3d';
      ctx.fillRect(mPlatX, mPlatY, mPlatW, 66);
      ctx.fillStyle = light ? '#79a878' : '#3a7d5c';
      ctx.fillRect(mPlatX, mPlatY, mPlatW, 4);
      ctx.fillStyle = light ? '#9d7f57' : '#181421';
      ctx.fillRect(mPlatX, mPlatY + 66, mPlatW, 10);
      ctx.fillStyle = light ? '#cfb791' : '#2a2436';
      ctx.fillRect(mPlatX - 12, mPlatY + 26, 12, 44);
      ctx.fillStyle = light ? '#9d7f57' : '#181421';
      ctx.fillRect(mPlatX - 12, mPlatY + 70, 12, 6);

      // 3c) 逐站位绘制地板光环/涟漪、单只主角像素精灵与体积聚光灯（零分身！）
      for (let i = 0; i < slotInfos.length; i++) {
        const info = slotInfos[i];
        const { sl, st, cnt, isHov, cheering, farewell, pose, sym, jumpPx, breath, blink, clipTick } = info;
        const floorY = sl.key === 'm' ? 276 : 292;

        // 顶梁聚光灯罩
        ctx.fillStyle = light ? '#5e4934' : '#283148';
        ctx.fillRect(sl.cx - 10, 14, 20, 6);
        ctx.fillStyle = st.light > 0.05 ? `rgba(${sl.rayB}, ${0.35 + st.light * 0.65})` : (light ? '#9c8a74' : '#1b2030');
        ctx.fillRect(sl.cx - 7, 20, 14, 4);

        // 地板柔边投影 + 阵营光环
        if (hasRad) {
          const sh = ctx.createRadialGradient(sl.cx, floorY + 2, 5, sl.cx, floorY + 2, 44);
          sh.addColorStop(0, light ? 'rgba(72,52,32,0.22)' : 'rgba(0,0,0,0.52)');
          sh.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = sh;
          ctx.fillRect(sl.cx - 46, floorY - 14, 92, 34);
        }
        if (st.light > 0.03 && hasRad) {
          const glowR = 36 + st.light * 20;
          const gl = ctx.createRadialGradient(sl.cx, floorY + 1, 2, sl.cx, floorY + 1, glowR);
          const aBase = light ? 0.28 : 0.44;
          gl.addColorStop(0, `rgba(${sl.rayB}, ${(aBase * st.light).toFixed(3)})`);
          gl.addColorStop(0.55, `rgba(${sl.rayA}, ${(aBase * 0.48 * st.light).toFixed(3)})`);
          gl.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.save();
          ctx.translate(sl.cx, floorY + 1);
          ctx.scale(1, 0.38);
          ctx.fillStyle = gl;
          ctx.fillRect(-glowR, -glowR, glowR * 2, glowR * 2);
          ctx.restore();
        }

        // 激活瞬间地板扩散双光环涟漪
        if (info.rippleProg > 0 && info.rippleProg < 1 && isFn(ctx.ellipse) && isFn(ctx.stroke)) {
          const rp = info.rippleProg;
          ctx.save();
          ctx.strokeStyle = `rgba(${sl.rayB}, ${((1 - rp) * 0.78).toFixed(3)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(sl.cx, floorY + 1, 18 + rp * 42, 6 + rp * 15, 0, 0, Math.PI * 2);
          ctx.stroke();
          if (rp > 0.16) {
            const rp2 = (rp - 0.16) / 0.84;
            ctx.strokeStyle = `rgba(${sl.rayA}, ${((1 - rp2) * 0.45).toFixed(3)})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.ellipse(sl.cx, floorY + 1, 12 + rp2 * 32, 5 + rp2 * 11, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        }

        const shadeAlpha = cnt === 0 && !isHov && !farewell ? (light ? 0.56 : 0.46) : 1;
        ctx.save();
        if (shadeAlpha < 1) ctx.globalAlpha = shadeAlpha;

        if (sl.key !== 'm') {
          // 单只高清主角 (PX = 4)，无多只分身
          const mainPx = 4;
          const oxGrid = Math.round(sl.cx / mainPx) - 8;
          const oyGrid = Math.round((floorY + jumpPx) / mainPx) - 10;
          art.drawMainActor(ctx, sl.kind, pose, tickIdx + i, oxGrid, oyGrid, mainPx, {
            clipTick,
            sym,
            breath,
            blink,
            noShadow: true,
          });
        } else {
          // 站位 5：3 只迷你小蟹立于苔藓石台（pxSize = 2.5 -> 整格 2）
          const mPx = 2;
          const crabDefs = [
            { id: 'cowboy', dx: -26, dy: 0, phase: 0 },
            { id: 'shades', dx: 26, dy: 0, phase: 1 },
            { id: 'wizard', dx: 0, dy: cnt > 0 ? -16 : 2, phase: 2 },
          ];
          for (const cd of crabDefs) {
            const cJump = cheering
              ? -Math.round(Math.abs(Math.sin((info.cheerProg + cd.phase * 0.18) * Math.PI * 2)) * 12)
              : cnt > 0 && !reduced
                ? -Math.round(Math.max(0, Math.sin(now / 420 + cd.phase * 1.6)) * 3)
                : 0;
            const gx = Math.round((sl.cx + cd.dx) / mPx) - 8;
            const gy = Math.round((floorY + cd.dy + cJump) / mPx) - 8;
            art.drawMiniCrab(ctx, cd.id, cheering || isHov ? 'trick' : 'idle', gx, gy, mPx);
          }
          if (cnt === 0 && !isHov && !farewell) {
            ctx.fillStyle = light ? '#6d6258' : '#a8a194';
            const zy = floorY - 38 - ((tickIdx % 4) < 2 ? 0 : 2);
            ctx.fillRect(sl.cx + 14, zy, 6, 2);
            ctx.fillRect(sl.cx + 16, zy + 2, 2, 2);
            ctx.fillRect(sl.cx + 14, zy + 4, 6, 2);
          }
        }
        ctx.restore();

        // 体积感丁达尔聚光灯 + 上升星尘
        if (st.light > 0.03 && hasPoly) {
          ctx.save();
          if (!light) ctx.globalCompositeOperation = 'lighter';
          const coneTopW = 12;
          const coneBotW = 58;
          if (hasGrad) {
            const rayG = ctx.createLinearGradient(sl.cx, 22, sl.cx, floorY + 10);
            const topA = (light ? 0.24 : 0.36) * st.light;
            const midA = (light ? 0.11 : 0.17) * st.light;
            rayG.addColorStop(0, `rgba(${sl.rayB}, ${topA.toFixed(3)})`);
            rayG.addColorStop(0.55, `rgba(${sl.rayA}, ${midA.toFixed(3)})`);
            rayG.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = rayG;
          } else {
            ctx.fillStyle = `rgba(${sl.rayA}, ${(0.15 * st.light).toFixed(3)})`;
          }
          ctx.beginPath();
          ctx.moveTo(sl.cx - coneTopW, 22);
          ctx.lineTo(sl.cx + coneTopW, 22);
          ctx.lineTo(sl.cx + coneBotW, floorY + 10);
          ctx.lineTo(sl.cx - coneBotW, floorY + 10);
          ctx.closePath();
          ctx.fill();

          if (hasGrad) {
            const coreG = ctx.createLinearGradient(sl.cx, 22, sl.cx, floorY);
            coreG.addColorStop(0, `rgba(${sl.rayB}, ${((light ? 0.18 : 0.28) * st.light).toFixed(3)})`);
            coreG.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = coreG;
            ctx.beginPath();
            ctx.moveTo(sl.cx - 5, 22);
            ctx.lineTo(sl.cx + 5, 22);
            ctx.lineTo(sl.cx + 28, floorY + 2);
            ctx.lineTo(sl.cx - 28, floorY + 2);
            ctx.closePath();
            ctx.fill();
          }

          for (const mt of st.motes) {
            if (!reduced) mt.y -= mt.spd * (dt / 16);
            if (mt.y < 0) mt.y = 210;
            const prog = mt.y / 210;
            const mx = Math.round(sl.cx + mt.x * (0.28 + prog * 0.72) + Math.sin(now / 900 + mt.ph) * 4);
            const my = Math.round(32 + mt.y);
            const tw = 0.45 + 0.55 * Math.sin(now / 450 + mt.ph);
            ctx.fillStyle = `rgba(${sl.rayB}, ${(tw * st.light * (light ? 0.65 : 0.84)).toFixed(3)})`;
            ctx.fillRect(mx, my, 2, 2);
          }

          for (let bi = st.burst.length - 1; bi >= 0; bi--) {
            const b = st.burst[bi];
            b.t += dt / 750;
            if (b.t >= 1) { st.burst.splice(bi, 1); continue; }
            const bx = Math.round(sl.cx + b.dx * (0.7 + b.t * 1.2));
            const by = Math.round(floorY - 24 - b.t * 62 * b.vy);
            ctx.fillStyle = `rgba(${sl.rayB}, ${((1 - b.t) * 0.92).toFixed(3)})`;
            ctx.fillRect(bx, by, 2, 2);
          }
          ctx.restore();
        }
      }

      // 3d) 电影级暗角 (Vignette)
      if (hasRad) {
        const vig = ctx.createRadialGradient(STAGE_W / 2, STAGE_H * 0.52, STAGE_W * 0.28, STAGE_W / 2, STAGE_H * 0.52, STAGE_W * 0.64);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, light ? 'rgba(92,68,42,0.16)' : 'rgba(5,7,14,0.58)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, STAGE_W, STAGE_H);
      }
    };

    const stopLoop = () => {
      if (rafId) {
        canAF(rafId);
        rafId = 0;
      }
    };

    const reclaimStageVram = () => {
      stopLoop();
      if (webglStage) {
        try { webglStage.dispose(); } catch {}
        webglStage = null;
      }
      canvas.width = 0;
      canvas.height = 0;
    };

    const stepLoop = (ts) => {
      rafId = 0;
      if (!isOpen || disposed || view.isConnected === false) {
        if (isOpen) closeStage();
        else reclaimStageVram();
        return;
      }
      if (doc.hidden) {
        reclaimStageVram();
        return;
      }
      drawStageFrame(ts || nowMs(), false);
      if (isOpen && !disposed && !doc.hidden && !isReducedMotion()) {
        rafId = reqAF(stepLoop);
      }
    };

    const onDocKeyDown = (ev) => {
      if (!isOpen) return;
      if (view.isConnected === false) { closeStage(); return; }
      if (ev?.key === 'Escape') {
        ev.preventDefault?.();
        ev.stopPropagation?.();
        closeStage();
      }
    };
    const onDocVisChange = () => {
      if (!isOpen) return;
      if (view.isConnected === false) { closeStage(); return; }
      if (doc.hidden) {
        reclaimStageVram();
      } else {
        drawStageFrame(nowMs(), true);
        if (!rafId && !isReducedMotion()) rafId = reqAF(stepLoop);
      }
    };

    let detachMo = null;
    const stopDetachObserver = () => {
      if (!detachMo) return;
      try { detachMo.disconnect(); } catch {}
      detachMo = null;
    };
    const startDetachObserver = () => {
      stopDetachObserver();
      const MO = win?.MutationObserver || (typeof MutationObserver === 'function' ? MutationObserver : null);
      const watchRoot = doc.body || sec.closest?.('[role="dialog"]')?.parentNode || sec.parentNode;
      if (!MO || !watchRoot) return;
      try {
        detachMo = new MO(() => {
          if (isOpen && view.isConnected === false) closeStage();
        });
        detachMo.observe(watchRoot, { childList: true, subtree: true });
      } catch {
        detachMo = null;
      }
    };

    const openStage = () => {
      if (disposed || isOpen) return;
      isOpen = true;
      for (const blk of getMainBlocks()) {
        if (!blk) continue;
        blk.hidden = true;
        sa(blk, 'hidden', '');
        if (blk.style) blk.style.display = 'none';
      }
      view.hidden = false;
      ra(view, 'hidden');
      if (view.style) view.style.display = 'flex';
      const r = readRoster();
      STAGE_SLOTS.forEach((sl, idx) => {
        slotStates[idx].light = slotCountOf(r, sl.key) > 0 ? 1 : 0;
        slotStates[idx].cheerUntil = 0;
        slotStates[idx].farewellUntil = 0;
      });
      syncStageControls();
      doc.addEventListener?.('keydown', onDocKeyDown, true);
      doc.addEventListener?.('visibilitychange', onDocVisChange);
      startDetachObserver();
      if (!doc.hidden) {
        drawStageFrame(nowMs(), true);
        if (!isReducedMotion()) rafId = reqAF(stepLoop);
      }
    };

    const closeStage = () => {
      if (!isOpen) return;
      isOpen = false;
      hoveredSlot = -1;
      ptrInside = false;
      stopDetachObserver();
      reclaimStageVram();
      doc.removeEventListener?.('keydown', onDocKeyDown, true);
      doc.removeEventListener?.('visibilitychange', onDocVisChange);
      view.hidden = true;
      sa(view, 'hidden', '');
      if (view.style) view.style.display = 'none';
      for (const blk of getMainBlocks()) {
        if (!blk) continue;
        blk.hidden = false;
        ra(blk, 'hidden');
        if (blk.style) blk.style.display = '';
      }
      if (sec.isConnected !== false) syncRoot();
    };

    const disposeStage = () => {
      if (disposed) return;
      closeStage();
      stopDetachObserver();
      disposed = true;
      unbindCanvasEvents(canvas);
      reclaimStageVram();
    };

    backBtn.addEventListener('click', (ev) => {
      ev?.stopPropagation?.();
      closeStage();
    });

    ap(foldBody, view);
    const api = {
      el: view,
      canvas,
      open: openStage,
      close: closeStage,
      dispose: disposeStage,
      sync: syncStageControls,
      isOpen: () => isOpen,
      getActiveRafId: () => rafId,
      getFrameCount: () => frameCount,
      getBackend: () => renderBackend,
      getWebGLStats: () => (webglStage ? webglStage.getStats() : null),
      getArtSource: () => lastArtSource || resolveMascotArt()?.source || 'ch9-fallback',
      getSlotStates: () => slotStates.map((s) => ({ key: s.key, light: s.light, cheering: s.cheerUntil > nowMs(), farewell: s.farewellUntil > nowMs() })),
      setPointer: (nx, ny, inside = true) => {
        ptrNormX = nx; ptrNormY = ny; ptrInside = Boolean(inside);
        webglStage?.setPointer?.(nx, ny, Boolean(inside));
      },
      hoverSlot: (idx) => { hoveredSlot = idx; if (isOpen) drawStageFrame(nowMs(), true); },
      clickSlot: (idx) => { if (isOpen) toggleStageSlot(idx); },
      renderNow: () => { if (isOpen) drawStageFrame(nowMs(), true); },
    };
    sec.__agMascotStageApi = api;
    return api;
  };

  return {create: createMascotCastingStage, spotlight: SPOTLIGHT_ICON_SVG};
})();

const prismStageLabels = {
  "mascotRosterTitle": "自定义上场阵容",
  "mascotRosterCount": "主宠 {n}/4",
  "mascotRosterMinis": "+3 迷你蟹",
  "mascotSpeciesCrab": "Claude 蟹",
  "mascotSpeciesCat": "Gemini 猫",
  "mascotSpeciesDragon": "GPT 白龙",
  "mascotSpeciesWhale": "DeepSeek 蓝鲸",
  "mascotStageOpenBtn": "打开桌宠选角舞台",
  "mascotStageTitle": "桌宠选角舞台",
  "mascotStageBackBtn": "返回设置",
  "mascotStageHint": "点击酒馆舞台角色或下方阵营名牌点亮/熄灯聚光灯，移动指针体验 3D 视差",
  "mascotStagePresetDual": "双宠经典",
  "mascotStagePresetQuad": "四宠同台",
  "mascotStagePresetOff": "全员休息",
  "mascotStageMinisSlot": "迷你小蟹角",
  "mascotStageActiveOn": "在场中",
  "mascotStageActiveOff": "休息中"
};
