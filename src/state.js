const themes = {
  auto:'随系统 · 黑曜 / 冷晶', obsidian:'深空黑曜', warm:'暖炭玄岩',
  crystal:'白昼冷晶', alabaster:'暖白画册', host:'沿用 DSH 外观'
};
const rosters = { 'r:c1,k1+m':'小蟹和紫猫', 'r:w1':'Deepy 鲸鱼', 'r:d1':'银龙', 'r:c1,k1,d1,w1+m':'全员', off:'关闭' };
const prismFrameRates = {60:'60 FPS',120:'120 FPS',180:'180 FPS',native:'原生满帧'};
const prismAuraStyles = {prism:'极夜琉纱',neon:'幽邃光晕'};
const prismAuraLevels = {subtle:'静谧',balanced:'均衡',vivid:'绚丽'};
const prismRippleLevels = {off:'关闭',subtle:'微光',medium:'标准',full:'鲜明'};
const prismScrollModes = {inertia:'高速惯性',native:'原生瞬移'};
const prismCodeFonts = {system:'系统默认',jetbrains:'JetBrains Mono',cascadia:'Cascadia Code',sfmono:'SF Mono / Consolas'};
const defaults = {theme:'auto', roster:'r:c1,k1+m', vial:true, slider:true, motion:true, fold:true, wallpaper:false, autoTranslate:false,
  thoughtView:'bilingual', accent:'follow', sidebarStudio:false, ambient:100,
  darkAuraStyle:'prism',darkAura:'balanced',homeRipple:true,convRipple:'subtle',effortMemory:true,
  smoothCaret:true,compactComposer:true,bottomScroll:'inertia',directMenu:true,codeFont:'system',codeLigatures:false,
  targetFps:'180', rim:true, radius:'standard'};
