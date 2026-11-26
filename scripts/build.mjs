import { readFile, writeFile, mkdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = name => readFile(new URL(name, root), 'utf8');
// Map the host selectors, glyph opacity and foreground idle cadence; vendor/ retains the originals.
const home = '[data-content-phase="hero"][data-prism-code-view]';
const conversation = '[data-content-phase="active"][data-prism-code-view] > [data-slot="conversation.hero.frame"]';
const markdown = '[data-chat-group-part="response"] [data-text-interaction-source]';
const vendors = [];
for (const [name, file, globalExport] of [
  ['water','vial-core'], ['actors','dual-mascot-rig'], ['rippleCore','ripple-core'],
  ['rippleHost','home-ripple-host'], ['convAura','conv-aura','__agPrismConvAura'],
  ['streamChoreo','stream-choreography'], ['smoothCaret','smooth-caret'], ['prismEffortEngine','model-effort-engine'],
  ['prismCrystalEngine','model-crystal'], ['prismGlyphs','model-glyphs'], ['prismTavern','octopath-stage-webgl'],
]) {
  let source = await read('vendor/' + file + '.js');
  if (file === 'ripple-core') {
    // Both the GPU and 2D renderer consume this glyph buffer (glyph, opacity, wave mix, prism hue).
    const hooks = [
      ['function createWebGL2Renderer(canvas, columns, rows)', 'function createWebGL2Renderer(canvas, columns, rows, antialias)'],
      ['const gl = canvas.getContext(\'webgl2\', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: false });',
        'const gl = canvas.getContext(\'webgl2\', { alpha: true, premultipliedAlpha: true, antialias, depth: false, preserveDrawingBuffer: false });'],
      ['createWebGL2Renderer(canvas, columns, rows)) ||', 'createWebGL2Renderer(canvas, columns, rows, options?.antialias === true)) ||'],
      // Advance the fixed-step clock even at rest; the previous step has already cleared the wave grids.
      ['          step();\n          behind -= WAVE_STEP;', '          if (moving) step();\n          behind -= WAVE_STEP;'],
      // Keep the last character rows and side gutters legible all the way to the pane boundary.
      ['edge[cell] = ex * ey;', 'edge[cell] = 0.68 + 0.32 * ex * ey;'],
      // A continuous scene clock bypasses the upstream 40 ms cache for the alpha buffer.
      ['const seconds = still ? 0 : now / 1000;', 'const sceneMs = palette?.sceneMs ?? now;\n        const seconds = still ? 0 : sceneMs / 1000;'],
      ['const needIdleRefresh =', '$& palette?.sceneMs !== undefined ||'],
      // Spread glyph changes over each changeRate interval instead of flipping the whole pane at once.
      ['const glyphs = new Uint8Array(cells);', '$&\n    const glyphOffsets = new Uint8Array(cells);'],
      ['patch[cell] = patchClear(x, y);','$&\n        glyphOffsets[cell] = Math.floor(hash(column + 11, row + 5) * 32);'],
      ['M.floor((now / 1000) * RIPPLE.changeRate);', 'M.floor((now / 1000) * RIPPLE.changeRate * 32);'],
      ['const tick = tickAt(now, still);', 'const tick = tickAt(sceneMs, still);'],
      ['glyphs[row * columns + column] = glyphIndex(column, row, tick);', `const cell = row * columns + column;
              const epoch = Math.floor((tick + glyphOffsets[cell]) / 32);
              if (lastTick < 0 || epoch !== Math.floor((lastTick + glyphOffsets[cell]) / 32)) {
                glyphs[cell] = glyphIndex(column, row, epoch);
              }`],
      // Blend cached neighbouring cloud samples so the drifting wave never jumps a full character column.
      ['const drift = M.floor((seconds * RIPPLE.cloudDrift) / cellWidth);', `const offset = seconds * RIPPLE.cloudDrift / cellWidth;
        const drift = Math.floor(offset);
        const fraction = offset - drift;`],
      ['c < columns; c++) {\n          colClouds[c]', 'c <= columns; c++) {\n          colClouds[c]'],
      ['const prevG = glow[cell];', `$&
            const leftCloud = colClouds[column][row];
            const cloud = leftCloud + fraction * (colClouds[column + 1][row] - leftCloud);`],
      ['idleThemeScale * colClouds[column][row]', 'idleThemeScale * cloud'],
      ['idleAlpha * colClouds[column][row]', 'idleAlpha * cloud'],
      ['const frameGap = isGpuGlow ? 0 : (ext ? 14 : (basePresence < 1 ? 33 : 42));',
        'const frameGap = isGpuGlow || ext ? 0 : (basePresence < 1 ? 33 : 42);'],
    ];
    for (const [anchor, replacement] of hooks) {
      if (source.split(anchor).length !== 2) throw Error('Review ripple-core glyph adaptation: ' + anchor);
      source = source.replace(anchor, replacement);
    }
    // The horizon, like the glyph plane, draws one full-screen triangle without a depth test.
    const contextFlags = 'antialias: false, preserveDrawingBuffer: false';
    if (source.split(contextFlags).length !== 2) throw Error('Review horizon WebGL context options.');
    source = source.replace(contextFlags,'depth: false, '+contextFlags);
    // Give DSH's subdued conversation palette a small lift while retaining the original cloud valleys.
    const base = 'const idleAlpha = eff.dark ? RIPPLE.idleAlphaDark : RIPPLE.idleAlphaLight;';
    if (source.split(base).length !== 2) {
      throw new Error('Review the conversation glyph opacity mapping for the new ripple-core source.');
    }
    source = source.replace(base, 'const idleAlpha = palette?.conv ? (eff.dark ? 0.32 : 0.3) * (palette.glyphGain ?? 1) : (eff.dark ? RIPPLE.idleAlphaDark : RIPPLE.idleAlphaLight);');
    // Decay by elapsed time even when a display refresh is shorter than 16 ms.
    source = source.replaceAll('M.exp(-M.max(0.016, rawDt) / 0.38)','M.exp(-rawDt / 0.38)');
  }
  if (file === 'home-ripple-host') {
    // Foreground drawing follows VSync in both states. Only the background's visual time slows down.
    const throttle = /const vsDt = lastTs[^;]+;[\s\S]*?\n        lastDraw = now;/;
    const hooks = [
      // Query the owning renderer so a loss check cannot create a context with browser defaults.
      [`inst?.isContextLost?.() || (inst?.mode !== '2d' && cv?.getContext?.('webgl2')?.isContextLost?.())`, 'inst?.isContextLost?.()'],
      // Initial DSH glyph canvases historically used the default MSAA; recovery canvases did not.
      ['{ prefer2D: !!u, onContextLost: () => onLost(1) }', '{ prefer2D: !!u, antialias: !sw, onContextLost: () => onLost(1) }'],
      // A DSH conversation can contain thousands of message elements. Cache the descendant
      // hole check until an insertion, removal or change to either hole attribute.
      ['    function isConvBlocked() {', `    let holeObserver, nestedHole = null;
    function hasNestedHole(d) {
      const selector = '[data-has-browser-hole="true"],[data-has-drawer-browser-hole="true"]';
      if (!d?.documentElement || typeof MutationObserver !== 'function') return Boolean(d?.querySelector?.(selector));
      if (!holeObserver) {
        holeObserver = new MutationObserver(() => {
          const wasBlocked = nestedHole;
          nestedHole = null;
          if (wasBlocked) syncRipple();
        });
        holeObserver.observe(d.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:[HOLE_A,DHOLE_A]});
      }
      if (nestedHole === null) nestedHole = Boolean(d.querySelector(selector));
      return nestedHole;
    }

    function isConvBlocked() {`],
      ['d?.querySelector?.(\'[data-has-browser-hole="true"],[data-has-drawer-browser-hole="true"]\')','hasNestedHole(d)'],
      ['    function unmountRipple() {', '$&\n      holeObserver?.disconnect(); holeObserver = undefined; nestedHole = null;'],
      ['    function syncRipple() {', '$&\n      nestedHole = null;'],
      ['    getMinFrameGapMs,','    isTaskActive = () => false,\n    getSurface,\n    homeGlyphsEnabled = () => true,'],
      ['function resolveTarget() {', `$&
      if (getSurface) {
        const target = getSurface();
        if (!target) return null;
        if (target.mode === 'home') return isAllowed() ? { ...target, level: 'off' } : null;
        const level = convLv();
        return level === 'off' || isConvBlocked() ? null : { ...target, level };
      }`],
      ['let lastDraw = 0;', 'const frameDue = createPrismFrameGate();\n      const sceneTime = createPrismAmbientClock();\n      const applyBreath = createPrismTaskBreath();'],
      ['let lastTs = 0;', ''],
      ['const need = force1 ||', `const moving = inT || busy || inI || aRec;
        const continuous = !still && !hP() && amb > 0.001;
        const need = continuous || force1 ||`],
      ['const pal = buildPal(tok, auraState, now, amb, sp, state.mode, state.convLevel);', `const sceneMs = sceneTime(now, moving);
          const pal = buildPal(tok, auraState, sceneMs, amb, sp, state.mode, state.convLevel);
          pal.sceneMs = sceneMs;
          if (pal.conv && !still) applyBreath(pal, now, isTaskActive());`],
      ['state.glow?.draw?.(now,', 'state.glow?.draw?.(sceneMs,'],
      // Keep the home gradient's GPU resources when the same panel changes to a conversation.
      ['          try { state.glow?.dispose?.(); } catch {}\n          state.glow = null;\n          state.glowCanvas?.remove?.();\n          state.glowCanvas = null;',
        '          setVis(state.glowCanvas, false);'],
      ['          mountGlow(0, 0);\n        }\n        gZero = false;',
        "          mountGlow(0, 0);\n          if (state.width > 0 && state.height > 0) syncG(state.width, state.height);\n        } else setVis(state.glowCanvas, state.glow?.mode !== 'none');\n        gZero = false;"],
      ['if (hasSz(state.glowCanvas)) {', "if (state.mode === 'home' && hasSz(state.glowCanvas)) {"],
      ['state.field.draw(now, pal, still);','if (state.mode !== "home" || homeGlyphsEnabled()) $&'],
      ['state.onPress = (ev) => {','$&\n        if (state.mode === "home" && !homeGlyphsEnabled()) return;'],
      ['state.onMove = (ev) => {','$&\n        if (state.mode === "home" && !homeGlyphsEnabled()) return;'],
      ['if (isDestroyed() || hP() || still || !(inT || busy || inI || aRec)) enterIdleSleep();',
        'if (isDestroyed() || !continuous) enterIdleSleep();'],
    ];
    if (!throttle.test(source)) throw new Error('Review the active frame cadence for the new ripple host.');
    source = source.replace(throttle, 'if (!frameDue(now) && !still && drawn && !force1 && !hP()) { wake(); return; }');
    for (const [anchor,replacement] of hooks) {
      if (source.split(anchor).length !== 2) throw new Error('Review ripple host frame hook: '+anchor);
      source = source.replace(anchor,replacement);
    }
  }
  if (file === 'conv-aura') {
    // Use the same frame gate as the field. Phase durations still use real elapsed time.
    const oldCadence = /        \/\/ Split-Rate 300Hz VSync throttle[^\n]+\n[\s\S]*?(?=        const phaseElapsed =)/;
    const oldThrottle = /        const settleIdleSleep = [\s\S]*?        lastGpuDrawAt = now;/;
    const oldSchedule = /        let nextDelay = [\s\S]*?        state.timer = setTimeout\(\(\) => wake\(false\), nextDelay\);/;
    for (const section of [oldCadence,oldThrottle,oldSchedule]) {
      if (!section.test(source)) throw Error('Review the conversation glow frame scheduling.');
    }
    source = source.replace(oldCadence,'').replace(oldThrottle,'        forceImmediateDraw = false;')
      .replace(oldSchedule,'        wake(false);');
    const hooks = [
      ['let lastGpuDrawAt = 0;', 'const frameDue = createPrismFrameGate();\n      const sceneTime = createPrismAmbientClock();'],
      ['const allowLivingFlow = isMotionStandardOrUltra() && !isP();', `$&
        if (allowLivingFlow && drawnOnce && !forceImmediateDraw && !frameDue(now)) { wake(false); return; }`],
      ['const prevPhaseBeforeAdv = state.phase;',''],
      ['const phaseJustChanged = phase !== prevPhaseBeforeAdv;', 'const sceneMs = sceneTime(now, phase !== "idle" || inLiftoffEbb);'],
      ['computeConvAuraOptics(phase, state.phaseAt, now, dark, state.wasRunning, OPTICS_BUF, da);',
        'computeConvAuraOptics(phase, state.phaseAt, phase === "idle" ? sceneMs : now, dark, state.wasRunning, OPTICS_BUF, da);'],
      ['invokeConvGlowDraw(state.glow, now, dark, st, o, ambient, spectrum);',
        'invokeConvGlowDraw(state.glow, sceneMs, dark, st, o, ambient, spectrum);'],
      ['glow.draw(now, dark, opt.strength, extra);','extra.dark = dark;\n        extra.strength = opt.strength;\n        glow.draw(now, extra);'],
      ['const still = !allowLivingFlow || settleIdleSleep;', 'const still = !allowLivingFlow;'],
      ['if (isDestroyed() || !allowLivingFlow || settleIdleSleep)', 'if (isDestroyed() || !allowLivingFlow)'],
      ['opt.strength = opt.surge = opt.speed = 0;\n          state.lastOptics = opt;\n          return enterAuraSleep();',
        'opt.strength = opt.surge = opt.speed = 0;\n          state.lastOptics = opt;\n          return allowLivingFlow ? wake(false) : enterAuraSleep();'],
      ['paint(idleSnapOpt, true);\n          return enterAuraSleep();','paint(idleSnapOpt, !allowLivingFlow);\n          return allowLivingFlow ? wake(false) : enterAuraSleep();'],
    ];
    for (const [anchor,replacement] of hooks) {
      if (source.split(anchor).length !== 2) throw new Error('Review active aura frame hook: '+anchor);
      source = source.replace(anchor,replacement);
    }
  }
  if (['home-ripple-host', 'conv-aura', 'stream-choreography'].includes(file)) {
    source = source.replaceAll('.agy-home',home).replaceAll('[data-testid="conversation-view"]',conversation)
      .replaceAll('[data-testid="planner-response-text"]',markdown)
      .replaceAll('[data-testid="input-cancel-button"]','[data-prism-running="true"] [data-composer-card]');
  }
  if(file==='smooth-caret')source=source.replaceAll('[data-testid="agent-input-box"]','[data-composer-card]');
  // Keep modules which publish both CommonJS and a browser singleton local to this plugin.
  vendors.push('const ' + name + ' = ((globalThis) => { const module = {exports:{}};\n' + source +
    '\nreturn ' + (globalExport ? 'globalThis.' + globalExport : 'module.exports') + '; })(Object.create(window));');
}
const files = ['state','frame-clock','conversation','shell','studio-home','chat-space','inspector','outline-rail','controls','composer','model-menu','panel-stage','panel','client'];
const modules = await Promise.all(files.map(k => read('src/' + k + '.js')));
const css = [
  (await read('vendor/style.css')).replaceAll('.theme-light','.prism-light-body').replaceAll('.agy-user-bubble)', '.agy-user-bubble,[data-message-bubble])')
    // DSH measures live terminal cells from its separate terminal font setting. Tool transcript snippets use pre.
    .replace('.xterm,.xterm-rows,',''),
  await read('vendor/studio-tokens.css'), await read('vendor/studio-dashboard.css'),
  (await read('vendor/sidebar-studio.css')).replaceAll('html[data-theme="light"]','html[data-ag-cs-theme="light"]'),
  ...await Promise.all(['prism','shell','studio-home','chat-space','inspector','outline-rail','composer','model-menu','panel'].map(k=>read('src/'+k+'.css'))),
].join('\n');
const bundle = ['// Independent DSH adaptation, modified 2026-11-26. Upstream Obsidian Prism by RMvdesi and contributors. GPL-3.0-only. See NOTICE and THIRD_PARTY_NOTICES.md.',
  'window.__ModuleLoader__.load({id:"dsh-obsidian-prism",factory(require){',
  'const React=require("react"), h=React.createElement, {createPortal}=require("react-dom");',
  'const sheet=' + JSON.stringify(css) + ';', ...vendors, ...modules,
  'return { inject:["slots","modelDirectories","sessions","theme","remote","sidebarRight","sidebarRightTabs"], apply }; }});', ''].join('\n');
await mkdir(new URL('lib/', root), {recursive:true});
await writeFile(new URL('lib/client.js', root), bundle);
