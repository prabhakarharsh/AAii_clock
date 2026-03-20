import { useState, useRef } from 'react';
// import type { Alarm } from '../types';
import { TONES, fmtTime, to24h, playTone, C } from '../appShared';

const F = "'JetBrains Mono', monospace";

function ToneSelector({ tone, onSave }: any) {
  const [open, setOpen] = useState(false);
  const [playing, setPlay] = useState<any>(null);
  const [sel, setSel] = useState(tone.id);
  const [custom, setCustom] = useState({ url: tone.custom || null, name: tone.customName || '' });

  const preview = (id: any, url: any) => {
    setPlay(id);
    playTone(id, url || null);
    setTimeout(() => setPlay(null), 1800);
  };

  const handleFile = (e: any) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('audio/')) { alert('Upload an audio file'); return; }
    if (f.size > 5 * 1024 * 1024) { alert('Max 5 MB'); return; }
    const r = new FileReader();
    r.onload = ev => {
      const url = ev.target?.result;
      setCustom({ url, name: f.name.replace(/\.[^.]+$/, '') });
      setSel('custom');
      preview('custom', url);
    };
    r.readAsDataURL(f);
    e.target.value = '';
  };

  const save = () => {
    const found = TONES.find(t => t.id === sel);
    onSave({
      id: sel,
      name: sel === 'custom' ? (custom.name || 'Custom') : (found?.name || sel),
      type: sel === 'custom' ? 'custom' : 'builtin',
      custom: sel === 'custom' ? (custom.url as any) : null,
      customName: sel === 'custom' ? custom.name : '',
    });
    setOpen(false);
  };

  const cur = TONES.find(t => t.id === tone.id) || { name: tone.name, icon: '🎵' };

  return (
    <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: '1.5rem', overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: '0.8rem 1.1rem', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: C.bg3, borderBottom: open ? `1px solid ${C.border}` : 'none' }}>
        <span style={{ fontSize: '1.1rem' }}>{cur?.icon || '🔊'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: C.muted, fontSize: '0.56rem', letterSpacing: '0.2em', marginBottom: '0.12rem' }}>GLOBAL ALARM TONE</div>
          <div style={{ color: C.text, fontSize: '0.78rem', fontWeight: 600 }}>{tone.name}</div>
        </div>
        <span style={{ color: C.muted, fontSize: '0.68rem' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {TONES.map(t => {
              const isSel = sel === t.id;
              const isPlaying = playing === t.id;
              return (
                <div key={t.id} onClick={() => { setSel(t.id); preview(t.id, null); }}
                  style={{ background: isSel ? C.blue + '15' : C.bg, border: `1px solid ${isSel ? C.blue : C.border}`, borderRadius: 8, padding: '0.7rem 0.6rem', cursor: 'pointer', transition: 'all .2s', textAlign: 'center', position: 'relative' }}>
                  {isSel && <div style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', background: C.blue }} />}
                  {isPlaying && <div style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', background: C.green, animation: 'blink .4s step-end infinite' }} />}
                  <div style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>{t.icon}</div>
                  <div style={{ color: isSel ? C.blue : C.text, fontSize: '0.68rem', fontWeight: isSel ? 600 : 400 }}>{t.name}</div>
                </div>
              );
            })}
            <div style={{ background: sel === 'custom' ? C.purple + '15' : C.bg, border: `1px solid ${sel === 'custom' ? C.purple : C.border}`, borderRadius: 8, padding: '0.7rem 0.6rem', textAlign: 'center', position: 'relative' }}>
              {sel === 'custom' && <div style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', background: C.purple }} />}
              <div style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>📁</div>
              <div style={{ color: sel === 'custom' ? C.purple : C.text, fontSize: '0.68rem', fontWeight: sel === 'custom' ? 600 : 400, marginBottom: '0.35rem' }}>Custom File</div>
              <label htmlFor="tone-upload-input" style={{ cursor: 'pointer' }}>
                <input id="tone-upload-input" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                  style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                  onChange={handleFile} />
                <div style={{ background: 'transparent', border: `1px solid ${C.border2}`, borderRadius: 5, padding: '0.3rem 0.4rem', color: C.dim, fontSize: '0.6rem' }}>
                  {custom.url ? `▶ ${custom.name.slice(0, 10)}` : '📁 upload'}
                </div>
              </label>
            </div>
          </div>
          <button onClick={save} style={{ width: '100%', background: 'transparent', border: `1px solid ${C.green}`, borderRadius: 7, padding: '0.65rem', fontFamily: F, fontSize: '0.74rem', color: C.green, cursor: 'pointer', letterSpacing: '0.12em' }}>
            $ tone.save("{TONES.find(t => t.id === sel)?.name || custom.name || 'Custom'}")
          </button>
        </div>
      )}
    </div>
  );
}

function RingtoneUploader({ ringtoneName, ringtoneData, onSet, onClear }: any) {
  const [previewing, setPreviewing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFile = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) { alert('Please select an audio file'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('File too large (max 10MB)'); return; }

    const reader = new FileReader();
    reader.onload = (ev: any) => {
      onSet({
        name: file.name.replace(/\.[^/.]+$/, ''),
        data: ev.target.result,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const previewTone = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (!ringtoneData) return;
    if (previewing) {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      setPreviewing(false);
      return;
    }
    try {
      const audio = new Audio(ringtoneData);
      audioRef.current = audio;
      audio.volume = 0.8;
      audio.play().catch(e => alert('Playback failed: ' + e.message));
      setPreviewing(true);
      audio.onended = () => setPreviewing(false);
      setTimeout(() => { if (audioRef.current === audio) { audio.pause(); setPreviewing(false); } }, 10000);
    } catch (e) { }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
      {!ringtoneData ? (
        <label htmlFor="ringtone-up" style={{ 
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.4rem 0.75rem',
          background: C.bg3,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          color: C.dim,
          fontSize: '0.65rem',
          fontFamily: F,
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.purple; e.currentTarget.style.color = C.purple; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}
        >
          <input id="ringtone-up" type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleFile} />
          <span style={{ fontSize: '0.8rem' }}>📎</span>
          <span>Attach custom ringtone</span>
        </label>
      ) : (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          background: C.purple + '12', 
          border: `1px solid ${C.purple}44`, 
          borderRadius: 6, 
          padding: '0.35rem 0.6rem' 
        }}>
          <span style={{ fontSize: '0.8rem' }}>🎵</span>
          <span style={{ 
            color: C.purple, 
            fontSize: '0.65rem', 
            fontWeight: 600, 
            maxWidth: '120px', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap' 
          }}>
            {ringtoneName}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: '0.2rem' }}>
            <button 
              onClick={previewTone} 
              style={{ 
                background: previewing ? C.purple + '30' : 'transparent', 
                border: `1px solid ${C.purple}66`, 
                borderRadius: 4, 
                color: C.purple, 
                fontSize: '0.55rem', 
                padding: '0.15rem 0.4rem', 
                cursor: 'pointer',
                fontFamily: F,
                letterSpacing: '0.05em'
              }}
            >
              {previewing ? 'STOP' : 'TEST'}
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); onClear(); }} 
              style={{ 
                color: C.red + '99', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                fontSize: '0.75rem',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.red}
              onMouseLeave={e => e.currentTarget.style.color = C.red + '99'}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ClockFormatToggle({ fmt, onChange }: any) {
  return (
    <div style={{ display: 'flex', background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 20, overflow: 'hidden' }}>
      {['24h', '12h'].map((f: any) => (
        <button key={f} onClick={() => onChange(f)} style={{ background: fmt === f ? C.blue : 'transparent', border: 'none', color: fmt === f ? C.bg : C.muted, padding: '0.25rem 0.75rem', fontFamily: F, fontSize: '0.6rem', cursor: 'pointer' }}>{f}</button>
      ))}
    </div>
  );
}

export function AlarmsTab({ 
  alarms, 
  addAlarm: onAddAlarm, 
  toggleAlarm: onToggleAlarm, 
  removeAlarm: onRemoveAlarm, 
  loading, 
  error: apiError,
  alarmTone, 
  onToneSave, 
  clockFmt 
}: any) {
  const [form, setForm] = useState<any>({ time: '', hours: '', minutes: '', ampm: 'AM', label: '', repeat: 'once', ringtoneName: null, ringtoneData: null });
  const [error, setError] = useState('');

  const addAlarm = async () => {
    let finalTime = '';
    if (clockFmt === '12h') {
      if (!form.hours || !form.minutes) { setError('// enter time'); return; }
      finalTime = to24h(form.hours, form.minutes, form.ampm);
    } else {
      if (!form.time) { setError('// enter time'); return; }
      finalTime = form.time;
    }
    
    try {
      await onAddAlarm({
        time: finalTime,
        label: form.label.trim(),
        repeat: form.repeat,
        active: true,
        ringtoneName: form.ringtoneName,
        ringtoneData: form.ringtoneData
      });
      setForm({ time: '', hours: '', minutes: '', ampm: 'AM', label: '', repeat: 'once', ringtoneName: null, ringtoneData: null });
      setError('');
    } catch (err: any) {
      setError(`// error: ${err.message}`);
    }
  };

  if (loading && alarms.length === 0) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: C.blue, fontFamily: F }}>
      <div className="blink">// LOADING_ALARMS...</div>
    </div>
  );

  const sorted = [...alarms].sort((a, b) => a.time.localeCompare(b.time));
  const repeatColor = { once: '#58a6ff', daily: '#3fb950', weekdays: '#79c0ff', weekends: '#f0883e' };

  return (
    <div className="fade-up" style={{ padding: '1.25rem', maxWidth: '800px', margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      <ToneSelector tone={alarmTone} onSave={onToneSave} />

      {apiError && (
        <div style={{ background: C.red + '15', border: `1px solid ${C.red}`, borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', color: C.red, fontSize: '0.8rem' }}>
          // API_ERROR: {apiError}
          <button onClick={() => window.location.reload()} style={{ marginLeft: '1rem', background: 'none', border: `1px solid ${C.red}`, color: C.red, borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>RETRY</button>
        </div>
      )}

      <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '1.5rem', marginBottom: '1.5rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #58a6ff, #d2a8ff)', borderRadius: '10px 10px 0 0' }} />
        <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', fontSize: '0.8rem' }}>
          <span style={{ color: C.purple }}>alarm</span><span style={{ color: C.text }}>.</span><span style={{ color: C.yellow }}>schedule</span><span style={{ color: C.text }}>(</span>
        </div>

        <div style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.6rem', color: C.dim, marginBottom: '0.4rem' }}>time:</div>
              {clockFmt === '12h' ? (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input type="number" placeholder="HH" style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.orange, width: '3.5rem', padding: '0.5rem', textAlign: 'center' }} value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} />
                  <span style={{ color: C.muted }}>:</span>
                  <input type="number" placeholder="MM" style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.orange, width: '3.5rem', padding: '0.5rem', textAlign: 'center' }} value={form.minutes} onChange={e => setForm({ ...form, minutes: e.target.value })} />
                  <div style={{ display: 'flex', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
                    {['AM', 'PM'].map(p => (
                      <button key={p} style={{ background: form.ampm === p ? C.blue : 'transparent', border: 'none', color: form.ampm === p ? C.bg : C.muted, padding: '0.4rem 0.6rem', fontSize: '0.65rem', cursor: 'pointer' }} onClick={() => setForm({ ...form, ampm: p })}>{p}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <input type="time" style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.orange, width: '100%', padding: '0.5rem' }} value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.6rem', color: C.dim, marginBottom: '0.4rem' }}>repeat:</div>
              <select style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: (repeatColor as any)[form.repeat], width: '100%', padding: '0.5rem' }} value={form.repeat} onChange={e => setForm({ ...form, repeat: e.target.value })}>
                {Object.keys(repeatColor).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', color: C.dim, marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>label:</span>
              <RingtoneUploader 
                ringtoneName={form.ringtoneName} 
                ringtoneData={form.ringtoneData} 
                onSet={(r: any) => setForm((f:any) => ({ ...f, ringtoneName: r.name, ringtoneData: r.data }))} 
                onClear={() => setForm((f:any) => ({ ...f, ringtoneName: null, ringtoneData: null }))} 
              />
            </div>
            <input 
              type="text" 
              placeholder="Alarm description..." 
              style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.yellow, width: '100%', padding: '0.5rem 1rem' }} 
              value={form.label} 
              onChange={e => setForm({ ...form, label: e.target.value })} 
              onKeyDown={e => e.key === 'Enter' && addAlarm()}
            />
          </div>
        </div>

        <div style={{ color: C.text, fontSize: '0.8rem', margin: '1rem 0' }}>)</div>
        {error && <div style={{ color: C.red, fontSize: '0.7rem', marginBottom: '1rem' }}>{error}</div>}
        <button onClick={addAlarm} style={{ width: '100%', background: 'transparent', border: `1px solid ${C.blue}`, borderRadius: 7, padding: '0.8rem', color: C.blue, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.1em' }}>$ add_alarm --time "{form.hours || '...'}:{form.minutes || '...'}"</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '3rem 6rem 1fr 6rem 4rem', gap: '1rem', padding: '0.5rem 1rem', fontSize: '0.6rem', color: C.muted, borderBottom: `1px solid ${C.border}` }}>
          <span>IDX</span><span>TIME</span><span>LABEL</span><span>REPEAT</span><span>ACTIVE</span>
        </div>
        {sorted.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: C.dim, fontSize: '0.8rem' }}>// NO_ALARMS_FOUND</div>
        ) : sorted.map((a, i) => (
          <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '3rem 6rem 1fr 6rem 4rem', gap: '1rem', padding: '1rem', background: a.active ? C.bg2 : C.bg, border: `1px solid ${a.active ? C.border2 : C.border}`, borderRadius: 8, alignItems: 'center', opacity: a.active ? 1 : 0.5 }}>
            <span style={{ color: C.muted, fontSize: '0.7rem' }}>{String(i + 1).padStart(3, '0')}</span>
            <span style={{ color: C.orange, fontWeight: 700, fontSize: '1.1rem' }}>{fmtTime(a.time, clockFmt === '12h')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
              <span style={{ color: C.text, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label || '// no label'}</span>
              {a.ringtoneData && <span style={{ fontSize: '0.6rem', color: C.purple, background: C.purple + '15', padding: '1px 6px', borderRadius: 10, border: `1px solid ${C.purple}33` }}>🎵 {a.ringtoneName?.slice(0, 10)}</span>}
            </div>
            <span style={{ fontSize: '0.6rem', color: (repeatColor as any)[a.repeat], background: (repeatColor as any)[a.repeat] + '15', padding: '2px 8px', borderRadius: 20, textAlign: 'center' }}>{a.repeat}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div onClick={() => onToggleAlarm(a.id, !a.active)} style={{ width: 34, height: 18, background: a.active ? C.green + '33' : C.bg, border: `1px solid ${a.active ? C.green : C.border2}`, borderRadius: 10, position: 'relative', cursor: 'pointer' }}>
                <div style={{ width: 14, height: 14, background: a.active ? C.green : C.muted, borderRadius: '50%', position: 'absolute', top: 1, left: a.active ? 17 : 2, transition: 'all 0.2s' }} />
              </div>
              <button onClick={() => onRemoveAlarm(a.id)} style={{ background: 'none', border: 'none', color: C.red + '66', cursor: 'pointer', fontSize: '0.7rem' }}>rm</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

