function PrismWaterColumn({pressure,running,reduced,theme,accent}) {
  const ratio = progress(pressure);
  const canvas = React.useRef(null), api = React.useRef(null), state = React.useRef({});
  function readState() {
    const color = palette();
    return {fill:ratio ?? 0, maxTokens:pressure?.contextWindow, critical:ratio >= .85, isDark:prismIsDark(),
      lightPreset:color === 'alabaster' ? 'alabaster' : 'crystal', palette:color, accentTone:accent,
      streaming:running && !reduced, camp:'gemini', hoveredSlice:-1};
  }
  state.current = readState();
  React.useLayoutEffect(() => {
    if (!canvas.current) return;
    let frame = 0, last = 0;
    const frameDue=createPrismFrameGate();
    const wake = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
    };
    function draw(now) {
      frame = 0;
      if (!api.current || document.hidden) return;
      if (!frameDue(now)) {wake();return;}
      api.current.step(last ? (now-last)/1000 : 1/60);
      last = now;
      if (!api.current.isSettled()) wake();
    }
    api.current = water.mountPhysicalWaterVial(canvas.current,{
      ...state.current, getState:() => state.current, reduceMotion:reduced, onWake:wake
    });
    wake();
    document.addEventListener('visibilitychange',wake);
    const stop = watchMedia('(prefers-color-scheme: dark)',() => {
      state.current.isDark = prismIsDark(); api.current?.wake();
    });
    return () => {
      stop(); document.removeEventListener('visibilitychange',wake); cancelAnimationFrame(frame);
      api.current?.dispose(); api.current = null;
    };
  },[ratio === null,reduced]);
  React.useEffect(() => { api.current?.wake(); },[ratio,running,theme,accent,pressure?.contextWindow]);
  const capacity = pressure?.contextWindow;
  const capacityText = Number.isFinite(capacity) && capacity > 0 ?
    new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(capacity) : '—';
  return h(React.Fragment,null,
    h('div',{className:'prism-column-head'},h('span',null,capacityText),h('strong',null,ratio === null ? '—' : (ratio*100).toFixed(1)+'%')),
    ratio === null ? h('div',{className:'prism-column-empty','aria-label':'暂无上下文读数'},h('i')) :
      h('canvas',{ref:canvas,width:96,height:220,'aria-label':'可触摸的上下文试管'}),
    h('div',{className:'prism-column-foot'},ratio === null ? '暂无读数' : running ? 'STREAMING' : 'IDLE'));
}

function Vial({pressure,running,reduced,theme}) {
  const {accent} = usePrefs();
  const button = React.useRef(null), panel = React.useRef(null);
  const [open,setOpen] = React.useState(false);
  const id = React.useId();
  const ratio = progress(pressure), percent = ratio === null ? '—' : Math.round(ratio*100)+'%';
  React.useLayoutEffect(() => {
    const popup = panel.current;
    const onToggle = event => setOpen(event.newState === 'open');
    popup.addEventListener('toggle',onToggle);
    return () => popup.removeEventListener('toggle',onToggle);
  },[]);
  React.useLayoutEffect(() => {
    if (!open) return;
    const popup = panel.current, trigger = button.current;
    const position = () => {
      const anchor = trigger.getBoundingClientRect(), bounds = popup.getBoundingClientRect();
      const left = Math.min(window.innerWidth - bounds.width - 6,Math.max(6,anchor.right - bounds.width));
      const top = anchor.top - bounds.height - 9;
      popup.style.left = Math.max(6,left)+'px';
      popup.style.top = (top >= 6 ? top : Math.max(6,Math.min(anchor.bottom+8,window.innerHeight-bounds.height-6)))+'px';
    };
    position();
    window.addEventListener('resize',position);
    document.addEventListener('scroll',position,true);
    return () => {
      window.removeEventListener('resize',position); document.removeEventListener('scroll',position,true);
    };
  },[open]);
  React.useEffect(() => {
    if (ratio >= .85) button.current?.closest('[data-composer-card]')?.dispatchEvent(new Event('prism-vial-high'));
  },[ratio >= .85]);
  return h(React.Fragment,null,
    h('button',{ref:button,className:'prism-context-chip',type:'button',title:'上下文窗口',
      'aria-label':ratio === null ? '上下文窗口，暂无读数' : '上下文占用 '+percent,'aria-controls':id,
      'aria-expanded':open,popoverTarget:id},
      h('i',{'aria-hidden':'true',style:{'--prism-used-angle':(360*(ratio ?? 0))+'deg'}}),h('strong',null,percent)),
    createPortal(h('section',{popover:'auto',role:'region','aria-label':'上下文窗口',id,ref:panel,
      className:'prism-context-popover'},open && h(PrismWaterColumn,{pressure,running,reduced,theme,accent})),document.body));
}

