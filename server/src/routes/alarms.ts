import { Router, Request, Response } from 'express';
import prisma from '../db';

const router = Router();

// GET all alarms → get all alarms
router.get('/alarms', async (req: Request, res: Response) => {
  try {
    const alarms = await (prisma as any).alarm.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: alarms });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET one alarm by id → get one alarm by id
router.get('/alarms/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alarm = await (prisma as any).alarm.findUnique({
      where: { id }
    });
    
    if (!alarm) {
       res.status(404).json({ success: false, error: 'Alarm not found' });
       return;
    }
    
    res.json({ success: true, data: alarm });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST create new alarm
router.post('/alarms', async (req: Request, res: Response) => {
  try {
    const { label, time, repeat, ringtoneName, active } = req.body;
    
    if (!label || !time) {
       res.status(400).json({ success: false, error: 'Label and time are required' });
       return;
    }

    const newAlarm = await (prisma as any).alarm.create({
      data: {
        label,
        time,
        repeat: repeat || 'once',
        ringtoneName: ringtoneName || 'Default',
        active: active !== undefined ? active : true
      }
    });
    
    res.status(201).json({ success: true, data: newAlarm });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// PUT update alarm
router.put('/alarms/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, time, repeat, ringtoneName, active } = req.body;
    
    const updatedAlarm = await (prisma as any).alarm.update({
      where: { id },
      data: {
        label,
        time,
        repeat,
        ringtoneName,
        active
      }
    });
    
    res.json({ success: true, data: updatedAlarm });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// DELETE one alarm by id
router.delete('/alarms/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma as any).alarm.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Alarm deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
