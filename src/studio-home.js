const homeRanges = [
  {id:'all', label:'全部', days:0},
  {id:'30d', label:'30 天', days:30},
  {id:'7d', label:'7 天', days:7}
];
const {FISH_LOGO_PATH:deepSeekMarkPath,FISH_LOGO_VIEWBOX:deepSeekMarkBox}=require('@deepseek-ai/dsh-client-ui-primitives');

function DeepSeekMark({className,size=22,...props}) {
  const {width,height}=deepSeekMarkBox;
  return h('svg',{className,width:size,height:size*height/width,viewBox:'0 0 '+width+' '+height,fill:'none','aria-hidden':true,...props},
    h('path',{d:deepSeekMarkPath,fill:'currentColor'}));
}

function homeLocalDay(date) {
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
function homeDayOffset(date, offset) {
  const day=new Date(date);
  day.setHours(0,0,0,0);
  day.setDate(day.getDate()+offset);
  return day;
}
function studioHomeData(rows, workspace, range, today) {
  const end=homeLocalDay(today);
  const start=range.days ? homeLocalDay(homeDayOffset(today,1-range.days)) : '';
  const workspaces=new Set(), selectedSpaces=new Set(), selectedDays=new Set(), daily=new Map();
  let sessions=0;
  for (const session of Object.values(rows)) {
    if (!session || session.parentId || session.origin==='subagent') continue;
    const cwd=session.cwd;
    if (cwd) workspaces.add(cwd);
    if (session.blank || (workspace && cwd!==workspace)) continue;
    const date=session.updatedAt ? new Date(session.updatedAt) : null;
    const key=date && Number.isFinite(date.getTime()) ? homeLocalDay(date) : '';
    if (key && key<=end) daily.set(key,(daily.get(key)||0)+1);
    if ((start && (!key || key<start)) || (key && key>end)) continue;
    sessions++;
    if (key) selectedDays.add(key);
    if (cwd) selectedSpaces.add(cwd);
  }
  const earliest=homeDayOffset(today,1-26*7);
  earliest.setDate(earliest.getDate()-earliest.getDay());
  const cells=[];
  for (const d=new Date(earliest); homeLocalDay(d)<=end; d.setDate(d.getDate()+1)) {
    const date=homeLocalDay(d);
    cells.push({date,count:daily.get(date)||0});
  }
  const peak=Math.max(1,...cells.map(c=>c.count));
  for (const cell of cells) cell.level=Math.ceil(5*cell.count/peak);
  return {workspaces:[...workspaces].sort((a,b)=>a.localeCompare(b)),sessions,days:selectedDays.size,spaces:selectedSpaces.size,cells};
}

function StudioHomeHeat({cells}) {
  const ref=React.useRef(null),tip=React.useRef(null);
  const [focus,setFocus]=React.useState(cells.length-1);
  function present(cell) {
    const grid=ref.current, hint=tip.current;
    if (!grid || !hint || !cell) return;
    hint.textContent=cell.dataset.tip;
    const x=Math.max(0,Math.min(grid.clientWidth-hint.offsetWidth,cell.offsetLeft+(cell.offsetWidth-hint.offsetWidth)/2));
    const y=cell.offsetTop>hint.offsetHeight+4 ? cell.offsetTop-hint.offsetHeight-4 : cell.offsetTop+cell.offsetHeight+4;
    hint.style.transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px)';
    hint.dataset.shown='true';
  }
  function hide() { if(tip.current) delete tip.current.dataset.shown; }
  function navigate(event,index) {
    const keys={ArrowUp:index-1,ArrowDown:index+1,ArrowLeft:index-7,ArrowRight:index+7,Home:0,End:cells.length-1};
    if (event.key==='Escape') { hide(); return; }
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next=Math.min(cells.length-1,Math.max(0,keys[event.key]));
    ref.current.children[next]?.focus();
  }
  return h('div',{className:'ag-cs-home-heat',ref,'data-local-only':'1',role:'group','aria-label':'近 26 周的会话更新，使用方向键浏览日期',
    onMouseLeave:()=>{const current=ref.current?.ownerDocument.activeElement;if(current?.classList.contains('ag-cs-home-heat-cell') && ref.current.contains(current)) present(current);else hide();}},
    cells.map(({date,count,level},i)=>{
      const label=date+' · '+count+' 个会话最近更新';
      return h('span',{key:date,className:'ag-cs-home-heat-cell','data-level':level,'data-tip':label,role:'img','aria-label':label,
        tabIndex:i===Math.min(focus,cells.length-1)?0:-1,onFocus:e=>{setFocus(i);present(e.currentTarget);},onBlur:hide,
        onMouseEnter:e=>present(e.currentTarget),onClick:e=>{e.currentTarget.focus();present(e.currentTarget);},onKeyDown:e=>navigate(e,i)});
    }),h('span',{className:'ag-cs-home-heat-hint',ref:tip,'aria-hidden':true}));
}

