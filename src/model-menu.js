// DSH model-directory binding for Obsidian Prism's model glyphs, starfield and cut crystal.
// Adapted 2026-11-25. The picker lists the models returned by the active DSH provider.
function usePrismDirectory(directory) {
  const read = React.useCallback(() => directory.store.getSnapshot(), [directory]);
  const subscribe = React.useCallback(fn => directory.store.subscribe(fn), [directory]);
  return React.useSyncExternalStore(subscribe, read);
}

function modelLevels(model) {
  const reasoning = model?.reasoning;
  if (!reasoning) return [];
  const levels = reasoning.efforts.map(({id, name}) => ({effort:id, label:name, routeValue:id}));
  if (reasoning.defaultEffort === undefined) levels.unshift({effort:'', label:'Default', routeValue:undefined});
  return levels;
}

function prismEffortKey(provider, modelId) {
  return 'dsh-obsidian-prism/effort/'+JSON.stringify([provider,modelId]);
}
function supportsPrismEffort(model, effort) {
  return typeof effort==='string' && model?.reasoning?.efforts.some(level=>level.id===effort);
}
function prismSavedEffort(provider, model) {
  if (!prefs.effortMemory || !model?.reasoning) return undefined;
  try {
    const value=localStorage.getItem(prismEffortKey(provider,model.id));
    return supportsPrismEffort(model,value) ? value : undefined;
  } catch { return undefined; }
}
function prismMenuEffort(current, provider, model) {
  const active=current?.provider===provider && current.model===model.id;
  return (active ? current.reasoningEffort : prismSavedEffort(provider,model)) ?? model.reasoning?.defaultEffort;
}
function prismRouteModel(groups, route) {
  return route && groups.find(group=>group.id===route.provider)?.models.find(model=>model.id===route.model);
}
function writePrismEffort(route, model) {
  if (!model?.reasoning) return;
  const key=prismEffortKey(route.provider,model.id);
  try {
    if (route.reasoningEffort===undefined) localStorage.removeItem(key);
    else if (supportsPrismEffort(model,route.reasoningEffort)) localStorage.setItem(key,route.reasoningEffort);
  } catch {}
}

// All DSH model pickers use the directory for this composer, including the native /model command.
const prismEffortBindings=new WeakMap();
function bindPrismEffortMemory(directory, readCommandPopup) {
  let binding=prismEffortBindings.get(directory);
  if (!binding) {
    const original=directory.select;
    const own=Object.hasOwn(directory,'select');
    async function select(selection) {
      if (!prefs.effortMemory) return original.call(this,selection);
      const {current,groups,pending}=directory.store.getSnapshot();
      const changed=current?.provider!==selection.provider || current?.model!==selection.model;
      const model=prismRouteModel(groups,selection);
      // /model offers only model names, but DSH supplies the catalogue default in its onSelect.
      const command=changed && !pending && selection.reasoningEffort===model?.reasoning?.defaultEffort && readCommandPopup?.();
      const modelOnly=!Object.hasOwn(selection,'reasoningEffort') || (command?.command==='model' && command.submitting);
      const saved=changed && modelOnly ? prismSavedEffort(selection.provider,model) : undefined;
      const next=saved===undefined ? selection : {...selection,reasoningEffort:saved};
      const result=await original.call(this,next);
      if (result?.ok && prefs.effortMemory) {
        const updated=directory.store.getSnapshot().groups;
        const previousModel=prismRouteModel(updated,current);
        // Adopt an existing session's first explicit choice, without replacing a newer saved choice from another session.
        if (changed && current?.reasoningEffort!==undefined && !prismSavedEffort(current.provider,previousModel)) {
          writePrismEffort(current,previousModel);
        }
        if (!changed || Object.hasOwn(next,'reasoningEffort')) writePrismEffort(next,prismRouteModel(updated,next));
      }
      return result;
    }
    directory.select=select;
    binding={users:0,release(){
      if (directory.select===select) {
        if (own) directory.select=original;
        else delete directory.select;
      }
    }};
    prismEffortBindings.set(directory,binding);
  }
  binding.users++;
  return ()=>{
    if (--binding.users===0) {binding.release();prismEffortBindings.delete(directory);}
  };
}


