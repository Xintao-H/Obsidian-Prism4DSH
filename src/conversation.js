const turnSelector = '[data-chat-flow-kind="user"],[data-chat-flow-kind="steering"]';
const reasoningSelector = '[data-variant="think"][data-expanded]';
function fadePrismTranscript(node) {
  if (document.documentElement.dataset.prismMotion!=='true') return;
  return node.animate([{opacity:0.48},{opacity:1}],{
    id:'prism-session-fade',duration:180,easing:'ease-out'
  });
}
function enterPrismSession(root,id,lastSession) {
  if (!root?.parentElement?.parentElement?.matches('[data-slot="main.conversation"]') || !id) return;
  const previous=lastSession.current;
  lastSession.current=id;
  if (!previous || previous===id || document.documentElement.dataset.prismMotion!=='true') return;

  let animation;
  // A reopened session can be settling while DSH loads its history.
  function reveal() {
    if (root.dataset.contentPhase==='hero') return true;
    if (root.dataset.contentPhase!=='active') return false;
    const row=root.querySelector('[data-slot="conversation.chat.flow"] > [data-chat-flow-kind]');
    if (!row) return false;
    animation=fadePrismTranscript(row.closest('[data-chat-flow]'));
    return true;
  }
  let observer;
  if (!reveal()) {
    observer=new MutationObserver(()=>{if (reveal()) observer.disconnect();});
    observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['data-content-phase']});
  }
  return ()=>{observer?.disconnect();animation?.cancel();};
}
function conversationRows(root) {
  return [...(root?.querySelectorAll(turnSelector) || [])].map((row,i) => ({
    row, title:(row.querySelector('[data-message-bubble]') || row).textContent.trim().replace(/\s+/g,' ').slice(0,120),
    key:row.dataset.chatAnchorKey || String(i)
  })).filter(item=>item.title);
}
function navigateTo(row) {
  row.scrollIntoView({block:'center',behavior:document.documentElement.dataset.prismMotion === 'true' ? 'smooth':'instant'});
  row.animate?.([{outline:'2px solid var(--pr-accent)'},{outline:'2px solid transparent'}],{duration:640});
}
const prismThoughtSlot='[data-slot="conversation.chat.reasoning.body"]';
const prismThoughtCache=new WeakMap();
function sourceText(row) {
  const source=row.querySelector(prismThoughtSlot);
  if(!source)return '';
  const excluded='[data-prism-owned],button,[aria-hidden=true]';
  if(!source.querySelector(excluded))return source.textContent.trim();
  const walker=document.createTreeWalker(source,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{
    acceptNode(node) {
      if(node.nodeType===Node.TEXT_NODE)return NodeFilter.FILTER_ACCEPT;
      return node.matches(excluded)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_SKIP;
    }
  });
  let text='';
  while(walker.nextNode())text+=walker.currentNode.data;
  return text.trim();
}
async function modelAction(directory,task,text,signal) {
  const route = directory.store.getSnapshot().current;
  if (!route?.provider || !route?.model) throw Error('请先在此会话中选择可用模型');
  const result = await fetch(new URL('obsidian-prism/model',document.baseURI),{
    method:'POST',headers:{'content-type':'application/json'},signal,
    body:JSON.stringify({task,text,model:route.model,provider:route.provider})
  });
  const data = await result.json();
  if (!result.ok || !data.text) throw Error(data.error || '模型调用失败');
  return data.text;
}
function watchTranscript(root, directory, options) {
  if (!root) return () => {};
  const added = new Map();
  const jobs = new Set();
  const pendingTranslations = new Map();
  let disposed=false;
  const stream=streamChoreo.createStreamChoreographyController({
    isDestroyed:()=>disposed,isMotionStandardOrUltra:()=>document.documentElement.dataset.prismMotion==='true',
    isMotionUltra:()=>document.documentElement.dataset.agCsMotion==='ultra',
    isConvRunning:()=>root.dataset.prismRunning==='true',isThoughtIsolatedNode:()=>false,isThoughtMutationRecord:()=>false,
    isManagedThoughtPanel:()=>false,runGuardedMut:fn=>fn()
  });
  let frame=0;
  const button = (name,cls) => {
    const el = document.createElement('button');
    el.type='button'; el.className=cls; el.textContent=name; el.dataset.prismOwned=''; return el;
  };
  function fold(pre) {
    if (!options.fold || added.has(pre) || pre.textContent.split('\n',48).length < 48) return;
    const control=button('收起代码','prism-code-control');
    control.setAttribute('aria-expanded','true');
    control.onclick=()=>{
      pre.toggleAttribute('data-prism-collapsed');
      const closed=pre.hasAttribute('data-prism-collapsed');
      control.textContent=closed?'展开完整代码':'收起代码'; control.setAttribute('aria-expanded',String(!closed));
    };
    pre.after(control);
    added.set(pre,()=>{control.remove();pre.removeAttribute('data-prism-collapsed');});
  }
  function translate(row) {
    if(added.has(row))return;
    const initialSource=row.querySelector(prismThoughtSlot);
    if(!initialSource||!sourceText(row))return;
    const box=document.createElement('div');
    box.className='prism-inline ag-prism-thought-overlay';
    box.dataset.prismOwned='';
    const result=document.createElement('div');
    result.className='prism-translation ag-prism-thought-body';
    result.setAttribute('aria-live','polite');
    const actions=document.createElement('div');actions.className='prism-thought-actions';
    const control=button('译为中文','prism-text-action');
    const raw=button('原文','prism-text-action ag-prism-thought-raw-toggle');
    const refresh=button('重新转译','prism-text-action ag-prism-thought-retranslate-btn');
    actions.append(control,raw,refresh);box.append(result,actions);initialSource.before(box);

    let preferred=prefs.thoughtView, rawOverride=null, showTranslation=true;
    let busy=false, failure='', attempted='';
    const render=()=>{
      const value=prismThoughtCache.get(row), hasTranslation=!!value && !failure;
      if(preferred!==prefs.thoughtView){preferred=prefs.thoughtView;rawOverride=null;showTranslation=true;}
      const translated=hasTranslation && showTranslation;
      const withRaw=rawOverride ?? preferred==='bilingual';
      const mode=translated?(withRaw?'bilingual':'immersive'):'original';
      row.dataset.prismThoughtView=mode;
      result.hidden=!translated&&!failure;
      const content=failure || (translated?value.text:'');
      if(result.textContent!==content)result.textContent=content;
      control.disabled=busy;
      const caption=busy?'翻译中…':failure?'重试翻译':!hasTranslation?'译为中文':!showTranslation?'显示译文':preferred==='immersive'?'只看原文':'收起译文';
      if(control.textContent!==caption)control.textContent=caption;
      raw.hidden=!translated;raw.setAttribute('aria-pressed',String(withRaw));
      const rawLabel=withRaw?'收起原文':'原文';
      if(raw.textContent!==rawLabel)raw.textContent=rawLabel;
      refresh.hidden=!hasTranslation;refresh.disabled=busy;
    };
    const run=async()=>{
      const text=sourceText(row);
      if(!text||busy)return;
      const abort=new AbortController();jobs.add(abort);
      attempted=text;busy=true;failure='';render();
      try{
        const answer=await modelAction(directory,'translate',text,abort.signal);
        if(!abort.signal.aborted && (!row.hasAttribute('data-expanded')||sourceText(row)===text)){
          prismThoughtCache.set(row,{source:text,text:answer});showTranslation=true;rawOverride=null;
        }
      }catch(e){if(!abort.signal.aborted)failure=e.message;}
      finally{busy=false;jobs.delete(abort);if(!disposed)render();}
    };
    control.onclick=()=>{
      if(prismThoughtCache.has(row)&&!failure){showTranslation=!showTranslation;render();}
      else run();
    };
    raw.onclick=()=>{rawOverride=!(rawOverride??preferred==='bilingual');render();};
    refresh.onclick=run;
    pendingTranslations.set(row,()=>{
      if(!row.hasAttribute('data-expanded'))return;
      const source=row.querySelector(prismThoughtSlot);
      if(!source)return;
      if(box.parentElement!==source.parentElement)source.before(box);
      const saved=prismThoughtCache.get(row);
      const auto=options.autoTranslate && !busy && row.dataset.state!=='running' && row.checkVisibility();
      const text=saved || auto?sourceText(row):'';
      if(saved && saved.source!==text)prismThoughtCache.delete(row);
      render();
      if(auto && !prismThoughtCache.has(row) && text && text!==attempted)run();
    });
    added.set(row,()=>{pendingTranslations.delete(row);box.remove();delete row.dataset.prismThoughtView;});
  }
  const thought='[data-variant="think"]';
  const candidates=options.fold?'pre,'+thought:thought;
  const dirty=new Set();
  function markTree(node) {
    if(node.nodeType!==Node.ELEMENT_NODE || node.hasAttribute('data-prism-owned'))return;
    if(node.matches(candidates))dirty.add(node);
    if(node.childElementCount)for(const child of node.querySelectorAll(candidates))dirty.add(child);
  }
  function flush() {
    frame=0;
    for(const node of dirty) {
      if(!root.contains(node)) {added.get(node)?.();added.delete(node);}
      else if(node.tagName==='PRE')fold(node);
      else if(node.matches(reasoningSelector)) {translate(node);pendingTranslations.get(node)?.();}
    }
    dirty.clear();
  }
  const schedule=()=>{if (dirty.size && !frame) frame=requestAnimationFrame(flush);};
  const stopThoughtView=observePrefs(()=>{
    for(const node of pendingTranslations.keys())dirty.add(node);
    schedule();
  });
  const observer=new MutationObserver(records=>{
    if(root.dataset.prismRunning==='true')stream.onStreamMutations(records);
    for(const record of records) {
      const target=record.target.nodeType===Node.ELEMENT_NODE?record.target:record.target.parentElement;
      if(!target || target.closest('[data-prism-owned]'))continue;
      const row=target.closest(reasoningSelector), pre=options.fold && target.closest('pre');
      if(row)dirty.add(row);
      if(pre)dirty.add(pre);
      if(record.type==='attributes')markTree(target);
      else if(record.type==='childList') {
        record.addedNodes.forEach(markTree);
        record.removedNodes.forEach(markTree);
      }
    }
    schedule();
  });
  observer.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-expanded','data-state']});
  markTree(root);flush();
  const keydown=e=>{
    if (!e.altKey || e.ctrlKey || e.metaKey || !['ArrowUp','ArrowDown'].includes(e.key)) return;
    if (e.target.closest('input,textarea,select,dialog,[contenteditable="true"]')) return;
    const rows=conversationRows(root);
    const scroll=root.querySelector('[data-conversation-scroll]') || root;
    const top=scroll.getBoundingClientRect().top+28;
    const target=e.key==='ArrowDown' ? rows.find(r=>r.row.getBoundingClientRect().top>top+8)
      : rows.slice().reverse().find(r=>r.row.getBoundingClientRect().top<top-8);
    if (target) {e.preventDefault();navigateTo(target.row);}
  };
  root.addEventListener('keydown',keydown);
  return ()=>{stopThoughtView();observer.disconnect();cancelAnimationFrame(frame);disposed=true;stream.clearTransientTimers();stream.flushAllStreamArtifacts(true);jobs.forEach(job=>job.abort());
    root.removeEventListener('keydown',keydown);added.forEach(dispose=>dispose());};
}

