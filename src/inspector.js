const inspectorKind = 'dsh-obsidian-prism-omni';
const inspectorId = 'dsh-obsidian-prism/omni';
let inspectorSidebar = null;

function PrismInspectorIcon({size=16}) {
  return h('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.65,
    strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':'true'},
    h('rect',{x:3,y:4,width:18,height:16,rx:3}),h('path',{d:'M14 4v16M6.5 8h4M6.5 11h3'}));
}

function showPrismInspector(url='') {
  inspectorSidebar?.openTab(inspectorKind,{params:{url}});
}

function PrismInspector({root}) {
  React.useEffect(() => {
    if (!root) return;
    function linkClick(event) {
      if (event.button || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const link = event.target.closest?.('a[href]');
      if (!link || link.hasAttribute('download') || !link.closest('[data-text-interaction-source],[data-prism-chat-space]')) return;
      const href = link.getAttribute('href');
      if (!/^https?:\/\//i.test(href) || !inspectorSidebar) return;
      event.preventDefault(); event.stopPropagation(); showPrismInspector(link.href);
    }
    const open = () => showPrismInspector();
    root.addEventListener('click',linkClick,true); root.addEventListener('prism-open-inspector',open);
    return () => { root.removeEventListener('click',linkClick,true); root.removeEventListener('prism-open-inspector',open); };
  },[root]);
  return null;
}

function inspectFileKind(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (['diff','patch'].includes(ext)) return 'diff';
  if (['html','htm','xhtml'].includes(ext) || file.type === 'text/html') return 'html';
  if (ext === 'pdf' || file.type === 'application/pdf') return 'pdf';
  const media = file.type.split('/')[0];
  if (['image','audio','video'].includes(media)) return media;
  if (['png','gif','jpg','jpeg','svg','webp','avif','bmp','ico'].includes(ext)) return 'image';
  if (['mp4','mov','m4v','webm','ogv'].includes(ext)) return 'video';
  if (['mp3','wav','m4a','ogg','flac','aac'].includes(ext)) return 'audio';
  if (['py','js','ts','tsx','jsx','c','cpp','h','cs','java','go','rs','m','json','yaml','yml','css','sql','sh','ps1','toml','xml'].includes(ext)) return 'code';
  return 'text';
}

function InspectorSource({file,kind}) {
  const pageSize = 262144;
  const [bytes,setBytes] = React.useState(pageSize), [wrap,setWrap] = React.useState(true);
  const [source,setSource] = React.useState(''), [problem,setProblem] = React.useState(''), [copied,setCopied] = React.useState(false);
  React.useEffect(() => {
    let current = true;
    file.slice(0,bytes).text().then(value => { if (current) setSource(value); },e => { if (current) setProblem(e.message); });
    return () => { current = false; };
  },[file,bytes]);
  const diffs = React.useMemo(() => kind !== 'diff' ? null : source.split('\n').map((line,i) => {
    const tone = /^(diff |index |--- |\+\+\+ |@@)/.test(line) ? 'head' : line[0] === '+' ? 'add' : line[0] === '-' ? 'remove' : undefined;
    return h('span',{className:'prism-diff-line','data-line-kind':tone,key:i},line || '\u00a0');
  }),[kind,source]);
  async function copy() {
    try { await navigator.clipboard.writeText(source); setCopied(true); }
    catch { setProblem('无法访问剪贴板，请选中文本复制。'); }
  }
  return h(React.Fragment,null,
    h('div',{className:'wb-controls'},
      h('button',{type:'button',className:'wb-btn','aria-pressed':wrap,onClick:()=>setWrap(!wrap)},'自动换行'),
      h('button',{type:'button',className:'wb-btn',onClick:copy},copied?'已复制':'复制文本'),
      bytes < file.size && h('button',{type:'button',className:'wb-btn',onClick:()=>{setCopied(false);setBytes(bytes+pageSize);}},'加载更多')),
    problem && h('div',{role:'status'},problem),
    h('pre',{className:'wb-source-pane','data-wrap':wrap?'1':'0'},kind==='diff' ? diffs : source));
}

function InspectorFile({file}) {
  const kind = inspectFileKind(file);
  const [url,setUrl] = React.useState(''), [sourceMode,setSourceMode] = React.useState(false);
  const [zoom,setZoom] = React.useState(1);
  React.useLayoutEffect(() => {
    const next = URL.createObjectURL(file); setUrl(next);
    return () => URL.revokeObjectURL(next);
  },[file]);
  if (['diff','text','code'].includes(kind)) return h(InspectorSource,{file,kind});
  if (kind==='html') return h(React.Fragment,null,
    h('div',{className:'wb-controls'},['预览','源代码'].map((txt,i)=>h('button',{key:txt,type:'button',className:'wb-btn',
      'aria-pressed':sourceMode===!!i,onClick:()=>setSourceMode(!!i)},txt))),
    sourceMode ? h(InspectorSource,{file,kind:'code'}) : url && h('iframe',{className:'wb-frame',sandbox:'',src:url,title:file.name}));
  if (kind==='pdf') return url && h('iframe',{className:'wb-frame',title:file.name,src:url});
  if (kind==='image') return h(React.Fragment,null,
    h('div',{className:'wb-controls'},
      h('button',{type:'button',className:'wb-btn','aria-label':'缩小图像',disabled:zoom<=.5,onClick:()=>setZoom(Math.max(.5,zoom-.25))},'−'),
      h('button',{type:'button',className:'wb-btn','aria-label':'图像适应宽度',onClick:()=>setZoom(1)},Math.round(zoom*100)+'%'),
      h('button',{type:'button',className:'wb-btn','aria-label':'放大图像',disabled:zoom>=4,onClick:()=>setZoom(Math.min(4,zoom+.25))},'+')),
    h('div',{className:'wb-image-bed'},url&&h('img',{src:url,alt:file.name,style:{width:zoom*100+'%'}})));
  return h('div',{className:'wb-media-bed'},url && h(kind,{src:url,controls:true,preload:'metadata','aria-label':file.name}));
}

function InspectorContents({tab,remote}) {
  const picker = React.useRef(null);
  const [file,setFile] = React.useState(null);
  const [fileVersion,bumpFile] = React.useReducer(n=>n+1,0);
  const url = file ? '' : remote;
  const kind = file ? inspectFileKind(file) : url ? 'web' : 'file';
  return h('section',{className:'prism-inspector','aria-label':'棱镜资源检视台'},
    h('header',{className:'wb-topbar'},
      h('span',{className:'wb-badge'},kind.toUpperCase()),
      h('strong',{className:'wb-filename',title:file?.name||url||'资源检视台'},file?.name || (url && new URL(url).host) || '资源检视台'),
      h('button',{type:'button',className:'wb-btn',onClick:()=>picker.current?.click()},'选择文件'),
      h('input',{ref:picker,type:'file',hidden:true,'aria-label':'选择检视台文件',onChange:e=>{
        const next=e.target.files[0];if(next){setFile(next);bumpFile();}e.target.value='';
      }}),
      h('button',{type:'button',className:'wb-btn wb-hide','aria-label':'收起资源检视台',title:'收起资源检视台',
        onClick:()=>inspectorSidebar?.hide(tab.id)},h(PrismInspectorIcon,{size:14}))),
    file ? h(InspectorFile,{file,key:fileVersion}) : url ? h(React.Fragment,null,
      h('div',{className:'wb-address'},h('span',{title:url},url),
        h('a',{className:'wb-btn',href:url,target:'_blank',rel:'noopener noreferrer',title:'在外部浏览器打开原链接'},'打开原链接')),
      h('iframe',{className:'wb-frame',src:url,title:'网页预览',sandbox:'allow-scripts allow-forms allow-presentation',referrerPolicy:'no-referrer'})) :
      h('div',{className:'wb-empty'},h(PrismInspectorIcon,{size:28}),h('p',null,'选择本机文件，或点击对话中的网页链接。')));
}

function InspectorBody({useTabInfo}) {
  const {tab}=useTabInfo();
  const params=tab.navigation.params||{};
  const remote=/^https?:\/\//i.test(params.url||'') ? params.url : '';
  return h(InspectorContents,{tab,remote,key:tab.navigation.revision});
}

function registerPrismInspector(ctx) {
  ctx.effect(()=>{
    const sidebar=ctx.sidebarRight;
    inspectorSidebar=sidebar;
    const definition=ctx.sidebarRightTabs.register({id:inspectorId,kind:inspectorKind,title:()=>'棱镜检视台',keepMounted:true,
      guide:[{id:inspectorId,order:40,title:()=>'棱镜资源检视台',icon:PrismInspectorIcon}]});
    const body=ctx.slots.inject('sidebar.right.pane.tab',()=>ctx.slots.register({name:'sidebar.right.pane.tab',key:inspectorId},InspectorBody));
    const title=ctx.slots.inject('sidebar.right.pane.tab.title',()=>ctx.slots.register({name:'sidebar.right.pane.tab.title',key:inspectorId},
      ()=>h('span',{className:'prism-inspector-title'},h(PrismInspectorIcon,{size:14}),'棱镜检视台')));
    const entry=ctx.slots.inject('conversation.session.header.utilities',()=>ctx.slots.register({
      name:'conversation.session.header.utilities',id:inspectorId+'/open',order:40},()=>h('button',{
        className:'prism-rail-button',type:'button','aria-label':'打开资源检视台',title:'打开资源检视台',onClick:()=>showPrismInspector()
      },h(PrismInspectorIcon))));
    return ()=>{
      for (const {kind,sessionId,tabId} of sidebar.openTabs.getSnapshot()) if (kind===inspectorKind) sidebar.closeIn(sessionId,tabId);
      entry(); title(); body(); definition(); inspectorSidebar=null;
    };
  },'Prism: Omni workbench');
}