function disposePrismMascots(perch) {
  perch.rig?.dispose();
  perch.host?.remove();
  perch.rig=null;
  perch.host=null;
  perch.sleeping=false;
}

function Mascots({root,mainPerch,options}) {
  const privatePerch=React.useMemo(()=>({}),[]);
  const main=root.parentElement?.parentElement?.matches('[data-slot="main.conversation"]');
  const perch=main ? mainPerch : privatePerch;
  const refresh=React.useRef(null);
  const reduced=useReduced() || !options.motion;
  const enabled=options.roster!=='off';
  React.useLayoutEffect(()=>{
    if (!enabled) {disposePrismMascots(perch);return;}
    let card,previousRunning,previousSession;
    const readCamp=()=>{
      const model=card?.querySelector('[data-model-id]');
      if(!model)return undefined;
      const id=(model.getAttribute('data-provider-id')+' '+model.getAttribute('data-model-id')).toLowerCase();
      if (/anthropic|claude/.test(id)) return 'claude';
      if (/gemini|google/.test(id)) return 'gemini';
      if (/openai|gpt/.test(id)) return 'gpt';
      return 'deepseek';
    };
    function sync() {
      const rig=perch.rig;
      if(!rig || !card)return;
      const covered=root.dataset.prismFieldState==='chat';
      if (covered!==Boolean(perch.sleeping)) {
        perch.sleeping=covered;
        rig.notify('host-sleep',{sleep:covered});
      }
      const running=root.dataset.prismRunning==='true',hasError=root.dataset.prismError==='true';
      const session=root.dataset.conversationSession;
      const shown=!!card.querySelector('button[aria-expanded="true"]');
      perch.host.toggleAttribute('data-prism-peeking',shown);
      rig.setState({mascot:prefs.roster,streaming:running,hasError,camp:readCamp(),yieldMode:shown?'peek':'none',
        reducedMotion:!prefs.motion || prefersReducedMotion()});
      if(previousSession===session && previousRunning!==undefined && previousRunning!==running)
        rig.notify(running?'send':'streamDone',{error:hasError});
      previousSession=session;
      previousRunning=running;
    }
    const modelObserver=new MutationObserver(sync);
    const type=e=>{if(e.target.matches('[data-composer-input]'))perch.rig.onUserType(e.target.textContent||'');};
    const rim=e=>perch.rig.setRimLight(e.detail);
    const critical=()=>perch.rig.notify('vial-high');
    function detach(){
      if(!card)return;
      modelObserver.disconnect();
      card.removeEventListener('input',type);
      card.removeEventListener('prism-rim-light',rim);
      card.removeEventListener('prism-vial-high',critical);
      if(perch.host?.parentNode===card)perch.host.remove();
      card=null;
    }
    function findCard(){
      if(card && root.contains(card))return;
      detach();
      card=root.querySelector('[data-composer-seat] [data-composer-card]');
      if(!card)return;
      if(!perch.host){
        const host=document.createElement('div');
        host.className='ag-cs-crab ag-cs-dual-stage prism-companions';
        host.setAttribute('aria-label','像素伙伴');
        perch.host=host;
      }
      card.append(perch.host);
      if(!perch.rig){
        perch.host.setAttribute('data-prism-placing','');
        perch.rig=actors.mountDualMascotStage(perch.host,{mascot:prefs.roster,camp:readCamp()||'deepseek',
          reducedMotion:!prefs.motion || prefersReducedMotion(),streaming:root.dataset.prismRunning==='true',hasError:root.dataset.prismError==='true'});
        // Commit the rig's initial coordinates before enabling its walking transition.
        perch.host.getBoundingClientRect();
        perch.host.removeAttribute('data-prism-placing');
      }else perch.rig.syncPowerState();
      modelObserver.observe(card,{subtree:true,attributes:true,attributeFilter:['aria-expanded','data-model-id','data-provider-id']});
      card.addEventListener('input',type);
      card.addEventListener('prism-rim-light',rim);
      card.addEventListener('prism-vial-high',critical);
      sync();
    }
    // The host replaces the composer between sessions and when a confirmation replaces the input.
    const layout=new MutationObserver(findCard);
    layout.observe(root,{childList:true,subtree:true});
    const activity=new MutationObserver(sync);
    activity.observe(root,{attributes:true,attributeFilter:['data-prism-running','data-prism-error','data-conversation-session','data-prism-field-state']});
    findCard();
    refresh.current=sync;
    return ()=>{
      refresh.current=null;
      layout.disconnect();activity.disconnect();detach();
      if(!main)disposePrismMascots(perch);
    };
  },[root,enabled,perch,main]);
  React.useLayoutEffect(()=>{refresh.current?.();},[reduced,options.roster]);
  return null;
}
