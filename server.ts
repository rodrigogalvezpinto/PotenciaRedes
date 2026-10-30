/**
 * PulsoRed Chile - Full-Stack Application Entry Point
 * Servidor Express con Vite middleware montado en desarrollo y estáticos en producción.
 * Puerto estándar 3000 según especificación de entorno.
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { initDatabase } from './src/server/db.js';
import { apiRouter } from './src/server/routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // AI Studio requiere explícitamente el puerto 3000 para el dev server
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // 1. Inicializar base de datos relacional SQLite y semillas
  initDatabase();

  // 2. Parsers de peticiones
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 3. Cabeceras de seguridad HTTP básicas
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // 4. Montar rutas de API
  app.use('/api', apiRouter);

  // 5. Configurar frontend Vite o estáticos
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('[PulsoRed Chile] Servidor en desarrollo con Vite middlewares activado.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[PulsoRed Chile] Servidor en producción sirviendo distribución estática.');
  }

  // 6. Iniciar listener en el puerto 3000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PulsoRed Chile] Plataforma comercial activa en http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[PulsoRed Chile] Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
