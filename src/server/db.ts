/**
 * PulsoRed Chile - Relational SQLite Database Layer
 * Utiliza node:sqlite (DatabaseSync) nativo de Node v22 con transacciones ACID,
 * claves foráneas, índices y modo WAL para persistencia robusta.
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'pulsorad.db');
export const db = new DatabaseSync(DB_PATH);

// Configuración de rendimiento y consistencia
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

/**
 * Inicialización de esquema relacional con migraciones idempotentes
 */
export function initDatabase() {
  db.exec(`
    -- 1. Catálogo de Servicios
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      platform TEXT NOT NULL,          -- instagram, tiktok, youtube, linkedin, x
      category TEXT NOT NULL,          -- followers, likes, views, subscribers
      description TEXT NOT NULL,
      order_type TEXT NOT NULL DEFAULT 'quantity', -- 'quantity' inicialmente
      min_quantity INTEGER NOT NULL,
      max_quantity INTEGER NOT NULL,
      price_per_1000 INTEGER NOT NULL, -- Precio público en CLP por cada 1.000 unidades
      url_pattern TEXT NOT NULL,       -- Expresión regular o regla de validación de URL
      url_placeholder TEXT NOT NULL,
      delivery_time_hours INTEGER NOT NULL DEFAULT 4,
      delivery_conditions TEXT NOT NULL,
      refill_days INTEGER NOT NULL DEFAULT 30,
      refill_conditions TEXT NOT NULL,
      cancellation_conditions TEXT NOT NULL,
      provider_name TEXT NOT NULL DEFAULT 'SMM_PWR',
      provider_service_id TEXT NOT NULL,
      provider_cost_usd REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'PUBLISHED', -- PUBLISHED, PAUSED, ARCHIVED
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 2. Pedidos Principales
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,                     -- UUID interno
      reference TEXT UNIQUE NOT NULL,           -- REF-YYYYMMDD-XXXX
      tracking_token TEXT UNIQUE NOT NULL,     -- Token criptográfico de alta entropía (64 hex)
      customer_email TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_whatsapp TEXT,
      destination_url TEXT NOT NULL,
      service_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      payment_method TEXT NOT NULL,            -- 'TENPO_TRANSFER' | 'WEBPAY_PLUS'
      public_price INTEGER NOT NULL,           -- Precio público total en CLP
      discount_amount INTEGER NOT NULL DEFAULT 0, -- Ahorro aplicado en CLP
      final_price INTEGER NOT NULL,            -- Total final a pagar en CLP
      payment_status TEXT NOT NULL DEFAULT 'PENDING', 
      -- PENDING, REPORTED, UNDER_REVIEW, CONFIRMED, REJECTED, REFUND_PENDING, REFUNDED
      delivery_status TEXT NOT NULL DEFAULT 'UNSENT',
      -- UNSENT, READY_FOR_DISPATCH, DISPATCHED_TO_PROVIDER, IN_PROGRESS, COMPLETED, PARTIAL, CANCELLED, INCIDENT
      terms_accepted INTEGER NOT NULL DEFAULT 1,
      ip_address TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    -- 3. Instantáneas Inmutables del Servicio al Momento de Comprar
    CREATE TABLE IF NOT EXISTS service_snapshots (
      id TEXT PRIMARY KEY,
      order_id TEXT UNIQUE NOT NULL,
      service_id TEXT NOT NULL,
      title TEXT NOT NULL,
      platform TEXT NOT NULL,
      category TEXT NOT NULL,
      unit_price_clp INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      delivery_conditions TEXT NOT NULL,
      refill_conditions TEXT NOT NULL,
      cancellation_conditions TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- 4. Intentos y Transacciones Webpay Plus
    CREATE TABLE IF NOT EXISTS payment_attempts (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      tbk_token TEXT UNIQUE,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'CLP',
      status TEXT NOT NULL,                   -- INITIALIZED, AUTHORIZED, FAILED, ABORTED
      authorization_code TEXT,
      payment_type_code TEXT,
      shares_number INTEGER,
      card_number TEXT,
      response_code INTEGER,
      raw_response TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- 5. Movimientos Bancarios Tenpo (Conciliación Manual)
    CREATE TABLE IF NOT EXISTS bank_transfers (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      reported_amount INTEGER NOT NULL,
      reported_sender_name TEXT,
      reported_bank TEXT,
      reported_reference TEXT,
      customer_notes TEXT,
      -- Campos de verificación por el administrador
      verified_by TEXT,
      verified_at TEXT,
      verified_amount INTEGER,
      bank_movement_id TEXT UNIQUE,           -- Restricción ÚNICA: una transferencia no puede pagar 2 pedidos
      admin_notes TEXT,
      status TEXT NOT NULL DEFAULT 'REPORTED', -- REPORTED, VERIFIED, REJECTED, DISCREPANCY
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- 6. Registros de Despacho al Proveedor (Manual en V1)
    CREATE TABLE IF NOT EXISTS provider_dispatches (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      provider_name TEXT NOT NULL DEFAULT 'SMM_PWR',
      external_order_id TEXT NOT NULL,        -- ID entregado por SMM PWR tras compra manual
      cost_amount REAL NOT NULL,
      cost_currency TEXT NOT NULL DEFAULT 'USD',
      dispatch_mode TEXT NOT NULL DEFAULT 'MANUAL', -- MANUAL en v1, AUTO en v2 futura
      dispatched_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SENT',    -- SENT, IN_PROGRESS, COMPLETED, FAILED, CANCELLED
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- 7. Historial y Auditoría de Acciones Administrativas
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      admin_user TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      previous_state TEXT,
      new_state TEXT,
      reason TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    -- 8. Notificaciones Transaccionales (Cola / Registro)
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      recipient TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'EMAIL',  -- EMAIL, TELEGRAM
      event_type TEXT NOT NULL,               -- ORDER_CREATED, PAYMENT_CONFIRMED, DISPATCHED, INCIDENT
      status TEXT NOT NULL DEFAULT 'SENT',    -- SENT, FAILED, RETRYING
      payload TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- 9. Usuarios Administradores
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ADMIN',     -- ADMIN, OPERATOR
      created_at TEXT NOT NULL
    );

    -- 10. Configuración Comercial y Bloqueos
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL
    );

    -- Índices para búsqueda rápida y auditoría
    CREATE INDEX IF NOT EXISTS idx_orders_reference ON orders(reference);
    CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(tracking_token);
    CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
    CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);
    CREATE INDEX IF NOT EXISTS idx_transfers_movement ON bank_transfers(bank_movement_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);

  // Semilla de servicios iniciales si la tabla está vacía
  seedInitialServices();
  seedInitialConfig();
  seedDefaultAdmin();

  // Asegurar que el nombre de marca oficial sea PotenciaRedes Chile
  db.prepare("UPDATE system_config SET value = 'PotenciaRedes Chile' WHERE key = 'STORE_NAME'").run();
  db.prepare("UPDATE system_config SET value = 'soporte@potenciaredes.cl' WHERE key = 'SUPPORT_EMAIL'").run();
}

function seedInitialServices() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM services');
  const result = countStmt.get() as { count: number };
  if (result.count > 0) return;

  const now = new Date().toISOString();
  const insertStmt = db.prepare(`
    INSERT INTO services (
      id, title, platform, category, description, order_type,
      min_quantity, max_quantity, price_per_1000, url_pattern, url_placeholder,
      delivery_time_hours, delivery_conditions, refill_days, refill_conditions,
      cancellation_conditions, provider_name, provider_service_id, provider_cost_usd,
      status, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )
  `);

  const initialServices = [
    {
      id: 'ig-followers-cl',
      title: 'Seguidores Instagram (Audiencia Perfil Global)',
      platform: 'instagram',
      category: 'followers',
      description: 'Aumento de visibilidad en perfil público de Instagram. Entrega progresiva y controlada. No requiere contraseña.',
      order_type: 'quantity',
      min_quantity: 100,
      max_quantity: 20000,
      price_per_1000: 4990,
      url_pattern: '^https?:\\/\\/(www\\.)?instagram\\.com\\/[A-Za-z0-9_.]+\\/?$',
      url_placeholder: 'https://instagram.com/tu_perfil',
      delivery_time_hours: 3,
      delivery_conditions: 'El perfil debe ser obligatoriamente PÚBLICO durante todo el proceso. Inicio entre 1 y 6 horas.',
      refill_days: 30,
      refill_conditions: 'Reposición manual ante caídas superiores al 10% durante los primeros 30 días con revisión administrativa.',
      cancellation_conditions: 'Cancelable únicamente antes de que el pedido sea enviado al proveedor.',
      provider_name: 'SMM_PWR',
      provider_service_id: '101',
      provider_cost_usd: 1.20,
      status: 'PUBLISHED'
    },
    {
      id: 'ig-likes-post',
      title: 'Likes Instagram (Interacción para Publicaciones)',
      platform: 'instagram',
      category: 'likes',
      description: 'Interacciones de alta velocidad para fotos o Reels específicos en perfiles abiertos.',
      order_type: 'quantity',
      min_quantity: 50,
      max_quantity: 10000,
      price_per_1000: 2490,
      url_pattern: '^https?:\\/\\/(www\\.)?instagram\\.com\\/(p|reel)\\/[A-Za-z0-9_-]+\\/?$',
      url_placeholder: 'https://instagram.com/p/Cxyz123/',
      delivery_time_hours: 1,
      delivery_conditions: 'Publicación debe ser pública. Distribución inmediata tras confirmación de pago.',
      refill_days: 15,
      refill_conditions: 'Reposición no aplicable a likes una vez completados satisfactoriamente salvo caída anómala.',
      cancellation_conditions: 'No cancelable una vez iniciado el despacho debido a la rapidez de entrega.',
      provider_name: 'SMM_PWR',
      provider_service_id: '105',
      provider_cost_usd: 0.45,
      status: 'PUBLISHED'
    },
    {
      id: 'tiktok-views-vid',
      title: 'Reproducciones TikTok (Distribución para Videos)',
      platform: 'tiktok',
      category: 'views',
      description: 'Distribución de reproducciones de alta velocidad para videos públicos de TikTok.',
      order_type: 'quantity',
      min_quantity: 500,
      max_quantity: 50000,
      price_per_1000: 990,
      url_pattern: '^https?:\\/\\/(www\\.|vm\\.)?tiktok\\.com\\/(@[A-Za-z0-9_.]+\\/video\\/[0-9]+|[A-Za-z0-9]+)\\/?$',
      url_placeholder: 'https://www.tiktok.com/@usuario/video/1234567890',
      delivery_time_hours: 2,
      delivery_conditions: 'Video debe ser público y sin restricciones geográficas o de edad.',
      refill_days: 0,
      refill_conditions: 'Sin reposición por ser servicio de visualización directa.',
      cancellation_conditions: 'Cancelable antes de procesar.',
      provider_name: 'SMM_PWR',
      provider_service_id: '201',
      provider_cost_usd: 0.15,
      status: 'PUBLISHED'
    },
    {
      id: 'tiktok-followers',
      title: 'Seguidores TikTok (Audiencia de Perfil)',
      platform: 'tiktok',
      category: 'followers',
      description: 'Incremento de comunidad en perfiles de creadores de contenido de TikTok.',
      order_type: 'quantity',
      min_quantity: 100,
      max_quantity: 10000,
      price_per_1000: 6990,
      url_pattern: '^https?:\\/\\/(www\\.)?tiktok\\.com\\/@[A-Za-z0-9_.]+\\/?$',
      url_placeholder: 'https://www.tiktok.com/@tu_usuario',
      delivery_time_hours: 6,
      delivery_conditions: 'Cuenta pública obligatoria. No cambiar el nombre de usuario durante la entrega.',
      refill_days: 30,
      refill_conditions: 'Garantía de reposición manual por 30 días solicitada vía panel de seguimiento.',
      cancellation_conditions: 'Cancelable antes de entrar a cola de procesamiento.',
      provider_name: 'SMM_PWR',
      provider_service_id: '205',
      provider_cost_usd: 1.80,
      status: 'PUBLISHED'
    },
    {
      id: 'yt-views-retention',
      title: 'Visualizaciones YouTube (Alta Retención)',
      platform: 'youtube',
      category: 'views',
      description: 'Reproducciones seguras para videos públicos de YouTube con tiempo de visualización real.',
      order_type: 'quantity',
      min_quantity: 500,
      max_quantity: 25000,
      price_per_1000: 3890,
      url_pattern: '^https?:\\/\\/(www\\.)?(youtube\\.com\\/watch\\?v=|youtu\\.be\\/)[A-Za-z0-9_-]+',
      url_placeholder: 'https://youtu.be/dQw4w9WgXcQ',
      delivery_time_hours: 12,
      delivery_conditions: 'Video público sin restricciones de inserción. Métricas pueden demorar hasta 24h en actualizar en YouTube Studio.',
      refill_days: 30,
      refill_conditions: 'Reposición automática garantizada por 30 días si la pérdida supera el 5%.',
      cancellation_conditions: 'Cancelable solo antes de su despacho al servidor de difusión.',
      provider_name: 'SMM_PWR',
      provider_service_id: '301',
      provider_cost_usd: 1.10,
      status: 'PUBLISHED'
    },
    {
      id: 'linkedin-followers',
      title: 'Seguidores LinkedIn (Perfiles y Páginas de Empresa)',
      platform: 'linkedin',
      category: 'followers',
      description: 'Ampliación de red profesional para marcas, ejecutivos y empresas chilenas.',
      order_type: 'quantity',
      min_quantity: 100,
      max_quantity: 5000,
      price_per_1000: 12900,
      url_pattern: '^https?:\\/\\/(www\\.)?linkedin\\.com\\/(company|in)\\/[A-Za-z0-9_-]+\\/?$',
      url_placeholder: 'https://linkedin.com/company/tu-empresa',
      delivery_time_hours: 24,
      delivery_conditions: 'La página de empresa o perfil debe estar en modo visible público.',
      refill_days: 30,
      refill_conditions: 'Garantía de reposición de 30 días previa revisión del perfil.',
      cancellation_conditions: 'Cancelable si aún no ha iniciado despacho manual.',
      provider_name: 'SMM_PWR',
      provider_service_id: '401',
      provider_cost_usd: 4.50,
      status: 'PUBLISHED'
    }
  ];

  for (const s of initialServices) {
    insertStmt.run(
      s.id, s.title, s.platform, s.category, s.description, s.order_type,
      s.min_quantity, s.max_quantity, s.price_per_1000, s.url_pattern, s.url_placeholder,
      s.delivery_time_hours, s.delivery_conditions, s.refill_days, s.refill_conditions,
      s.cancellation_conditions, s.provider_name, s.provider_service_id, s.provider_cost_usd,
      s.status, now, now
    );
  }
}

function seedInitialConfig() {
  const configs = [
    { key: 'STORE_NAME', value: 'PotenciaRedes Chile', desc: 'Nombre comercial de la tienda' },
    { key: 'COUNTRY', value: 'Chile', desc: 'País de operación comercial' },
    { key: 'CURRENCY', value: 'CLP', desc: 'Moneda oficial de facturación' },
    { key: 'TRANSFER_DISCOUNT_PERCENT', value: '5', desc: 'Porcentaje de descuento para transferencias Tenpo' },
    // Datos de la cuenta Tenpo (Centralizados en servidor, editables en panel)
    { key: 'TENPO_BENEFICIARY_NAME', value: 'PotenciaRedes SpA (en trámite) / Rodrigo Gálvez', desc: 'Nombre del titular de la cuenta' },
    { key: 'TENPO_RUT', value: '18.492.381-K', desc: 'RUT del titular de la cuenta' },
    { key: 'TENPO_BANK', value: 'Tenpo Prepago (Tenpo SpA)', desc: 'Institución financiera receptora' },
    { key: 'TENPO_ACCOUNT_TYPE', value: 'Cuenta Vista / Prepago', desc: 'Tipo de cuenta bancaria' },
    { key: 'TENPO_ACCOUNT_NUMBER', value: '88102938192', desc: 'Número de cuenta' },
    { key: 'TENPO_EMAIL', value: 'pagos@potenciaredes.cl', desc: 'Correo para comprobantes' },
    { key: 'SUPPORT_WHATSAPP', value: '+56987654321', desc: 'WhatsApp oficial de soporte' },
    { key: 'SUPPORT_EMAIL', value: 'soporte@potenciaredes.cl', desc: 'Email de atención a clientes' },
    // Estado de integraciones
    { key: 'WEBPAY_ENVIRONMENT', value: 'INTEGRATION', desc: 'Ambiente Webpay Plus: INTEGRATION o PRODUCTION' },
    { key: 'WEBPAY_COMMERCE_CODE', value: '597055555532', desc: 'Código de comercio Transbank (test predeterminado)' },
    { key: 'SMM_PWR_AUTOMATION_ENABLED', value: 'false', desc: 'Bloqueo de seguridad: V1 no ejecuta compras automáticas' },
    { key: 'SMM_PWR_API_URL', value: 'https://smmpwr.com/api/v2', desc: 'URL API oficial SMM PWR' }
  ];

  const checkStmt = db.prepare('SELECT key FROM system_config WHERE key = ?');
  const insertStmt = db.prepare('INSERT INTO system_config (key, value, description, updated_at) VALUES (?, ?, ?, ?)');
  const now = new Date().toISOString();

  for (const c of configs) {
    const existing = checkStmt.get(c.key);
    if (!existing) {
      insertStmt.run(c.key, c.value, c.desc, now);
    }
  }
}

import crypto from 'node:crypto';

function seedDefaultAdmin() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM admin_users');
  const res = countStmt.get() as { count: number };
  if (res.count > 0) return;

  const salt = crypto.randomBytes(16).toString('hex');
  // Hash para la contraseña predeterminada de inicialización en desarrollo: 'PulsoRedAdmin2026!'
  // En producción se requiere cambio obligatorio
  const password = process.env.ADMIN_INITIAL_PASSWORD || 'PulsoRedAdmin2026!';
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO admin_users (id, username, password_hash, salt, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('admin-root', 'admin', hash, salt, 'ADMIN', now);
}
