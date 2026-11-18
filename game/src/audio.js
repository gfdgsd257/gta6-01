// Synthesised sound effects through WebAudio — no audio files at all.
// Every sound is built from oscillators and filtered noise at run time,
// so the game ships zero bytes of audio and never touches the network.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let sirenOn = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  return {
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    pickup() {
      tone(660, 0.09, 'sine', 0.25);
      setTimeout(() => tone(990, 0.12, 'sine', 0.25), 70);
    },
    coin() {
      tone(880, 0.07, 'triangle', 0.22, 1320);
    },
    gunshot() {
      noise(0.16, 0.5, 2400);
      tone(160, 0.1, 'square', 0.2, 50);
    },
    punch() {
      noise(0.08, 0.3, 900);
    },
    crash() {
      noise(0.35, 0.5, 700);
      tone(90, 0.25, 'sawtooth', 0.25, 40);
    },
    steal() {
      tone(300, 0.12, 'square', 0.18, 520);
    },
    mission() {
      tone(523, 0.12, 'triangle', 0.25);
      setTimeout(() => tone(659, 0.12, 'triangle', 0.25), 110);
      setTimeout(() => tone(784, 0.2, 'triangle', 0.3), 220);
    },
    busted() {
      tone(440, 0.3, 'sawtooth', 0.25, 220);
      setTimeout(() => tone(330, 0.4, 'sawtooth', 0.25, 165), 260);
    },
    // A looping engine hum whose pitch follows the car's speed.
    engine(speed01) {
      if (!ensure() || muted) {
        if (engineGain) engineGain.gain.value = 0;
        return;
      }
      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineGain = ctx.createGain();
        engineGain.gain.value = 0;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      }
      engineOsc.frequency.value = 55 + speed01 * 130;
      engineGain.gain.value = speed01 > 0.02 ? 0.05 + speed01 * 0.05 : 0;
    },
    // A two-tone police siren that wails while any police car is near.
    siren(active) {
      if (!ensure()) return;
      if (active && !sirenOn) {
        sirenOn = true;
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'triangle';
        sirenGain = ctx.createGain();
        sirenGain.gain.value = muted ? 0 : 0.06;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        let high = true;
        const wail = () => {
          if (!sirenOn || !sirenOsc) return;
          sirenOsc.frequency.value = high ? 950 : 700;
          high = !high;
          sirenOsc._timer = setTimeout(wail, 420);
        };
        wail();
      } else if (!active && sirenOn) {
        sirenOn = false;
        if (sirenOsc) {
          clearTimeout(sirenOsc._timer);
          try { sirenOsc.stop(); } catch { /* already stopped */ }
          sirenOsc = null;
        }
      }
      if (sirenGain) sirenGain.gain.value = muted || !sirenOn ? 0 : 0.06;
    },
  };
}
