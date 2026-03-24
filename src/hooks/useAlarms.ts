import { useState, useEffect } from 'react'
import type { Alarm } from '../types'
import { 
  getAllAlarms, 
  createAlarm, 
  updateAlarm, 
  deleteAlarm 
} from '../services/alarmService'

export function useAlarms() {
  const [alarms, setAlarms] = 
    useState<Alarm[]>([])
  const [loading, setLoading] = 
    useState(true)
  const [error, setError] = 
    useState<string | null>(null)

  const fetchAlarms = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllAlarms()
      setAlarms(data)
    } catch (err) {
      setError(
        err instanceof Error ? 
        err.message : 
        'Failed to fetch alarms'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlarms()
  }, [])

  const addAlarm = async (
    alarm: Partial<Alarm>
  ) => {
    try {
      await createAlarm(alarm)
      await fetchAlarms()
    } catch (err) {
      setError(
        err instanceof Error ? 
        err.message : 
        'Failed to create alarm'
      )
    }
  }

  const toggleAlarm = async (
    id: string, 
    active: boolean
  ) => {
    try {
      await updateAlarm(id, { active })
      await fetchAlarms()
    } catch (err) {
      setError(
        err instanceof Error ? 
        err.message : 
        'Failed to update alarm'
      )
    }
  }

  const removeAlarm = async (id: string) => {
    try {
      await deleteAlarm(id)
      await fetchAlarms()
    } catch (err) {
      setError(
        err instanceof Error ? 
        err.message : 
        'Failed to delete alarm'
      )
    }
  }

  return {
    alarms,
    loading,
    error,
    addAlarm,
    toggleAlarm,
    removeAlarm,
    refreshAlarms: fetchAlarms
  }
}
