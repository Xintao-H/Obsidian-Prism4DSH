// Obsidian Prism Sidebar Studio bound to DSH model directories and local chat history.
const prismMarkdownText = require('@deepseek-ai/dsh-client-ui-primitives').MarkdownText;
const prismMarkdownLabels = {
  code:{copyLabel:'复制',copiedLabel:'已复制',toolbarLabels:{codeLabel:'代码',wrapLabel:'自动换行',unwrapLabel:'取消换行'}},
  footnotes:'脚注'
};
function PrismChatMarkdown({text}) {
  return h(prismMarkdownText,{text,streaming:false,labels:prismMarkdownLabels});
}
const spaceKey='dsh-obsidian-prism/chat-space-v1';
function readPrismSpace() {
  try {
    const saved=JSON.parse(localStorage.getItem(spaceKey));
    if(saved && Array.isArray(saved.chats) && Array.isArray(saved.folders))return saved;
  } catch {}
  return {chats:[],folders:[],active:null,kind:'knowledge',folder:null};
}
function ChatModeDock({mode,setMode}) {
  return h('div',{className:'ag-prism-mode-dock','data-prism-mode-dock':'','data-window-drag-exclude':'true'},
    h('div',{className:'ag-prism-sb-seg',role:'tablist','aria-label':'工作模式','data-mode':mode},
      h('span',{className:'ag-prism-sb-slider','aria-hidden':'true'}),
      ['code','chat'].map(key=>h('button',{type:'button',className:'ag-prism-sb-mode-btn',role:'tab',key,'aria-selected':mode===key,
        'data-mode-btn':key,'data-active':mode===key?'1':'0',onClick:()=>setMode(key),onKeyDown:e=>{
          if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
          e.preventDefault();const next=key==='code'?'chat':'code';setMode(next);e.currentTarget.parentElement.querySelector('[data-mode-btn="'+next+'"]').focus();
        }},modeIcon(key,12.5),h('span',null,key==='code'?'Code':'Chat')))));
}
function ChatSpaceSidebar({space,update,newChat,openChat}) {
  const [search,setSearch]=React.useState(null),[adding,setAdding]=React.useState(null),[name,setName]=React.useState('');
  const [closed,setClosed]=React.useState({});
  const startFolder=kind=>{setAdding(adding===kind?null:kind);setName('');};
  const createFolder=e=>{
    e.preventDefault();if(!name.trim())return;
    const folder={id:crypto.randomUUID(),kind:adding,name:name.trim()};
    update(prev=>({...prev,folders:[...prev.folders,folder],active:null,folder:folder.id,kind:folder.kind}));
    setAdding(null);setName('');
  };
  const dropChat=(e,kind,folder)=>{
    const id=e.dataTransfer.getData('text/prism-chat');
    if(!id)return;
    e.preventDefault();
    update(prev=>({...prev,chats:prev.chats.map(chat=>chat.id===id?{...chat,kind,folder}:chat),
      ...(prev.active===id?{kind,folder}:{})}));
  };
  const dropProps=(kind,folder)=>({onDragOver:e=>{if(e.dataTransfer.types.includes('text/prism-chat'))e.preventDefault();},onDrop:e=>dropChat(e,kind,folder)});
  const row=chat=>h('div',{className:'ag-prism-sb-row-wrap',key:chat.id},h('button',{
    type:'button',className:'ag-prism-sb-row',draggable:true,onDragStart:e=>e.dataTransfer.setData('text/prism-chat',chat.id),
    onClick:()=>openChat(chat),'data-active':space.active===chat.id?'1':'0',title:chat.title},h('span',{className:'ag-prism-sb-row-title'},chat.title)));
  const section=kind=>{
    const label=kind==='spark'?'Spark':'Knowledge';
    const list=space.chats.filter(chat=>chat.kind===kind && (!search || chat.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
    const folders=space.folders.filter(f=>f.kind===kind);
    const unfiled=list.filter(chat=>!chat.folder);
    return h(React.Fragment,{key:kind},h('div',{className:'ag-prism-sb-sec',...dropProps(kind,null)},
      h('span',{className:'ag-prism-sb-sec-lead'},modeIcon(kind==='spark'?'folder':'chat',12),label),h('span',{className:'ag-prism-sb-sec-right'},
        h('span',{className:'ag-prism-sb-cnt'},list.length),h('button',{type:'button',className:'ag-prism-sb-icon-btn',
          'aria-label':'新建 '+label+' 文件夹',onClick:()=>startFolder(kind)},modeIcon('plus',13)))),
      adding===kind&&h('form',{className:'ag-prism-sb-inline-box',onSubmit:createFolder},h('input',{autoFocus:true,className:'ag-prism-sb-inline-input',
        placeholder:'输入文件夹名回车创建…','aria-label':'文件夹名称',value:name,onChange:e=>setName(e.target.value),onKeyDown:e=>{if(e.key==='Escape')setAdding(null);}})),
      unfiled.length>0&&h('div',{className:'ag-prism-sb-time-lbl'},'对话'),unfiled.map(row),
      folders.map(f=>{
        const contents=list.filter(chat=>chat.folder===f.id);
        if(search && !contents.length && !f.name.includes(search))return null;
        return h('div',{className:'ag-prism-sb-group-wrap',key:f.id,...dropProps(kind,f.id)},
          h('button',{type:'button',className:'ag-prism-sb-group-head','aria-expanded':!closed[f.id],'data-collapsed':closed[f.id]?'1':'0',
            onClick:()=>setClosed({...closed,[f.id]:!closed[f.id]})},h('span',{className:'ag-prism-sb-chev'},modeIcon('chev',10)),modeIcon('folder',13),
            h('span',{className:'ag-prism-sb-row-title'},f.name),h('span',{className:'ag-prism-sb-cnt'},contents.length)),
          h('div',{className:'ag-prism-sb-row-actions'},h('button',{type:'button',className:'ag-prism-sb-act-btn','aria-label':'在 '+f.name+' 新建对话',onClick:()=>newChat(kind,f.id)},modeIcon('plus',13))),
          h('div',{className:'ag-prism-sb-folder-grid','data-collapsed':closed[f.id]?'1':'0',inert:closed[f.id]?'':undefined},
            h('div',{className:'ag-prism-sb-folder-over'},contents.map(row))));
      }),
      !list.length&&!folders.length&&h('div',{className:'ag-prism-sb-empty'},kind==='knowledge'?'暂无对话':'切至 Spark 或新建工作文件夹'));
  };
  return h('section',{'data-prism-chat-sidebar':'',className:'ag-prism-chat-pane','data-active':'1','data-entering':'1','aria-label':'Chat 侧栏'},
    h('div',{className:'ag-prism-sb-chat-head'},h('button',{type:'button',className:'ag-prism-sb-new-btn',onClick:()=>newChat('knowledge',null)},modeIcon('plus',14),'新建对话'),
      h('button',{type:'button',className:'ag-prism-sb-icon-btn','aria-label':'搜索对话',onClick:()=>setSearch(search===null?'':null)},modeIcon('search',14))),
    h('div',{className:'ag-prism-sb-search-wrap','data-open':search===null?'0':'1'},h('div',{className:'ag-prism-sb-search-over'},search!==null&&
      h('label',{className:'ag-prism-sb-search'},modeIcon('search',12.5),h('input',{autoFocus:true,placeholder:'搜索 Chat 对话…','aria-label':'搜索 Chat 对话',
        value:search,onChange:e=>setSearch(e.target.value),onKeyDown:e=>{if(e.key==='Escape')setSearch(null);}})))),
    h('div',{className:'ag-prism-sb-list'},section('knowledge'),section('spark')));
}
function ChatModelPicker({directory,notice}) {
  const snapshot=usePrismDirectory(directory);
  const current=snapshot.current;
  const opts=snapshot.groups.flatMap(group=>group.models.map(model=>({provider:group.id,model:model.id,label:model.name||model.id})));
  const selected=opts.findIndex(m=>m.provider===current?.provider&&m.model===current?.model);
  const choice=opts[selected];
  React.useEffect(()=>{directory.load().catch(err=>notice(err.message));},[directory]);
  return h('label',{className:'ag-prism-ghost-btn prism-space-select'},
    choice && h(PrismModelGlyph,{model:{id:choice.model,name:choice.label},effort:current?.reasoningEffort,active:true}),
    h('span',null,opts[selected]?.label||current?.model||'选择模型'),modeIcon('chev',10),
    h('select',{'aria-label':'Chat 模型',disabled:snapshot.status==='selecting',value:selected,onChange:async e=>{
      const chosen=opts[Number(e.target.value)];if(!chosen)return;
      try{
        const result=await directory.select({model:chosen.model,provider:chosen.provider});
        if(result?.ok===false)notice(result.error?.message||'模型切换失败');
      }catch(err){notice(err.message);}
    }},selected<0&&h('option',{value:-1},'选择模型'),opts.map((m,i)=>h('option',{value:i,key:m.provider+'/'+m.model},m.label))));
}
function PrismWorkspace({root,directory,mode,setMode}) {
  const [anchors,setAnchors]=React.useState({});
  React.useEffect(()=>{
    if(!root)return;
    const locate=()=>{
      const sidebar=document.querySelector('[data-slot="sidebar"]');
      const dock=sidebar?.querySelector('[data-window-drag]'), list=sidebar?.querySelector('[data-sidebar-scrollport]');
      setAnchors(prev=>prev.dock===dock&&prev.list===list?prev:{dock,list});
    };
    locate();
    const side=document.querySelector('[data-slot="sidebar"]');
    const observer=new MutationObserver(locate);
    observer.observe(side?.parentElement || document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[root]);
  const [space,setSpace]=React.useState(readPrismSpace);
  const live=React.useRef(space),job=React.useRef(null),fileInput=React.useRef(null),editor=React.useRef(null),last=React.useRef(null);
  const [draft,setDraft]=React.useState(''),[attachments,setAttachments]=React.useState([]),[busy,setBusy]=React.useState(''),[error,setError]=React.useState('');
  const [focus,setFocus]=React.useState(false),[drag,setDrag]=React.useState(false);
  const active=space.chats.find(c=>c.id===space.active), kind=active?.kind||space.kind, spark=kind==='spark';
  const readingPage=React.useRef(null),openingChat=React.useRef(null);
  React.useLayoutEffect(()=>{
    if (!readingPage.current || openingChat.current!==active?.id) return;
    openingChat.current=null;
    const animation=fadePrismTranscript(readingPage.current);
    return ()=>animation?.cancel();
  },[active?.id]);
  const update=fn=>{
    const next=fn(live.current);live.current=next;setSpace(next);
    try{localStorage.setItem(spaceKey,JSON.stringify(next));}catch{setError('本机存储空间不足，本次修改仅保存在当前窗口。');}
  };
  React.useEffect(()=>()=>job.current?.abort(),[]);
  // Native Code and Chat mount different editors. Restore the unsent draft on return.
  React.useLayoutEffect(()=>{
    if(mode==='chat' && editor.current && editor.current.innerText!==draft)editor.current.textContent=draft;
  },[mode,active?.id]);
  React.useLayoutEffect(()=>{
    last.current?.scrollIntoView({block:'nearest'});
  },[active?.id,active?.messages.length,busy,mode]);
  const clearDraft=()=>{setDraft('');setAttachments([]);setError('');if(editor.current)editor.current.textContent='';};
  const openChat=chat=>{
    if (chat.id!==space.active) openingChat.current=chat.id;
    clearDraft();update(prev=>({...prev,active:chat.id,kind:chat.kind,folder:chat.folder}));
  };
  const newChat=(nextKind,folder=null)=>{clearDraft();update(prev=>({...prev,active:null,kind:nextKind,folder}));};
  const switchKind=nextKind=>{
    if(kind===nextKind)return;
    if(active){newChat(nextKind);return;}
    update(prev=>({...prev,kind:nextKind,folder:null}));
  };
  const addFiles=async files=>{
    try{
      const data=[];
      for(const f of files){
        if(!f.type.startsWith('text/')&&!/\.(txt|md|csv|tsv|json|jsonl|xml|yaml|yml|log|py|js|ts|css|html|tex|m|c|cpp|rs|sh)$/i.test(f.name))
          throw Error('请选择文本、Markdown、代码或 CSV 文件');
        if(f.size>155000)throw Error(f.name+' 超过单次附件限制（155 KB）');
        data.push({name:f.name,text:await f.text()});
      }
      setAttachments(prev=>[...prev,...data]);setError('');
    }catch(e){setError(e.message);}
  };
  const send=async retry=>{
    if(job.current)return;
    if(!retry&&!draft.trim()&&!attachments.length)return;
    const message={role:'user',text:draft.trim()||(attachments.length?'请阅读附加的文件。':''),files:attachments};
    const messages=retry?active.messages:[...(active?.messages||[]),message];
    const payload=JSON.stringify(messages.map(m=>({role:m.role,text:[m.text,...(m.files||[]).map(f=>f.name+'\n'+f.text)].join('\n\n')})));
    if(new Blob([JSON.stringify({text:payload})]).size>250000){setError('当前会话和附件超过单次模型请求容量，请新建对话或减少附件。');return;}
    const id=active?.id||crypto.randomUUID(), controller=new AbortController();job.current=controller;
    if(!retry){
      update(prev=>{
        const next={id,title:active?.title||message.text.slice(0,48),kind,folder:space.folder||null,messages};
        return {...prev,active:id,chats:[next,...prev.chats.filter(c=>c.id!==id)]};
      });
      clearDraft();
    }
    setBusy(id);setError('');
    try{
      const answer=await modelAction(directory,'chat',payload,controller.signal);
      update(prev=>({...prev,chats:prev.chats.map(c=>c.id===id?{...c,messages:[...c.messages,{role:'assistant',text:answer}]}:c)}));
    }catch(e){if(!controller.signal.aborted)setError(e.message);}
    finally{job.current=null;setBusy('');}
  };
  if(!root)return null;
  const dock=anchors.dock&&createPortal(h(ChatModeDock,{mode,setMode}),anchors.dock);
  if(mode!=='chat')return dock;
  const draftReady=!!(draft.trim()||attachments.length);
  const filePicker=h('input',{ref:fileInput,type:'file',multiple:true,hidden:true,'aria-label':'附加文本文件',accept:'text/*,.csv,.json,.md,.yaml,.yml,.py,.js,.ts,.html,.css,.tex,.m,.log',
    onChange:e=>{const files=Array.from(e.target.files);e.target.value='';addFiles(files);}});
  const vessel=h('div',{className:'ag-prism-vessel-wrap','data-kind':kind,'data-focused':focus?'1':'0','data-spark-tray':spark?'1':'0','data-drag-over':drag?'1':'0'},
    h('div',{className:'ag-prism-vessel',onFocus:()=>setFocus(true),onBlur:e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocus(false);},
      onDragOver:e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();setDrag(true);}},
      onDragLeave:e=>{if(!e.currentTarget.contains(e.relatedTarget))setDrag(false);},
      onDrop:e=>{if(e.dataTransfer.files.length){e.preventDefault();setDrag(false);addFiles(Array.from(e.dataTransfer.files));}}},
      h('div',{className:'ag-prism-att-strip'},attachments.map((a,i)=>h('span',{className:'ag-prism-att-chip',key:i},modeIcon('file',13),a.name,
        h('button',{type:'button','aria-label':'移除 '+a.name,onClick:()=>setAttachments(attachments.filter((_,idx)=>idx!==i))},modeIcon('x',11))))),
      h('div',{ref:editor,role:'textbox',contentEditable:'plaintext-only','aria-label':'Chat 消息','aria-multiline':'true',className:'ag-prism-chat-input',
        'data-placeholder':spark?'交给我一件要处理的事务…':'问点什么，或整理一份想法…',onInput:e=>setDraft(e.currentTarget.innerText),
        onKeyDown:e=>{if(!e.nativeEvent.isComposing&&e.key==='Enter'&&!e.shiftKey&&!e.altKey){e.preventDefault();send(false);}}}),
      h('div',{className:'ag-prism-chat-bar'},h('div',{className:'ag-prism-chat-bar-g'},
        h('button',{type:'button',className:'ag-prism-sb-icon-btn','aria-label':'附加文档',onClick:()=>fileInput.current.click()},modeIcon('plus')),
        filePicker,h('div',{className:'ag-prism-subseg','data-submode':kind},h('span',{className:'ag-prism-subslider'}),
          ['knowledge','spark'].map(key=>h('button',{type:'button',key,className:'ag-prism-subbtn','aria-pressed':kind===key,'data-active':kind===key?'1':'0',
            onClick:()=>switchKind(key)},key==='knowledge'?'Knowledge':'Spark')))),
        h('div',{className:'ag-prism-chat-bar-g'},h(ChatModelPicker,{directory,notice:setError}),h('button',{type:'button',className:'ag-prism-send-btn',
          'aria-label':busy===active?.id?'停止生成':'发送 Chat 消息','data-ready':draftReady||busy?'1':'0',disabled:busy?busy!==active?.id:!draftReady,
          onClick:()=>busy?job.current?.abort():send(false)},busy?modeIcon('x',15):modeIcon('up',15)))),
      h('div',{className:'ag-prism-tray-grid'},h('div',{className:'ag-prism-tray-over'},spark&&h('div',{className:'ag-prism-tray-bar'},
        h('div',{className:'ag-prism-chat-bar-g'},h('label',{className:'ag-prism-ghost-btn prism-space-select'},modeIcon('folder',13),
          h('span',null,space.folders.find(f=>f.id===space.folder)?.name||'工作文件夹'),modeIcon('chev',10),
          h('select',{'aria-label':'Spark 工作文件夹',value:space.folder||'',onChange:e=>{
            const folder=e.target.value||null;
            update(prev=>({...prev,folder,chats:prev.chats.map(c=>c.id===prev.active?{...c,folder}:c)}));
          }},h('option',{value:''},'未归档'),space.folders.filter(f=>f.kind==='spark').map(f=>h('option',{key:f.id,value:f.id},f.name)))),
          h('button',{type:'button',className:'ag-prism-ghost-btn',onClick:()=>fileInput.current.click()},modeIcon('file',13),'导入文本文件')))))),
    error&&h('div',{className:'prism-chat-error',role:'alert'},error));
  const history=active&&h('div',{className:'prism-space-reading','aria-live':'polite'},h('div',{className:'prism-space-page',ref:readingPage},
    active.messages.map((m,i)=>h('article',{key:i,'data-role':m.role},m.role==='assistant'&&h('strong',null,'助手'),
      m.role==='assistant'?h(PrismChatMarkdown,{text:m.text}):h('div',{className:'prism-space-prose'},m.text),m.files?.length>0&&h('small',null,m.files.map(f=>f.name).join(' · ')))),
    busy===active.id&&h('span',{className:'prism-space-pending',role:'status'},'正在思考…'),
    !busy&&active.messages.at(-1)?.role==='user'&&h('button',{type:'button',className:'ag-prism-ghost-btn',onClick:()=>send(true)},'重新生成'),
    h('span',{ref:last})));
  const home=h('section',{'data-prism-chat-space':'','data-visible':'1',className:'ag-prism-chat-home','aria-label':'Chat 工作区','data-has-conversation':active?'1':'0'},
    !active&&h('div',{className:'ag-prism-chat-aura','data-kind':kind,'data-focused':focus?'1':'0'},h('div',{className:'ag-prism-aura-orb ag-prism-orb-a'}),h('div',{className:'ag-prism-aura-orb ag-prism-orb-b'})),
    history,h('div',{className:'ag-prism-chat-home-inner'},
      !active&&h('div',{className:'ag-prism-hero-head'},h('div',{className:'ag-prism-hero-eyebrow-row'},
        h(DeepSeekMark,{className:'ag-prism-hero-mark'}),h('span',{className:'ag-prism-hero-eyebrow'},'你好')),
        h('h1',{className:'ag-prism-hero-h1'},'有什么我可以帮你的？')),vessel));
  return h(React.Fragment,null,dock,anchors.list&&createPortal(h(ChatSpaceSidebar,{space,update,openChat,newChat}),anchors.list),createPortal(home,root));
}
