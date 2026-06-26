import './config/env'; // Load and validate env first
import express, { RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';


import { config } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.startsWith('chrome-extension://') || origin.includes('localhost')) {
        callback(null, true);
      } else if (Array.isArray(config.cors.allowedOrigins) && config.cors.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback allow in dev/local
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, error: 'Too many requests, please try again later.' },
}) as unknown as RequestHandler;
app.use('/api', limiter);

// Auth endpoints have stricter limits
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many auth attempts, try again in 15 minutes.' },
}) as unknown as RequestHandler;
app.use('/api/auth/login', authLimiter);


// ─── Parsing Middleware ────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser() as any);

// ─── Logging ──────────────────────────────────────────────────────────────────
if (config.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.http(msg.trim()) },
    }),
  );
}

// ─── Static Files ───────────────────────────────────────────────────────────────
import path from 'path';
app.use(express.static(path.join(process.cwd(), 'public')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');

    app.listen(config.port, () => {
      logger.info(`🚀 RSOrangeTech API running on http://localhost:${config.port}/api`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      
      // Initialize background jobs
      const { initCronJobs } = require('./services/cron.service');
      initCronJobs();
    });
  } catch (err) {
    logger.error('❌ Failed to start server', { err });
    process.exit(1);
  }
}

bootstrap();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
