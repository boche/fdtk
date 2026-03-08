(function () {
  const STORAGE_KEY = 'fdtk-audio-enabled';
  let audioContext = null;
  let enabled = localStorage.getItem(STORAGE_KEY) !== 'off';

  function ensureContext() {
    if (!enabled) {
      return null;
    }
    if (!audioContext) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) {
        return null;
      }
      audioContext = new AudioContextCtor();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  }

  function tone(frequency, duration, type, gainValue, delay) {
    const ctx = ensureContext();
    if (!ctx) {
      return;
    }
    const now = ctx.currentTime + (delay || 0);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue || 0.035, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function play(kind) {
    if (!enabled) {
      return;
    }
    if (kind === 'battle') {
      tone(190, 0.16, 'square', 0.05, 0);
      tone(150, 0.12, 'square', 0.03, 0.05);
      return;
    }
    if (kind === 'bad') {
      tone(200, 0.18, 'sawtooth', 0.04, 0);
      tone(160, 0.15, 'sawtooth', 0.03, 0.08);
      return;
    }
    if (kind === 'event') {
      tone(330, 0.18, 'sine', 0.035, 0);
      tone(494, 0.22, 'sine', 0.03, 0.08);
      return;
    }
    tone(420, 0.14, 'triangle', 0.04, 0);
    tone(560, 0.11, 'triangle', 0.025, 0.06);
  }

  function toggle() {
    enabled = !enabled;
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    if (enabled) {
      ensureContext();
    }
    return enabled;
  }

  function isEnabled() {
    return enabled;
  }

  window.FDTK = window.FDTK || {};
  window.FDTK.audio = {
    play: play,
    toggle: toggle,
    isEnabled: isEnabled,
    ensureContext: ensureContext,
  };
})();
