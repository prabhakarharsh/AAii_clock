export const C = {
  bg: '#0d1117',
  bg2: '#161b22',
  bg3: '#1c2128',
  bg4: '#21262d',
  border: '#30363d',
  border2: '#3d444d',
  green: '#3fb950',
  blue: '#58a6ff',
  orange: '#f0883e',
  red: '#f85149',
  purple: '#d2a8ff',
  yellow: '#e3b341',
  cyan: '#79c0ff',
  pink: '#ff7b72',
  text: '#c9d1d9',
  dim: '#8b949e',
  muted: '#484f58',
} as const;

export const TONES = [
  { id: 'beep', name: 'System Beep', icon: '📟' },
  { id: 'digital', name: 'Digital Pulse', icon: '💻' },
  { id: 'gentle', name: 'Gentle Chime', icon: '🔔' },
  { id: 'urgent', name: 'Urgent Alert', icon: '🚨' },
  { id: 'matrix', name: 'Matrix Code', icon: '🟩' },
  { id: 'terminal', name: 'Terminal Bell', icon: '⌨️' },
  { id: 'radar', name: 'Radar Ping', icon: '📡' },
];

export const fmt12 = (time24: string) => {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const fmt24 = (time24: string) => time24 || '';

export const fmtTime = (time24: string, use12: boolean) => {
  if (!time24 || time24 === '00:00') return '--:--';
  const parts = String(time24).split(':');
  const clean = `${parts[0]}:${parts[1] || '00'}`;
  if (!use12) return clean;
  const h = parseInt(parts[0]) || 0;
  const m = parseInt(parts[1]) || 0;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const to24h = (h: string, m: string, ampm: 'AM' | 'PM') => {
  let hh = parseInt(h) || 0;
  const mm = String(parseInt(m) || 0).padStart(2, '0');
  if (ampm === 'PM' && hh !== 12) hh += 12;
  if (ampm === 'AM' && hh === 12) hh = 0;
  return `${String(hh).padStart(2, '0')}:${mm}`;
};

export function playTone(id: string = 'beep', customUrl: string | null = null) {
  if (id === 'custom' && customUrl) {
    try {
      const a = new Audio(customUrl);
      a.volume = 0.8;
      a.play().catch(() => {});
      setTimeout(() => {
        a.pause();
        a.currentTime = 0;
      }, 10000);
    } catch {
      playTone('beep');
    }
    return;
  }

  try {
    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    if (ctx.state === 'suspended') void ctx.resume();

    const mk = (type: OscillatorType, freq: number, start: number, dur: number, vol = 0.15) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.03);
      g.gain.setValueAtTime(vol, start + dur * 0.75);
      g.gain.linearRampToValueAtTime(0, start + dur);
      o.start(start);
      o.stop(start + dur + 0.05);
    };

    const t = ctx.currentTime;
    switch (id) {
      case 'beep':
        for (let i = 0; i < 4; i++) mk('square', 880, t + i * 0.28, 0.22);
        break;
      case 'digital':
        for (let i = 0; i < 8; i++) mk('square', i % 2 ? 800 : 1200, t + i * 0.12, 0.1, 0.12);
        break;
      case 'urgent':
        for (let i = 0; i < 6; i++) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'sawtooth';
          const s = t + i * 0.18;
          o.frequency.setValueAtTime(1400, s);
          o.frequency.linearRampToValueAtTime(900, s + 0.15);
          g.gain.setValueAtTime(0.2, s);
          g.gain.linearRampToValueAtTime(0, s + 0.15);
          o.start(s);
          o.stop(s + 0.18);
        }
        break;
      case 'matrix':
        [1200, 1000, 800, 600, 400, 300].forEach((f, i) => mk('square', f, t + i * 0.15, 0.13, 0.13));
        break;
      case 'terminal':
        for (let i = 0; i < 3; i++) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'triangle';
          o.frequency.value = 440;
          const s = t + i * 0.5;
          g.gain.setValueAtTime(0, s);
          g.gain.linearRampToValueAtTime(0.2, s + 0.01);
          g.gain.exponentialRampToValueAtTime(0.001, s + 0.45);
          o.start(s);
          o.stop(s + 0.5);
        }
        break;
      case 'gentle':
        [523, 659, 784, 1047].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.value = f;
          const s = t + i * 0.35;
          g.gain.setValueAtTime(0, s);
          g.gain.linearRampToValueAtTime(0.18, s + 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, s + 0.8);
          o.start(s);
          o.stop(s + 0.85);
        });
        break;
      case 'radar':
        for (let i = 0; i < 2; i++) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'sine';
          const s = t + i * 0.9;
          o.frequency.setValueAtTime(200, s);
          o.frequency.exponentialRampToValueAtTime(1600, s + 0.6);
          g.gain.setValueAtTime(0, s);
          g.gain.linearRampToValueAtTime(0.2, s + 0.05);
          g.gain.setValueAtTime(0.2, s + 0.3);
          g.gain.exponentialRampToValueAtTime(0.001, s + 0.85);
          o.start(s);
          o.stop(s + 0.9);
        }
        break;
      default:
        for (let i = 0; i < 4; i++) mk('square', 880, t + i * 0.28, 0.22);
    }
  } catch (e) {
    console.warn('tone error', e);
  }
}

