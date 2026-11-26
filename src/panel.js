// DSH adaptation of the Obsidian Prism settings center, updated 2026-11-26.
const panelThemes = {auto:'自动', host:'跟随当前主题', warm:'Alabaster 暖岩', obsidian:'Obsidian 深空'};
const panelDaylight = {crystal:'白昼冷晶', alabaster:'暖白画册'};
const panelAccents = {follow:'跟随模型',cobalt:'钴蓝',iris:'鸢尾紫',amber:'琥珀金',mono:'极简单色'};
const panelRadii = {compact:'利落锐角',standard:'均衡标准',round:'柔和圆润'};
const prismSubtabs = {appearance:'外观',interaction:'交互',thought:'思考转译',modules:'实用模块',beta:'Beta 内容',about:'配置与关于',all:'全部'};
const scenePresets = [
  ['ultra','完整光效',{motion:true,rim:true,ambient:100,roster:defaults.roster,homeRipple:true,convRipple:defaults.convRipple}],
  ['focus','专注编码',{motion:true,ambient:35,roster:'off',homeRipple:false,convRipple:'off'}],
  ['eco','静默省电',{motion:false,ambient:0,roster:'off',homeRipple:false,convRipple:'off'}]
];
const panelRow = (key, title, desc, control) => h('div',{'data-ag-cs-row':key,key},
  h('div',{className:'py-2'},
    h('div',{className:'flex-1'},h('div',{className:'ag-cs-settings-title-line'},h('span',{'data-k':'t'},title)),h('span',{'data-k':'d'},desc)),
    control));
function PanelSegments({title,items,value,onSelect,tones=false}) {
  return h('div',{className:'ag-cs-seg-group',role:'group','aria-label':title},
    Object.entries(items).map(([key,label])=>h('button',{key,type:'button',className:'ag-cs-seg-btn',
      'aria-pressed':String(value)===key,'data-pressed':String(value)===key?'':undefined,
      onClick:e=>{
        const next=e.currentTarget, prev=next.parentElement.querySelector('[data-pressed]');
        if(prev && prev!==next && document.documentElement.dataset.prismMotion==='true') {
          const a=prev.getBoundingClientRect(), b=next.getBoundingClientRect();
          next.animate([
            {transform:'translate('+ (a.left-b.left)+'px,'+(a.top-b.top)+'px) scale('+a.width/b.width+',1)',opacity:.85},
            {transform:'translate(0,0) scale(1,1)',opacity:0}
          ],{duration:220,easing:'cubic-bezier(.22,1,.36,1)',pseudoElement:'::after'});
        }
        onSelect(key);
      }
    },tones&&h('span',{className:'ag-cs-tone-dot','data-tone':key,'aria-hidden':'true'}),label)));
}
function PrismSwitch({label,value,onChange}) {
  return h('span',{className:'ag-cs-seg-group',role:'group','data-ui-kind':'switch','data-switch-on':value?'1':'0'},
    h('span',{className:'ag-cs-switch-thumb','aria-hidden':'true'}),
    h('button',{type:'button',role:'switch','aria-label':label,'aria-checked':value,onClick:()=>onChange(!value)}));
}
function PrismRoster({value,onOpen}) {
  const r=actors.parseMascotSpec(value)||{};
  const species=[['c','Claude 蟹','#d97757'],['k','Gemini 猫','#947fd6'],['d','GPT 白龙','#d7dfef'],['w','DeepSeek 蓝鲸','#4e6fff']];
  const active=species.filter(([key])=>r[key]);
  return h('div',{className:'prism-roster-box'},h('div',{className:'prism-roster-chips'},
    h('strong',null,'主宠 '+active.length+'/4'),
    active.map(([key,name,color])=>h('span',{key,className:'prism-roster-chip'},h('i',{style:{background:color}}),name)),
    r.minis&&h('span',{className:'prism-roster-chip'},'+3 迷你蟹')),
    h('button',{type:'button',className:'prism-stage-open',onClick:onOpen},
      h('span',{'aria-hidden':'true',dangerouslySetInnerHTML:{__html:prismCastingStage.spotlight}}),'打开桌宠选角舞台'));
}
function PrismWallpaperFile() {
  const [message,setMessage]=React.useState('');
  return h('div',{className:'prism-wall-import'},h('label',{className:'ag-cs-cfg-btn prism-input-label'},'选择文件',
    h('input',{type:'file','aria-label':'本机图片或视频',accept:'image/png,image/jpeg,image/webp,image/avif,image/gif,video/mp4,video/webm',
      onChange:async e=>{
        const file=e.target.files?.[0];
        if(!file)return;
        try {
          if(!/^(image\/(png|jpeg|webp|gif|avif)|video\/(mp4|webm))$/.test(file.type))throw Error('请选择图片、MP4 或 WebM 文件');
          await mediaStore('put',file);
          if(prefs.wallpaper)window.dispatchEvent(new Event('prism-wallpaper-file'));else setPref('wallpaper',true);
          setMessage(file.name);
        } catch(err){setMessage(err.message);}
      }})),message&&h('span',{role:'status'},message));
}
const panelThoughtViews={immersive:'沉浸纯译文',bilingual:'双语上下对照'};
const cfgOptions = {thoughtView:panelThoughtViews,theme:{...panelThemes,...panelDaylight},accent:panelAccents,radius:panelRadii,
  darkAuraStyle:prismAuraStyles,darkAura:prismAuraLevels,convRipple:prismRippleLevels,targetFps:prismFrameRates,
  codeFont:prismCodeFonts,bottomScroll:prismScrollModes};
