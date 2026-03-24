import { apiCall } from './api'
import type { Alarm } from '../types'

export async function getAllAlarms(): 
  Promise<Alarm[]> {
  const data = await apiCall('/alarms')
  return data.data
}

export async function createAlarm(
  alarm: Partial<Alarm>
): Promise<Alarm> {
  const data = await apiCall(
    '/alarms', 
    'POST', 
    alarm
  )
  return data.data
}

export async function updateAlarm(
  id: string,
  alarm: Partial<Alarm>
): Promise<Alarm> {
  const data = await apiCall(
    `/alarms/${id}`, 
    'PUT', 
    alarm
  )
  return data.data
}

export async function deleteAlarm(
  id: string
): Promise<void> {
  await apiCall(`/alarms/${id}`, 'DELETE')
}
