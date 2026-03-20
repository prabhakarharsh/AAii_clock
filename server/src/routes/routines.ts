import { Router, Request, Response } from 'express';
import prisma from '../db';

const router = Router();

// GET all routines with steps
router.get('/routines', async (req: Request, res: Response) => {
  try {
    const routines = await (prisma as any).routine.findMany({
      include: { steps: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: routines });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET one routine with steps
router.get('/routines/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const routine = await (prisma as any).routine.findUnique({
      where: { id },
      include: { steps: true }
    });
    
    if (!routine) {
       res.status(404).json({ success: false, error: 'Routine not found' });
       return;
    }
    
    res.json({ success: true, data: routine });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST new routine with steps
router.post('/routines', async (req: Request, res: Response) => {
  try {
    const { name, steps } = req.body;
    
    if (!name || !steps || !Array.isArray(steps)) {
       res.status(400).json({ success: false, error: 'Name and steps are required' });
       return;
    }

    const newRoutine = await (prisma as any).routine.create({
      data: {
        name,
        active: true,
        steps: {
          create: steps.map((step: any) => ({
            order: step.order,
            type: step.type,
            label: step.label,
            time: step.time,
            note: step.note
          }))
        }
      },
      include: { steps: true }
    });
    
    res.status(201).json({ success: true, data: newRoutine });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// PUT update routine name or active
router.put('/routines/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body;
    
    const updatedRoutine = await (prisma as any).routine.update({
      where: { id },
      data: {
        name,
        active
      },
      include: { steps: true }
    });
    
    res.json({ success: true, data: updatedRoutine });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/routines/:id/run → run a routine
router.post('/routines/:id/run', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const routine = await (prisma as any).routine.findUnique({
      where: { id },
      include: { steps: true }
    });
    
    if (!routine) {
       res.status(404).json({ success: false, error: 'Routine not found' });
       return;
    }

    // Logic for running routine (placeholder since no 'triggered' field exists yet)
    // We could potentially activate alarms or timers here.
    
    res.json({
      success: true,
      message: 'Routine started',
      routine
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// DELETE routine and all its steps (cascade handling in DB)
router.delete('/routines/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma as any).routine.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Routine deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// DELETE one step from a routine
router.delete('/routines/:id/steps/:stepId', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;
    await (prisma as any).routineStep.delete({
      where: { id: stepId }
    });
    res.json({ success: true, message: 'Step deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
