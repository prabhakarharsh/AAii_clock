import { useState, useMemo } from 'react';
import type { Alarm, Task, Milestone } from '../types';
import { C } from '../appShared';

interface TasksTabProps {
  tasks: Task[];
  addReminder: (data: Partial<Task | any>) => Promise<void>;
  updateTask?: (id: string, updates: Partial<Task>) => Promise<void>;
  markDone: (id: string, done: boolean) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  onAddAlarm: (data: any) => Promise<void>;
}

export function TasksTab({ 
  tasks, addReminder, updateTask, removeReminder, 
  onAddAlarm 
}: TasksTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, in-progress, completed, todo
  const [sortType, setSortType] = useState('newest'); // newest, progress-asc, progress-desc, title
  
  // Form state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [milestonesText, setMilestonesText] = useState('');
  const [extractedAlarms, setExtractedAlarms] = useState<Partial<Alarm>[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanFile, setScanFile] = useState<any>(null);
  const [scanLog, setScanLog] = useState('');

  const setForm = (f: { title: string, description: string, milestones: string }) => {
    setTitle(f.title);
    setDesc(f.description);
    setMilestonesText(f.milestones);
  }

  const IMG_T = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
  ];

  const resetForm = () => {
    setTitle('');
    setDesc('');
    setMilestonesText('');
    setExtractedAlarms([]);
    setShowForm(false);
    setIsScanning(false);
    setScanning(false);
    setScanFile(null);
    setScanLog('');
  };

  const handleManualClick = () => {
    resetForm();
    setShowForm(true);
  };

  const handleScanFile = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const file = files[0];
    if (!file) return;

    // show form immediately with loading state
    setShowForm(true);
    setScanning(true);
    setScanFile({
      name:       file.name,
      type:       file.type,
      previewUrl: IMG_T.includes(file.type)
                    ? URL.createObjectURL(file)
                    : null,
    });
    setScanLog('> Reading file...');

    // reset form while scanning
    setForm({ title: '', description: '', milestones: '' });

    // ── STEP A: read file ──────────────────────────
    let base64 = '';
    try {
      setScanLog('> Converting file...');
      base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res((r.result as string).split(',')[1]);
        r.onerror = () => rej(new Error('FileReader failed'));
        r.readAsDataURL(file);
      });

      // Note: we don't need plain text separately; we always send base64 payload to the AI layer.
    } catch (e: any) {
      setScanLog(`// error reading file: ${e.message}`);
      setScanning(false);
      return;
    }

    try {
      const { aiService } = await import('../services/aiService');
      const res = await aiService.extractRoadmapFromFile({
        name: file.name,
        type: file.type || 'text/plain',
        content: `data:${file.type || 'text/plain'};base64,${base64}`,
      });

      if (!res.success || !res.extracted) {
        setScanLog('// warning: no milestones extracted — try a different file');
        return;
      }

      const parsed = res.extracted;
      const nextTitle = (parsed.title || file.name.replace(/\.[^.]+$/, '')).trim();
      const nextDesc = (parsed.description || '').trim();
      const milestones = Array.isArray(parsed.milestones)
        ? parsed.milestones.map((m: any) => String(m).trim()).filter(Boolean)
        : [];

      if (milestones.length === 0) {
        setScanLog('// warning: no milestones extracted — try a different file');
        return;
      }

      setTitle(nextTitle);
      setDesc(nextDesc);
      setMilestonesText(milestones.join('\n'));
      
      setExtractedAlarms([]);
      setScanLog(`> ✓ Extracted ${milestones.length} milestones from "${file.name}"`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setScanLog(`// scan failed: ${message}`);
      console.error('Scan file error:', err);
    } finally {
      setScanning(false);
    }
  };


  const saveTask = async () => {
    if (!title) return;
    
    const lines = milestonesText.split('\n').map(l => l.trim()).filter(l => l);
    const ms: Milestone[] = lines.map(text => ({
      id: 'ms_' + Date.now() + Math.random().toString(36).slice(2,5),
      text,
      done: false
    }));

    const newTask: Partial<Task> = {
      title,
      description: desc,
      milestones: ms,
      createdAt: Date.now()
    };

    await addReminder(newTask);

    // notify parent to select this task in AI session - we might need the ID back from backend
    // but for now we'll just skip it or use a temporary one if possible.

    // Save extracted alarms
    if (extractedAlarms.length > 0) {
      extractedAlarms.forEach(a => {
        onAddAlarm({
          time: a.time || '00:00',
          label: a.label || 'Alarm',
          repeat: 'once' as const,
          active: true,
          ringtoneName: 'Default'
        });
      });
      alert(`✓ Created ${extractedAlarms.length} related alarms.`);
    }

    resetForm();
  };

  const toggleMilestone = async (taskId: string, msId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !updateTask) return;

    const newMilestones = task.milestones.map(m => 
      m.id === msId ? { ...m, done: !m.done } : m
    );

    await updateTask(taskId, { milestones: newMilestones });
  };

  const deleteTask = async (taskId: string) => {
    await removeReminder(taskId);
  };

  const addMilestoneInline = async (taskId: string, text: string) => {
    if (!text.trim()) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || !updateTask) return;

    const newMs: Milestone = {
      id: 'ms_' + Date.now(),
      text: text.trim(),
      done: false
    };

    await updateTask(taskId, { milestones: [...task.milestones, newMs] });
  };


  // FILTER & SORT LOGIC
  const filteredTasks = useMemo(() => {
    const result = tasks.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.milestones.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchSearch) return false;

      const total = t.milestones.length;
      const done = t.milestones.filter(m => m.done).length;
      
      if (filterType === 'completed') return total > 0 && done === total;
      if (filterType === 'in-progress') return done > 0 && done < total;
      if (filterType === 'todo') return done === 0;
      return true;
    });

    result.sort((a, b) => {
      if (sortType === 'title') return a.title.localeCompare(b.title);
      if (sortType === 'newest') return b.createdAt - a.createdAt;
      
      const getPct = (t: Task) => t.milestones.length === 0 ? 0 : (t.milestones.filter(m => m.done).length / t.milestones.length);
      if (sortType === 'progress-asc') return getPct(a) - getPct(b);
      if (sortType === 'progress-desc') return getPct(b) - getPct(a);
      return 0;
    });

    return result;
  }, [tasks, searchQuery, filterType, sortType]);

  return (
    <div className="fade-up" style={{ padding: '24px', maxWidth: '760px', margin: '0 auto', width: '100%', height: '100%', overflowY: 'auto' }}>
      
      {/* 2px purple gradient top accent */}
      <div style={{ height: '2px', background: 'linear-gradient(90deg, var(--purple), var(--cyan))', marginBottom: '24px', borderRadius: '1px' }} />

      {/* TOP ACTION BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
        <button 
          onClick={handleManualClick}
          style={{
            border: '1px dashed var(--border2)',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'left',
            color: 'var(--text)',
            backgroundColor: 'rgba(255,255,255,0.02)'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}
        >
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>✏️ Manual</div>
          <div className="syntax-comment" style={{ fontSize: '12px' }}>$ touch roadmap.md // create goal</div>
        </button>

        <label
          htmlFor="task-scan-input-v2"
          style={{ cursor: 'pointer', display: 'block' }}
          onDragOver={e => {
            e.preventDefault();
            e.currentTarget.style.background = 'rgba(210, 168, 255, 0.12)';
          }}
          onDragLeave={e => {
            e.currentTarget.style.background = 'transparent';
          }}
          onDrop={e => {
            e.preventDefault();
            e.currentTarget.style.background = 'transparent';
            if (e.dataTransfer.files?.length) {
              handleScanFile(e.dataTransfer.files);
            }
          }}
        >
          <input
            id="task-scan-input-v2"
            type="file"
            accept="image/*,.pdf,.txt,.md,.py,.js,.ts,.cpp,.c,.java,.json,.csv,.html,.css,.xlsx,.docx"
            style={{
              position:      'absolute',
              width:         1,
              height:        1,
              opacity:       0,
              pointerEvents: 'none',
            }}
            onChange={e => {
              if (e.target.files?.length) {
                handleScanFile(e.target.files);
              }
              e.target.value = '';
            }}
          />
          <div style={{
            background:   'rgba(210, 168, 255, 0.05)',
            border:       `1px dashed rgba(210, 168, 255, 0.33)`,
            borderRadius: 9,
            padding:      '0.9rem 0.6rem',
            textAlign:    'center',
            lineHeight:   1.6,
            transition:   'all .2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--purple)';
            e.currentTarget.style.background  = 'rgba(210, 168, 255, 0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(210, 168, 255, 0.33)';
            e.currentTarget.style.background  = 'rgba(210, 168, 255, 0.05)';
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.35rem' }}>🤖</div>
            <div style={{
              color:         'var(--purple)',
              fontWeight:    600,
              fontSize:      '0.74rem',
              letterSpacing: '0.06em',
            }}>
              Scan File
            </div>
            <div style={{
              color:      'var(--muted)',
              fontSize:   '0.62rem',
              marginTop:  '0.2rem',
            }}>
              AI reads & builds exact roadmap
            </div>
          </div>
        </label>
      </div>

      {/* CREATE FORM */}
      {showForm && (
        <div className="slide-in" style={{ marginBottom: '40px', backgroundColor: 'var(--bg2)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ padding: '20px', opacity: isScanning ? 0.4 : 1, pointerEvents: isScanning ? 'none' : 'auto' }}>
            <div style={{ marginBottom: '16px' }}>
              <span className="syntax-keyword">class </span><span className="syntax-function">Roadmap</span><span className="syntax-text"> {"{"}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '24px' }}>
              {scanFile && (
                <div style={{
                  background:   'var(--bg)',
                  border:       `1px solid ${scanning ? 'rgba(210, 168, 255, 0.33)' : scanLog.startsWith('//') ? 'rgba(248, 81, 73, 0.33)' : 'rgba(63, 185, 80, 0.33)'}`,
                  borderRadius: 6,
                  padding:      '0.6rem 0.85rem',
                  marginBottom: '1rem',
                  display:      'flex',
                  alignItems:   'center',
                  gap:          8,
                }}>
                  {scanning && (
                    <span style={{
                      width:      8,
                      height:     8,
                      borderRadius: '50%',
                      background: 'var(--purple)',
                      display:    'inline-block',
                      flexShrink: 0,
                      animation:  'blink .6s infinite',
                    }} />
                  )}
                  {!scanning && !scanLog.startsWith('//') && (
                    <span style={{ color: 'var(--green)', fontSize: '0.9rem', flexShrink: 0 }}>✓</span>
                  )}
                  {!scanning && scanLog.startsWith('//') && (
                    <span style={{ color: 'var(--red)', fontSize: '0.9rem', flexShrink: 0 }}>✕</span>
                  )}
                  <span style={{
                    color:      scanning
                                  ? 'var(--purple)'
                                  : scanLog.startsWith('//')
                                    ? 'var(--red)'
                                    : 'var(--green)',
                    fontSize:   '0.72rem',
                    fontFamily: "'JetBrains Mono', monospace",
                    flex:       1,
                  }}>
                    {scanLog}
                  </span>
                  {/* show file name */}
                  {scanFile.previewUrl ? (
                    <img
                      src={scanFile.previewUrl}
                      alt=""
                      style={{
                        width:        22,
                        height:       22,
                        objectFit:    'cover',
                        borderRadius: 3,
                        flexShrink:   0,
                      }}
                    />
                  ) : (
                    <span style={{
                      color:      'var(--dim)',
                      fontSize:   '0.62rem',
                      flexShrink: 0,
                      maxWidth:   100,
                      overflow:   'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {scanFile.name}
                    </span>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <span className="syntax-type" style={{ width: '120px', marginTop: '8px' }}>title:</span>
                <input 
                  type="text" 
                  value={title}
                  placeholder="e.g., Learn C++ Completely"
                  onChange={e => setTitle(e.target.value)}
                  style={{ color: 'var(--green)', fontWeight: 'bold', border: 'none', backgroundColor: 'transparent' }} 
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <span className="syntax-type" style={{ width: '120px', marginTop: '8px' }}>description:</span>
                <input 
                  type="text" 
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  style={{ border: 'none', backgroundColor: 'transparent' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ width: '120px', marginTop: '8px' }}>
                  <span className="syntax-type">milestones:</span>
                  <label htmlFor="task-rescan-input-v2" style={{ cursor: 'pointer' }}>
                    <input
                      id="task-rescan-input-v2"
                      type="file"
                      accept="image/*,.pdf,.txt,.md,.py,.js,.ts,.cpp,.c,.java,.json,.csv,.html,.css,.xlsx,.docx"
                      style={{
                        position:      'absolute',
                        width:         1,
                        height:        1,
                        opacity:       0,
                        pointerEvents: 'none',
                      }}
                      onChange={e => {
                        if (e.target.files?.length) {
                          handleScanFile(e.target.files);
                        }
                        e.target.value = '';
                      }}
                    />
                    <span style={{
                      color:         scanning ? 'var(--muted)' : 'var(--purple)',
                      fontSize:      '0.6rem',
                      letterSpacing: '0.1em',
                      display:       'flex',
                      alignItems:    'center',
                      gap:           4,
                      padding:       '2px 7px',
                      border:        `1px solid rgba(210, 168, 255, 0.26)`,
                      borderRadius:  20,
                      transition:    'all .2s',
                      cursor:        scanning ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={e => {
                      if (!scanning) e.currentTarget.style.background = 'rgba(210, 168, 255, 0.1)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                    }}>
                      📎 {scanFile ? 're-scan' : 'scan file'}
                    </span>
                  </label>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <textarea 
                    rows={7}
                    value={milestonesText}
                    onChange={e => setMilestonesText(e.target.value)}
                    style={{ color: 'var(--yellow)', resize: 'vertical', border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}
                    placeholder="Enter milestones line by line"
                  />
                </div>
              </div>

              {extractedAlarms.length > 0 && (
                <div style={{ paddingLeft: '24px' }}>
                  <span className="syntax-type">suggested_alarms:</span>
                  <div style={{ 
                    marginTop: '8px', 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px', 
                    padding: '8px', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '4px' 
                  }}>
                    {extractedAlarms.map((a, i) => (
                      <div key={i} style={{ 
                        fontSize: '11px', 
                        padding: '2px 8px', 
                        border: '1px solid var(--border2)', 
                        borderRadius: '12px',
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center'
                      }}>
                        <span className="syntax-orange">{a.time}</span>
                        <span className="syntax-text">{a.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px' }}>
              <span className="syntax-text">{"}"}</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button 
                onClick={saveTask}
                style={{ backgroundColor: 'var(--green)', color: 'var(--bg)', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}
              >
                $ git push --roadmap
              </button>
              <button 
                onClick={resetForm}
                style={{ color: 'var(--dim)', padding: '8px 16px', fontSize: '12px' }}
              >
                [esc]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div style={{ 
        backgroundColor: 'var(--bg2)', 
        padding: '12px 16px', 
        borderRadius: '6px', 
        marginBottom: '24px', 
        display: 'flex', 
        gap: '12px', 
        alignItems: 'center',
        border: '1px solid var(--border)' 
      }}>
        <div style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>TASK MANAGER</div>
        <select 
          value={filterType} 
          onChange={e => setFilterType(e.target.value)}
          style={{ width: 'auto', fontSize: '11px', padding: '4px 8px', border: '1px solid var(--border2)' }}
        >
          <option value="all">Filter: All</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="todo">Todo</option>
        </select>
        <select 
          value={sortType} 
          onChange={e => setSortType(e.target.value)}
          style={{ width: 'auto', fontSize: '11px', padding: '4px 8px', border: '1px solid var(--border2)' }}
        >
          <option value="newest">Sort: Newest</option>
          <option value="progress-desc">Progress (Desc)</option>
          <option value="progress-asc">Progress (Asc)</option>
          <option value="title">Title</option>
        </select>
        <div style={{ flex: 1, position: 'relative' }}>
          <input 
            type="text" 
            placeholder="type to filter..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ fontSize: '11px', padding: '4px 8px', border: '1px solid var(--border2)' }}
          />
        </div>
      </div>

      {/* TASK CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {filteredTasks.map((task: Task) => {

          return (
            <div key={task.id} className="slide-in" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
              
              {/* Card Header */}
              <div style={{ backgroundColor: 'var(--bg3)', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <span style={{
                    color:          C.text,
                    fontSize:       '0.78rem',
                    fontWeight:     600,
                    overflow:       'hidden',
                    textOverflow:   'ellipsis',
                    whiteSpace:     'nowrap',
                  }}>
                    {task.title.toLowerCase().replace(/\s+/g, '_')}.md
                  </span>
                  
                  {task.description && (
                    <div style={{
                      color:        C.muted,
                      fontSize:     '0.65rem',
                      marginTop:    '0.15rem',
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace:   'nowrap',
                      maxWidth:     '70%',
                    }}>
                      — {task.description}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label htmlFor={`task-attach-${task.id}`} style={{ cursor: 'pointer', color: 'var(--cyan)', fontSize: '11px' }}>
                    📎 attach
                    <input 
                      type="file" 
                      id={`task-attach-${task.id}`} 
                      style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} 
                      onChange={e => handleScanFile(e.target.files)}
                    />
                  </label>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    style={{ color: 'var(--muted)', fontSize: '11px' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                  >
                    rm -rf
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '16px' }}>
                {(() => {
                  const done  = task.milestones.filter(m => m.done).length;
                  const total = task.milestones.length;
                  const pct   = total > 0 ? Math.round(done / total * 100) : 0;
                  const sc    = pct === 100 ? C.green : pct > 50 ? C.cyan : C.blue;
                  const filled = total > 0 ? Math.round(done / total * 20) : 0;
                  const empty  = 20 - filled;
                  const bar    = '[' + '█'.repeat(filled) + '·'.repeat(empty) + ']';
                  const F = "'JetBrains Mono', monospace";
                  return (
                    <div style={{ marginBottom: '0.85rem' }}>
                      {/* text progress bar like screenshot */}
                      <div style={{
                        display:        'flex',
                        alignItems:     'center',
                        gap:            8,
                        marginBottom:   '0.35rem',
                        fontFamily:     F,
                      }}>
                        <span style={{
                          color:       sc,
                          fontSize:    '0.72rem',
                          letterSpacing: '0.02em',
                          flex:        1,
                        }}>
                          {bar}
                        </span>
                        <span style={{
                          color:    C.muted,
                          fontSize: '0.68rem',
                        }}>
                          {done}/{total}
                        </span>
                        <span style={{
                          color:      sc,
                          fontSize:   '0.68rem',
                          fontWeight: 700,
                          minWidth:   '2.5rem',
                          textAlign:  'right',
                        }}>
                          {pct}%
                        </span>
                      </div>
                      {/* thin color bar */}
                      <div style={{
                        height:     3,
                        background: C.bg3,
                        borderRadius: 2,
                        overflow:   'hidden',
                      }}>
                        <div style={{
                          height:     '100%',
                          width:      `${pct}%`,
                          background: sc,
                          borderRadius: 2,
                          transition: 'width 0.6s ease',
                          boxShadow:  `0 0 8px ${sc}55`,
                        }} />
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {task.milestones.map((ms: Milestone, i: number) => (
                    <div 
                      key={ms.id} 
                      onClick={() => toggleMilestone(task.id, ms.id)}
                      style={{ 
                        display: 'flex', 
                        padding: '2px 0', 
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg4)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <span className="syntax-comment" style={{ width: '30px', textAlign: 'right', marginRight: '10px', userSelect: 'none', fontSize: '11px' }}>
                        {i + 1}│
                      </span>
                      <span style={{
                          fontSize:    '0.8rem',
                          color:       ms.done ? C.dim : C.text,
                          textDecoration: ms.done ? 'line-through' : 'none',
                          textDecorationColor: C.muted,
                          lineHeight:  1.6,
                          whiteSpace:  'normal',    // ← allow wrapping
                          wordBreak:   'break-word',
                          flex:        1,
                        }}>
                          {ms.text}
                        </span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', padding: '4px 0', alignItems: 'center' }}>
                    <span className="syntax-comment" style={{ width: '30px', textAlign: 'right', marginRight: '10px', fontSize: '11px' }}>
                      {task.milestones.length + 1}│
                    </span>
                    <input 
                      type="text"
                      placeholder="+ add milestone..."
                      style={{ border: 'none', backgroundColor: 'transparent', padding: 0, fontSize: '13px', color: 'var(--muted)', width: '100%' }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          addMilestoneInline(task.id, (e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '11px' }}>
                  <button className="syntax-cyan" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🔔 cron.add(task)
                  </button>
                  <span className="syntax-comment">// created {new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
