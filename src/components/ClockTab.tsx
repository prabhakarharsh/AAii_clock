import { useEffect, useRef, useState } from 'react';
import type { Alarm, Task, Routine } from '../types';
import { C, fmtTime } from '../appShared';

interface ClockTabProps {
  alarms: Alarm[];
  tasks: Task[];
  routine: Routine | null;
  setActiveTab: (tab: string) => void;
  isVisible: boolean;
  clockFmt: string;
}

export function ClockTab({ 
  alarms, tasks, routine, setActiveTab, isVisible, clockFmt 
}: ClockTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isVisible]);

  // Matrix Rain Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    resizeCanvas();

    const charSet = "01アイウエオカキクサシスセタチツナニヌ{}[]()<>=/;:+-*&#%$@!?";
    const fontSize = 14;
    const columns = Math.ceil(canvas.width / fontSize);
    const drops: number[] = new Array(columns).fill(0);

    const draw = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      ctx.fillStyle = 'rgba(13, 17, 23, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(63, 185, 80, 0.12)'; // Very transparent green
      ctx.font = `${fontSize}px 'JetBrains Mono'`;

      for (let i = 0; i < drops.length; i++) {
        const text = charSet.charAt(Math.floor(Math.random() * charSet.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 0.4;
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [isVisible]);

  const use12 = clockFmt==='12h';
  const displayH = use12 ? (time.getHours()%12||12) : time.getHours();
  const hh = String(displayH).padStart(2,'0');
  const mm = String(time.getMinutes()).padStart(2,'0');
  const ss = String(time.getSeconds()).padStart(2,'0');
  const ampm = time.getHours()>=12?'PM':'AM';

  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const activeAlarmsCount = alarms.filter(a => a.active).length;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg)' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '40px', height: '100%', display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
        
        {/* Terminal Prompt */}
        <div className="fade-up" style={{ marginBottom: '40px' }}>
          <div style={{ color: 'var(--text)', fontSize: '14px', marginBottom: '12px' }}>
            <span style={{ color: 'var(--green)' }}>student@cse</span>:<span style={{ color: 'var(--blue)' }}>~/arc-clock</span>$ date +"%{clockFmt === '12h' ? 'r' : 'H:%M:%S'}"
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: 'clamp(5rem, 18vw, 9rem)', fontWeight: 700, color: 'var(--blue)', textShadow: '0 0 60px rgba(88, 166, 255, 0.2)' }}>
              {hh}<span style={{ animation: 'blink 1s step-end infinite' }}>:</span>{mm}
            </span>
            <span style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', color: 'var(--muted)', fontWeight: 500 }}>
              :{ss}
            </span>
            
            {use12 && (
              <span style={{fontSize:'clamp(1.5rem,5vw,2.5rem)',fontWeight:700,color:ampm==='AM'?C.cyan:C.orange,paddingBottom:'0.6rem',marginLeft:'0.2em',letterSpacing:'0.1em'}}>
                {ampm}
              </span>
            )}

            <span className="blink" style={{ display: 'inline-block', width: '20px', height: '0.8em', backgroundColor: 'var(--blue)', marginLeft: '12px', verticalAlign: 'middle' }} />
          </div>
          
          <div style={{ color: 'var(--dim)', fontSize: '18px', marginTop: '12px' }}>
            // {dateStr}
          </div>
        </div>

        {/* Status Panel */}
        <div className="fade-up" style={{ 
          marginTop: 'auto', 
          backgroundColor: 'rgba(22, 26, 34, 0.85)', 
          backdropFilter: 'blur(8px)', 
          border: '1px solid var(--border)', 
          borderRadius: '12px', 
          padding: '24px',
          maxWidth: '400px',
          pointerEvents: 'auto'
        }}>
          <div style={{ color: 'var(--purple)', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px', letterSpacing: '0.1em' }}>
            → PROCESS.STATUS
          </div>
          
          <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--dim)' }}>alarms:</span>
              <span className="syntax-orange">{activeAlarmsCount} running</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--dim)' }}>tasks:</span>
              <span className="syntax-orange">{tasks.length} active</span>
            </div>
            
            {activeAlarmsCount > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
                <span style={{ color: 'var(--dim)', fontSize: '12px' }}>// next alarm:</span>
                <div style={{ color: 'var(--yellow)', cursor: 'pointer', marginTop: '4px' }} onClick={() => setActiveTab('alarms')}>
                  {fmtTime(alarms.find(a => a.active)?.time || '', clockFmt === '12h')} — "{alarms.find(a => a.active)?.label || 'Untitled'}"
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
              <span style={{ color: 'var(--dim)', fontSize: '12px' }}>// routine:</span>
              <div style={{ color: routine ? 'var(--green)' : 'var(--muted)', marginTop: '4px' }}>
                {routine ? 'auto-managed ✓' : 'not loaded'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