function PrismModelGlyph({model, effort, active, trigger}) {
  const size = trigger ? 16 : 15;
  if (/deepseek|深度求索/i.test(model.name+' '+model.id)) {
    return h('span',{className:'ag-cs-model-glyph','data-brand':'deepseek','data-selected':String(active),'aria-hidden':true},
      h(DeepSeekMark,{size}));
  }
  const label = (model.name || model.id) + ' ' + (effort || '');
  const {brand, tier} = prismGlyphs.parseModelLabelInfo(label);
  const path = prismGlyphs.BRAND_PATHS[brand] || prismGlyphs.BRAND_PATHS.gemini;
  return h('span',{className:'ag-cs-model-glyph' + (trigger ? '' : ' ag-cs-panel-row-glyph'),
    'data-brand':brand,'data-tier':tier,'data-selected':String(active),'aria-hidden':'true'},
    h('svg',{className:'ag-cs-model-glyph-svg',width:size,height:size,viewBox:trigger ? '-4 -4 32 32' : '0 0 24 24',fill:'none'},
      trigger && h('g',{className:'ag-cs-glyph-orbit-group'},
        h('ellipse',{className:'ag-cs-glyph-orbit',cx:12,cy:12,rx:14.5,ry:6.2,transform:'rotate(-24 12 12)'}),
        h('circle',{className:'ag-cs-glyph-sat is-a',cx:25.2,cy:6.1,r:1.65}),
        h('circle',{className:'ag-cs-glyph-sat is-b',cx:-1.2,cy:17.9,r:1.25})),
      h('path',{className:trigger ? 'ag-cs-glyph-body' : undefined,d:path,fill:trigger ? undefined : active ? 'var(--glyph-color-hi)' : 'currentColor',
        fillOpacity:trigger || active ? undefined : .72,fillRule:'evenodd'}),
      trigger && h('circle',{className:'ag-cs-glyph-core',cx:12,cy:12,r:brand==='gemini' ? 2.7 : 2.1})));
}

function PrismModelLabel({provider, model, placement, selected, directory}) {
  const data = usePrismDirectory(directory);
  usePrefs();
  const effort = prismMenuEffort(data.current,provider.id,model);
  const badge = typeof model.badge?.text === 'string' ? model.badge.text : null;
  return h('span',{className:'prism-model-label','data-placement':placement},
    h(PrismModelGlyph,{model,effort,active:selected,trigger:placement==='trigger'}),
    h('span',{className:'prism-model-name'},model.name), badge && h('small',null,badge));
}

function bindPrismCrystal(track, canvas, read, fixed) {
  const crystal = prismCrystalEngine.mountCrystalPrismBar(canvas, {
    reduceMotion:read().reduceMotion,
    getState:() => ({...read(),hideLock:!fixed,prismStrength:1})
  });
  let frame = 0, previous = 0;
  const frameDue=createPrismFrameGate();
  function draw(now) {
    frame = 0;
    if (document.hidden) return;
    if (!frameDue(now)) {wake();return;}
    crystal.step(previous ? Math.min(.05,(now-previous)/1000) : .016);
    previous = now;
    if (!read().reduceMotion && !crystal.isIdle()) frame = requestAnimationFrame(draw);
  }
  function wake() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function pointer(event) {
    crystal.setPointerClient(event.clientX,event.clientY);
    wake();
  }
  function leave() { crystal.setPointerClient(-9999,-9999); wake(); }
  track.addEventListener('pointermove',pointer);
  track.addEventListener('pointerleave',leave);
  document.addEventListener('visibilitychange',wake);
  const observer = new ResizeObserver(wake);
  observer.observe(track);
  crystal.wake();
  wake();
  return {refresh() { crystal.setReduceMotion(read().reduceMotion); crystal.invalidate(); wake(); },
    dispose() { cancelAnimationFrame(frame); observer.disconnect();
      track.removeEventListener('pointermove',pointer); track.removeEventListener('pointerleave',leave);
      document.removeEventListener('visibilitychange',wake); crystal.dispose(); }};
}

