import { apiCall } from './api';
import type { Alarm } from '../types';

export const alarmService = {
  getAllAlarms: () => apiCall('/alarms'),
  getAlarm: (id: string) => apiCall(`/alarms/${id}`),
  createAlarm: (data: Partial<Alarm>) => apiCall('/alarms', 'POST', data),
  updateAlarm: (id: string, data: Partial<Alarm>) => apiCall(`/alarms/${id}`, 'PUT', data),
  deleteAlarm: (id: string) => apiCall(`/alarms/${id}`, 'DELETE'),
};
