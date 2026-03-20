import { useState, useRef, useEffect } from 'react';
import type { Task, Alarm } from '../types';
import { askAnthropic } from '../services/ai';
import { C } from '../appShared';

const F = "'JetBrains Mono', monospace";
const tCol = (i: number) => [C.blue, C.purple, C.cyan, C.orange, C.green, C.yellow][i % 6];

interface AITabProps {
  alarms: Alarm[];
  addAlarm: (data: Partial<Alarm>) => Promise<void>;
  tasks: Task[];
  addReminder: (data: Partial<Task | any>) => Promise<void>;
  markDone: (id: string, done: boolean) => Promise<void>;
  selectedTaskIds?: Set<string>;
  onSelectedTaskIdsChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AISession {
  id: string;
  topic: string;
  messages: Message[];
  linkedTaskId?: string;
}

function TaskMiniCard({ task, idx, selected, onToggle, onAsk }: any) {
  const done  = task.milestones.filter((m: any) => m.done).length;
  const total = task.milestones.length;
  const pct   = total > 0 ? Math.round(done / total * 100) : 0;
  const col   = tCol(idx);
  const next  = task.milestones.find((m: any) => !m.done);

  return (
    <div
      onClick={onToggle}
      style={{
        background:  selected ? C.bg2 : C.bg,
        border:      `1px solid ${selected ? col + '55' : C.border}`,
        borderLeft:  `3px solid ${selected ? col : C.muted}`,
        borderRadius:'0 8px 8px 0',
        padding:     '0.65rem 0.85rem',
        cursor:      'pointer',
        transition:  'all 0.2s',
        animation:   'slideIn 0.2s ease',
        minWidth:    0,
      }}
    >
      {/* top row: checkbox + title + pct */}
      <div style={{
        display:     'flex',
        alignItems:  'center',
        gap:         8,
        marginBottom: next && selected ? '0.4rem' : 0,
      }}>
        {/* checkbox */}
        <div style={{
          width:       15,
          height:      15,
          borderRadius:3,
          border:      `1.5px solid ${selected ? col : C.muted}`,
          background:  selected ? col + '22' : 'transparent',
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'center',
          fontSize:    '0.58rem',
          color:       col,
          flexShrink:  0,
          transition:  'all 0.2s',
        }}>
          {selected ? '✓' : ''}
        </div>

        {/* title */}
        <span style={{
          color:        selected ? C.text : C.dim,
          fontSize:     '0.76rem',
          fontWeight:   selected ? 600 : 400,
          flex:         1,
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          fontFamily:   F,
        }}>
          {task.title}
        </span>

        {/* percent */}
        <span style={{
          color:      selected ? col : C.muted,
          fontSize:   '0.65rem',
          fontWeight: 700,
          flexShrink: 0,
          fontFamily: F,
        }}>
          {pct}%
        </span>
      </div>

      {/* 6-block progress bar */}
      <div style={{
        height:       2,
        background:   C.bg3,
        borderRadius: 1,
        marginBottom: next && selected ? '0.4rem' : 0,
        overflow:     'hidden',
      }}>
        <div style={{
          height:     '100%',
          width:      `${pct}%`,
          background: col,
          borderRadius: 1,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* next milestone + ask AI — only when selected */}
      {selected && next && (
        <div style={{
          display:     'flex',
          alignItems:  'center',
          gap:         6,
          marginTop:   '0.1rem',
        }}>
          <span style={{
            color:    C.muted,
            fontSize: '0.58rem',
            flexShrink: 0,
          }}>
            next→
          </span>
          <span style={{
            color:        C.dim,
            fontSize:     '0.65rem',
            flex:         1,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            fontFamily:   F,
          }}>
            {next.text.length > 55
              ? next.text.slice(0, 55) + '...'
              : next.text}
          </span>
          <span
            onClick={e => {
              e.stopPropagation();
              onAsk(`I just finished "${next.text}" for "${task.title}". What should I do next?`);
            }}
            style={{
              color:        col,
              fontSize:     '0.58rem',
              cursor:       'pointer',
              padding:      '1px 6px',
              border:       `1px solid ${col}44`,
              borderRadius: 10,
              flexShrink:   0,
              transition:   'all 0.2s',
              whiteSpace:   'nowrap',
            }}
            onMouseEnter={e => e.currentTarget.style.background = col + '18'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            ask AI
          </span>
        </div>
      )}
    </div>
  );
}

function SessionPanel({
  tasks, selectedIds, onToggle,
  onSelectAll, onClear, open, onOpenToggle, onAsk
}: any) {
  const selCount  = selectedIds.size;
  const selTasks  = tasks.filter((t: any) => selectedIds.has(t.id));
  const totalDone = selTasks.reduce(
    (s: any, t: any) => s + t.milestones.filter((m: any) => m.done).length, 0
  );
  const totalMs   = selTasks.reduce(
    (s: any, t: any) => s + t.milestones.length, 0
  );
  const overallPct = totalMs > 0
    ? Math.round(totalDone / totalMs * 100)
    : 0;

  return (
    <div style={{
      background:   C.bg2,
      border:       `1px solid ${C.border}`,
      borderRadius: 10,
      marginBottom: '0.85rem',
      overflow:     'hidden',
    }}>

      {/* ── header bar ── */}
      <div
        onClick={onOpenToggle}
        style={{
          padding:      '0.6rem 0.85rem',
          display:      'flex',
          alignItems:   'center',
          gap:          8,
          cursor:       'pointer',
          background:   C.bg3,
          borderBottom: open ? `1px solid ${C.border}` : 'none',
          userSelect:   'none',
        }}
      >
        {/* SESSION label */}
        <span style={{
          color:         C.muted,
          fontSize:      '0.56rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          flexShrink:    0,
        }}>
          SESSION
        </span>

        {/* status text */}
        <span style={{
          color:      selCount > 0 ? C.text : C.muted,
          fontSize:   '0.72rem',
          fontWeight: selCount > 0 ? 600 : 400,
          flex:       1,
        }}>
          {selCount > 0
            ? `${selCount} task${selCount > 1 ? 's' : ''} active`
            : 'no tasks selected'
          }
        </span>

        {/* combined progress when tasks selected */}
        {selCount > 0 && totalMs > 0 && (
          <>
            <span style={{
              color:    C.dim,
              fontSize: '0.65rem',
            }}>
              · {totalDone}/{totalMs}
            </span>
            <div style={{
              width:        60,
              height:       3,
              background:   C.bg,
              borderRadius: 2,
              overflow:     'hidden',
            }}>
              <div style={{
                height:     '100%',
                width:      `${overallPct}%`,
                background: C.blue,
                borderRadius: 2,
                transition: 'width 0.4s',
              }} />
            </div>
          </>
        )}

        {/* right controls */}
        <div style={{
          display:    'flex',
          gap:        6,
          alignItems: 'center',
          marginLeft: 'auto',
          flexShrink: 0,
        }}>
          {tasks.length > 0 && (
            <span
              onClick={e => { e.stopPropagation(); onSelectAll(); }}
              style={{
                color:         C.blue,
                fontSize:      '0.6rem',
                cursor:        'pointer',
                padding:       '2px 8px',
                border:        `1px solid ${C.blue}33`,
                borderRadius:  10,
                letterSpacing: '0.06em',
                transition:    'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.blue + '18'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              all
            </span>
          )}
          {selCount > 0 && (
            <span
              onClick={e => { e.stopPropagation(); onClear(); }}
              style={{
                color:        C.muted,
                fontSize:     '0.6rem',
                cursor:       'pointer',
                padding:      '2px 8px',
                border:       `1px solid ${C.border}`,
                borderRadius: 10,
                transition:   'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg4}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              clear
            </span>
          )}
          <span style={{
            color:    C.muted,
            fontSize: '0.7rem',
          }}>
            {open ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* ── open body ── */}
      {open && (
        <div style={{ padding: '0.75rem' }}>

          {/* no tasks at all */}
          {tasks.length === 0 && (
            <div style={{
              color:      C.muted,
              fontSize:   '0.75rem',
              textAlign:  'center',
              padding:    '1rem',
              fontFamily: F,
            }}>
              // no tasks yet — go to Tasks tab to create some
            </div>
          )}

          {tasks.length > 0 && (
            <>
              {/* quick prompts — only when tasks selected */}
              {selCount > 0 && (
                <div style={{
                  display:       'flex',
                  flexWrap:      'wrap',
                  gap:           '0.4rem',
                  marginBottom:  '0.75rem',
                }}>
                  {[
                    'Plan my day across all selected tasks',
                    "What's blocking my progress?",
                    'Build a time-blocked schedule for today',
                    'Which task needs most attention?',
                    'Suggest smart alarm times for my tasks',
                  ].map(p => (
                    <button
                      key={p}
                      onClick={() => onAsk(p)}
                      style={{
                        background:    C.bg3,
                        border:        `1px solid ${C.border2}`,
                        borderRadius:  20,
                        color:         C.dim,
                        padding:       '0.28rem 0.75rem',
                        fontSize:      '0.62rem',
                        cursor:        'pointer',
                        fontFamily:    F,
                        transition:    'all 0.2s',
                        whiteSpace:    'nowrap',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = C.blue;
                        e.currentTarget.style.color       = C.blue;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = C.border2;
                        e.currentTarget.style.color       = C.dim;
                      }}
                    >
                      $ {p}
                    </button>
                  ))}
                </div>
              )}

              {/* task cards grid */}
              <div style={{
                display:               'grid',
                gridTemplateColumns:   'repeat(auto-fill, minmax(200px, 1fr))',
                gap:                   '0.5rem',
              }}>
                {tasks.map((t: any, i: any) => (
                  <TaskMiniCard
                    key={t.id}
                    task={t}
                    idx={i}
                    selected={selectedIds.has(t.id)}
                    onToggle={() => onToggle(t.id)}
                    onAsk={(p: any) => { onAsk(p); }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function AITab({ 
  alarms, addAlarm, 
  tasks, addReminder, markDone, 
  selectedTaskIds = new Set(),
  onSelectedTaskIdsChange 
}: AITabProps) {
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [internalIds, setInternalIds] = useState(new Set<string>());
  const [attachments, setAttachments] = useState<any[]>([]);

  const selectedIds = selectedTaskIds || internalIds;
  const setSelectedIds = onSelectedTaskIdsChange || setInternalIds;

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const activeTasks = tasks.filter(t => selectedIds.has(t.id));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession?.messages, isLoading]);

  const startNewSession = (topic = 'New Session', taskId?: string) => {
    const id = 'sess_' + Date.now();
    const newSess: AISession = { id, topic, messages: [], linkedTaskId: taskId };
    setSessions(prev => [newSess, ...prev]);
    setActiveSessionId(id);
  };

  const handleSend = async (overrideInput?: string) => {
    const currentInput = overrideInput || input;
    if (!currentInput.trim() || !activeSessionId) return;

    const userMsg: Message = { role: 'user', content: currentInput };
    if (!overrideInput) setInput('');
    setIsLoading(true);

    setSessions(prev => prev.map(s => 
      s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg] } : s
    ));

    try {
      const allTasksContext = tasks.map((t, i) => ({
        id:    t.id,
        title: t.title,
        color: ['blue','purple','cyan','orange','green','yellow'][i % 6],
        inSession: selectedIds.has(t.id),
        totalMilestones:    t.milestones.length,
        completedCount:     t.milestones.filter(m => m.done).length,
        progressPercent:    t.milestones.length > 0
          ? Math.round(t.milestones.filter(m=>m.done).length / t.milestones.length * 100)
          : 0,
        // include full milestone text for detailed advice
        completedMilestones: t.milestones
          .filter(m => m.done)
          .map(m => m.text),
        remainingMilestones: t.milestones
          .filter(m => !m.done)
          .map(m => m.text),
        nextMilestone: t.milestones.find(m => !m.done)?.text || null,
      }));

      const contextPrompt = `You are the ARC AI Manager. 
      ALL TASKS: ${JSON.stringify(allTasksContext)}
      ACTIVE ALARMS: ${JSON.stringify(alarms.filter(a => a.active))}
      User is asking about: ${currentInput}`;

      const response = await askAnthropic(currentInput, contextPrompt, attachments);
      const assistantMsg: Message = { role: 'assistant', content: response };

      // ── AUTO-EXECUTE AI ACTIONS ──
      try {
        // Look for arc-create blocks
        const createMatch = response.match(/```arc-create\n([\s\S]*?)\n```/);
        if (createMatch) {
          const data = JSON.parse(createMatch[1]);
          if (data.alarms) {
            data.alarms.forEach((a: any) => addAlarm({ ...a, active: true }));
          }
          if (data.tasks) {
            data.tasks.forEach((t: any) => addReminder({ ...t }));
          }
        }

        // Look for arc-update blocks
        const updateMatch = response.match(/```arc-update\n([\s\S]*?)\n```/);
        if (updateMatch) {
          const data = JSON.parse(updateMatch[1]);
          if (data.taskId && data.completeMilestones) {
            // mark as done if milestones are finished
            markDone(data.taskId, true);
          }
        }
      } catch (e) {
        console.warn('AI execution error:', e);
      }

      setSessions(prev => prev.map(s => 
        s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s
      ));
      setAttachments([]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    setSelectedIds((prev: Set<string>) => {
      const next = new Set<string>(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fade-up" style={{ display: 'flex', height: '100%', backgroundColor: 'var(--bg)' }}>
      
      {/* SESSION SIDEBAR */}
      <div style={{ width: '280px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg2)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.1em' }}>THREADS</span>
          <button onClick={() => startNewSession()} style={{ color: 'var(--blue)', fontSize: '18px', padding: 0, minWidth: 30, minHeight: 30 }}>+</button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {sessions.length === 0 && (
            <div style={{ padding: '12px', color: 'var(--dim)', fontSize: '11px', textAlign: 'center', fontFamily: F }}>
               // no threads found
            </div>
          )}
          {sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => setActiveSessionId(s.id)}
              style={{ 
                padding: '10px 12px', cursor: 'pointer', borderRadius: '4px', marginBottom: '4px',
                backgroundColor: activeSessionId === s.id ? 'var(--bg3)' : 'transparent',
                border: activeSessionId === s.id ? '1px solid var(--border)' : '1px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: '13px', color: activeSessionId === s.id ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: F }}>
                {s.topic}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        
        {/* Chat Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg3)', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: F }}>
            <span className="syntax-keyword">agent</span>.<span className="syntax-function">repl</span>
            <span className="syntax-dim"> --session:</span> {activeSession?.topic || 'idle'}
          </div>
        </div>

        {/* Scrollable Messages Area */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px', position: 'relative' }}>
          
          <SessionPanel 
            tasks={tasks}
            selectedIds={selectedIds}
            onToggle={handleToggle}
            onSelectAll={() => setSelectedIds(new Set(tasks.map(t => t.id)))}
            onClear={() => setSelectedIds(new Set())}
            open={panelOpen}
            onOpenToggle={() => setPanelOpen(!panelOpen)}
            onAsk={handleSend}
          />

          {!activeSessionId && (
            <div style={{ height: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--dim)' }}>
               <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🤖</div>
               <div style={{ fontSize: '14px', fontFamily: F }}>Select a thread to start session</div>
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {activeSession?.messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px', textAlign: m.role === 'user' ? 'right' : 'left' }}>
                  {m.role === 'user' ? 'ME@ARC' : 'ARC_AI'}
                </div>
                <div style={{ 
                  padding: '12px 16px', borderRadius: '8px', 
                  backgroundColor: m.role === 'user' ? 'var(--bg4)' : 'var(--bg2)',
                  border: `1px solid ${m.role === 'user' ? 'var(--border2)' : 'var(--border)'}`,
                  fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap', color: 'var(--text)'
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>ARC_AI</div>
                <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
                   <span className="blink">▉</span>
                   <span style={{
                    color:    C.muted,
                    fontSize: '0.68rem',
                    marginLeft: 6,
                  }}>
                    {attachments.length > 0
                      ? 'analyzing file...'
                      : activeTasks.length > 1
                        ? `coordinating ${activeTasks.length} tasks...`
                        : activeTasks.length === 1
                          ? `working on ${activeTasks[0].title.slice(0, 20)}...`
                          : 'thinking...'
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Bar */}
        {activeSessionId && (
          <div style={{ padding: '20px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg2)' }}>
            <div style={{ position: 'relative', display: 'flex', gap: '12px' }}>
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={
                  activeTasks.length > 1
                    ? `ask about ${activeTasks.map(t => t.title.split(' ')[0]).join(', ')}...`
                    : activeTasks.length === 1
                      ? `ask about ${activeTasks[0].title}...`
                      : attachments.length > 0
                        ? 'press ⏎ to analyze attached file...'
                        : 'ask anything or select tasks above...'
                }
                disabled={isLoading}
                style={{ flex: 1, padding: '12px 16px', backgroundColor: 'var(--bg)', border: '1px solid var(--border2)', fontSize: '14px', fontFamily: F }}
              />
              <button 
                onClick={() => handleSend()}
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: isLoading
                    ? C.muted
                    : activeTasks.length > 1
                      ? C.purple
                      : activeTasks.length === 1
                        ? C.blue
                        : attachments.length > 0
                          ? C.cyan
                          : C.blue,
                  color: 'white', fontWeight: 'bold', 
                  borderRadius: '4px', opacity: (isLoading || (!input.trim() && attachments.length === 0)) ? 0.5 : 1, transition: 'all 0.2s', fontFamily: F
                }}
              >
                SEND
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