function PrismReasoningRow({model, route, locked, pending, onSelect, preview}) {
  const prefs = usePrefs(), reduced = useReduced() || !prefs.motion;
  const host = React.useRef(null), value = React.useRef(null), row = React.useRef(null), settings = React.useRef(null);
  const slider = React.useRef(null), crystal = React.useRef(null), latest = React.useRef(null), fill = React.useRef(0);
  const levels = modelLevels(model);
  const isOrchestrator = prismGlyphs.parseModelLabelInfo(model.name+' '+model.id).isOrchestrator;
  const fixed = isOrchestrator && levels.length < 2;
  latest.current = {baseName:model.name,effortLevels:levels,currentEffort:route.reasoningEffort ?? model.reasoning?.defaultEffort ?? '',
    locked:locked || levels.length < 2, pending, onSelect, reduced};
  function crystalState() {
    const html = document.documentElement;
    return {reduceMotion:latest.current.reduced,fillRatio:fixed ? -1 : fill.current,
      isDark:prismEffortEngine.surfaceIsDark(window,document),ambientIntensity:1,
      accentTone:html.dataset.agCsAccent==='follow' && ['warm','alabaster'].includes(palette()) ? 'warm' : html.dataset.agCsAccent};
  }
  React.useLayoutEffect(() => {
    const container = host.current;
    if (!fixed) {
      slider.current = prismEffortEngine.mountCodexEffortSlider({
        container,row:row.current,valueElement:value.current,document,window,
        seat:{_read:() => latest.current, selectEffort:level => latest.current.onSelect(level.routeValue)},
        onVisualRatio:p => { fill.current=p; crystal.current?.refresh(); }
      });
      container.querySelector('[role=slider]').setAttribute('aria-label','推理强度');
    }
    if (isOrchestrator) {
      const track = fixed ? container.firstElementChild : container.querySelector('.ces-track');
      track.classList.add('ag-cs-orch-track');
      const canvas = document.createElement('canvas');
      canvas.className = 'ag-cs-orch-canvas';
      canvas.setAttribute('aria-hidden','true');
      track.prepend(canvas);
      crystal.current = bindPrismCrystal(track,canvas,crystalState,fixed);
    }
    return () => {
      settings.current?.(); settings.current = null;
      crystal.current?.dispose(); crystal.current = null;
      slider.current?.unmount(); slider.current = null;
    };
  },[model.id,route.provider,isOrchestrator,fixed]);
  React.useLayoutEffect(() => { slider.current?.refresh(); crystal.current?.refresh(); },
    [locked,pending,route.reasoningEffort,model.reasoning,reduced,prefs.theme]);
  function openSliderSettings(x,y) {
    settings.current?.();
    settings.current = prismEffortEngine.openSettingsPanel({document,window,x,y,parent:row.current});
    const popup = row.current.querySelector('.ces-set');
    if (popup) {
      popup.setAttribute('popover','manual');
      popup.showPopover?.();
    }
  }
  return h('div',{className:'ces-ag-section','data-effort-slot':'true','aria-busy':pending},
    h('div',{className:'prism-model-divider',role:'separator'}),
    h('div',{className:'ces-ag-effort-row',ref:row,'data-ag-orch-p':isOrchestrator && !fixed ? '1' : undefined,
      'data-testid':fixed ? 'orchestrator-effort-bar' : undefined,
      onContextMenu:e => {e.preventDefault();e.stopPropagation();openSliderSettings(e.clientX,e.clientY);},
      onKeyDown:e => {if(e.key==='ContextMenu' || (e.shiftKey && e.key==='F10')) {
        e.preventDefault();e.stopPropagation();const rect=row.current.getBoundingClientRect();openSliderSettings(rect.left,rect.bottom+4);
      }}},
      h('div',{className:'ces-ag-effort-head'+(fixed ? ' ag-cs-orch-head' : '')},
        h('span',{className:'ces-ag-effort-title'},preview ? '推理等级 · '+model.name : '推理等级'),
        h('span',{ref:value,className:'ces-ag-effort-value'+(fixed ? ' ag-cs-orch-value' : '')},fixed ? levels[0]?.label || 'Auto' : undefined)),
      h('div',{className:'ces-inline',ref:host},fixed && h('div',{className:'ag-cs-orch-track',role:'status','aria-label':'Orchestrator '+(levels[0]?.label || 'Auto')}))));
}

