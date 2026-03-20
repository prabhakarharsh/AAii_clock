import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';

import prisma from './db';
import alarmRoutes from './routes/alarms';
import reminderRoutes from './routes/reminders';
import aiRoutes from './routes/ai';
import routineRoutes from './routes/routines';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(morgan('dev'));
app.use(cors({ origin: 'http://localhost:5174' }));
app.use(express.json());

// Routes
app.use('/api', alarmRoutes);
app.use('/api', reminderRoutes);
app.use('/api', aiRoutes);
app.use('/api', routineRoutes);

// Detailed health check route
app.get('/health', async (req: Request, res: Response) => {
  try {
    // DB connection test
    await (prisma as any).$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ok',
      database: 'connected',
      routes: {
        alarms: 'active',
        reminders: 'active',
        ai: 'active',
        routines: 'active'
      },
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Global error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 ARC Clock Backend - Status: Online`);
  console.log(`🔗 Port: ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health\n`);
  console.log('--- Registered API Routes ---');
  console.log('- Alarms:    /api/alarms');
  console.log('- Reminders: /api/reminders');
  console.log('- AI:        /api/ai');
  console.log('- Routines:  /api/routines');
});
