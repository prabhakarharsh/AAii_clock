import React, { useState, useEffect } from 'react';
import type { Alarm, Task, VoiceState } from '../types';
import { MiniClock } from './MiniClock';

interface AppShellProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alarms: Alarm[];
  tasks: Task[];
  voiceState: VoiceState;
  isOnline: boolean;
  wakeOn: boolean;
  setWakeOn: (val: boolean) => void;
  clockFmt: string;
  onFormatChange: (fmt: string) => void;
  children: React.ReactNode;
}

import { ClockFormatToggle } from './AlarmsTab';

export function AppShell({ 
  activeTab, setActiveTab, alarms, tasks, voiceState, 
  isOnline, wakeOn, setWakeOn, clockFmt, onFormatChange, children 
}: AppShellProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeAlarmsCount = alarms.filter(a => a.active).length;

  const toggleKeepAwake = async () => {
    if (!('wakeLock' in navigator)) {
      alert("Wake Lock API not supported in this browser.");
      return;
    }
    setWakeOn(!wakeOn);
  };

  const tabs = [
    { id: 'clock', label: '⌚ clock.ts' },
    { id: 'alarms', label: `⏰ alarms[${activeAlarmsCount}].ts` },
    { id: 'tasks', label: `📌 tasks[${tasks.length}].md` },
    { id: 'voice', label: '🎙️ voice.cmd' },
    { id: 'ai', label: '✦ ai.repl' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', backgroundColor: 'var(--bg)' }}>
      
      {/* 1. TITLE BAR */}
      <div style={{
        paddingTop: 'env(titlebar-area-height, env(safe-area-inset-top, 0px))',
        backgroundColor: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '12px',
        paddingRight: '12px',
        paddingBottom: '0',
        height: 'calc(32px + env(titlebar-area-height, 0px))',
        fontSize: '11px',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', gap: '8px', paddingLeft: 'env(titlebar-area-x, 0px)' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--red)', opacity: 0.7 }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--yellow)', opacity: 0.7 }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--green)', opacity: 0.7 }} />
        </div>
        <div style={{ 
          color: 'var(--muted)', 
          fontWeight: 400, 
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          flex: 1,
          textAlign: 'center'
        }}>
          ARC CLOCK — terminal edition v4.0
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingRight: 'env(titlebar-area-width, 0px)' }}>
          {!isOnline && (
            <span style={{ color: 'var(--orange)', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="blink">●</span> OFFLINE
            </span>
          )}
          <span style={{ color: 'var(--muted)', fontSize: '10px' }}>⎇ main</span>
          
          <ClockFormatToggle fmt={clockFmt} onChange={onFormatChange} />

          <button 
            onClick={toggleKeepAwake}
            style={{ 
              fontSize: '10px', 
              color: wakeOn ? 'var(--green)' : 'var(--muted)',
              border: `1px solid ${wakeOn ? 'var(--green)' : 'var(--muted)'}`,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: wakeOn ? 'rgba(63, 185, 80, 0.1)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {wakeOn ? '● SCREEN ON' : '○ KEEP AWAKE'}
          </button>
        </div>
      </div>

      {/* 2. TAB BAR */}
      <div style={{
        backgroundColor: 'var(--bg3)',
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        minHeight: '36px'
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0 16px',
                height: '36px',
                backgroundColor: isActive ? 'var(--bg)' : 'var(--bg3)',
                color: isActive ? 'var(--text)' : 'var(--muted)',
                borderTop: `2px solid ${isActive ? 'var(--blue)' : 'transparent'}`,
                borderRight: '1px solid var(--border)',
                minWidth: '120px',
                textAlign: 'left',
                fontSize: '11px',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. MINI CLOCK BAR (shown on non-clock tabs) */}
      {activeTab !== 'clock' && (
        <MiniClock now={currentTime} clockFmt={clockFmt} />
      )}

      {/* 4. MAIN CONTENT AREA */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ maxWidth: '760px', width: '100%', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>

      {/* 5. STATUS BAR */}
      <div style={{
        height: '22px',
        backgroundColor: 'var(--blue)',
        color: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        fontSize: '11px',
        justifyContent: 'space-between',
        fontWeight: 600,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '0 8px', margin: '0 -12px 0 0' }}>⎇ main</span>
          <span>✓ {activeAlarmsCount} alarms active</span>
          <span>📌 {tasks.length} roadmaps</span>
          <span>🎙️ voice: {voiceState.enabled ? 'ON' : 'OFF'}</span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>JetBrains Mono</span>
          <span>UTF-8</span>
          <span>{wakeOn ? 'Wake Lock Active' : 'Wake Lock Inactive'}</span>
        </div>
      </div>
    </div>
  );
}