function PrismConfigBackup() {
  const [message,setMessage]=React.useState('导出或导入此设备上的棱镜偏好。');
  const readConfig=async file=>{
    if(!file)return;
    try{
      const data=JSON.parse(await file.text());
      if(data.format!=='dsh-obsidian-prism/1'||!data.preferences)throw Error('请选择 DSH 黑曜棱镜导出的 JSON 文件');
      if(Object.hasOwn(data.preferences,'ripple') && !Object.hasOwn(prismRippleLevels,data.preferences.ripple))throw Error('配置项格式有误 · ripple');
      const saved=expandLegacyRipple(data.preferences);
      const patch={};
      for(const [key,def] of Object.entries(defaults)){
        if(!Object.hasOwn(saved,key))continue;
        const val=saved[key];
        if(typeof val!==typeof def||cfgOptions[key]&&!Object.hasOwn(cfgOptions[key],val)||
          key==='roster'&&!actors.isValidMascotValue(val)||key==='ambient'&&(!Number.isFinite(val)||val<0||val>100))throw Error('配置项格式有误 · '+key);
        patch[key]=val;
      }
      for(const [key,val] of Object.entries(patch))setPref(key,val);
      setMessage('已导入 '+Object.keys(patch).length+' 项偏好');
    }catch(err){setMessage(err.message);}
  };
  const download=()=>{
    const file=new Blob([JSON.stringify({format:'dsh-obsidian-prism/1',preferences:prefs},null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(file);a.download='dsh-obsidian-prism.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);setMessage('配置已导出');
  };
  return h('div',{className:'ag-cs-cfg-footer'},h('div',{className:'ag-cs-cfg-meta'},h('span',{className:'ag-cs-cfg-title'},'配置备份'),
    h('span',{className:'ag-cs-cfg-hint',role:'status'},message)),
    h('div',{className:'ag-cs-cfg-actions'},h('button',{type:'button',className:'ag-cs-cfg-btn',onClick:download},'导出 JSON'),
      h('label',{className:'ag-cs-cfg-btn prism-input-label'},'导入 JSON',h('input',{type:'file',accept:'.json,application/json','aria-label':'导入 JSON',
        onChange:e=>{const file=e.target.files?.[0];e.target.value='';readConfig(file);}}))));
}
function SettingsPanel({startOpen=false}={}) {
  const p=usePrefs();
  const section=React.useRef(null), stageMount=React.useRef(null), main=React.useRef(null), stageApi=React.useRef(null);
  const [foldState,setFoldState]=React.useState(()=>startOpen || localStorage.getItem('dsh-prism/settings-open')==='1'?'open':'unvisited');
  const opened=foldState==='open';
  const [group,setGroup]=React.useState(()=>{
    const saved=localStorage.getItem('dsh-prism/settings-subtab');return Object.hasOwn(prismSubtabs,saved)?saved:'appearance';
  });
  const openStage=()=>{
    if(!stageApi.current){
      stageApi.current=prismCastingStage.create({doc:document,sec:section.current,foldBody:stageMount.current,getMainBlocks:()=>[main.current],
        getLang:()=>'zh-CN',uiText:()=>prismStageLabels,getCurMascot:()=>prefs.roster,setMascotValue:v=>setPref('roster',v),
        isLightThemeNow:()=>document.documentElement.dataset.agCsTheme==='light',syncRoot:()=>{},BTN:'ag-cs-seg-btn'});
    }
    stageApi.current.open();
  };
  React.useEffect(()=>()=>{
    stageApi.current?.dispose();
  },[]);
  const fold=()=>{
    stageApi.current?.close();setFoldState(opened?'closed':'open');localStorage.setItem('dsh-prism/settings-open',opened?'0':'1');
  };
  const choose=id=>{setGroup(id);localStorage.setItem('dsh-prism/settings-subtab',id);};
  const groupKeys=Object.keys(prismSubtabs);
  const subtabKey=(e,i)=>{
    const target=e.key==='ArrowRight'?i+1:e.key==='ArrowLeft'?i-1:e.key==='Home'?0:e.key==='End'?groupKeys.length-1:null;
    if(target===null)return;
    e.preventDefault();
    const k=groupKeys[(target+groupKeys.length)%groupKeys.length]; choose(k);
    e.currentTarget.parentElement.querySelector('[data-ag-cs-subtab="'+k+'"]').focus();
  };
  const segment=(key,title,desc,items,tones=false)=>panelRow(items===panelDaylight?'lightPreset':key,title,desc,h(PanelSegments,{title,items,value:p[key],
    onSelect:v=>setPref(key,key==='ambient'?Number(v):v),tones}));
  const toggle=(key,title,desc)=>panelRow(key,title,desc,h(PrismSwitch,{label:title,value:p[key],onChange:v=>setPref(key,v)}));
  const groupBox=(id,title,rows,extra)=> (group===id||group==='all')&&h('section',{key:id,className:'ag-cs-settings-group','data-ag-cs-group':id},
    h('div',{className:'ag-cs-settings-subhead'},title),rows&&h('div',{className:'ag-cs-settings-card divide-y'},...rows),extra);
  const fullRoster=actors.parseMascotSpec(p.roster)||{};
  const paletteName=themes[p.theme]||'自动';
  return h('div',{id:'ag-cs-settings-sec',className:'prism-settings-center',ref:section,'data-open':opened?'1':'0'},
    h('button',{type:'button',className:'ag-cs-settings-fold-head','aria-expanded':opened,onClick:fold},
      h('span',{className:'ag-cs-settings-fold-left'},h('span',{className:'ag-cs-settings-brand-mark prism-panel-brand','aria-hidden':'true'}),
        h('strong',{className:'prism-brand-title'},'Obsidian Prism · 黑曜棱镜'),h('span',{className:'ag-cs-settings-ver'},'v0.3.4')),
      h('span',{className:'ag-cs-settings-fold-right'},h('span',{className:'ag-cs-settings-fold-summary'},paletteName+' · '+(p.motion?'动效开启':'静默')),
        h('span',{className:'ag-cs-settings-fold-chevron','aria-hidden':'true'},h('svg',{width:14,height:14,viewBox:'0 0 16 16',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round'},h('path',{d:'M4 6l4 4 4-4'}))))),
    foldState!=='unvisited' && h('div',{className:'ag-cs-settings-fold-body','aria-hidden':!opened},
      h('div',{ref:main,className:'prism-settings-guts'},h('div',{className:'ag-cs-settings-topdeck'},
        h('div',{className:'ag-cs-preset-row'},h('span',{className:'ag-cs-preset-label'},'场景预设'),
          h('div',{className:'ag-cs-preset-pills'},scenePresets.map(([id,name,patch])=>{
            const active=Object.entries(patch).every(([key,val])=>key==='roster'
              ?actors.encodeMascotSpec(fullRoster)===actors.encodeMascotSpec(actors.parseMascotSpec(val)):p[key]===val);
            return h('button',{className:'ag-cs-preset-btn',type:'button',key:id,'data-active':active?'1':'0','aria-pressed':active,
              onClick:()=>Object.entries(patch).forEach(([key,val])=>setPref(key,val))},name);
          }))),
        h('div',{className:'ag-cs-subtabs',role:'tablist','aria-label':'设置分组'},groupKeys.map((key,i)=>h('button',{type:'button',role:'tab',key,
          className:'ag-cs-subtab-btn','data-ag-cs-subtab':key,'aria-selected':group===key,tabIndex:group===key?0:-1,onKeyDown:e=>subtabKey(e,i),onClick:()=>choose(key)},prismSubtabs[key])))),
      h('div',{className:'ag-cs-settings-groups'},
        groupBox('appearance','外观与版面',[
          segment('theme','主题配色方案','支持跟随当前主题、Obsidian 深空或 Alabaster 暖岩精调配色。',panelThemes),
          segment('theme','浅色表面质感','切换至浅色主题，调整表面层级、对比度与背景风格。',panelDaylight),
          segment('darkAuraStyle','深色表面材质','在深空黑曜配色下选择多色折射或蓝紫冷光。指定强调色时，极光优先采用该颜色。',prismAuraStyles),
          segment('accent','强调色倾向','调节按钮高亮、焦点环与图表主色的色相倾向。',panelAccents,true),
          segment('radius','界面圆角风格','统一调节输入框、卡片与弹出面板的几何曲率。',panelRadii),
          segment('ambient','环境氛围光浓度','精细控制背景极光与边缘折射光晕的不透明度比例。',{0:'关闭 (0%)',35:'微光 (35%)',70:'柔和 (70%)',100:'标准 (100%)'}),
          segment('darkAura','深色极光浓度','调节深色对话页底部光晕的亮度与覆盖范围。',prismAuraLevels),
          toggle('homeRipple','首页字符波纹','在新会话显示字符纹理，点击空白处可激起涟漪。'),
          segment('convRipple','对话页字符波纹','调节字符底纹和点击涟漪的强度。任务运行时，字符的颜色和深浅会缓慢起伏。',prismRippleLevels),
          segment('targetFps','目标刷新帧率','底部光晕和字符底纹按所选档位刷新。前台静置时，光晕和底纹的起伏会放慢。',prismFrameRates),
          toggle('motion','弹簧与消息动效','启用界面光效、桌宠动画与流式消息反馈。')
        ]),
        groupBox('interaction','输入、侧栏与宠物',[
          toggle('compactComposer','输入框紧凑排版','收紧输入区与底部工具栏的留白。'),
          toggle('smoothCaret','平滑打字光标','在输入区平滑移动插入光标。'),
          segment('bottomScroll','回到底部滚动动效','点击回到底部时使用惯性滑动或立即定位。滑动中可用滚轮打断。',prismScrollModes),
          toggle('directMenu','会话直触右键菜单','在对话正文右键打开旁聊和会话操作。Shift＋右键保留宿主菜单。'),
          segment('codeFont','代码等宽字体','选择代码使用的本机等宽字体。',prismCodeFonts),
          toggle('codeLigatures','代码编程连字','使用字体自带的编程连字显示多字符运算符，如 => 和 !=。'),
          toggle('rim','指针反光','指针靠近时，输入框边沿出现彩光，新会话卡片出现镜面反光。'),
          toggle('fold','长代码块折叠按钮','在长代码块下方显示展开与收起操作。'),
          panelRow('roster','桌宠阵容','在选角舞台上点亮或熄灭每位伙伴的聚光灯。',null)
        ],h(PrismRoster,{value:p.roster,onOpen:openStage})),
        groupBox('thought','思考过程转译',[
          toggle('autoTranslate','用当前模型自动翻译展开的思考','展开思考时调用当前会话的模型进行转译。'),
          segment('thoughtView','思考译文展示','沉浸显示译文，或在译文下方对照原文。',panelThoughtViews)
        ]),
        groupBox('modules','实用功能模块',[
          toggle('vial','上下文液体试管','根据当前会话的上下文占用显示液面。'),
          toggle('slider','模型菜单水晶滑块','在支持推理等级的模型下显示光学滑块。'),
          toggle('effortMemory','跨模型记住推理档位','切回模型时恢复这个提供方、这个模型上次选定的推理等级。')
        ]),
        groupBox('beta','Beta 内容',[
          toggle('sidebarStudio','Chat 对话模式','在侧栏顶部显示 Code / Chat 切换，打开独立的 Chat 空间。'),
          toggle('wallpaper','显示 Prism 壁纸','在工作区背景显示本地图片或视频。'),
          panelRow('file','本机图片或视频','支持 PNG、JPEG、WebP、AVIF、GIF、MP4 和 WebM。',h(PrismWallpaperFile))
        ]),
        groupBox('about','配置与关于',null,h(React.Fragment,null,h('div',{className:'ag-cs-about-box'},
          h('div',{className:'ag-cs-about-repo-info'},h('strong',null,'Obsidian-Prism4DSH'),h('span',{className:'ag-cs-repo-chip'},'DSH v0.3.4')),
          h('a',{href:'https://github.com/RMvdesi/obsidian-prism',target:'_blank',rel:'noreferrer'},'RMvdesi / Obsidian Prism',' ↗'),
          h('details',null,h('summary',null,'版本与开源许可'),h('p',{className:'ag-cs-about-disclaimer'},'原作者为 RMvdesi 与 Obsidian Prism 上游贡献者。DSH 社区独立移植，更新于 2026-11-26。以 v1.0.8-beta.2 为基础，极光与波纹核心取自 v1.0.8-beta.3（41cc481）。GPL-3.0-only。完整署名见 NOTICE 与 THIRD_PARTY_NOTICES.md。'))),
          h(PrismConfigBackup)))
      )),h('div',{ref:stageMount,className:'prism-stage-mount'})));
}
function Outline({root,onClose}) {
  const [query,setQuery]=React.useState(''),[rows,setRows]=React.useState(()=>conversationRows(root));
  React.useEffect(()=>{
    if(!root)return;
    let timer;
    const ob=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>setRows(conversationRows(root)),150);});
    ob.observe(root,{childList:true,subtree:true});return()=>{ob.disconnect();clearTimeout(timer);};
  },[root]);
  const matches=rows.filter(r=>r.title.toLowerCase().includes(query.toLowerCase()));
  return h(React.Fragment,null,h('input',{type:'search',placeholder:'搜索已加载的提问','aria-label':'搜索提问',value:query,onChange:e=>setQuery(e.target.value)}),
    matches.length ? h('ol',{className:'prism-outline'},matches.map(({row,key,title})=>h('li',{key},h('button',{
      onClick:()=>{onClose();requestAnimationFrame(()=>navigateTo(row));}},title)))):h('p',null,rows.length?'没有匹配的提问。':'当前尚无已加载的提问。'));
}
function ModelPane({mode,initial,sessionId,directory,root,title,renameTitle}) {
  const storageKey='dsh-prism/chat/'+sessionId;
  const [history,setHistory]=React.useState(()=>{try{return JSON.parse(localStorage.getItem(storageKey)) || [];}catch{return [];}});
  const [input,setInput]=React.useState(initial || ''),[result,setResult]=React.useState(''),[error,setError]=React.useState('');
  const [busy,setBusy]=React.useState(false),[task,setTask]=React.useState('translate'),[written,setWritten]=React.useState(''), job=React.useRef(null);
  React.useEffect(()=>()=>job.current?.abort(),[]);
  const save=list=>{setHistory(list);try{localStorage.setItem(storageKey,JSON.stringify(list));}catch{setError('本机会话记录空间已满');}};
  const run=async()=>{
    if(!input.trim() || busy)return;
    const text=input.trim(), controller=new AbortController(); job.current=controller;
    setBusy(true);setError('');setResult('');
    try{
      const list=[...history,{role:'user',text}];
      const answer=await modelAction(directory,mode==='chat'?'chat':task,mode==='chat'?JSON.stringify(list):text,controller.signal);
      if(mode==='chat'){save([...list,{role:'assistant',text:answer}]);setInput('');}else setResult(answer);
    }catch(e){if(!controller.signal.aborted)setError(e.message);}
    finally{if(job.current===controller){job.current=null;setBusy(false);}}
  };
  return h('section',{className:'prism-model-pane'},
    mode==='chat' ? h('div',{className:'prism-chat-log'},history.map((m,i)=>h('div',{key:i,'data-role':m.role},h('b',null,m.role==='user'?'你':'助手'),m.role==='assistant'?h(PrismChatMarkdown,{text:m.text}):h('p',null,m.text))))
      : h('div',{className:'prism-actions'},h('select',{'aria-label':'翻译类型',disabled:busy,value:task,onChange:e=>{setTask(e.target.value);setResult('');setError('');}},
        h('option',{value:'translate'},'文本 / 思考'),h('option',{value:'title'},'会话标题')),
        task==='title'?h('button',{disabled:!title,onClick:()=>{setInput(typeof title==='string'?title:'');setError('');}},'取当前标题'):h('button',{onClick:()=>{
          const texts=[...(root?.querySelectorAll(reasoningSelector)||[])].filter(row=>row.checkVisibility()).map(sourceText).filter(Boolean);
          if(texts.length){setInput(texts.at(-1));setError('');}else setError('请展开聊天中的思考，或在下方粘贴文本。');
        }},'取最近可见思考')),
    h('textarea',{rows:4,value:input,disabled:busy,onChange:e=>setInput(e.target.value),'aria-label':mode==='chat'?'旁聊问题':'待翻译文本',
      placeholder:mode==='chat'?'在此旁聊，历史保存在本机':'在选区右键选择「译为中文」，或将原文粘贴到这里'}),
    h('div',{className:'prism-actions'},h('button',{className:'prism-primary',disabled:busy||!input.trim(),onClick:run},
      busy?'正在处理…':mode==='chat'?'用当前模型发送':'用当前模型翻译'),
      busy&&h('button',{onClick:()=>job.current?.abort()},'取消')),
    error&&h('p',{role:'alert'},error),result&&h('p',{className:'prism-translation','aria-live':'polite'},result),
    result&&task==='title'&&mode==='translate'&&h('button',{disabled:busy||title===result||written===result,onClick:async()=>{
      try{const response=await renameTitle(result);if(!response?.ok)throw Error(response?.error?.message || '标题更新失败');setWritten(result);setError('');}
      catch(e){setError(e.message);}
    }},title===result||written===result?'标题已更新':'将译文设为会话标题'));
}
function FilePreview() {
  const [file,setFile]=React.useState(null),[url,setUrl]=React.useState(''),[text,setText]=React.useState('');
  React.useEffect(()=>{
    if(!file)return;
    let valid=true;const objectUrl=URL.createObjectURL(file);setUrl(objectUrl);setText('');
    if(!/^(image|video|audio)\//.test(file.type) && file.type!=='application/pdf'){
      file.slice(0,160000).text().then(s=>{if(valid)setText(s);});
    }
    return()=>{valid=false;URL.revokeObjectURL(objectUrl);};
  },[file]);
  const props={src:url,controls:true};
  return h('div',{className:'prism-preview'},h('input',{type:'file','aria-label':'选择预览文件',onChange:e=>setFile(e.target.files?.[0]||null)}),
    file&&url&&(file.type.startsWith('image/')?h('img',{src:url,alt:file.name}):file.type.startsWith('video/')?h('video',props):
      file.type.startsWith('audio/')?h('audio',props):file.type==='application/pdf'?h('iframe',{src:url,title:file.name}):
      h(React.Fragment,null,h('pre',null,text),file.size>160000&&h('small',null,'已显示前 160 KB'))));
}

const prismPanelRoutes={settings:['外观','外观'],outline:['大纲','会话大纲'],translate:['翻译','思考转译'],chat:['旁聊','独立旁聊'],files:['文件','文件预览']};
function Panel({initial={tab:'settings'},root,directory,sessionId,title,renameTitle,onClose}) {
  const [tab,setTab]=React.useState(initial.tab), ref=React.useRef(null);
  React.useEffect(()=>{
    const el=ref.current;
    el.showModal();
    return()=>el.close();
  },[]);
  return createPortal(h('dialog',{ref,className:'prism-dialog prism-panel-shell','aria-label':'黑曜棱镜',onCancel:onClose,
    onClick:e=>{
      if(e.target!==e.currentTarget)return;
      const r=e.currentTarget.getBoundingClientRect();
      if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();
    }},
    h('nav',{className:'prism-panel-nav','aria-label':'棱镜面板','data-ag-cs-settings-nav':'1'},
      h('strong',{className:'prism-nav-title'},'设置'),
      Object.entries(prismPanelRoutes).map(([id,[name]])=>h('button',{key:id,type:'button','aria-pressed':tab===id,
        'data-ag-cs-nav-active':tab===id?'1':undefined,onClick:()=>setTab(id)},name)),
      h('button',{type:'button',className:'prism-nav-close','aria-label':'关闭黑曜棱镜',onClick:onClose},'关闭设置',h('kbd',null,'Esc'))),
    h('main',{className:'prism-panel-body',key:tab},h('h2',null,prismPanelRoutes[tab][1]),
      tab==='settings'?h(SettingsPanel,{startOpen:true}):
      tab==='outline'?h(Outline,{root,onClose}):tab==='files'?h(FilePreview):h(ModelPane,{key:tab,mode:tab,
        initial:tab===initial.tab?initial.text:'',directory,sessionId,root,title,renameTitle}))),document.body);
}