function bindPrismConversationNavigation(root, showMenu) {
  if(!root)return;
  let stopGlide=()=>{};
  let handBack=false;
  function returnToBottom(event) {
    const button=event.target.closest('button[class$="_toBottom"]');
    if (!button || handBack || prefs.bottomScroll!=='inertia' || document.documentElement.dataset.prismMotion!=='true') return;
    const viewport=button.closest('[data-conversation-scroll]') || root.querySelector('[data-chat-flow]')?.parentElement;
    if (!viewport) return;
    stopGlide();
    const start=viewport.scrollTop, distance=viewport.scrollHeight-viewport.clientHeight-start;
    if (distance<=24) return;
    event.preventDefault();event.stopPropagation();
    const duration=Math.max(340,Math.min(540,250+Math.sqrt(distance)*6.5));
    const began=performance.now();
    let frame;
    const cancel=()=>{
      cancelAnimationFrame(frame);
      for(const type of ['wheel','pointerdown','touchstart']) viewport.removeEventListener(type,cancel,true);
      window.removeEventListener('keydown',cancel,true);
      stopGlide=()=>{};
    };
    function step(now) {
      const t=Math.min(1,(now-began)/duration);
      const floor=Math.max(0,viewport.scrollHeight-viewport.clientHeight);
      if (t<1) {
        viewport.scrollTop=start+(floor-start)*(1-Math.pow(1-t,3.6));
        frame=requestAnimationFrame(step);
      } else {
        cancel();
        // Let DSH reclaim its spacer and resume following newly streamed messages.
        if(button.isConnected){
          handBack=true;
          try{button.click();}finally{handBack=false;}
        } else viewport.scrollTop=floor;
      }
    }
    stopGlide=cancel;
    for(const type of ['wheel','pointerdown','touchstart']) viewport.addEventListener(type,cancel,{capture:true,passive:true});
    window.addEventListener('keydown',cancel,true);
    frame=requestAnimationFrame(step);
  }
  function contextMenu(event) {
    if (!prefs.directMenu || root.dataset.contentPhase!=='active' || event.defaultPrevented || event.shiftKey || event.ctrlKey || event.metaKey) return;
    if(event.target.closest('a,button,input,textarea,select,[contenteditable=true],[role=menu],[role=dialog],[data-composer-card],[data-prism-chat-space]'))return;
    const selection=window.getSelection();
    const text=root.contains(selection?.anchorNode??null) && root.contains(selection?.focusNode??null) ? selection.toString().trim() : '';
    event.preventDefault();event.stopPropagation();
    const anchor=event.target.getBoundingClientRect();
    showMenu({x:event.clientX||anchor.left,y:event.clientY||anchor.top,text});
  }
  root.addEventListener('click',returnToBottom,true);
  root.addEventListener('contextmenu',contextMenu,true);
  return ()=>{
    stopGlide();
    root.removeEventListener('click',returnToBottom,true);
    root.removeEventListener('contextmenu',contextMenu,true);
  };
}
