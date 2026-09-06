import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import apiRoutes from './server/routes';

dotenv.config();

const app = express();
const PORT = 3000;

// CORS headers for cross-origin previews and mobile webviews
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Middleware for parsing JSON with generous limit for multimodal base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount MedTrack AI modular REST API routes (includes auth, clinical AI, records, etc.)
app.use('/api', apiRoutes);

// Global error handling middleware - always returns JSON
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express Server Error caught:', err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(err?.status || 500).json({
    success: false,
    error: err?.message || 'A server error occurred during request processing',
  });
});

// Setup Vite middleware in dev or static files in production
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MedTrack AI server running at http://0.0.0.0:${PORT}`);
  });
}

// Export app for Vercel Serverless Function compatibility
export default app;

// Only start standalone HTTP server in non-serverless environments (local dev / container)
if (!process.env.VERCEL) {
  setupServer();
}
