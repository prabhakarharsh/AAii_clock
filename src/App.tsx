import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from './components/AppShell';
import { ClockTab } from './components/ClockTab';
import { AlarmsTab } from './components/AlarmsTab';
import { TasksTab } from './components/TasksTab';
import { AITab } from './components/AITab';
import { VoiceRoutineTab } from './components/VoiceRoutineTab';
import { useAlarms } from './hooks/useAlarms';
import { useReminders } from './hooks/useReminders';
import { useRoutines } from './hooks/useRoutines';
import type { Alarm, VoiceState, Routine } from './types';
import { C, fmtTime, playTone } from './appShared';

function App() {
  const [activeTab, setActiveTab] = useState('clock');
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set<string>());

  const { alarms, loading: alarmsLoading, error: alarmsError, addAlarm, toggleAlarm, removeAlarm } = useAlarms();
  const { tasks, loading: remindersLoading, error: remindersError, addReminder, markDone, removeReminder } = useReminders();
  const { routines } = useRoutines();
  
  const [routine, setRoutine] = useState<Routine | null>(null);
  useEffect(() => {
    if (routines.length > 0) setRoutine(routines[0]);
  }, [routines]);

  const [voiceState, setVoiceState] = useState<VoiceState>(() => {
    try {
      const stored = localStorage.getItem('arc_voice');
      return stored ? JSON.parse(stored) : { enabled: false, language: 'en-IN', transcriptHistory: [] };
    } catch {
      return { enabled: false, language: 'en-IN', transcriptHistory: [] };
    }
  });

  useEffect(() => {
    localStorage.setItem('arc_voice', JSON.stringify(voiceState));
  }, [voiceState]);

  const [alarmTone, setAlarmTone] = useState(() => {
    try { const s = localStorage.getItem('arc_tone'); return s ? JSON.parse(s) : { id: 'beep', name: 'System Beep', type: 'builtin', custom: null }; } catch { return { id: 'beep', name: 'System Beep', type: 'builtin', custom: null }; }
  });
  const saveTone = (t: any) => { setAlarmTone(t); try { localStorage.setItem('arc_tone', JSON.stringify(t)); } catch (e) { } };

  const [clockFmt, setClockFmt] = useState(() => localStorage.getItem('arc_fmt') || '24h');
  const saveFmt = (f: any) => { setClockFmt(f); localStorage.setItem('arc_fmt', f); };


  const [triggerAlarm, setTriggerAlarm] = useState<Alarm | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isVisible, setIsVisible] = useState(document.visibilityState === 'visible');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [wakeOn, setWakeOn] = useState(false);


  // Track fired alarms to prevent duplicate fires in the same minute
  const firedMap = useRef<Set<string>>(new Set());

  const [, setNotifAsked] = useState(false);
  const [notifGranted, setNotifGranted] = useState(
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted'
  );
  const [showNotifBanner, setShowNotifBanner] = useState(false);

  // PWA UI & Service Worker Safe Registration
  useEffect(() => {
    // Fix 3: Generate Icons at runtime
    function generateAndInjectIcons() {
      const sizes = [192, 512];
      sizes.forEach((size) => {
        const existingLink = document.querySelector(`link[rel="apple-touch-icon"][sizes="${size}x${size}"]`);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = size * 0.04;
        const r = size * 0.18;
        const p = size * 0.08;
        ctx.beginPath();
        ctx.moveTo(p + r, p);
        ctx.lineTo(size - p - r, p);
        ctx.arcTo(size - p, p, size - p, p + r, r);
        ctx.lineTo(size - p, size - p - r);
        ctx.arcTo(size - p, size - p, size - p - r, size - p, r);
        ctx.lineTo(p + r, size - p);
        ctx.arcTo(p, size - p, p, size - p - r, r);
        ctx.lineTo(p, p + r);
        ctx.arcTo(p, p, p + r, p, r);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = '#58a6ff';
        ctx.font = `bold ${size * 0.42}px JetBrains Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⌚', size / 2, size / 2);
        ctx.fillStyle = '#3fb950';
        ctx.font = `${size * 0.1}px JetBrains Mono, monospace`;
        ctx.fillText('ARC', size / 2, size * 0.78);
        const dataUrl = canvas.toDataURL('image/png');
        if (existingLink) {
          (existingLink as HTMLLinkElement).href = dataUrl;
        } else {
          const link = document.createElement('link');
          link.rel = 'apple-touch-icon';
          link.sizes = `${size}x${size}`;
          link.href = dataUrl;
          document.head.appendChild(link);
        }
        (window as any)[`_arcIcon${size}`] = dataUrl;
      });
    }

    // Fix 2: Crash-Safe SW Registration
    function registerServiceWorker() {
      if (!('serviceWorker' in navigator)) return;
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('SW registered:', registration.scope);
          setInterval(() => registration.update(), 60 * 1000);
        })
        .catch((error) => console.warn('SW registration failed:', error));
    }

    // Fix 8: Mobile VH logic
    const setVH = () => {
      document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
    };

    generateAndInjectIcons();
    registerServiceWorker();
    setVH();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleVisibility = () => setIsVisible(document.visibilityState === 'visible');
    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      if (!localStorage.getItem('arc_install_dismissed')) {
        setTimeout(() => setShowInstallBanner(true), 10000);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    // Fix 6: Notification logic (after 8s wait)
    if (typeof Notification !== 'undefined' && Notification.permission === 'default' && !localStorage.getItem('arc_notif_asked')) {
      const timer = setTimeout(() => setShowNotifBanner(true), 8000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
        window.removeEventListener('resize', setVH);
        window.removeEventListener('orientationchange', setVH);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  const wakeLockRef = useRef<any>(null);

  // Wake Lock Re-acquisition Logic
  useEffect(() => {
    const requestLock = async () => {
      if ('wakeLock' in navigator && wakeOn && isVisible) {
        try {
          if (!wakeLockRef.current) {
            wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
            wakeLockRef.current.addEventListener('release', () => {
              wakeLockRef.current = null;
            });
          }
        } catch (err) {
          console.error('Failed to request wake lock', err);
        }
      } else if (wakeLockRef.current && (!wakeOn || !isVisible)) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };

    requestLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [wakeOn, isVisible]);

  const fireAlarm = useCallback((alarm: Alarm) => {
    setTriggerAlarm(alarm);

    // Use alarm's own ringtone if set,
    // otherwise fall back to global tone setting
    if (alarm.ringtoneData) {
      try {
        const audio = new Audio(alarm.ringtoneData);
        audio.volume = 0.85;
        audio.loop = true;
        audio.play().catch(() => {
          // fallback to global tone if audio fails
          playTone(alarmTone?.id || 'beep', alarmTone?.custom || null);
        });
        // Store reference so we can stop it on dismiss
        (window as any)._arcAlarmAudio = audio;
        // Safety: auto-stop after 5 minutes
        setTimeout(() => {
          if ((window as any)._arcAlarmAudio === audio) {
            audio.pause();
            audio.currentTime = 0;
            (window as any)._arcAlarmAudio = null;
          }
        }, 5 * 60 * 1000);
      } catch {
        playTone(alarmTone?.id || 'beep', alarmTone?.custom || null);
      }
    } else {
      // No custom ringtone — use global tone
      playTone(alarmTone?.id || 'beep', alarmTone?.custom || null);
    }

    // System Notification
    if (Notification.permission === 'granted') {
      const notif = new Notification(`⏰ ${alarm.time}`, {
        body: alarm.label || 'Your alarm is ringing!',
        icon: '/favicon.svg',
        tag: `alarm-${alarm.id}`,
        vibrate: [300, 100, 300],
        requireInteraction: true
      } as any);
      notif.onclick = () => { window.focus(); notif.close(); };
    }

    // Mobile Vibration
    if ('vibrate' in navigator) {
      navigator.vibrate([400, 150, 400, 150, 400]);
    }
  }, [alarmTone]);

  // Main Alarm Engine Loop
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      if (now.getSeconds() === 0) {
        const hh = now.getHours().toString().padStart(2, '0');
        const mm = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${hh}:${mm}`;
        const dateStr = now.toLocaleDateString();

        alarms.forEach(a => {
          const fireKey = `${a.id}_${dateStr}_${currentTime}`;
          if (a.active && a.time === currentTime && !firedMap.current.has(fireKey)) {
            firedMap.current.add(fireKey);
            fireAlarm(a);
          }
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [alarms, fireAlarm]);

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const perm = await Notification.requestPermission();
      setNotifGranted(perm === 'granted');
    } catch (e) {
      console.warn('Notification permission error:', e);
    }
    localStorage.setItem('arc_notif_asked', 'true');
    setShowNotifBanner(false);
    setNotifAsked(true);
  };

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  const handleUserInteraction = () => {
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const dismissAlarm = () => {
    // Stop custom ringtone audio if playing
    if ((window as any)._arcAlarmAudio) {
      try {
        (window as any)._arcAlarmAudio.pause();
        (window as any)._arcAlarmAudio.currentTime = 0;
        (window as any)._arcAlarmAudio = null;
      } catch (e) { }
    }
    setTriggerAlarm(null);
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(console.error);
      audioCtxRef.current = null;
    }
  };

  return (
    <div onClick={handleUserInteraction}>
      <AppShell
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alarms={alarms}
        tasks={tasks as any}
        voiceState={voiceState}
        isOnline={isOnline}
        wakeOn={wakeOn}
        setWakeOn={setWakeOn}
        onFormatChange={saveFmt}
        clockFmt={clockFmt}
      >
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {activeTab === 'clock' && (
            <ClockTab
              alarms={alarms}
              tasks={tasks as any}
              routine={routine}
              setActiveTab={setActiveTab}
              isVisible={isVisible}
              clockFmt={clockFmt}
            />
          )}
          {activeTab === 'alarms' && (
            <AlarmsTab 
              alarms={alarms} 
              addAlarm={addAlarm}
              toggleAlarm={toggleAlarm}
              removeAlarm={removeAlarm}
              loading={alarmsLoading}
              error={alarmsError}
              alarmTone={alarmTone} 
              onToneSave={saveTone} 
              clockFmt={clockFmt}
            />
          )}
          {activeTab === 'tasks' && (
            <TasksTab 
              tasks={tasks as any} 
              addReminder={addReminder}
              markDone={markDone}
              removeReminder={removeReminder}
              loading={remindersLoading}
              error={remindersError}
              onAddAlarm={(a: any) => addAlarm(a)}
            />
          )}
          {activeTab === 'voice' && (
            <VoiceRoutineTab
              alarms={alarms}
              addAlarm={addAlarm}
              removeAlarm={removeAlarm}
              tasks={tasks as any}
              addReminder={addReminder}
              markDone={markDone}
              voiceState={voiceState}
              setVoiceState={setVoiceState}
              alarmTone={alarmTone}
            />
          )}
          {activeTab === 'ai' && (
            <AITab
              alarms={alarms}
              addAlarm={addAlarm}
              tasks={tasks as any}
              addReminder={addReminder}
              markDone={markDone}
              selectedTaskIds={selectedTaskIds}
              onSelectedTaskIdsChange={setSelectedTaskIds}
            />
          )}
        </div>

        {/* PWA Prompts */}
        {showInstallBanner && (
          <div className="slide-in" style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: '760px', backgroundColor: 'var(--bg3)', border: '1px solid var(--green)', borderRadius: '10px', padding: '16px', zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '13px' }}>
              <span style={{ marginRight: '8px' }}>📲</span>
              <strong>Install ARC Clock as an app</strong>
              <div className="syntax-comment" style={{ fontSize: '11px', marginTop: '4px' }}>Works offline · Always-on · Faster access</div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleInstallApp} className="syntax-green" style={{ border: '1px solid var(--green)', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Install Now</button>
              <button onClick={() => { setShowInstallBanner(false); localStorage.setItem('arc_install_dismissed', 'true'); }} style={{ color: 'var(--muted)', fontSize: '12px' }}>✕</button>
            </div>
          </div>
        )}

        {/* Notification permission banner JSX */}
        {showNotifBanner && !notifGranted && (
          <div style={{
            position: 'fixed',
            bottom: '3.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 2rem)',
            maxWidth: 680,
            background: '#161b22',
            border: '1px solid #3fb950',
            borderRadius: 10,
            padding: '0.85rem 1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            zIndex: 400,
            fontFamily: 'JetBrains Mono, monospace',
            animation: 'fadeUp 0.3s ease',
          }}>
            <span style={{ fontSize: '1.2rem' }}>🔔</span>
            <div style={{ flex: 1 }}>
              <div style={{
                color: '#c9d1d9', fontSize: '0.78rem',
                fontWeight: 600, marginBottom: '0.2rem'
              }}>
                Enable alarm notifications?
              </div>
              <div style={{ color: '#484f58', fontSize: '0.65rem' }}>
              // alerts fire even when app is minimized
              </div>
            </div>
            <button
              onClick={requestNotifications}
              style={{
                background: 'transparent',
                border: '1px solid #3fb950',
                borderRadius: 7,
                padding: '0.4rem 0.9rem',
                color: '#3fb950',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.7rem',
                whiteSpace: 'nowrap',
              }}>
              Enable
            </button>
            <button
              onClick={() => {
                setShowNotifBanner(false);
                localStorage.setItem('arc_notif_asked', 'true');
              }}
              style={{
                background: 'none', border: 'none',
                color: '#484f58', cursor: 'pointer',
                fontSize: '0.85rem', padding: '0 4px',
              }}>
              ✕
            </button>
          </div>
        )}

        {/* iOS Install Instructions */}
        {/iPad|iPhone|iPod/.test(navigator.userAgent) && !(navigator as any).standalone && !localStorage.getItem('arc_install_dismissed') && (
          <div className="fade-up" style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: '760px', backgroundColor: 'var(--bg3)', border: '1px solid var(--blue)', borderRadius: '10px', padding: '16px', zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '13px' }}>
              <span style={{ marginRight: '8px' }}>🍎</span>
              <strong>Install on iOS</strong>
              <div className="syntax-comment" style={{ fontSize: '11px', marginTop: '4px' }}>Tap Safari Share menu → <span style={{ color: 'var(--blue)' }}>'Add to Home Screen'</span></div>
            </div>
            <button onClick={() => { localStorage.setItem('arc_install_dismissed', 'true'); window.location.reload(); }} style={{ color: 'var(--muted)', fontSize: '12px' }}>✕</button>
          </div>
        )}

        {/* Alarm Trigger Modal (Existing) */}
        {triggerAlarm && (
          <div className="fade-up" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(13, 17, 23, 0.95)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            <div className="syntax-dim" style={{ fontSize: '24px', marginBottom: '24px' }}>// SCHEDULED TASK TRIGGERED</div>
            <div style={{ fontSize: '32px', marginBottom: '40px' }}>
              <span className="syntax-purple">alarm.fire</span><span className="syntax-yellow">(</span><span className="syntax-orange">"{triggerAlarm.time}"</span><span className="syntax-yellow">)</span>
            </div>
            <div className="blink" style={{ fontSize: '130px', fontWeight: 'bold', color: 'var(--green)', lineHeight: 1 }}>
              {fmtTime(triggerAlarm.time, clockFmt === '12h')}
            </div>
            <div style={{ fontSize: '32px', color: 'var(--yellow)', marginTop: '20px', marginBottom: '60px', textAlign: 'center' }}>
              <div>"{triggerAlarm.label}"</div>
              {triggerAlarm.ringtoneData && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  marginTop: '0.4rem',
                  padding: '0.2rem 0.65rem',
                  background: C.purple + '15',
                  border: `1px solid ${C.purple}44`,
                  borderRadius: 20,
                  fontSize: '0.62rem',
                  color: C.purple,
                }}>
                  <span style={{ animation: 'blink 1s step-end infinite' }}>▶</span>
                  {triggerAlarm.ringtoneName || 'Custom Ringtone'}
                </div>
              )}
            </div>
            <button onClick={dismissAlarm} style={{ border: '2px solid var(--border)', padding: '16px 32px', fontSize: '20px', borderRadius: '8px', backgroundColor: 'var(--bg2)' }}>process.exit(0) <span className="syntax-dim">// dismiss</span></button>
          </div>
        )}

      </AppShell>
    </div>
  );
}

export default App;