// DSH opens the native model-list pane directly before a first route has been selected.
// That pane has no model.options slot; use the popup owned by this composer's trigger.
function PrismNativeModelPane({root,directory,locked,readCommandPopup}) {
  const [pane,setPane]=React.useState(null);
  React.useLayoutEffect(()=>bindPrismEffortMemory(directory,readCommandPopup),[directory,readCommandPopup]);
  React.useLayoutEffect(()=>{
    const slot=root.querySelector('[data-slot="conversation.input.model"]');
    if (!slot) return;
    function sync() {
      const trigger=slot.querySelector('button[aria-controls]');
      const popup=trigger && document.getElementById(trigger.getAttribute('aria-controls'));
      setPane(previous=>popup?.getAttribute('role')==='group'
        ? previous?.popup===popup ? previous : {popup,trigger}
        : null);
    }
    const observer=new MutationObserver(sync);
    observer.observe(slot,{subtree:true,attributes:true,attributeFilter:['aria-controls','aria-expanded'],childList:true});
    sync();
    return ()=>observer.disconnect();
  },[root]);
  if (!pane) return null;
  const dismiss=()=>{if (pane.trigger.getAttribute('aria-expanded')==='true') pane.trigger.click();pane.trigger.focus();};
  return createPortal(h(PrismEffort,{directory,available:true,locked,dismiss,nativePane:pane}),pane.popup);
}