function StudioHomeTrend({cells,days}) {
  const columns=cells.slice(-(days||30));
  const peak=Math.max(...columns.map(c=>c.count));
  if (!peak) return h('div',{className:'ag-cs-home-models-empty'},'这段时间还没有会话更新');
  const step=Math.max(1,Math.ceil(peak/4)), top=Math.ceil(peak/step)*step;
  const pct=(v)=>100*v/top+'%';
  const points=columns.map((c,i)=>[(i+.5)*1000/columns.length,Math.max(2,160-160*c.count/top)]);
  let line='M'+points[0].join(' ');
  for (let i=1;i<points.length;i++) {
    const a=points[i-2]||points[i-1],b=points[i-1],c=points[i],d=points[i+1]||c;
    const clamp=y=>Math.min(Math.max(b[1],c[1]),Math.max(Math.min(b[1],c[1]),y));
    line+=' C'+[b[0]+(c[0]-a[0])/6,clamp(b[1]+(c[1]-a[1])/6),c[0]-(d[0]-b[0])/6,clamp(c[1]-(d[1]-b[1])/6),...c].map(n=>n.toFixed(2)).join(' ');
  }
  const peakIndex=columns.findIndex(c=>c.count===peak);
  const axisIndices=[0,Math.floor((columns.length-1)/2),columns.length-1];
  const ticks=Array.from({length:top/step+1},(_,i)=>i*step);
  const trendLabel='近 '+columns.length+' 天的会话更新，最高为 '+columns[peakIndex].date+' 的 '+peak+' 个会话';
  return h('div',{className:'ag-cs-home-chart',role:'group','aria-label':trendLabel},
    h('div',{className:'ag-cs-home-chart-plot'},
      ticks.map(n=>h('span',{key:n,className:'ag-cs-home-chart-tick',style:{bottom:pct(n)}},n)),
      h('div',{className:'ag-cs-home-chart-bars'},columns.map(c=>h('span',{key:c.date,className:'ag-cs-home-chart-col',title:c.date+' · '+c.count+' 个会话',style:{height:pct(c.count)}},
        h('span',{className:'ag-cs-home-chart-seg','data-color':'0',style:{height:'100%'}})))),
      h('svg',{className:'ag-cs-home-chart-svg',viewBox:'0 0 1000 160',preserveAspectRatio:'none','aria-hidden':true},
        ticks.map(n=>h('line',{key:n,className:'ag-cs-home-chart-grid',x1:0,y1:160-n/top*160,x2:1000,y2:160-n/top*160,vectorEffect:'non-scaling-stroke'})),
        h('path',{className:'ag-cs-home-chart-area',d:line+' L'+points[points.length-1][0]+' 160 L'+points[0][0]+' 160 Z',fill:'currentColor',opacity:0.085}),
        h('path',{className:'ag-cs-home-chart-line',d:line,fill:'none',vectorEffect:'non-scaling-stroke'})),
      h('span',{className:'ag-cs-home-chart-peak','aria-hidden':true,style:{left:(peakIndex+.5)*100/columns.length+'%',bottom:Math.min(99,peak*100/top)+'%'}})),
    h('div',{className:'ag-cs-home-chart-axis'},axisIndices.map((i,j)=>h('span',{key:i,className:'ag-cs-home-chart-label',style:{left:j*50+'%',transform:'translateX(-'+j*50+'%)'}},columns[i].date.slice(5)))));
}

