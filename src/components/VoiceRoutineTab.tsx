import { useState, useEffect, useRef } from 'react';
import type { Alarm, Task, VoiceState } from '../types';

interface VoiceRoutineTabProps {
  alarms: Alarm[];
  addAlarm: (data: Partial<Alarm>) => Promise<void>;
  removeAlarm: (id: string) => Promise<void>;
  tasks: Task[];
  addReminder: (data: Partial<Task | any>) => Promise<void>;
  markDone: (id: string, done: boolean) => Promise<void>;
  voiceState: VoiceState;
  setVoiceState: React.Dispatch<React.SetStateAction<VoiceState>>;
  alarmTone: any;
}

import { playTone } from '../appShared';

// Convert spoken time text → 24h "HH:MM" for storage
const parseSpokenTime = (text: string) => {
  if (!text) return null;
  let t = text.toLowerCase().trim();

  // normalize punctuation
  t = t.replace(/a\.m\./gi, 'am').replace(/p\.m\./gi, 'pm');
  t = t.replace(/(\d{1,2})\s*o[''`]?clock/gi, '$1:00');

  // word → digit
  const wordNums: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'zero': 0, 'oh': 0,
  };
  Object.entries(wordNums).forEach(([w, n]) => {
    t = t.replace(new RegExp(`\\b${w}\\b`, 'gi'), String(n));
  });

  // special words
  t = t.replace(/\bnoon\b/gi, '12:00 pm');
  t = t.replace(/\bmidnight\b/gi, '12:00 am');
  t = t.replace(/half\s+past\s+(\d{1,2})/gi, '$1:30');
  t = t.replace(/quarter\s+past\s+(\d{1,2})/gi, '$1:15');
  t = t.replace(/quarter\s+to\s+(\d{1,2})/gi, (_, h) => `${parseInt(h) - 1}:45`);

  // try patterns — most specific first
  const patterns = [
    // "9:05 am" — with minutes and period
    /\b(\d{1,2}):(\d{2})\s*(am|pm)\b/i,
    // "9 am" — just hour and period
    /\b(\d{1,2})\s+(am|pm)\b/i,
    // "9:05" — no period
    /\b(\d{1,2}):(\d{2})\b/,
  ];

  for (const pat of patterns) {
    const m = t.match(pat);
    if (!m) continue;

    const hours = parseInt(m[1]);
    // m[2] could be minutes OR am/pm depending on pattern
    const m2lower = (m[2] || '').toLowerCase();
    const mins = /^\d+$/.test(m2lower) ? parseInt(m[2]) : 0;
    const ampm = /^(am|pm)$/.test(m2lower)
      ? m2lower
      : (m[3] || '').toLowerCase();

    if (hours < 1 || hours > 12) continue;
    if (mins < 0 || mins > 59) continue;

    // convert to 24h
    let h24 = hours;
    if (ampm === 'pm' && h24 !== 12) h24 += 12;
    if (ampm === 'am' && h24 === 12) h24 = 0;

    // return clean HH:MM — only two parts, no seconds
    return `${String(h24).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  return null;
};

// Convert "HH:MM" (24h storage) → "9:30 AM" (12h display)
const to12hDisplay = (time24: string) => {
  if (!time24) return '';
  // take only first two colon-parts (HH:MM)
  const parts = String(time24).split(':');
  const h = parseInt(parts[0]) || 0;
  const m = parseInt(parts[1]) || 0;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

// Extract label from voice text after removing time words
const extractLabel = (text: string) => {
  let t = text.toLowerCase();
  // remove trigger phrases
  t = t.replace(/set\s+alarm|alarm\s+for|alarm\s+at|remind\s+me(\s+about)?|reminder(\s+for)?|wake\s+me(\s+up)?(\s+at)?/gi, '');
  // remove time expressions
  t = t.replace(/\d{1,2}:\d{2}\s*(am|pm)?/gi, '');
  t = t.replace(/\b\d{1,2}\s*(am|pm|a\.m\.|p\.m\.)/gi, '');
  t = t.replace(/\b(at|for|in|on|every|daily|tomorrow|tonight|morning|evening|night)\b/gi, '');
  t = t.replace(/\b(repeat|repeated|repeating|each)\b/gi, '');
  t = t.replace(/o[''`]?clock/gi, '');
  t = t.trim().replace(/\s+/g, ' ').replace(/^[\s,]+|[\s,]+$/g, '');
  // capitalize first letter
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
};

// Detect repeat pattern from voice text
const extractRepeat = (text: string) => {
  const t = text.toLowerCase();
  if (/every\s+day|daily|each\s+day/.test(t)) return 'daily';
  if (/weekday|week\s+day|monday.+friday/.test(t)) return 'weekdays';
  if (/weekend|saturday|sunday/.test(t)) return 'weekends';
  return 'once';
};


export function VoiceRoutineTab({
  alarms, addAlarm, removeAlarm,
  tasks, addReminder, markDone,
  voiceState, setVoiceState,
  alarmTone
}: VoiceRoutineTabProps) {
  // State from Bug 3 fix
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  // Use voiceState.transcriptHistory as the log
  const recRef = useRef<any>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [tempRoutine, setTempRoutine] = useState<any | null>(null);
  const [fileContent, setFileContent] = useState<string>('');


  // Initialize recognition ONCE
  const initRecognition = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return null;

    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.lang = 'en-IN';

    // After getting final result, pick the alternative
    // that contains a time pattern if possible:
    rec.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          // try all alternatives, pick best one
          let best = event.results[i][0].transcript;
          for (let j = 0; j < event.results[i].length; j++) {
            const alt = event.results[i][j].transcript;
            // prefer alternative that contains a time
            if (/\d/.test(alt) && !/\d/.test(best)) best = alt;
          }
          final += best;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (interim) setTranscript(interim + '...');

      if (final.trim()) {
        setTranscript(final.trim());
        try { rec.stop(); } catch (e) { }
        setListening(false);
        setProcessing(true);
        processVoiceCommand(final.trim());
      }
    };

    rec.onend = () => {
      setListening(false);
    };

    rec.onerror = (event: any) => {
      setListening(false);
      setProcessing(false);
      const errorMessages: any = {
        'not-allowed': '// error: mic permission denied',
        'no-speech': '// no speech detected',
        'audio-capture': '// error: no microphone found',
        'network': '// error: network issue',
        'aborted': '// recognition cancelled',
      };
      const msg = errorMessages[event.error] || `// error: ${event.error}`;
      addToVoiceLog({ role: 'assistant' as const, text: msg });
      try { rec.stop(); } catch (e) { }
    };

    rec.onaudiostart = () => {
      setTranscript('');
    };

    return rec;
  };

  const startListening = () => {
    if (listening || processing) return;
    const rec = initRecognition();
    if (!rec) {
      addToVoiceLog({ role: 'assistant' as const, text: '// error: speech recognition not supported' });
      return;
    }
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
      setTranscript('');
    } catch (e) {
      console.warn('Could not start recognition:', e);
      setListening(false);
    }
  };

  const stopListening = () => {
    try {
      recRef.current?.stop();
      recRef.current?.abort();
    } catch (e) { }
    setListening(false);
    setTranscript('');
  };

  const toggleVoice = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
        recRef.current?.abort();
      } catch (e) { }
    };
  }, []);




  const parseVoiceLocally = (text: string) => {
    const t = text.toLowerCase().trim();

    // ── delete alarm
    if (/delete|remove|cancel/.test(t) && /alarm|reminder/.test(t)) {
      const time24 = parseSpokenTime(t);
      const label = extractLabel(t);
      return {
        action: 'delete_alarm',
        data: { time12: time24 ? to12hDisplay(time24) : '', label },
        confirmation: time24
          ? `Deleting alarm at ${to12hDisplay(time24)}`
          : `Deleting alarm: ${label}`,
        error: null,
      };
    }

    // ── toggle alarm off/on
    if (/turn\s+off|disable|pause|mute/.test(t) && /alarm/.test(t)) {
      const label = extractLabel(t);
      return {
        action: 'toggle_alarm',
        data: { label },
        confirmation: `Toggled alarm: ${label}`,
        error: null,
      };
    }

    // ── list alarms
    if (/what\s+alarm|list\s+alarm|show\s+alarm|my\s+alarm/.test(t)) {
      return {
        action: 'list_alarms',
        data: {},
        confirmation: 'Listing your alarms',
        error: null,
      };
    }

    // ── complete milestone
    const markMatch = t.match(/mark\s+(.+?)\s+(done|complete|finished|as\s+done)/i);
    if (markMatch) {
      const ms = markMatch[1].trim();
      return {
        action: 'complete_milestone',
        data: { milestoneText: ms },
        confirmation: `Marked "${ms}" as done`,
        error: null,
      };
    }

    // ── add task
    if (/add\s+task|create\s+task|new\s+task/.test(t)) {
      const titleMatch = t.match(/(?:add|create|new)\s+task\s+(?:called\s+|named\s+|for\s+)?(.+?)(?:\s+with\s+milestones?\s+(.+))?$/i);
      if (titleMatch) {
        const title = titleMatch[1]?.trim() || 'New Task';
        const msPart = titleMatch[2] || '';
        const milestones = msPart
          ? msPart.split(/,|\band\b/).map(s => s.trim()).filter(Boolean)
          : [];
        return {
          action: 'add_task',
          data: { title, milestones },
          confirmation: `Task created: ${title}`,
          error: null,
        };
      }
    }

    // ── show status
    if (/status|progress|how\s+many|what.s\s+my/.test(t)) {
      return {
        action: 'show_status',
        data: {},
        confirmation: 'Showing current status',
        error: null,
      };
    }

    // ── set alarm (main case)
    const isAlarmCmd = /alarm|remind|reminder|wake|alert|notify/.test(t);
    const time24 = parseSpokenTime(t);

    if (isAlarmCmd && time24) {
      const rawLabel = extractLabel(t) || 'Alarm';
      // Remove any time patterns that leaked into label
      const cleanedLabel = rawLabel
        .replace(/\d{1,2}(:\d{2})+(:\d{2})*\s*(am|pm)?/gi, '')
        .replace(/\b(am|pm)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim() || 'Alarm';

      const repeat = extractRepeat(t);
      return {
        action: 'add_alarm',
        data: {
          time12: to12hDisplay(time24),
          label: cleanedLabel,
          repeat: repeat,
        },
        confirmation: `Alarm set for ${to12hDisplay(time24)}${cleanedLabel !== 'Alarm' ? ' — ' + cleanedLabel : ''}${repeat !== 'once' ? ` (${repeat})` : ''}`,
        error: null,
      };
    }

    // ── time only, assume alarm
    if (time24 && !isAlarmCmd) {
      return {
        action: 'add_alarm',
        data: {
          time12: to12hDisplay(time24),
          label: extractLabel(t) || 'Alarm',
          repeat: extractRepeat(t),
        },
        confirmation: `Alarm set for ${to12hDisplay(time24)}`,
        error: null,
      };
    }

    return null; // could not parse locally
  };

  const processVoiceCommand = async (rawText: string) => {
    // normalize and log
    const text = rawText.trim();
    addToVoiceLog({ type: 'command', text });

    // ── STEP A: try local parser first (instant, no API needed)
    const localResult = parseVoiceLocally(text);

    // ── STEP B: call AI for better understanding
    let aiResult: any = null;
    try {
      const { aiService } = await import('../services/aiService');
      const res = await aiService.extractTask(text);
      if (res.success && res.extracted) {
        aiResult = {
          action: res.extracted.type === 'alarm' ? 'add_alarm' : 'add_task',
          data: {
            time12: res.extracted.time ? to12hDisplay(res.extracted.time) : '',
            label: res.extracted.label,
            repeat: res.extracted.repeat || 'once',
            title: res.extracted.label,
            milestones: res.extracted.note ? [res.extracted.note] : []
          },
          confirmation: res.extracted.label ? `Extracted: ${res.extracted.label}` : 'Extracted data',
          error: null
        };
      }
    } catch (e: any) {
      console.warn('Voice AI error:', e.message);
    }


    // use AI result if valid, else fall back to local
    const result = (aiResult && aiResult.action && aiResult.action !== 'unknown')
      ? aiResult
      : localResult;

    if (!result) {
      addToVoiceLog({
        type: 'error',
        text: '// could not understand — try: "set alarm 9 AM study C++"',
      });
      setProcessing(false);
      setTranscript('');
      return;
    }

    // execute the action
    executeVoiceAction(result);

    addToVoiceLog({
      type: result.error ? 'error' : 'success',
      text: result.error
        ? `// error: ${result.error}`
        : `> ✓ ${result.confirmation || 'done'}`,
    });

    setProcessing(false);
    setTranscript('');
  };

  const executeVoiceAction = (parsed: any) => {
    if (!parsed || !parsed.action) return;

    switch (parsed.action) {

      case 'add_alarm': {
        const raw12 = (parsed.data?.time12 || '').trim();
        const label = (parsed.data?.label || 'Alarm').trim();
        const repeat = parsed.data?.repeat || 'once';

        if (!raw12) {
          addToVoiceLog({
            type: 'error',
            text: '// error: no time found — say e.g. "alarm 9 AM study"',
          });
          setProcessing(false);
          setTranscript('');
          return;
        }

        const cleanTime24 = (() => {
          let s = raw12.toUpperCase().trim();
          const isPM = s.includes('PM');
          const isAM = s.includes('AM');
          s = s.replace(/AM|PM/gi, '').trim();
          const parts = s.split(':').map((p: any) => p.trim()).filter(Boolean);
          const hh = parseInt(parts[0]) || 0;
          const mm = parseInt(parts[1]) || 0;
          if (hh < 0 || hh > 12) return null;
          if (mm < 0 || mm > 59) return null;
          let hours = hh;
          if (isPM && hours !== 12) hours += 12;
          if (isAM && hours === 12) hours = 0;
          if (!isPM && !isAM) {
              if (hours >= 1 && hours <= 6) hours += 12;
          }
          return `${String(hours).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        })();

        if (!cleanTime24) {
          addToVoiceLog({
            type: 'error',
            text: `// error: could not parse time "${raw12}" — say e.g. "9:30 AM"`,
          });
          setProcessing(false);
          setTranscript('');
          return;
        }

        const cleanLabel = label
          .replace(/\d{1,2}:\d{2}(:\d{2})*(:\d{2})*/g, '')
          .replace(/\b(am|pm|a\.m\.|p\.m\.)\b/gi, '')
          .replace(/\b\d{1,2}\s*(am|pm)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

        addAlarm({
          time: cleanTime24,
          label: cleanLabel || 'Alarm',
          repeat: repeat,
          active: true,
          ringtoneName: 'Default'
        });
        
        playTone(alarmTone?.id || 'beep', alarmTone?.custom || null);

        const displayTime = (() => {
          const [h, m] = cleanTime24.split(':').map(Number);
          const ap = h >= 12 ? 'PM' : 'AM';
          const h12 = h % 12 || 12;
          return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
        })();

        addToVoiceLog({
          type: 'success',
          text: `> ✓ Alarm set for ${displayTime}${cleanLabel && cleanLabel !== 'Alarm' ? ' — ' + cleanLabel : ''}${repeat !== 'once' ? ' (' + repeat + ')' : ''}`,
        });

        break;
      }

      case 'delete_alarm': {
        const time12 = parsed.data?.time12 || '';
        const label = (parsed.data?.label || '').toLowerCase();

        const targets = alarms.filter(a => {
          const matchTime = time12 && to12hDisplay(a.time) === time12;
          const matchLabel = label && a.label.toLowerCase().includes(label);
          return (matchTime || matchLabel);
        });

        if (targets.length === 0) {
          addToVoiceLog({
            type: 'error',
            text: `// no alarm found matching "${time12 || label}"`,
          });
          return;
        }

        targets.forEach(a => removeAlarm(a.id));
        break;
      }

      case 'toggle_alarm': {
        // Toggle feature is usually via toggleAlarm hook, but AI might send direct toggle
        const label = (parsed.data?.label || '').toLowerCase();
        const time12 = parsed.data?.time12 || '';

        const targets = alarms.filter(a => {
          const matchLabel = label && a.label.toLowerCase().includes(label);
          const matchTime = time12 && to12hDisplay(a.time) === time12;
          return (matchLabel || matchTime);
        });

        targets.forEach(a => addAlarm({ id: a.id, active: !a.active } as any));
        break;
      }

      case 'list_alarms': {
        if (alarms.length === 0) {
          addToVoiceLog({ type: 'info', text: '> no alarms set' });
          return;
        }
        alarms
          .filter(a => a.active)
          .sort((a, b) => a.time.localeCompare(b.time))
          .forEach(a => {
            addToVoiceLog({
              type: 'info',
              text: `> ${to12hDisplay(a.time)} — ${a.label || 'no label'} (${a.repeat})`,
            });
          });
        break;
      }

      case 'add_task': {
        const title = parsed.data?.title || 'Voice Task';
        const milestones = parsed.data?.milestones || [];
        const newTask: Partial<Task> = {
          title,
          description: '',
          milestones: milestones.map((t: string, i: number) => ({ id: 'ms_' + i, text: t, done: false })),
          createdAt: Date.now(),
        };
        addReminder(newTask);
        playTone('gentle');
        break;
      }

      case 'complete_milestone': {
        const keyword = (parsed.data?.milestoneText || '').toLowerCase();
        if (!keyword) return;

        tasks.forEach(task => {
            task.milestones.forEach(m => {
                if (m.text.toLowerCase().includes(keyword)) {
                    // This is a bit tricky with the new hook, we might need a specific 'toggleMilestone' in useReminders
                    // But for now let's just mark the reminder as done if it matches or something similar.
                    // Actually, let's assume one roadmap per topic.
                    markDone(task.id, true);
                }
            });
        });
        playTone('gentle');
        break;
      }

      case 'show_status': {
        const active = alarms.filter(a => a.active).length;
        const total = tasks.length;
        const done = tasks.reduce((s, t) => s + (t.milestones?.filter(m => m.done).length || 0), 0);
        const allMs = tasks.reduce((s, t) => s + (t.milestones?.length || 0), 0);
        const nextAlm = [...alarms]
          .filter(a => a.active)
          .sort((a, b) => a.time.localeCompare(b.time))[0];
        addToVoiceLog({
          type: 'info',
          text: `> ${active} active alarms | ${total} roadmaps | ${done}/${allMs} milestones done${nextAlm ? ` | next: ${to12hDisplay(nextAlm.time)}` : ''}`,
        });
        break;
      }


      default:
        break;
    }
  };

  const addToVoiceLog = (entry: any) => {
    setVoiceState(prev => ({
      ...prev,
      transcriptHistory: [
        { ...entry, timestamp: Date.now() },
        ...prev.transcriptHistory,
      ].slice(0, 10)
    }));
  };

  const handleRoutineUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScrubbing(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target?.result as string;
      setFileContent(content);
      
      try {
        const { aiService } = await import('../services/aiService');
        const res = await aiService.extractTask(content);
        
        if (res.success && res.extracted) {
          const extracted = res.extracted;
          // Show extracted tasks by creating a routine from the result
          // If the AI returns steps/milestones, use them, otherwise use the note or label
          const newRoutine = {
            name: file.name,
            steps: [] as any[]
          };

          if (extracted.steps) {
            newRoutine.steps = extracted.steps.map((s: any, i: number) => ({
              id: 'step_' + i,
              label: s.label || s.text,
              time: s.time || '08:00'
            }));
          } else if (extracted.note) {
            // Split note into lines as milestones if it's multiple lines
            newRoutine.steps = extracted.note.split('\n').filter(Boolean).map((line: string, i: number) => ({
              id: 'step_' + i,
              label: line.trim(),
              time: extracted.time || '08:00'
            }));
          } else {
            newRoutine.steps = [{
              id: 'step_0',
              label: extracted.label || 'Extracted Task',
              time: extracted.time || '08:00'
            }];
          }

          setTempRoutine(newRoutine);
        }
      } catch (err) {
        console.error('File scan error:', err);
        alert("Failed to scan file");
      } finally {
        setIsScrubbing(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fade-up" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', width: '100%', height: '100%', overflowY: 'auto' }}>

      <div style={{ height: '2px', background: 'linear-gradient(90deg, var(--green), var(--yellow))', marginBottom: '24px', borderRadius: '1px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* VOICE SECTION */}
        <div style={{ backgroundColor: 'var(--bg2)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div className="syntax-purple" style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '20px', letterSpacing: '0.1em' }}>
            {">"} VOICE_ENGINE
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
            <div
              onClick={toggleVoice}
              style={{
                width: 80, height: 80,
                borderRadius: '50%',
                border: `2px solid ${listening ? '#d2a8ff' :
                    processing ? '#58a6ff' :
                      '#484f58'
                  }`,
                background:
                  listening ? '#d2a8ff18' :
                    processing ? '#58a6ff18' :
                      '#1c2128',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: listening || processing ? 'default' : 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                animation: listening
                  ? 'voicePulse 0.8s ease-in-out infinite'
                  : 'none',
              }}
            >
              {/* pulse ring when listening */}
              {listening && (
                <div style={{
                  position: 'absolute',
                  inset: -8,
                  borderRadius: '50%',
                  border: '2px solid #d2a8ff',
                  animation: 'pulseRing 1.2s ease-out infinite',
                }} />
              )}

              <span style={{ fontSize: '2rem' }}>
                {processing ? '⏳' : listening ? '🎙️' : '🎙️'}
              </span>
            </div>

            {/* status text below button */}
            <div style={{
              color: listening ? '#d2a8ff' :
                processing ? '#58a6ff' :
                  '#484f58',
              fontSize: '0.7rem',
              letterSpacing: '0.16em',
              marginTop: '0.75rem',
              fontFamily: 'JetBrains Mono, monospace',
              textAlign: 'center',
            }}>
              {listening ? 'LISTENING...' :
                processing ? 'PROCESSING...' :
                  'TAP TO SPEAK'}
              {(listening || processing) && (
                <span style={{ animation: 'blink 1s step-end infinite' }}>▋</span>
              )}
            </div>

            <div style={{
              background: '#161b22', // C.bg2
              border: `1px solid #30363d`, // C.border
              borderRadius: 8,
              padding: '0.85rem 1rem',
              marginTop: '1rem',
              fontFamily: 'JetBrains Mono, monospace', // F
            }}>
              <div style={{
                color: '#484f58', // C.muted
                fontSize: '0.58rem',
                letterSpacing: '0.2em',
                marginBottom: '0.65rem',
              }}>
                // COMMAND EXAMPLES — always speak in 12h format
              </div>
              {[
                ['set alarm', '"set alarm 9 AM study C++"'],
                ['with repeat', '"alarm 7:30 AM daily wake up"'],
                ['reminder', '"remind me about DBMS at 3:30 PM"'],
                ['noon/midnight', '"set alarm noon" or "alarm midnight"'],
                ['delete', '"delete my 9 AM alarm"'],
                ['list', '"what alarms do I have"'],
                ['mark done', '"mark pointers done"'],
                ['add task', '"add task learn react with hooks routing"'],
                ['status', '"what is my status"'],
              ].map(([cmd, ex]) => (
                <div key={cmd} style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginBottom: '0.35rem',
                  alignItems: 'flex-start',
                }}>
                  <span style={{
                    color: '#484f58', // C.muted
                    fontSize: '0.6rem',
                    minWidth: 70,
                    flexShrink: 0,
                    paddingTop: '0.05rem',
                  }}>
                    {cmd}
                  </span>
                  <span style={{
                    color: '#e3b341', // C.yellow
                    fontSize: '0.68rem',
                    fontStyle: 'italic',
                  }}>
                    {ex}
                  </span>
                </div>
              ))}
            </div>

            {/* live transcript */}
            {transcript && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.5rem 1rem',
                background: '#161b22', // C.bg2
                border: `1px solid #3d444d`, // C.border2
                borderRadius: 8,
                fontFamily: 'JetBrains Mono, monospace', // F
                textAlign: 'center',
                maxWidth: 420,
              }}>
                <div style={{
                  color: '#484f58', // C.muted
                  fontSize: '0.56rem',
                  letterSpacing: '0.14em',
                  marginBottom: '0.2rem',
                }}>
                  // heard
                </div>
                <div style={{ color: '#e3b341', fontSize: '0.82rem' }}>
                  "{transcript}"
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            {fileContent && (
              <div className="syntax-comment" style={{ fontSize: '10px', marginBottom: '8px', opacity: 0.6 }}>
                // LAST_LOADED_FILE: {fileContent.length} bytes processed
              </div>
            )}
            <div className="syntax-dim" style={{ fontSize: '11px', marginBottom: '10px' }}>COMMAND_HISTORY (tail -n 3)</div>
            {voiceState.transcriptHistory.slice(0, 3).map((t: any, i: number) => (
              <div key={i} style={{ fontSize: '13px', marginBottom: '6px' }}>
                <span className="syntax-comment">$ </span>
                <span className="syntax-text">
                  {t.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ROUTINE SECTION */}
        <div style={{ backgroundColor: 'var(--bg2)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div className="syntax-purple" style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '20px', letterSpacing: '0.1em' }}>
            {">"} ROUTINE_PLANNER
          </div>

          {!tempRoutine && !isScrubbing && (
            <label
              htmlFor="routine-upload"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '160px', border: '2px dashed var(--border)', borderRadius: '8px', cursor: 'pointer',
                backgroundColor: 'rgba(255,255,255,0.02)'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--yellow)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
              <div style={{ fontSize: '14px', color: 'var(--yellow)' }}>Upload Schedule</div>
              <div className="syntax-comment" style={{ fontSize: '11px', marginTop: '4px' }}>PDF, IMAGE, TXT</div>
              <input type="file" id="routine-upload" style={{ display: 'none' }} accept=".txt,.pdf,.md,.doc,.docx" onChange={handleRoutineUpload} />
            </label>
          )}

          {isScrubbing && (
            <div style={{ height: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div className="blink" style={{ fontSize: '40px', marginBottom: '16px' }}>🤖</div>
              <div className="syntax-keyword" style={{ fontSize: '13px' }}>Scrubbing routine data...</div>
            </div>
          )}

          {tempRoutine && !isScrubbing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="syntax-green" style={{ fontSize: '12px' }}>✓ ACTIVE_ROUTINE</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const items = tempRoutine.items || tempRoutine.steps || [];
                      items.forEach((it: any) => {
                        addAlarm({
                          time: it.time,
                          label: it.activity || it.label || 'Routine Task',
                          active: true,
                          ringtoneName: 'Default'
                        });
                      });
                      alert(`Synced ${items.length} routine items to alarms.`);
                    }}
                    style={{ color: 'var(--blue)', fontSize: '11px', border: '1px solid var(--blue)', padding: '2px 6px', borderRadius: '4px' }}
                  >
                    [sync_alarms]
                  </button>
                  <button onClick={() => setTempRoutine(null)} style={{ color: 'var(--muted)', fontSize: '11px' }}>[clr]</button>
                </div>
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                {(tempRoutine?.items || tempRoutine?.steps || [])?.map((item: any, idx: number) => (
                  <div key={item.id || idx} style={{ display: 'flex', gap: '12px', padding: '6px 0', borderBottom: '1px solid var(--bg4)', fontSize: '13px' }}>
                    <span className="syntax-orange" style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{item.time}</span>
                    <span className="syntax-text" style={{ flex: 1 }}>{item.activity || item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
