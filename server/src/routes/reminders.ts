import { Router, Request, Response } from 'express';
import prisma from '../db';

const router = Router();

// GET all reminders
router.get('/reminders', async (req: Request, res: Response) => {
  try {
    const reminders = await (prisma as any).reminder.findMany({
      orderBy: { datetime: 'asc' }
    });
    res.json({ success: true, data: reminders });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET only pending (not done) reminders
router.get('/reminders/pending', async (req: Request, res: Response) => {
  try {
    const reminders = await (prisma as any).reminder.findMany({
      where: { done: false },
      orderBy: { datetime: 'asc' }
    });
    res.json({ success: true, data: reminders });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET one reminder by id
router.get('/reminders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reminder = await (prisma as any).reminder.findUnique({
      where: { id }
    });
    
    if (!reminder) {
       res.status(404).json({ success: false, error: 'Reminder not found' });
       return;
    }
    
    res.json({ success: true, data: reminder });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST create new reminder
router.post('/reminders', async (req: Request, res: Response) => {
  try {
    const { title, note, datetime } = req.body;
    
    if (!title || !datetime) {
       res.status(400).json({ success: false, error: 'Title and datetime are required' });
       return;
    }

    const newReminder = await (prisma as any).reminder.create({
      data: {
        title,
        note,
        datetime: new Date(datetime),
        done: false
      }
    });
    
    res.status(201).json({ success: true, data: newReminder });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// PUT update reminder
router.put('/reminders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, note, datetime, done } = req.body;
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (note !== undefined) updateData.note = note;
    if (datetime !== undefined) updateData.datetime = new Date(datetime);
    if (done !== undefined) updateData.done = done;

    const updatedReminder = await (prisma as any).reminder.update({
      where: { id },
      data: updateData
    });
    
    res.json({ success: true, data: updatedReminder });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// DELETE one reminder by id
router.delete('/reminders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma as any).reminder.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Reminder deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
