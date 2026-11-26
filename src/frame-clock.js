function prismFrameInterval() {
  const fps=prefs.targetFps;
  return fps==='native' ? 0 : 1000/(fps==='60' ? 60 : fps==='120' ? 120 : 180);
}

// Only background drift uses this clock. Pointer waves keep real time.
function createPrismAmbientClock() {
  let previous, elapsed, speed;
  return function advance(now, active) {
    const target = active ? 1 : 0.3;
    if (previous === undefined) {
      previous = elapsed = now;
      speed = target;
      return elapsed;
    }
    const dt = Math.min(100, Math.max(0, now - previous));
    previous = now;
    // Integrate the easing curve, so its travel is identical at different frame rates.
    const blend = -Math.expm1(-dt / 320);
    elapsed += target * dt + (speed - target) * 320 * blend;
    speed += (target - speed) * blend;
    return elapsed;
  };
}

// Advance from the previous deadline so fractional display ratios keep their cadence.
// On a 240 Hz display a target of 180 presents on three of every four refreshes.
function createPrismFrameGate() {
  let due=null,previousGap;
  return function ready(now) {
    const gap=prismFrameInterval();
    if (!gap) {due=null;return true;}
    if (due===null || gap!==previousGap || now-due>=gap) due=now;
    previousGap=gap;
    // Chromium's rounded timestamps can straddle an otherwise exact display refresh by 0.1 ms.
    if (now+0.12<due) return false;
    due+=gap;
    return true;
  };
}

// Tint and illuminate the existing glyphs. Do not change their identity or the pointer wave amplitudes.
function createPrismTaskBreath() {
  let previous, elapsed=0, envelope=0;
  const tint=[0,0,0];
  return function apply(palette,now,active) {
    const dt=previous===undefined ? 0 : Math.min(100, Math.max(0,now-previous));
    previous=now;
    envelope=active ? Math.min(1,envelope+dt/850) : Math.max(0,envelope-dt/850);
    if (!envelope) {elapsed=0;return;}
    elapsed=(elapsed+dt)%5600;
    const inhale=(1-Math.cos(2*Math.PI*elapsed/5600))*0.5;
    const weight=envelope*envelope*(3-2*envelope)*palette.ambientIntensity;
    palette.glyphGain=1+weight*(0.68*inhale-0.22);
    const blend=weight*(0.16+0.66*inhale);
    const spectrum=rippleCore.resolveHorizonSpectrumCode(palette.spectrum);
    rippleCore.spectrumRgb(0.04+0.16*inhale,tint,palette.dark,spectrum);
    for (let i=0;i<3;i++) tint[i]=palette.ink[i]+blend*(tint[i]-palette.ink[i]);
    palette.ink=tint;
  };
}
