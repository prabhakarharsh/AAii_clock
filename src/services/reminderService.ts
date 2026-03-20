import { apiCall } from './api';
import type { Reminder } from '../types';

export const reminderService = {
  getAllReminders: () => apiCall('/reminders'),
  getPendingReminders: () => apiCall('/reminders/pending'),
  createReminder: (data: Partial<Reminder>) => apiCall('/reminders', 'POST', data),
  updateReminder: (id: string, data: Partial<Reminder>) => apiCall(`/reminders/${id}`, 'PUT', data),
  deleteReminder: (id: string) => apiCall(`/reminders/${id}`, 'DELETE'),
};