function StudioHome({root,sessionList}) {
  const rows=React.useSyncExternalStore(sessionList.subscribe,sessionList.getSnapshot).byId;
  const panel=React.useRef(null),options=usePrefs(),reduced=useReduced();
  React.useEffect(()=>{
    if (panel.current && options.rim && options.ambient>0 && options.motion && !reduced)
      return installSurfaceRim(panel.current,options,'mirror');
  },[root,options.rim,options.ambient,options.motion,reduced]);
  const [tab,setTab]=React.useState('overview'),[rangeId,setRange]=React.useState('all'),[workspace,setWorkspace]=React.useState('');
  const range=homeRanges.find(r=>r.id===rangeId);
  const todayKey=homeLocalDay(new Date());
  const data=React.useMemo(()=>studioHomeData(rows,workspace,range,new Date()),[rows,workspace,range,todayKey]);
  const sessionId=root.closest('[data-conversation-content]')?.dataset.conversationSession;
  const activeWorkspace=rows[sessionId]?.cwd;
  const tabButton=(id,label)=>h('button',{key:id,type:'button',className:'ag-cs-home-tab','data-tab':id,
    'data-active':tab===id?'':undefined,'aria-pressed':tab===id,onClick:()=>setTab(id)},label);
  const stat=(id,label,value)=>h('div',{className:'ag-cs-home-stat','data-stat':id},h('span',{className:'ag-cs-home-stat-label'},label),h('span',{className:'ag-cs-home-stat-value'},value.toLocaleString()));
  return createPortal(h('section',{className:'prism-studio-hero','aria-label':'Studio 工作区'},
    h('div',{className:'prism-studio-inner'},
      h('div',{'data-testid':'home-greeting'},
        h(DeepSeekMark,{className:'home-greeting-mark'}),
        h('h1',{className:'home-greeting-title'},'接下来做什么？')),
      h('div',{className:'ag-cs-home-panel-seat'},
        h('div',{className:'ag-cs-home-panel','data-ag-cs-home-panel':'1',ref:panel},
          h('div',{className:'ag-cs-home-panel-head'},
            h('div',{className:'ag-cs-home-head-left'},h('div',{className:'ag-cs-home-tabs',role:'group','aria-label':'会话活动视图'},tabButton('overview','概览'),tabButton('trend','趋势'))),
            h('div',{className:'ag-cs-home-head-right'},
              data.workspaces.length>0 && h('select',{className:'ag-cs-home-ws-select','data-ag-cs-ws-filter':'1','aria-label':'工作区筛选',value:workspace,onChange:e=>setWorkspace(e.target.value)},
                h('option',{value:''},'全部项目'),data.workspaces.map(cwd=>h('option',{key:cwd,value:cwd,title:cwd},(cwd===activeWorkspace?'● ':'')+(cwd.split(/[\\/]/).filter(Boolean).pop()||cwd)))),
              h('div',{className:'ag-cs-home-ranges',role:'group','aria-label':'日期范围'},homeRanges.map(r=>h('button',{key:r.id,type:'button',className:'ag-cs-home-range','data-range':r.id,
                'data-active':rangeId===r.id?'':undefined,'aria-pressed':rangeId===r.id,onClick:()=>setRange(r.id)},r.label))))),
          tab==='overview' ? h(React.Fragment,null,
            h('div',{className:'ag-cs-home-stats'},stat('sessions','会话数',data.sessions),stat('days','活跃天数',data.days),stat('workspaces','活跃工作区',data.spaces)),
            h(StudioHomeHeat,{cells:data.cells})) : h(StudioHomeTrend,{cells:data.cells,days:range.days}),
          h('div',{className:'ag-cs-home-local-note','data-local-scope-note':'1'},
            tab==='overview'?'按本地会话的最近更新时间统计。热图显示近 26 周。':'按本地会话的最近更新时间统计，图中显示近 '+(range.days||30)+' 天。'))))),root);
}
