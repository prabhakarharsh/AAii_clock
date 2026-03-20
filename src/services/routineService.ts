import { apiCall } from './api';
import type { Routine } from '../types';

export const routineService = {
  getAllRoutines: () => apiCall('/routines'),
  createRoutine: (data: Partial<Routine>) => apiCall('/routines', 'POST', data),
  updateRoutine: (id: string, data: Partial<Routine>) => apiCall(`/routines/${id}`, 'PUT', data),
  runRoutine: (id: string) => apiCall(`/routines/${id}/run`, 'POST'),
  deleteRoutine: (id: string) => apiCall(`/routines/${id}`, 'DELETE'),
};
