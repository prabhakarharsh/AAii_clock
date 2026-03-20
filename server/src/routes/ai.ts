import { Router, Request, Response } from 'express';
import { extractTask, extractRoadmapFromFile } from '../services/aiService';
import prisma from '../db';

const router = Router();

// POST /api/ai/extract → Preview only (text)
router.post('/ai/extract', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
       res.status(400).json({ success: false, error: 'Text is required' });
       return;
    }

    const result = await extractTask(text);
    res.json({ success: true, extracted: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/extract-file → Preview only (file)
router.post('/ai/extract-file', async (req: Request, res: Response) => {
  try {
    const { name, type, content } = req.body;
    if (!content) {
       res.status(400).json({ success: false, error: 'File content is required' });
       return;
    }

    const result = await extractRoadmapFromFile({ name, type, content });
    res.json({ success: true, extracted: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/extract-and-save → Save based on type
router.post('/ai/extract-and-save', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
       res.status(400).json({ success: false, error: 'Text is required' });
       return;
    }

    const extracted = await extractTask(text);
    let saved: any = null;

    if (extracted.type === 'alarm') {
      saved = await (prisma as any).alarm.create({
        data: {
          label: extracted.label,
          time: extracted.time || "07:00",
          repeat: extracted.repeat || "once",
          active: true,
          ringtoneName: "Default"
        }
      });
    } else if (extracted.type === 'reminder' || extracted.type === 'routine') {
      saved = await (prisma as any).reminder.create({
        data: {
          title: extracted.label,
          note: extracted.note || (extracted.steps ? JSON.stringify(extracted.steps) : null),
          datetime: extracted.datetime ? new Date(extracted.datetime) : new Date(),
          done: false
        }
      });
    } else {
      throw new Error(`Invalid extracted task type: ${extracted.type}`);
    }

    res.json({
      success: true,
      extracted,
      saved
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});


export default router;
