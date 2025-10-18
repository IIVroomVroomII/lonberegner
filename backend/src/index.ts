import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './config/logger';
import { setupSwagger } from './config/swagger';
import routes from './routes';

// Load environment variables
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for React app
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Swagger documentation
setupSwagger(app);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1', routes);

// Serve static files from webapp/dist in production
if (process.env.NODE_ENV === 'production') {
  const webappPath = path.join(__dirname, '../../webapp/dist');
  app.use(express.static(webappPath));

  // Catch-all route for React Router (must be after API routes)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webappPath, 'index.html'));
  });
}

// Error handling
app.use(errorHandler);

// Start server
app.listen(port, () => {
  logger.info(`🚀 Server running on port ${port}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 API: http://localhost:${port}/api/v1`);
  logger.info(`📚 API Docs: http://localhost:${port}/api-docs`);
  logger.info(`📄 OpenAPI Spec: http://localhost:${port}/api-docs.json`);
});

export default app;
