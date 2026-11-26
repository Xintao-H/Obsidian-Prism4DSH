// DSH session-tree binding for the upstream hover navigator. Adapted 2026-11-25.
function PrismOutlineRail({root,active}) {
  const [row,setRow] = React.useState(null), [position,setPosition] = React.useState(null);
  const [query,setQuery] = React.useState(''), [turns,setTurns] = React.useState([]);
  const trigger = React.useRef(null), popup = React.useRef(null), search = React.useRef(null), timer = React.useRef(0);
  const restore = React.useRef(false), focusSearch = React.useRef(false);
  const id = React.useId();
  const sessionId = root?.getAttribute('data-conversation-session');
  React.useLayoutEffect(() => {
    setPosition(null);setRow(null);
    if (!active || !sessionId) return;
    const sidebar = document.querySelector('[data-slot="sidebar"]');
    if (!sidebar) return;
    const selector = '[data-row-key='+CSS.escape('session:'+sessionId)+']';
    const find = () => setRow(sidebar.querySelector(selector));
    find();
    const observer = new MutationObserver(find);
    observer.observe(sidebar,{childList:true,subtree:true,attributes:true,attributeFilter:['data-row-key']});
    return () => {observer.disconnect();clearTimeout(timer.current);};
  },[active,sessionId]);
  const close = React.useCallback(() => {clearTimeout(timer.current);setPosition(null);focusSearch.current=false;},[]);
  const delay = () => {clearTimeout(timer.current);timer.current=setTimeout(close,180);};
  function open(keyboard=false) {
    if (!trigger.current || !active) return;
    clearTimeout(timer.current);
    if (keyboard) focusSearch.current=true;
    const rect = trigger.current.getBoundingClientRect();
    const width = Math.min(268,innerWidth-16);
    setQuery('');
    setPosition({left:Math.max(8,Math.min(innerWidth-width-8,row.getBoundingClientRect().right+6)),top:Math.max(8,Math.min(rect.top,innerHeight-110)),width});
  }
  React.useLayoutEffect(() => {
    if (!position || !row?.isConnected || !active) return;
    const collect = () => setTurns(conversationRows(root));
    collect();
    const containsTurn = node => node.nodeType===Node.ELEMENT_NODE &&
      (node.matches(turnSelector) || (node.childElementCount && node.querySelector(turnSelector)));
    const affectsTurn = record => {
      if (record.type==='attributes') return true;
      const target=record.target.nodeType===Node.ELEMENT_NODE?record.target:record.target.parentElement;
      if (target?.closest(turnSelector)) return true;
      for (const node of record.addedNodes) if (containsTurn(node)) return true;
      for (const node of record.removedNodes) if (containsTurn(node)) return true;
      return false;
    };
    const transcript = new MutationObserver(records=>{if(records.some(affectsTurn))collect();});
    transcript.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-chat-flow-kind','data-chat-anchor-key']});
    const onKey = event => {
      if(event.key!=='Escape')return;
      const focused = popup.current?.contains(document.activeElement);
      close();
      if(focused){restore.current=true;trigger.current?.focus();restore.current=false;}
      if(focused || document.activeElement===trigger.current){event.preventDefault();event.stopPropagation();}
    };
    const outside = event => {
      if (!popup.current?.contains(event.target) && !trigger.current?.contains(event.target)) close();
    };
    const onScroll = event => { if (!popup.current?.contains(event.target)) close(); };
    const hold = () => clearTimeout(timer.current);
    row.addEventListener('pointerenter',hold);
    row.addEventListener('pointerleave',delay);
    document.addEventListener('keydown',onKey,true);
    document.addEventListener('pointerdown',outside,true);
    window.addEventListener('scroll',onScroll,true);
    window.addEventListener('resize',close);
    if (focusSearch.current) {search.current?.focus({preventScroll:true});focusSearch.current=false;}
    return () => {transcript.disconnect();setTurns([]);row.removeEventListener('pointerenter',hold);row.removeEventListener('pointerleave',delay);
      document.removeEventListener('keydown',onKey,true);document.removeEventListener('pointerdown',outside,true);
      window.removeEventListener('scroll',onScroll,true);window.removeEventListener('resize',close);};
  },[root,row,active,position,close]);
  if (!active || !sessionId || !row?.isConnected) return null;
  const filtered = turns.map((turn,i)=>({...turn,number:i+1})).filter(t=>(t.title+' #'+t.number).toLowerCase().includes(query.trim().toLowerCase()));
  function jump(turn) {
    close();
    if(turn?.row.isConnected) navigateTo(turn.row);
  }
  function blur(event) {
    const next=event.relatedTarget;
    if(!popup.current?.contains(next) && next!==trigger.current) delay();
  }
  return h(React.Fragment,null,
    createPortal(h('button',{type:'button',className:'ag-cs-nav-outline-trigger prism-outline-trigger',ref:trigger,
      'aria-label':'悬浮会话大纲','aria-haspopup':'dialog','aria-expanded':!!position,'aria-controls':position?id:undefined,
      onPointerEnter:()=>open(),onFocus:()=>{if(!restore.current)open();},onBlur:blur,
      onPointerDown:e=>e.stopPropagation(),onClick:e=>{e.stopPropagation();open(e.detail===0);},
      onKeyDown:e=>{if(['ArrowDown','Enter',' ','Tab'].includes(e.key)&&!e.shiftKey){e.preventDefault();e.stopPropagation();open(true);}}
    },'☰'),row),
    position && createPortal(h('aside',{id,ref:popup,className:'ag-cs-nav-outline-popover prism-outline-rail',role:'dialog','aria-label':'本会话大纲',
      style:{...position,maxHeight:'min(368px,calc(100vh - '+(position.top+8)+'px))'},
      onPointerEnter:()=>clearTimeout(timer.current),onPointerLeave:delay,onFocus:()=>clearTimeout(timer.current),onBlur:blur},
      h('div',{className:'ag-cs-nav-outline-head'},h('span',{className:'ag-cs-nav-outline-title'},'会话大纲 · '+turns.length)),
      h('input',{className:'ag-cs-nav-outline-search',type:'search',ref:search,placeholder:'搜索本会话…','aria-label':'筛选大纲',value:query,
        onChange:e=>setQuery(e.target.value),onKeyDown:e=>{if(e.key==='Enter'&&filtered.length){e.preventDefault();jump(filtered[0]);}
        if(e.key==='ArrowDown'){e.preventDefault();popup.current?.querySelector('.ag-cs-nav-outline-item')?.focus();}}}),
      h('div',{className:'ag-cs-nav-outline-list'},filtered.length ? filtered.map(turn=>h('button',{type:'button',key:turn.key,className:'ag-cs-nav-outline-item',
        title:turn.title,onClick:()=>jump(turn)},h('span',{className:'ag-cs-nav-outline-num'},'#'+turn.number),h('span',{className:'ag-cs-nav-outline-text'},turn.title)))
        : h('div',{className:'ag-cs-nav-outline-empty'},turns.length?'没有匹配的提问':'当前尚无已加载的提问'))),document.body));
}
