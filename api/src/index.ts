import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { aiRouter } from './routes/ai';
import { notificationRouter } from './routes/notifications';
import { reportRouter } from './routes/reports';
import { appointmentRouter } from './routes/appointments';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/ai', aiRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/reports', reportRouter);
app.use('/api/appointments', appointmentRouter);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 DietSync API running on http://localhost:${PORT}`);
  });
}

export default app;
