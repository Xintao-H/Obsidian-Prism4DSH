// Optical stops and the home panel's mirror treatment come from prism-rim-canvas.js.
const prismRimStops = {
  default: ['0:#ffffff:0.24:#4285f4:0.5:#9b72cb:0.74:#ea4335:0.92:#fbbc04:1:#fbbc0400','0:#2563eb:0.32:#7c3aed:0.64:#ea4335:0.88:#d97706:1:#d9770600'],
  warm: ['0:#fff6eef2:0.26:#f6bd60:0.54:#f0a37e:0.82:#d97757:1:#d9775700','0:#9a3412:0.34:#c25934:0.68:#d97757:0.9:#d97706:1:#d9770600'],
  cobalt: ['0:#f0f9fff5:0.26:#7ce2ff:0.56:#4285f4:0.86:#1b49b2:1:#1b49b200','0:#1d4ed8:0.35:#2563eb:0.7:#0284c7:0.92:#38bdf8:1:#38bdf800'],
  iris: ['0:#f5f3fff2:0.26:#ddd6fe:0.56:#a58af8:0.86:#6d28d9:1:#6d28d900','0:#5b21b6:0.36:#7c3aed:0.7:#8b5cf6:0.92:#a855f7:1:#a855f700'],
  amber: ['0:#fffbebf2:0.26:#fde68a:0.56:#f2b84b:0.86:#d97706:1:#d9770600','0:#92400e:0.36:#b45309:0.7:#d97706:0.92:#f59e0b:1:#f59e0b00'],
  mono: ['0:#f8fafceb:0.28:#e2e8f0:0.6:#94a3b8:0.88:#64748b:1:#64748b00','0:#1e293b:0.36:#334155:0.7:#64748b:0.92:#94a3b8:1:#94a3b800']
};

function prismIsDark() {
  const theme = palette();
  return ['obsidian','warm'].includes(theme) || (theme === 'host' &&
    (document.documentElement.dataset.agCsTheme === 'dark' || getComputedStyle(document.documentElement).colorScheme === 'dark'));
}

const prismMirrorRim = [
  '0:rgba(255,255,255,.95):.24:rgba(232,240,252,.56):.54:rgba(186,202,228,.18):.85:rgba(148,168,198,.03):1:rgba(148,168,198,0)',
  '0:rgba(30,64,175,.52):.42:rgba(59,130,246,.2):1:rgba(59,130,246,0)'
];
const prismMirrorWash = [
  '0:rgba(238,245,255,.068):.42:rgba(206,224,250,.026):.8:rgba(180,202,238,.006):1:rgba(180,202,238,0)',
  '0:rgba(37,99,235,.042):.5:rgba(37,99,235,.014):1:rgba(37,99,235,0)'
];
function rimGradient(gradient, spec) {
  const stops=spec.split(':');
  for(let i=0;i<stops.length;i+=2) gradient.addColorStop(Number(stops[i]),stops[i+1]);
  return gradient;
}
function mirrorCursor(ctx,x,y,width,height,dark) {
  if(width*height>120000) return;
  const outside=Math.hypot(Math.max(-x,x-width,0),Math.max(-y,y-height,0));
  if(outside>=42) return;
  ctx.save();
  ctx.globalAlpha*=(1-outside/42)*(dark?1:.65);
  ctx.translate(x+3.2,y+4.2);
  ctx.fillStyle=rimGradient(ctx.createRadialGradient(2,3,0,2,3,26),dark
    ? '0:rgba(248,252,255,.135):.45:rgba(216,232,252,.05):1:rgba(200,220,250,0)'
    : '0:rgba(37,99,235,.065):1:rgba(37,99,235,0)');
  ctx.fillRect(-24,-23,52,52);
  const silhouette=new Path2D('M0 0L0 13.8L3.6 10.5L6.1 15.6L8 14.7L5.5 9.6L10.1 9.6Z');
  for(const [offset,scale,spec] of [
    [-.55,1.18,dark?'0:rgba(232,242,255,.055):.55:rgba(204,224,248,.024):1:rgba(180,205,238,0)':'0:rgba(15,23,42,.032):1:rgba(15,23,42,0)'],
    [0,1.04,dark?'0:rgba(252,254,255,.115):.45:rgba(222,235,252,.048):1:rgba(190,210,240,.006)':'0:rgba(15,23,42,.06):1:rgba(15,23,42,.004)']
  ]) {
    ctx.save();ctx.translate(offset,offset);ctx.scale(scale,scale);
    ctx.fillStyle=rimGradient(ctx.createLinearGradient(0,0,offset?8:7,offset?16:15),spec);
    ctx.fill(silhouette);ctx.restore();
  }
  ctx.restore();
}

