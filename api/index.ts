import express from 'express';
import apiRoutes from '../server/routes';

const app = express();

// Cross-Origin Resource Sharing (CORS) headers for mobile webviews & cross-origin previews
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// JSON and URL-encoded body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount API routes both at /api and at root / (handles Vercel rewrite prefix variances)
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Health check endpoint for Vercel
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: 'vercel-serverless', timestamp: new Date().toISOString() });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: 'vercel-serverless', timestamp: new Date().toISOString() });
});

// Global error handler for serverless functions
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Vercel Serverless Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err?.status || 500).json({
    success: false,
    error: err?.message || 'Internal server error occurred',
  });
});

export { app };

// Serverless function handler for Vercel deployment
export default function handler(req: any, res: any) {
  return app(req, res);
}
