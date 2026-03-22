import { useState, useEffect } from 'react';
import { reminderService } from '../services/reminderService';
import type { Reminder, Task, Milestone } from '../types';

export function useReminders() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fromReminder = (r: Reminder): Task => {
    let description = '';
    let milestones: Milestone[] = [];
    
    if (r.note && r.note.startsWith('{')) {
      try {
        const parsed = JSON.parse(r.note);
        description = parsed.description || '';
        milestones = parsed.milestones || [];
        (r as any).attachmentName = parsed.attachmentName || undefined;
        (r as any).attachmentContent = parsed.attachmentContent || undefined;
      } catch {
        description = r.note;
      }
    } else {
      description = r.note || '';
    }

    return {
      id: r.id,
      title: r.title,
      description,
      milestones,
      createdAt: new Date(r.createdAt || Date.now()).getTime(),
      done: r.done,
      attachmentName: (r as any).attachmentName,
      attachmentContent: (r as any).attachmentContent
    } as any; // Cast because our local Task type is defined slightly differently
  };

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await reminderService.getAllReminders();
      const allReminders: Reminder[] = res.data;
      setReminders(allReminders);
      setTasks(allReminders.map(fromReminder));
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const addReminder = async (data: Partial<Task | Reminder>) => {
    try {
      let finalData: Partial<Reminder> = {};
      
      if ('milestones' in data) {
        // Converting a Task to a Reminder
        finalData = {
          title: data.title,
          note: JSON.stringify({
            description: data.description,
            milestones: data.milestones,
            attachmentName: (data as any).attachmentName,
            attachmentContent: (data as any).attachmentContent
          }),
          datetime: new Date().toISOString(),
          done: false
        };
      } else {
        finalData = data as any;
      }

      await reminderService.createReminder(finalData);
      await fetchReminders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const existing = tasks.find(t => t.id === id);
      if (!existing) return;

      const updated = { ...existing, ...updates };
      const finalData: Partial<Reminder> = {
        title: updated.title,
        note: JSON.stringify({
          description: updated.description,
          milestones: updated.milestones,
          attachmentName: updated.attachmentName,
          attachmentContent: updated.attachmentContent
        }),
        done: updated.milestones.length > 0 ? updated.milestones.every(m => m.done) : existing.done
      };

      await reminderService.updateReminder(id, finalData);
      await fetchReminders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const markDone = async (id: string, done: boolean) => {
    try {
      await reminderService.updateReminder(id, { done });
      await fetchReminders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const removeReminder = async (id: string) => {
    try {
      await reminderService.deleteReminder(id);
      await fetchReminders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return { tasks, reminders, loading, error, addReminder, updateTask, markDone, removeReminder, refresh: fetchReminders };
}