function installSurfaceRim(card, options, mode) {
  const mirror=mode==='mirror';
  const region = card.closest('[data-conversation-content]') || card;
  const canvas = card.ownerDocument.createElement('canvas');
  canvas.className = 'ag-cs-prism-rim-cv '+(mirror?'prism-home-rim':'prism-composer-rim');
  canvas.setAttribute('aria-hidden','true');
  if(mirror) {
    card.setAttribute('data-ag-cs-prism-mirror','1');
    card.setAttribute('data-ag-cs-prism-cv','1');
  }
  card.append(canvas);
  const ctx = canvas.getContext('2d');
  const frameDue=createPrismFrameGate();
  let frame = 0, pointer = null, painted = false;
  let bounds = canvas.getBoundingClientRect();
  let radius = parseFloat(getComputedStyle(card).borderTopLeftRadius) || 10;
  function illuminate(detail) { card.dispatchEvent(new CustomEvent('prism-rim-light',{detail})); }
  function clear() {
    pointer = null;
    if (!painted) return;
    ctx?.clearRect(0,0,canvas.width,canvas.height);
    if(!mirror) illuminate(null);
    painted = false;
  }
  function draw(now) {
    frame = 0;
    if (!pointer || !ctx) return;
    if (!frameDue(now)) {frame=requestAnimationFrame(draw);return;}
    const x = pointer.clientX - bounds.left, y = pointer.clientY - bounds.top;
    if (x < -280 || x > bounds.width+280 || y < -280 || y > bounds.height+280 || bounds.width < 4) return clear();
    const dark = prismIsDark(), base = palette();
    const tone = Object.hasOwn(prismRimStops, options.accent) ? options.accent :
      ['warm','alabaster'].includes(base) ? 'warm' : 'default';
    const scale = (options.ambient ?? 100)/100;
    const dpr = Math.min(window.devicePixelRatio || 1,1.5);
    const w = Math.round(bounds.width*dpr), ht = Math.round(bounds.height*dpr);
    if (canvas.width !== w || canvas.height !== ht) { canvas.width = w; canvas.height = ht; }
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,bounds.width,bounds.height);
    const variant=dark?0:1;
    ctx.globalAlpha = scale*(!mirror && tone === 'mono' ? .58 : 1);
    if (mirror) {
      ctx.save();
      ctx.beginPath();ctx.roundRect(0,0,bounds.width,bounds.height,radius);ctx.clip();
      ctx.fillStyle=rimGradient(ctx.createRadialGradient(x,y,0,x,y,210),prismMirrorWash[variant]);
      ctx.fillRect(0,0,bounds.width,bounds.height);
      mirrorCursor(ctx,x,y,bounds.width,bounds.height,dark);
      ctx.restore();
    }
    const inset=mirror ? 0.75 : 1;
    ctx.strokeStyle=rimGradient(ctx.createRadialGradient(x,y,0,x,y,240),(mirror?prismMirrorRim:prismRimStops[tone])[variant]);
    ctx.lineWidth=mirror?1.35:1.45;
    ctx.beginPath();ctx.roundRect(inset,inset,bounds.width-2*inset,bounds.height-2*inset,radius);ctx.stroke();
    painted = true;
    if(!mirror) {
      const strength = Math.max(0,1-Math.abs(y)/220)*scale*(tone === 'mono' ? .62 : 1);
      illuminate({active:strength > .015, localX:x, strength, toneKey:tone, dark});
    }
  }
  function move(event) {
    pointer = event;
    if (!frame) frame = requestAnimationFrame(draw);
  }
  function measure() {
    bounds = canvas.getBoundingClientRect();
    radius = parseFloat(getComputedStyle(card).borderTopLeftRadius) || 10;
    if (pointer && !frame) frame = requestAnimationFrame(draw);
  }
  const resize = new ResizeObserver(measure);
  resize.observe(card);
  region.addEventListener('pointermove',move,{passive:true});
  region.addEventListener('pointerleave',clear);
  region.addEventListener('scroll',measure,true);
  window.addEventListener('blur',clear);
  return () => {
    cancelAnimationFrame(frame); clear(); resize.disconnect(); canvas.remove();
    if(mirror) {
      card.removeAttribute('data-ag-cs-prism-mirror');
      card.removeAttribute('data-ag-cs-prism-cv');
    }
    region.removeEventListener('pointermove',move);
    region.removeEventListener('pointerleave',clear);
    region.removeEventListener('scroll',measure,true);
    window.removeEventListener('blur',clear);
  };
}

function ComposerEffects({marker,options,reduced}) {
  React.useEffect(() => {
    const card = marker.current?.closest('[data-composer-card]');
    if (!card) return;
    card.classList.add('surface-composer-card','prism-composer');
    const stop = options.rim !== false && options.ambient !== 0 && !reduced ? installSurfaceRim(card,options,'composer') : null;
    return () => { stop?.(); card.classList.remove('surface-composer-card','prism-composer'); };
  },[marker,options.rim,options.ambient,options.accent,options.radius,options.theme,reduced]);
  return null;
}

