import { useState, useEffect } from 'react';
import { routineService } from '../services/routineService';
import type { Routine } from '../types';

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutines = async () => {
    try {
      setLoading(true);
      const res = await routineService.getAllRoutines();
      setRoutines(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  const addRoutine = async (data: Partial<Routine>) => {
    try {
      await routineService.createRoutine(data);
      await fetchRoutines();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const runRoutine = async (id: string) => {
    try {
      await routineService.runRoutine(id);
      await fetchRoutines();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const removeRoutine = async (id: string) => {
    try {
      await routineService.deleteRoutine(id);
      await fetchRoutines();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return { routines, loading, error, addRoutine, runRoutine, removeRoutine, refresh: fetchRoutines };
}
