import { useState, useEffect } from 'react';
import { C } from '../appShared';

interface MiniClockProps {
  now: Date;
  clockFmt: string;
}

// Inline formatTime for MiniClock to be self-contained or I could import it if I moved it to a separate file.
// Since the user might want it simple, I'll use the logic.
export function MiniClock({ now, clockFmt }: MiniClockProps) {
  const [tick, setTick] = useState<any>(true);
  useEffect(() => {
    const id = setInterval(() => setTick((t:any) => !t), 500);
    return () => clearInterval(id);
  }, []);

  const use12 = clockFmt==='12h';
  const displayH = use12 ? (now.getHours()%12||12) : now.getHours();
  const hh = String(displayH).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  const ss = String(now.getSeconds()).padStart(2,'0');
  const ampm = now.getHours()>=12?'PM':'AM';

  return (
    <div style={{
      backgroundColor: 'var(--bg3)',
      borderBottom: '1px solid var(--border)',
      padding: '8px 24px',
      display: 'flex', alignItems: 'center', gap: 8,
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      <span style={{ color: 'var(--green)', fontSize: '14px' }}>▶</span>
      
      <span style={{
        color: 'var(--blue)', fontSize: '24px',
        fontWeight: 'bold', letterSpacing: '0.06em',
      }}>
        {hh}
        <span style={{ color: tick ? 'var(--dim)' : 'transparent', transition: 'color 0.1s' }}>:</span>
        {mm}
      </span>

      <span style={{ color: 'var(--muted)', fontSize: '16px', marginTop: '4px' }}>
        :{ss}
      </span>

      {/* AM/PM pill — only in 12h mode */}
      {clockFmt==='12h' && (
        <span style={{background:ampm==='AM'?C.cyan+'18':C.orange+'18',border:`1px solid ${ampm==='AM'?C.cyan+'44':C.orange+'44'}`,color:ampm==='AM'?C.cyan:C.orange,fontSize:'0.6rem',fontWeight:700,padding:'1px 7px',borderRadius:10,letterSpacing:'0.1em'}}>
          {ampm}
        </span>
      )}

      <span style={{
        marginLeft: 'auto', color: 'var(--dim)',
        fontSize: '10px', letterSpacing: '0.1em',
      }}>
        {now.toLocaleDateString('en-IN', {
          weekday: 'short', month: 'short', day: 'numeric',
        }).toUpperCase()}
      </span>
    </div>
  );
}
