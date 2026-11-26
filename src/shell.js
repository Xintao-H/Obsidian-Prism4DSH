// DSH selectors stop here. Rendering and optics are provided by the upstream modules.
const panelEvent = 'dsh-obsidian-prism:open-panel';
function emitPanel(tab='settings') {window.dispatchEvent(new CustomEvent(panelEvent,{detail:{tab}}));}
function modeIcon(name,size=15) {
  const paths={code:'m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18',chat:'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1.4-3.1A8.5 8.5 0 1 1 21 11.5Z',
    plus:'M12 5v14M5 12h14',folder:'M3 7V5h6l2 2h10v12H3Z',up:'m6 11 6-6 6 6m-6-6v14',chev:'m9 5 7 7-7 7',
    list:'M8 6h13M8 12h13M8 18h13M3 6h.5M3 12h.5M3 18h.5',search:'M16 16l4 4m-2-10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    settings:'M12 4v3m0 10v3M4 12h3m10 0h3M6 6l2 2m8 8 2 2M6 18l2-2m8-8 2-2M16 12a4 4 0 1 1-8 0 4 4 0 1 1 8 0',
    translate:'M2 6h12m-6-3v3M4 8c2 4 5 6 9 8m-2-9c-1 4-4 7-9 10m12 3 4-11 4 11m-7-3h6',file:'M5 3h9l5 5v13H5ZM14 3v6h5',x:'m6 6 12 12M6 18 18 6'};
  return h('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.65,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:paths[name]}));
}
// The main DSH panel is replaced when switching sessions. The glyph field belongs to the window.
function createPrismFieldSurface() {
  let root=null,panel=null,releaseFrame=0;
  const flags={isDestroyed:()=>!root,isDarkTheme:()=>document.documentElement.dataset.agCsTheme==='dark',
    getAmbientIntensity:()=>prefs.ambient/100,getMinFrameGapMs:prismFrameInterval,rippleCore,
    setAttrIfChanged:(el,k,v)=>{if(el.getAttribute(k)!==String(v))el.setAttribute(k,v);}};
  const field=rippleHost.createHomeRippleController({...flags,
    getSurface:()=>root && {root:panel,mode:root.dataset.contentPhase==='hero'?'home':'conv'},
    isAllowed:()=>true,homeGlyphsEnabled:()=>prefs.homeRipple,isTaskActive:()=>['thinking','running'].includes(root?.dataset.prismFieldState),
    isConvAllowed:()=>prefs.convRipple!=='off',getConvLevel:()=>prefs.convRipple,motionReduced:prefersReducedMotion,getAccentTone:()=>prefs.accent});
  const aura=convAura.createConvAuraController({...flags,isHomeRippleEnabled:()=>true,isMotionStandardOrUltra:()=>true,
    getSpectrumMode:()=>prefs.accent!=='follow' ? prefs.accent : ['warm','alabaster'].includes(palette()) ? 'warm' : 'default',
    runGuardedMut:fn=>fn()});
  function refresh() {field.sync();aura.sync();field.refreshTheme();aura.refreshTheme();}
  function dispose() {
    cancelAnimationFrame(releaseFrame);releaseFrame=0;root=panel=null;
    field.unmount();aura.unmount();
  }
  function attach(content,host) {
    cancelAnimationFrame(releaseFrame);releaseFrame=0;
    root=content;panel=host;
    root.setAttribute('data-prism-code-view','');panel.setAttribute('data-prism-field-panel','');
    refresh();
    return ()=>{
      content.removeAttribute('data-prism-code-view');host.removeAttribute('data-prism-field-panel');
      if (root!==content) return;
      root=panel=null;
      // React binds the replacement panel during the same navigation. Only release the graphics
      // when there is no successor at the next paint, e.g. motion was turned off.
      releaseFrame=requestAnimationFrame(dispose);
    };
  }
  return {field,aura,attach,refresh,dispose};
}
function prismInsertedTextCenter(editor,text) {
  const doc=editor.ownerDocument, selection=doc.getSelection();
  if (!selection?.rangeCount || !editor.contains(selection.focusNode)) return;
  const range=selection.getRangeAt(0).cloneRange();
  range.collapse(false);
  const walker=doc.createTreeWalker(editor,NodeFilter.SHOW_TEXT);
  let node=range.endContainer, offset=range.endOffset;
  walker.currentNode=node;
  if (node.nodeType!==Node.TEXT_NODE) {
    const next=node.childNodes[offset];
    if (next) walker.currentNode=next;
    node=next?walker.previousNode():(walker.lastChild() || walker.previousNode());
    offset=node?.length || 0;
  }
  // Lexical may split pasted text into blocks or inline spans. Measure only the inserted glyphs.
  const inserted=text.replace(/[\r\n]/g,'').replace(/\u00a0/g,' ');
  let remaining=inserted.length;
  const viewport=(editor.closest('[data-input-scroll]') || editor).getBoundingClientRect();
  let left=Infinity, right=-Infinity, top=Infinity, bottom=-Infinity;
  while (node && remaining) {
    let start=offset;
    while (start && remaining) {
      const ch=node.data[--start];
      if (ch==='\n' || ch==='\r') continue;
      if ((ch==='\u00a0'?' ':ch)!==inserted[--remaining]) return;
    }
    range.setStart(node,start);range.setEnd(node,offset);
    for (const rect of range.getClientRects()) {
      const x1=Math.max(rect.left,viewport.left), x2=Math.min(rect.right,viewport.right);
      const y1=Math.max(rect.top,viewport.top), y2=Math.min(rect.bottom,viewport.bottom);
      if (x2<=x1 || y2<=y1) continue;
      left=Math.min(left,x1);right=Math.max(right,x2);
      top=Math.min(top,y1);bottom=Math.max(bottom,y2);
    }
    node=walker.previousNode();
    offset=node?.length || 0;
  }
  if (!remaining && right>left) return {x:(left+right)/2,y:(top+bottom)/2};
}
function bindPrismTypingRipples(root,field) {
  let frame=0, lastPulse=-Infinity;
  function input(event) {
    if (event.isComposing) return;
    if (event.type!=='compositionend' && event.type!=='paste' && !['insertText','insertReplacementText','insertFromComposition','insertFromPaste'].includes(event.inputType)) return;
    const editor=event.target.closest('[data-composer-input][contenteditable=true]');
    if (!editor || editor.closest('[data-conversation-content]')!==root) return;
    const text=event.data || (event.clipboardData || event.dataTransfer)?.getData('text/plain');
    if (!text) return;
    // Lexical can handle paste and beforeinput itself. Measure after the DOM commit.
    const before=event.type==='beforeinput' || event.type==='paste'?editor.textContent:undefined;
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(now=>{
      if (now-lastPulse<150 || (before!==undefined && before===editor.textContent)) return;
      const mount=field.getMount();
      if (!mount || mount.parked || (mount.mode==='home' && !prefs.homeRipple)) return;
      const center=prismInsertedTextCenter(editor,text);
      if (!center) return;
      const bounds=mount.canvas.getBoundingClientRect();
      const {cellWidth,cellHeight}=rippleCore.RIPPLE;
      const x=center.x-bounds.left, y=center.y-bounds.top;
      if (x<0 || x>=bounds.width || y<0 || y>=bounds.height) return;
      const amplitude=mount.mode==='home'?0.32:({subtle:0.28,medium:0.40,full:0.54})[mount.convLevel];
      if (!amplitude) return;
      mount.waves.disturb(Math.floor(x/cellWidth),Math.floor(y/cellHeight),{
        amplitudeScale:amplitude,radiusScale:0.56,duration:0.24,frequency:6,loadWeight:0.32
      });
      mount.field.invalidate();mount.wake();lastPulse=now;
    });
  }
  const events=['beforeinput','input','compositionend','paste'];
  for (const type of events) root.addEventListener(type,input,true);
  return ()=>{
    for (const type of events) root.removeEventListener(type,input,true);
    cancelAnimationFrame(frame);
  };
}
function Field({root,options,mainField}) {
  const reduced=useReduced();
  const [activity,setActivity]=React.useState(()=>root.dataset.prismFieldState || 'idle');
  const panel=root.parentElement?.matches('[data-phase]') ? root.parentElement : root;
  const surface=React.useMemo(()=>panel===root ? createPrismFieldSurface() : mainField,[panel,root,mainField]);
  React.useLayoutEffect(()=>{
    const read=()=>setActivity(root.dataset.prismFieldState || 'idle');
    const observer=new MutationObserver(read);
    observer.observe(root,{attributes:true,attributeFilter:['data-prism-field-state']});
    read();
    return ()=>observer.disconnect();
  },[root]);
  const enabled=activity!=='chat' && !root.closest('[data-slot="sidebar"],[data-slot^="sidebar.right"]') && options.motion && options.theme!=='host' && !options.wallpaper && options.ambient>0 && !reduced;
  const running=activity==='thinking' || activity==='running';
  React.useLayoutEffect(()=>{
    if (!enabled) return;
    const detach=surface.attach(root,panel);
    const stopTyping=bindPrismTypingRipples(root,surface.field);
    const observer=new MutationObserver(surface.refresh);observer.observe(root,{attributes:true,attributeFilter:['data-content-phase']});
    function lift(event) {
      if(root.dataset.contentPhase!=='hero') return;
      const card=event.target.closest('[data-composer-card]');
      const send=card?.querySelector('button[class*="_primary"]:not(:disabled)');
      if(!send) return;
      const sending=event.type==='click' ? send.contains(event.target) :
        event.key==='Enter' && !event.shiftKey && !event.isComposing && event.target.closest('[data-composer-input][contenteditable=true]');
      if(sending) surface.field.triggerLiftoffBurst(card.getBoundingClientRect());
    }
    root.addEventListener('keydown',lift,true);root.addEventListener('click',lift,true);
    return ()=>{stopTyping();observer.disconnect();root.removeEventListener('keydown',lift,true);root.removeEventListener('click',lift,true);detach();};
  },[root,panel,enabled,surface]);
  React.useLayoutEffect(()=>{
    if (enabled) surface.refresh();
  },[surface,enabled,options.convRipple,options.theme,options.ambient,options.accent,options.darkAuraStyle,options.darkAura]);
  React.useEffect(()=>{if(enabled){if(running)surface.aura.triggerStart();surface.aura.sync();}},[surface,enabled,running]);
  return null;
}
function TranscriptMenu({menu,root,close,open,compactContext}) {
  const el=React.useRef(null);
  const [problem,setProblem]=React.useState('');
  const [submitting,setSubmitting]=React.useState(false);
  React.useLayoutEffect(()=>{
    const box=el.current;if(!box)return;
    const bounds=box.getBoundingClientRect();
    box.style.left=Math.max(6,Math.min(menu.x,window.innerWidth-bounds.width-6))+'px';
    box.style.top=Math.max(6,Math.min(menu.y,window.innerHeight-bounds.height-6))+'px';
    box.querySelector('button')?.focus();
    const away=e=>{if(!box.contains(e.target))close();};
    document.addEventListener('pointerdown',away,true);window.addEventListener('blur',close);
    return()=>{document.removeEventListener('pointerdown',away,true);window.removeEventListener('blur',close);};
  },[menu,close]);
  const editor=root.querySelector('[data-composer-input][contenteditable=true]');
  const plan=root.querySelector('[data-slot="conversation.input.plan"] button:not(:disabled)');
  const items=[...(menu.text?[['copy','file','复制选区','']]:[]),['chat','chat',menu.text?'就选区旁聊':'侧边提问','/btw'],
    ...(menu.text?[['translate','translate','译为中文','']]:[]),['outline','list','会话大纲','Alt ↑ ↓'],['files','file','文件预览',''],
    ...(plan?[['plan','list','切换计划模式','']]:[]),...(compactContext && editor && !editor.textContent.trim()?[['compact','chat','压缩上下文','/compact']]:[])];
  async function activate(id){
    if(id==='copy'){
      try {await navigator.clipboard.writeText(menu.text);} catch {setProblem('复制失败，请使用系统复制快捷键。');return;}
    }else if(id==='compact'){
      setSubmitting(true);
      try{await compactContext();}
      catch(error){setProblem(error.message);setSubmitting(false);return;}
    }else if(id==='plan')plan.click();
    else open(id,menu.text);
    close();
  }
  return createPortal(h('div',{ref:el,className:'ag-cs-ctx-menu prism-context',role:'menu','aria-label':'会话快捷菜单',
    onKeyDown:e=>{if(e.key==='Escape'){e.preventDefault();close();}else if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const buttons=[...el.current.querySelectorAll('button')];buttons[(buttons.indexOf(document.activeElement)+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();}}},
    menu.text&&h('p',{'data-ctx-quote':'1'},'“'+menu.text.slice(0,45)+'”'),items.map(([id,icon,title,kbd])=>h('button',{key:id,type:'button',role:'menuitem',disabled:submitting,className:'ag-cs-ctx-item'+(id==='chat'?' is-primary':''),onClick:()=>activate(id)},modeIcon(icon),h('span',null,title),kbd&&h('kbd',null,kbd))),problem&&h('p',{role:'alert'},problem)),document.body);
}
function OpticalCaret({root,enabled}) {
  React.useEffect(()=>{
    if(!enabled || !root)return;
    let disposed=false;
    const caret=smoothCaret.createSmoothCaretController({isDestroyed:()=>disposed,isEnabled:()=>!disposed,
      setAttrIfChanged:(el,key,value)=>{if(el.getAttribute(key)!==String(value))el.setAttribute(key,value);},
      runGuardedMut:fn=>fn()});
    const sync=e=>caret.queue(e.type==='input',false,e.type==='focusin',e.type==='scroll');
    const selection=()=>{if(root.contains(document.activeElement))caret.queue(false);};
    for(const type of ['input','focusin','focusout','keyup','pointerup','scroll'])root.addEventListener(type,sync,true);
    document.addEventListener('selectionchange',selection);caret.queue(false,true,true);
    return()=>{disposed=true;for(const type of ['input','focusin','focusout','keyup','pointerup','scroll'])root.removeEventListener(type,sync,true);
      document.removeEventListener('selectionchange',selection);caret.teardown();};
  },[root,enabled]);
  return null;
}
