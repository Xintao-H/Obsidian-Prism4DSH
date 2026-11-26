function StudioFrame({hero,children,mainField,sessionList,mainPerch}) {
  const p=usePrefs();
  const [content,setContent]=React.useState(null);
  const locate=React.useCallback(node=>setContent(node?.closest('[data-conversation-content]')||null),[]);
  const [mount,setMount]=React.useState(null);
  React.useLayoutEffect(()=>{
    if (!hero || !content || p.theme==='host') return;
    const seat=content?.querySelector('[data-composer-seat]');
    if (!seat) return;
    const holder=document.createElement('div');
    holder.className='prism-home-seat';
    seat.before(holder);
    setMount(holder);
    return ()=>{holder.remove();setMount(null);};
  },[hero,content,p.theme==='host']);
  return h(React.Fragment,null,h('span',{hidden:true,ref:locate}),children,
    hero && mount && h(StudioHome,{root:mount,sessionList}),
    content && h(Mascots,{root:content,mainPerch,options:p}),
    content && h(Field,{root:content,options:p,mainField}));
}
function Toolbar({useSession,useProjection,useChat,prismSession,directory,renameTitle,available,readCommandPopup,compactContext,lastSession}) {
  const p=usePrefs(), reduced=useReduced(), marker=React.useRef(null);
  const [root,setRoot]=React.useState(null),[phase,setPhase]=React.useState(''),[panel,setPanel]=React.useState(null);
  const [lastMode,setMode]=React.useState(()=>localStorage.getItem('dsh-obsidian-prism/workspace-mode')==='chat'?'chat':'code');
  const mode=p.sidebarStudio?lastMode:'code';
  const [menu,setMenu]=React.useState(null);
  const running=!!useSession(s=>s.running),title=useProjection('title')||'';
  const hasError=!!useSession(s=>s.promptError);
  const awaitingFirstTurn=useSession(s=>s.awaitingFirstTurn);
  const thinking=useChat(snapshot=>{
    const block=snapshot.legacy.partial?.blocks.at(-1);
    return block?.kind==='reasoning' && !!block.text.trim();
  });
  const open=React.useCallback((tab='settings',text='')=>setPanel({tab,text}),[]);
  const closeMenu=React.useCallback(()=>setMenu(null),[]);
  React.useLayoutEffect(()=>{
    const content=marker.current?.closest('[data-conversation-content]');setRoot(content);
    if(!content)return;
    const read=()=>setPhase(content.dataset.contentPhase);
    const obs=new MutationObserver(read);obs.observe(content,{attributes:true,attributeFilter:['data-content-phase']});read();
    return()=>obs.disconnect();
  },[prismSession]);
  React.useLayoutEffect(()=>enterPrismSession(root,prismSession,lastSession),[root,prismSession,lastSession]);
  React.useLayoutEffect(()=>{
    if (!root) return;
    root.dataset.prismRunning=String(running);
    root.dataset.prismError=String(hasError);
    const activity=running && thinking && phase==='active' ? 'thinking' : running || awaitingFirstTurn ? 'running' : 'idle';
    root.dataset.prismFieldState=mode==='chat' ? 'chat' : activity;
    return ()=>{delete root.dataset.prismRunning;delete root.dataset.prismFieldState;delete root.dataset.prismError;};
  },[root,mode,running,thinking,phase,awaitingFirstTurn,hasError]);
  React.useLayoutEffect(()=>{
    if(!p.sidebarStudio)return;
    const html=document.documentElement;html.dataset.prismWorkspace=mode;
    localStorage.setItem('dsh-obsidian-prism/workspace-mode',mode);
    return()=>{delete html.dataset.prismWorkspace;};
  },[p.sidebarStudio,mode]);
  React.useEffect(()=>{
    const receive=e=>{if(root?.isConnected && root.getClientRects().length){e.preventDefault();open(e.detail.tab);}};window.addEventListener(panelEvent,receive);
    return()=>window.removeEventListener(panelEvent,receive);
  },[root,open]);
  React.useEffect(()=>watchTranscript(root,directory,p),[root,directory,p.fold,p.autoTranslate]);
  React.useEffect(()=>bindPrismConversationNavigation(root,setMenu),[root,prismSession]);
  return h(React.Fragment,null,h('span',{className:'prism-toolbar','aria-hidden':true,ref:marker},
    h(ComposerEffects,{marker,options:p,reduced:reduced||!p.motion})),
    root&&h(PrismInspector,{root}),
    root&&h(PrismOutlineRail,{root,active:mode==='code' && phase==='active'}),
    root&&mode==='code'&&h(OpticalCaret,{root,enabled:p.smoothCaret&&!reduced&&p.motion}),
    root&&available&&h(PrismNativeModelPane,{root,directory,locked:running,readCommandPopup}),
    p.sidebarStudio&&root&&h(PrismWorkspace,{root,directory,mode,setMode}),
    menu&&p.directMenu&&h(TranscriptMenu,{menu,root,compactContext:available&&!running?compactContext:null,close:closeMenu,open:(tab,text)=>tab==='files'?root.dispatchEvent(new Event('prism-open-inspector')):open(tab,text)}),
    panel&&h(Panel,{initial:panel,root,directory,title,renameTitle,sessionId:prismSession,key:prismSession+panel.tab,onClose:()=>setPanel(null)}));
}
function ContextVial({useProjection,useSession}){
  const p=usePrefs(),reduced=useReduced(),pressure=useProjection('contextPressure'),running=!!useSession(s=>s.running);
  return p.vial?h(Vial,{pressure,running,reduced:reduced||!p.motion,theme:p.theme,accent:p.accent}):null;
}
function apply(ctx) {
  const lastSession={current:null};
  const mainField=createPrismFieldSurface();
  ctx.effect(()=>()=>mainField.dispose(),'Prism: conversation background');
  const mainPerch={};
  ctx.effect(()=>{
    const stop=observePrefs(()=>{if(prefs.roster==='off')disposePrismMascots(mainPerch);});
    return ()=>{stop();disposePrismMascots(mainPerch);};
  },'Prism: composer pets');
  registerPrismInspector(ctx);
  ctx.effect(()=>installAppearance(ctx),'Prism: interface');
  const register=(name,component,extra={})=>ctx.slots.inject(name,()=>ctx.slots.register({
    name,id:'dsh-obsidian-prism/'+name,order:45,...extra
  },component));
  const scope=id=>({prismSession:id,directory:ctx.modelDirectories.directoryFor(id),available:ctx.sessions.subagentAddress(id)===undefined,
    renameTitle:text=>ctx.sessions.manager.rename(id,text)});
  let modelCommands;
  ctx.inject(['commandUi'],commandCtx=>commandCtx.effect(()=>{
    modelCommands=commandCtx.commandUi;
    return ()=>{modelCommands=undefined;};
  }));
  register('conversation.input.left',Toolbar,{inject:id=>({...scope(id),lastSession,compactContext:async()=>{
    const session=ctx.sessions.binding(id)?.session;
    if(!session) throw Error('此会话已关闭');
    const result=await session.command('/compact');
    if(!result.ok) throw Error(result.error?.message || '压缩上下文失败');
    if(!result.value.matched) throw Error('此会话无法使用 /compact');
  },readCommandPopup:()=>{
    const session=ctx.sessions.scope(id);
    return session && modelCommands?.popupFor(session).state.getSnapshot();
  }})});
  register('conversation.input.right',ContextVial);
  register('conversation.input.model.options',PrismEffort,{inject:scope});
  register('conversation.input.model.label',PrismModelLabel,{inject:scope});
  register('settings.general.item',SettingsPanel);
  register('conversation.hero.frame',StudioFrame,{inject:()=>({mainField,sessionList:ctx.sessions.list,mainPerch})});
  register('conversation.session.header.utilities',()=>h('button',{className:'prism-rail-button',type:'button',title:'会话大纲','aria-label':'会话大纲',onClick:()=>emitPanel('outline')},modeIcon('list')));
}