function PrismEffort({directory, available, locked, dismiss, reportFailure, nativePane}) {
  const data = usePrismDirectory(directory), prefs = usePrefs();
  const [filter,setFilter] = React.useState(''), [problem,setProblem]=React.useState('');
  const main = React.useRef(null);
  const route = data.current;
  const groups = data.groups;
  const rows = groups.flatMap(group => group.models.map(model => ({group,model})));
  const selected = rows.find(({group,model})=>group.id===route?.provider && model.id===route?.model);
  const needle = filter.trim().toLowerCase();
  const visible = rows.filter(({model,group})=>!needle || [model.name,model.id,group.name].some(s=>s?.toLowerCase().includes(needle)));
  const target = selected || visible[0];
  const current = target?.model;
  const targetRoute = selected ? route : target && {provider:target.group.id,model:current.id,reasoningEffort:prismSavedEffort(target.group.id,current)};
  const pendingHere = !!targetRoute && data.pending?.provider===targetRoute.provider && data.pending.model===targetRoute.model;
  const flat = available && rows.length>0;
  const showSlider = !!current && flat && prefs.slider && (modelLevels(current).length > 0 || prismGlyphs.parseModelLabelInfo(current.name).isOrchestrator);
  // Arrow/Tab from the native trigger should reach visible rows and the slider, including by keyboard alone.
  React.useLayoutEffect(() => {
    if (!flat) return;
    const menu = nativePane?.popup || main.current.closest('[role=menu]');
    if (!menu) return;
    const trigger = nativePane?.trigger || Array.from(document.querySelectorAll('[data-composer-card] button[aria-controls]')).find(b=>b.getAttribute('aria-controls')===menu.id);
    // DSH normally anchors to the trigger's right edge, which moves as its effort label changes.
    if(trigger) menu.style.setProperty('--prism-open-trigger-width',trigger.getBoundingClientRect().width+'px');
    // Match the space above the actual trigger, including after the window is resized.
    const measure=()=>{
      if(trigger) menu.style.setProperty('--prism-menu-room',Math.max(1,trigger.getBoundingClientRect().top-22)+'px');
    };
    measure();
    const resize=new ResizeObserver(measure);
    if(trigger) resize.observe(trigger);
    window.addEventListener('resize',measure);
    if(nativePane) (main.current.querySelector('input') || main.current.querySelector('button'))?.focus();
    function navigate(event) {
      if (event.target.closest('.ces-set')) return;
      if (nativePane && event.key==='Escape') {event.preventDefault();event.stopPropagation();dismiss();return;}
      if (event.target.closest('[role=slider]') && event.key!=='Tab') return;
      if (!['ArrowDown','ArrowUp','Tab'].includes(event.key)) return;
      const items = [...menu.querySelectorAll('button:not(:disabled),[role=slider]:not([aria-disabled=true]),input:not(:disabled)')].filter(el => el.checkVisibility());
      if (!items.length) return;
      const index = items.indexOf(document.activeElement);
      const direction = event.key==='ArrowUp' || (event.key==='Tab' && event.shiftKey) ? -1 : 1;
      event.preventDefault(); event.stopPropagation();
      items[index<0 ? (direction<0 ? items.length-1 : 0) : (index+direction+items.length)%items.length].focus();
    }
    menu.addEventListener('keydown',navigate,true);
    trigger?.addEventListener('keydown',navigate,true);
    return () => {resize.disconnect();window.removeEventListener('resize',measure);menu.style.removeProperty('--prism-menu-room');menu.style.removeProperty('--prism-open-trigger-width');
      menu.removeEventListener('keydown',navigate,true);trigger?.removeEventListener('keydown',navigate,true);};
  },[flat,nativePane]);
  if (!flat) return null;
  async function select(selection, close) {
    if (locked || data.pending) return;
    setProblem('');
    try {
      const result = await directory.select(selection);
      if (result && !result.ok) throw Error(result.error?.message || '模型选择失败');
      if (close) dismiss?.();
    } catch(error) { if(reportFailure) reportFailure(error.message);else setProblem(error.message); }
  }
  return h('section',{className:'prism-models','data-testid':'model-selector-panel','data-prism-has-slider':String(showSlider),ref:main},
    h('div',{className:'prism-model-heading',role:'status'},data.status==='loading'?'正在刷新模型列表…':'模型'),
    rows.length>4 && h('input',{className:'prism-model-search',type:'search','aria-label':'搜索模型',placeholder:'搜索模型…',value:filter,onChange:e=>setFilter(e.target.value)}),
    h('div',{className:'prism-model-rows'},visible.map(({group,model}) => {
      const active = group.id===route?.provider && model.id===route?.model;
      const effort = prismMenuEffort(route,group.id,model);
      const effortName = model.reasoning?.efforts.find(e=>e.id===effort)?.name;
      return h('button',{type:'button',className:'prism-model-row',role:'menuitemradio','aria-checked':active,'data-selected':String(active),
        title:[model.name,group.name,typeof model.description==='string' && model.description].filter(Boolean).join(' · '),
        disabled:locked || !!data.pending,key:JSON.stringify([group.id,model.id]),onClick:()=>active ? dismiss?.() : select({provider:group.id,model:model.id},!prefs.slider || !modelLevels(model).length)},
        h(PrismModelGlyph,{model,effort,active}),
        h('span',{className:'prism-model-row-text'},model.name),
        effortName && h('span',{className:'prism-model-tier','data-effort':effort},effortName),
        typeof model.badge?.text==='string' && h('small',{className:'prism-model-badge'},model.badge.text),
        active && h('span',{className:'prism-model-check','aria-hidden':'true'},'✓'));
    }),!visible.length && h('div',{className:'prism-model-empty',role:'status'},'没有匹配的模型')),
    problem && !(nativePane && data.error) && h('div',{role:'alert',className:'prism-model-empty'},problem),
    showSlider && h(PrismReasoningRow,{key:targetRoute.provider+'/'+current.id,model:current,route:pendingHere?data.pending:targetRoute,
      locked:!pendingHere && (locked || !!data.pending),pending:pendingHere,
      preview:!selected,onSelect:effort=>select({provider:targetRoute.provider,model:current.id,reasoningEffort:effort},false)}));
}
