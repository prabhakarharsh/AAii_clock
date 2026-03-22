export type Alarm = {
  id: string
  label: string
  time: string
  active: boolean
  repeat: string
  ringtoneName?: string | null
  ringtoneData?: string | null
  createdAt?: string
}

export type Milestone = {
  id: string
  text: string
  done: boolean
}

export type Task = {
  id: string
  title: string
  description: string
  milestones: Milestone[]
  createdAt: number
  done?: boolean
  attachmentName?: string
  attachmentContent?: string
}

export type Reminder = {
  id: string
  title: string
  note?: string
  datetime: string
  done: boolean
  createdAt: string
}

export type RoutineStep = {
  id: string
  order: number
  type: string
  label: string
  time?: string
  note?: string
}

export type Routine = {
  id: string
  name: string
  active: boolean
  createdAt: string
  steps: RoutineStep[]
  items?: { id: string; time: string; activity: string; priority?: string }[]
}

export type VoiceState = {
  enabled: boolean
  language: string
  transcriptHistory: { role: 'user' | 'assistant'; text: string; action?: string; timestamp: number }[]
}

export type ExtractedTask = {
  type: 'alarm' | 'reminder'
  label: string
  note?: string
  time?: string
  datetime?: string
  repeat: string
  confidence: number
}