const prefKey = 'dsh-obsidian-prism/settings-v1';
const changeEvent = 'dsh-obsidian-prism:settings';
let prefs = {...defaults};
// Before 0.2.8 both pages used one ripple preference. Explicit per-page values take precedence.
function expandLegacyRipple(saved) {
  if (!Object.hasOwn(prismRippleLevels,saved?.ripple)) return saved;
  return {homeRipple:saved.ripple!=='off',convRipple:saved.ripple,...saved};
}
try {
  const saved = expandLegacyRipple(JSON.parse(localStorage.getItem(prefKey) || '{}'));
  for (const k of Object.keys(defaults)) {
    if (typeof saved[k] === typeof defaults[k]) prefs[k] = saved[k];
  }
  if (!Object.hasOwn(themes,prefs.theme)) prefs.theme = defaults.theme;
  if (!Object.hasOwn(prismFrameRates,prefs.targetFps)) prefs.targetFps = defaults.targetFps;
  if (!Object.hasOwn(prismAuraStyles,prefs.darkAuraStyle)) prefs.darkAuraStyle=defaults.darkAuraStyle;
  if (!Object.hasOwn(prismAuraLevels,prefs.darkAura)) prefs.darkAura=defaults.darkAura;
  if (!Object.hasOwn(prismRippleLevels,prefs.convRipple)) prefs.convRipple=defaults.convRipple;
  if (!Object.hasOwn(prismScrollModes,prefs.bottomScroll)) prefs.bottomScroll=defaults.bottomScroll;
  if (!Object.hasOwn(prismCodeFonts,prefs.codeFont)) prefs.codeFont=defaults.codeFont;
  if (!['bilingual','immersive'].includes(prefs.thoughtView)) prefs.thoughtView=defaults.thoughtView;
  if (!actors.parseMascotSpec(prefs.roster)) prefs.roster = defaults.roster;
} catch {}
function setPref(key, value) {
  prefs = {...prefs, [key]:value};
  try { localStorage.setItem(prefKey, JSON.stringify(prefs)); } catch {}
  window.dispatchEvent(new Event(changeEvent));
}
function observePrefs(listener) {
  window.addEventListener(changeEvent,listener);
  return () => window.removeEventListener(changeEvent,listener);
}
function usePrefs() { return React.useSyncExternalStore(observePrefs, () => prefs); }
const mediaQueries=new Map();
function systemMedia(query) {
  let media=mediaQueries.get(query);
  if (!media) { media=matchMedia(query);mediaQueries.set(query,media); }
  return media;
}
function watchMedia(query, listener) {
  const media = systemMedia(query);
  media.addEventListener('change',listener);
  return () => media.removeEventListener('change',listener);
}
const reduceQuery = '(prefers-reduced-motion: reduce)';
const prefersReducedMotion=()=>systemMedia(reduceQuery).matches;
const subscribeMotion = fn => watchMedia(reduceQuery,fn);
function useReduced() { return React.useSyncExternalStore(subscribeMotion,prefersReducedMotion); }
function palette() {
  return prefs.theme === 'auto' ? (systemMedia('(prefers-color-scheme: dark)').matches ? 'obsidian' : 'crystal') : prefs.theme;
}
function progress(pressure) {
  const used = pressure?.projectedTokens ?? pressure?.pressureTokens;
  const capacity = pressure?.contextWindow;
  return Number.isFinite(used) && used >= 0 && Number.isFinite(capacity) && capacity > 0
    ? Math.min(1, used / capacity) : null;
}
function mediaStore(action, value) {
  return new Promise((resolve,reject) => {
    const open = indexedDB.open('dsh-obsidian-prism',1);
    open.onupgradeneeded = () => open.result.createObjectStore('media');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('media',action === 'get' ? 'readonly':'readwrite');
      const store = tx.objectStore('media');
      const request = action === 'get' ? store.get('wallpaper') : action === 'put' ? store.put(value,'wallpaper') : store.delete('wallpaper');
      tx.oncomplete = () => { db.close(); resolve(request.result); };
      tx.onabort = () => { db.close(); reject(tx.error || new Error('壁纸保存失败')); };
    };
  });
}
function watchWallpaper() {
  let url, layer, revision = 0;
  const remove = () => {
    layer?.remove(); layer = undefined;
    if (url) URL.revokeObjectURL(url);
    url = undefined;
    delete document.documentElement.dataset.prismWallpaper;
  };
  const refresh = async () => {
    const current = ++revision;
    remove();
    if (!prefs.wallpaper) return;
    const file = await mediaStore('get').catch(() => undefined);
    if (!file || current !== revision) return;
    url = URL.createObjectURL(file);
    layer = document.createElement(file.type.startsWith('video/') ? 'video':'img');
    layer.className = 'prism-wallpaper';
    layer.setAttribute('aria-hidden','true');
    if (layer.tagName === 'VIDEO') { layer.loop = true; layer.muted = true; layer.playsInline = true; }
    layer.src = url;
    document.body.prepend(layer);
    document.documentElement.dataset.prismWallpaper = 'on';
    playback();
  };
  const playback = () => {
    if (layer?.tagName !== 'VIDEO') return;
    if (document.hidden || !prefs.motion || prefersReducedMotion()) layer.pause();
    else layer.play().catch(() => {});
  };
  let enabled = prefs.wallpaper;
  const stop = observePrefs(() => {
    if (enabled !== prefs.wallpaper) { enabled = prefs.wallpaper; refresh(); } else playback();
  });
  const stopMotion = watchMedia(reduceQuery,playback);
  document.addEventListener('visibilitychange',playback);
  window.addEventListener('prism-wallpaper-file',refresh);
  refresh();
  return () => { revision++; stop(); stopMotion(); document.removeEventListener('visibilitychange',playback);
    window.removeEventListener('prism-wallpaper-file',refresh); remove(); };
}
function installAppearance(ctx) {
  const theme=ctx.theme;
  const style = document.createElement('style');
  style.textContent = sheet; document.head.append(style);
  const root = document.documentElement;
  let original = theme.getTheme().preference;
  let active = true;
  const registered = Object.keys(themes).filter(k=>k!=='auto' && k!=='host').map(k=>theme.register({
    id:'prism-'+k, colorScheme:['obsidian','warm'].includes(k)?'dark':'light',tokens:{}
  }));
  const update = () => {
    const k=palette(), current=theme.getTheme().preference;
    if(k!=='host' && current!=='prism-'+k)theme.setTheme('prism-'+k);
    if(k==='host' && current.startsWith('prism-'))theme.setTheme(original);
    root.dataset.prismTheme=k; root.dataset.prismMotion=String(prefs.motion && !prefersReducedMotion());
    const light = k==='host' ? theme.getTheme().active.colorScheme==='light' : ['crystal','alabaster'].includes(k);
    document.body.classList.toggle('prism-light-body',light);
    const optics = {style:'1',theme:light?'light':'dark',palette:k==='warm'?'warm':k==='host'?'host':'obsidian',
      lightPreset:k==='alabaster'?'alabaster':'crystal',darkAuraStyle:prefs.darkAuraStyle,darkAura:prefs.darkAura,
      homeRipple:prefs.homeRipple?'on':'off',accent:prefs.accent,corners:({compact:'sharp',round:'soft'})[prefs.radius]||'balanced',
      motion:root.dataset.prismMotion==='true'?'standard':'off',composer:prefs.compactComposer?'on':'off',
      codeFont:prefs.codeFont==='system'?'default':prefs.codeFont,ligatures:prefs.codeLigatures?'1':'0',sidebar:'on',home:'studio',ambient:String(prefs.ambient/100)};
    for(const [key,value] of Object.entries(optics)) root.dataset['agCs'+key[0].toUpperCase()+key.slice(1)]=value;
    root.style.setProperty('--ag-ambient-mul',String(prefs.ambient/100));
  };
  update();
  const stopHost=ctx.on('theme/change', snapshot=>{
    if(snapshot.preference.startsWith('prism-'))return;
    original=snapshot.preference;
    queueMicrotask(()=>{if(active)update();});
  });
  const stopPrefs = observePrefs(update);
  const stopColor = watchMedia('(prefers-color-scheme: dark)',update);
  const stopReduce = watchMedia(reduceQuery,update);
  const stopWall = watchWallpaper();
  return () => { active=false;stopHost();stopPrefs(); stopColor(); stopReduce(); stopWall();
    if(theme.getTheme().preference.startsWith('prism-')) theme.setTheme(original);
    registered.forEach(remove=>remove());style.remove(); delete root.dataset.prismTheme; delete root.dataset.prismMotion;
    for (const key of ['Style','Theme','Palette','LightPreset','DarkAuraStyle','DarkAura','HomeRipple','Accent','Corners','Motion','Composer','CodeFont','Ligatures','Sidebar','Home','Ambient']) delete root.dataset['agCs'+key];
    document.body.classList.remove('prism-light-body'); root.style.removeProperty('--ag-ambient-mul'); };
}
