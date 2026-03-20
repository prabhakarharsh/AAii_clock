import { useState, useEffect } from 'react';
import { alarmService } from '../services/alarmService';
import type { Alarm } from '../types';

export function useAlarms() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlarms = async () => {
    try {
      setLoading(true);
      const res = await alarmService.getAllAlarms();
      setAlarms(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlarms();
  }, []);

  const addAlarm = async (data: Partial<Alarm>) => {
    try {
      await alarmService.createAlarm(data);
      await fetchAlarms();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleAlarm = async (id: string, active: boolean) => {
    try {
      await alarmService.updateAlarm(id, { active });
      await fetchAlarms();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const removeAlarm = async (id: string) => {
    try {
      await alarmService.deleteAlarm(id);
      await fetchAlarms();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return { alarms, loading, error, addAlarm, toggleAlarm, removeAlarm, refresh: fetchAlarms };
}
