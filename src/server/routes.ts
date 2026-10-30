/**
 * Rutas de API REST - PulsoRed Chile
 * Incluye endpoints públicos de catálogo, cotización, pedidos, seguimiento por token,
 * pasarela Webpay Plus, reporte de transferencias Tenpo y panel de administración auditable.
 */
import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db } from './db.js';
import { calculateOrderPricing } from './pricing.js';
import {
  validateDestinationUrl,
  generateTrackingToken,
  generateOrderReference,
  verifyPassword,
  checkRateLimit,
  isValidEmail
} from './security.js';
import { webpayService } from './webpay.js';
import { smmClient } from './providers/smmProvider.js';

export const apiRouter = Router();

// Cache simple de sesiones administrativas en memoria con caducidad
interface AdminSession {
  token: string;
  username: string;
  role: string;
  expiresAt: number;
}
const activeSessions = new Map<string, AdminSession>();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Se requiere token de sesión administrativa.' });
  }

  const token = authHeader.slice(7).trim();
  const session = activeSessions.get(token);

  if (!session || Date.now() > session.expiresAt) {
    if (session) activeSessions.delete(token);
    return res.status(401).json({ error: 'Sesión expirada o inválida. Inicie sesión nuevamente.' });
  }

  // Extender sesión
  session.expiresAt = Date.now() + 4 * 60 * 60 * 1000; // 4 horas
  (req as any).adminUser = session;
  next();
}

/**
 * Registra una acción en la bitácora de auditoría inmutable
 */
function logAuditEvent(
  adminUser: string,
  action: string,
  entityType: string,
  entityId: string,
  prevState: any,
  newState: any,
  reason?: string,
  ip?: string
) {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO audit_logs (id, admin_user, action, entity_type, entity_id, previous_state, new_state, reason, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      adminUser,
      action,
      entityType,
      entityId,
      prevState ? JSON.stringify(prevState) : null,
      newState ? JSON.stringify(newState) : null,
      reason || null,
      ip || null,
      now
    );
  } catch (err) {
    console.error('Error al registrar auditoría:', err);
  }
}

// =========================================================================
// 1. ENDPOINTS PÚBLICOS
// =========================================================================

/**
 * Salud general del sistema y dependencias
 */
apiRouter.get('/health', (_req, res) => {
  const serviceCount = db.prepare('SELECT COUNT(*) as c FROM services').get() as { c: number };
  const ordersCount = db.prepare('SELECT COUNT(*) as c FROM orders').get() as { c: number };
  const webpayInfo = webpayService.getEnvironmentInfo();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'SQLite WAL (node:sqlite) Operational',
    metrics: {
      services: serviceCount.c,
      orders: ordersCount.c
    },
    integrations: {
      webpay: webpayInfo,
      smmPwr: {
        automationEnabled: smmClient.isAutomationEnabled,
        status: 'MANUAL_DISPATCH_ENFORCED',
        policy: 'No se realizan compras automáticas. Gestión manual por operador autorizada.'
      }
    }
  });
});

/**
 * Configuración comercial pública (Datos de transferencia Tenpo, contacto y políticas)
 */
apiRouter.get('/config/public', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM system_config').all() as { key: string; value: string }[];
  const configMap: Record<string, string> = {};
  for (const r of rows) {
    configMap[r.key] = r.value;
  }

  const webpayInfo = webpayService.getEnvironmentInfo();

  res.json({
    storeName: configMap['STORE_NAME'] || 'PulsoRed Chile',
    country: configMap['COUNTRY'] || 'Chile',
    currency: configMap['CURRENCY'] || 'CLP',
    transferDiscountPercent: Number(configMap['TRANSFER_DISCOUNT_PERCENT'] || '5'),
    bankDetails: {
      beneficiaryName: configMap['TENPO_BENEFICIARY_NAME'] || 'Rodrigo Gálvez / PulsoRed SpA',
      rut: configMap['TENPO_RUT'] || '18.492.381-K',
      bankName: configMap['TENPO_BANK'] || 'Tenpo Prepago (Tenpo SpA)',
      accountType: configMap['TENPO_ACCOUNT_TYPE'] || 'Cuenta Vista / Prepago',
      accountNumber: configMap['TENPO_ACCOUNT_NUMBER'] || '88102938192',
      email: configMap['TENPO_EMAIL'] || 'pagos@pulsorad.cl'
    },
    support: {
      whatsapp: configMap['SUPPORT_WHATSAPP'] || '+56987654321',
      email: configMap['SUPPORT_EMAIL'] || 'soporte@pulsorad.cl'
    },
    webpay: webpayInfo,
    legalNotice: {
      status: 'BORRADOR_EN_REVISION',
      text: 'Los términos legales y condiciones tributarias de facturación se encuentran en proceso de formalización ante el SII y Transbank.'
    }
  });
});

/**
 * Catálogo público de servicios (Excluye campos confidenciales de costo y proveedor)
 */
apiRouter.get('/services', (_req, res) => {
  const services = db.prepare(`
    SELECT
      id, title, platform, category, description, order_type,
      min_quantity, max_quantity, price_per_1000, url_pattern, url_placeholder,
      delivery_time_hours, delivery_conditions, refill_days, refill_conditions,
      cancellation_conditions, status, updated_at
    FROM services
    WHERE status = 'PUBLISHED'
    ORDER BY platform ASC, price_per_1000 ASC
  `).all();

  res.json(services);
});

/**
 * Detalle de un servicio específico
 */
apiRouter.get('/services/:id', (req, res) => {
  const service = db.prepare(`
    SELECT
      id, title, platform, category, description, order_type,
      min_quantity, max_quantity, price_per_1000, url_pattern, url_placeholder,
      delivery_time_hours, delivery_conditions, refill_days, refill_conditions,
      cancellation_conditions, status, updated_at
    FROM services
    WHERE id = ? AND status = 'PUBLISHED'
  `).get(req.params.id);

  if (!service) {
    return res.status(404).json({ error: 'Servicio no encontrado o no disponible.' });
  }

  res.json(service);
});

/**
 * Cotización certificada calculada estrictamente en el servidor
 */
apiRouter.post('/orders/quote', (req, res) => {
  const { serviceId, quantity, paymentMethod } = req.body;

  if (!serviceId || typeof quantity !== 'number' || !paymentMethod) {
    return res.status(400).json({ error: 'Parámetros incompletos para cotización.' });
  }

  if (paymentMethod !== 'TENPO_TRANSFER' && paymentMethod !== 'WEBPAY_PLUS') {
    return res.status(400).json({ error: 'Método de pago no válido.' });
  }

  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId) as any;
  if (!service) {
    return res.status(404).json({ error: 'Servicio no encontrado.' });
  }

  if (service.status !== 'PUBLISHED') {
    return res.status(400).json({ error: 'El servicio seleccionado se encuentra pausado temporalmente.' });
  }

  if (quantity < service.min_quantity || quantity > service.max_quantity) {
    return res.status(400).json({
      error: `La cantidad debe estar entre ${service.min_quantity.toLocaleString('es-CL')} y ${service.max_quantity.toLocaleString('es-CL')} unidades.`
    });
  }

  const pricing = calculateOrderPricing(quantity, service.price_per_1000, paymentMethod);

  res.json({
    serviceId: service.id,
    serviceTitle: service.title,
    quantity,
    pricePer1000: service.price_per_1000,
    paymentMethod,
    ...pricing,
    currency: 'CLP',
    discountPercent: paymentMethod === 'TENPO_TRANSFER' ? 5 : 0
  });
});

/**
 * Creación de Pedido con captura inmutable de instantánea
 */
apiRouter.post('/orders', (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const isLocalDev = clientIp === '127.0.0.1' || clientIp === '::1' || process.env.NODE_ENV !== 'production';
  const orderLimit = isLocalDev ? 500 : 25;

  // Mitigación antiabuso / rate-limiting
  if (!checkRateLimit(`create_order_${clientIp}`, orderLimit, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes de pedido. Intente nuevamente más tarde.' });
  }

  const {
    serviceId,
    quantity,
    destinationUrl,
    customerName,
    customerEmail,
    customerWhatsapp,
    paymentMethod,
    termsAccepted
  } = req.body;

  // Validaciones obligatorias de entrada
  if (!serviceId || !quantity || !destinationUrl || !customerName || !customerEmail || !paymentMethod) {
    return res.status(400).json({ error: 'Todos los campos obligatorios deben ser completados.' });
  }

  if (!termsAccepted) {
    return res.status(400).json({ error: 'Debe aceptar los términos comerciales y condiciones de entrega para continuar.' });
  }

  if (!isValidEmail(customerEmail)) {
    return res.status(400).json({ error: 'El correo electrónico ingresado no tiene un formato válido.' });
  }

  if (paymentMethod !== 'TENPO_TRANSFER' && paymentMethod !== 'WEBPAY_PLUS') {
    return res.status(400).json({ error: 'Método de pago inválido.' });
  }

  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId) as any;
  if (!service) {
    return res.status(404).json({ error: 'El servicio solicitado no existe.' });
  }

  if (service.status !== 'PUBLISHED') {
    return res.status(400).json({ error: 'Este servicio está actualmente pausado para nuevas órdenes.' });
  }

  const qty = Math.floor(Number(quantity));
  if (isNaN(qty) || qty < service.min_quantity || qty > service.max_quantity) {
    return res.status(400).json({
      error: `Cantidad fuera de rango permitido (${service.min_quantity.toLocaleString('es-CL')} - ${service.max_quantity.toLocaleString('es-CL')}).`
    });
  }

  // Validación de seguridad de la URL de destino
  const urlCheck = validateDestinationUrl(destinationUrl, service.platform, service.url_pattern);
  if (!urlCheck.valid) {
    return res.status(400).json({ error: urlCheck.error });
  }

  // Cálculo de precio en servidor garantizado
  const pricing = calculateOrderPricing(qty, service.price_per_1000, paymentMethod);

  const orderId = crypto.randomUUID();
  const reference = generateOrderReference();
  const trackingToken = generateTrackingToken(); // 64-char hex de alta entropía
  const now = new Date().toISOString();

  // Transacción ACID para asegurar orden + instantánea indivisible
  try {
    db.exec('BEGIN TRANSACTION;');

    db.prepare(`
      INSERT INTO orders (
        id, reference, tracking_token, customer_email, customer_name, customer_whatsapp,
        destination_url, service_id, quantity, payment_method, public_price,
        discount_amount, final_price, payment_status, delivery_status, terms_accepted,
        ip_address, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, 'PENDING', 'UNSENT', 1,
        ?, ?, ?
      )
    `).run(
      orderId,
      reference,
      trackingToken,
      customerEmail.trim(),
      customerName.trim(),
      customerWhatsapp ? String(customerWhatsapp).trim() : null,
      destinationUrl.trim(),
      service.id,
      qty,
      paymentMethod,
      pricing.publicPrice,
      pricing.discountAmount,
      pricing.finalPrice,
      clientIp,
      now,
      now
    );

    // Registro de Instantánea Inmutable
    const snapshotId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO service_snapshots (
        id, order_id, service_id, title, platform, category,
        unit_price_clp, quantity, delivery_conditions, refill_conditions,
        cancellation_conditions, captured_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
    `).run(
      snapshotId,
      orderId,
      service.id,
      service.title,
      service.platform,
      service.category,
      service.price_per_1000,
      qty,
      service.delivery_conditions,
      service.refill_conditions,
      service.cancellation_conditions,
      now
    );

    // Registro de Notificación interna en cola
    const notifId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, order_id, recipient, channel, event_type, status, payload, created_at)
      VALUES (?, ?, ?, 'EMAIL', 'ORDER_CREATED', 'SENT', ?, ?)
    `).run(
      notifId,
      orderId,
      customerEmail.trim(),
      JSON.stringify({ reference, finalPrice: pricing.finalPrice, serviceTitle: service.title }),
      now
    );

    db.exec('COMMIT;');

    res.status(201).json({
      orderId,
      reference,
      trackingToken,
      trackingUrl: `/seguimiento?token=${trackingToken}`,
      finalPrice: pricing.finalPrice,
      publicPrice: pricing.publicPrice,
      discountAmount: pricing.discountAmount,
      paymentMethod,
      serviceTitle: service.title,
      quantity: qty
    });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    console.error('Error al crear pedido en base de datos:', err);
    res.status(500).json({ error: 'Ocurrió un error al registrar el pedido. Intente nuevamente.' });
  }
});

/**
 * Consulta de Seguimiento Privado
 * SEGURIDAD: REQUIERE token criptográfico de alta entropía.
 * Prohibido consultar órdenes solo por ID secuencial o email.
 */
apiRouter.get('/orders/track', (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  // Mitigar enumeración de tokens con rate limiting
  if (!checkRateLimit(`track_${clientIp}`, 60, 60 * 1000)) {
    return res.status(429).json({ error: 'Demasiadas consultas de seguimiento. Espere un momento.' });
  }

  const token = req.query.token as string;
  if (!token || typeof token !== 'string' || token.length < 32) {
    return res.status(400).json({
      error: 'Se requiere un enlace privado con token de seguridad válido para consultar el seguimiento.'
    });
  }

  const order = db.prepare(`
    SELECT
      id, reference, tracking_token, customer_email, customer_name,
      destination_url, service_id, quantity, payment_method, public_price,
      discount_amount, final_price, payment_status, delivery_status,
      created_at, updated_at
    FROM orders
    WHERE tracking_token = ?
  `).get(token) as any;

  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado. Verifique el enlace recibido por correo.' });
  }

  // Obtener instantánea del servicio
  const snapshot = db.prepare('SELECT * FROM service_snapshots WHERE order_id = ?').get(order.id) as any;

  // Obtener movimientos bancarios reportados (si aplica)
  const transfer = db.prepare('SELECT * FROM bank_transfers WHERE order_id = ? ORDER BY created_at DESC LIMIT 1').get(order.id) as any;

  // Obtener despachos de proveedor asociados
  const dispatch = db.prepare('SELECT provider_name, status, created_at FROM provider_dispatches WHERE order_id = ? ORDER BY created_at DESC LIMIT 1').get(order.id) as any;

  // Censurar parcialmente el email para privacidad (j***@domain.com)
  const emailParts = order.customer_email.split('@');
  const maskedEmail = emailParts[0].slice(0, 2) + '***@' + (emailParts[1] || '');

  res.json({
    order: {
      id: order.id,
      reference: order.reference,
      trackingToken: order.tracking_token,
      customerName: order.customer_name,
      maskedEmail,
      destinationUrl: order.destination_url,
      quantity: order.quantity,
      paymentMethod: order.payment_method,
      publicPrice: order.public_price,
      discountAmount: order.discount_amount,
      finalPrice: order.final_price,
      paymentStatus: order.payment_status,
      deliveryStatus: order.delivery_status,
      createdAt: order.created_at,
      updatedAt: order.updated_at
    },
    snapshot: snapshot || null,
    transferReport: transfer ? {
      status: transfer.status,
      reportedAmount: transfer.reported_amount,
      reportedSenderName: transfer.reported_sender_name,
      createdAt: transfer.created_at,
      verifiedAt: transfer.verified_at
    } : null,
    dispatchStatus: dispatch ? {
      status: dispatch.status,
      createdAt: dispatch.created_at
    } : null
  });
});

/**
 * Cliente informa transferencia bancaria ("Ya transferí")
 * ESTRICTO: Pasa el estado a 'REPORTED' (Pago informado / pendiente de revisión).
 * NUNCA confirma el pago automáticamente.
 */
apiRouter.post('/orders/report-transfer', (req, res) => {
  const { trackingToken, senderName, reportedAmount, bankName, referenceNote } = req.body;

  if (!trackingToken || typeof trackingToken !== 'string') {
    return res.status(400).json({ error: 'Token de pedido inválido.' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE tracking_token = ?').get(trackingToken) as any;
  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado.' });
  }

  if (order.payment_status === 'CONFIRMED') {
    return res.status(400).json({ error: 'Este pedido ya cuenta con un pago verificado y confirmado.' });
  }

  const parsedAmount = Math.floor(Number(reportedAmount));
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Debe ingresar el monto exacto transferido.' });
  }

  const now = new Date().toISOString();
  const transferId = crypto.randomUUID();

  try {
    db.exec('BEGIN TRANSACTION;');

    db.prepare(`
      INSERT INTO bank_transfers (
        id, order_id, reported_amount, reported_sender_name, reported_bank,
        reported_reference, customer_notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'REPORTED', ?, ?)
    `).run(
      transferId,
      order.id,
      parsedAmount,
      senderName ? String(senderName).trim() : null,
      bankName ? String(bankName).trim() : null,
      referenceNote ? String(referenceNote).trim() : null,
      'Cliente notificó transferencia desde interfaz web',
      now,
      now
    );

    // Cambiar estado a REPORTED (Pago informado / pendiente de revisión)
    db.prepare(`
      UPDATE orders
      SET payment_status = 'REPORTED', updated_at = ?
      WHERE id = ?
    `).run(now, order.id);

    db.exec('COMMIT;');

    res.json({
      success: true,
      message: 'Transferencia informada con éxito. Un operador verificará el ingreso en la cuenta Tenpo.',
      newPaymentStatus: 'REPORTED'
    });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    console.error('Error al registrar informe de transferencia:', err);
    res.status(500).json({ error: 'Error al registrar informe. Intente de nuevo.' });
  }
});

// =========================================================================
// 2. PASARELA WEBPAY PLUS (TRANSBANK)
// =========================================================================

/**
 * Inicialización de transacción Webpay Plus
 */
apiRouter.post('/webpay/create', async (req, res) => {
  const { trackingToken } = req.body;

  if (!trackingToken) {
    return res.status(400).json({ error: 'Token de seguimiento obligatorio.' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE tracking_token = ?').get(trackingToken) as any;
  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado.' });
  }

  if (order.payment_status === 'CONFIRMED') {
    return res.status(400).json({ error: 'Este pedido ya está pagado.' });
  }

  const envInfo = webpayService.getEnvironmentInfo();
  if (envInfo.isProduction && !envInfo.isConfigured) {
    return res.status(503).json({
      error: 'Webpay Plus en producción se encuentra temporalmente en desarrollo (pendiente validación de rubro y contrato Transbank).'
    });
  }

  try {
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const returnUrl = `${appUrl}/api/webpay/return`;
    const sessionId = `SES_${order.id.slice(0, 8)}_${Date.now()}`;

    const tx = await webpayService.createTransaction(
      order.reference,
      sessionId,
      order.final_price,
      returnUrl
    );

    const attemptId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO payment_attempts (
        id, order_id, payment_method, tbk_token, amount, currency, status, created_at, updated_at
      ) VALUES (?, ?, 'WEBPAY_PLUS', ?, ?, 'CLP', 'INITIALIZED', ?, ?)
    `).run(attemptId, order.id, tx.token, order.final_price, now, now);

    res.json({
      token: tx.token,
      url: tx.url,
      environment: tx.environment
    });
  } catch (err: any) {
    console.error('Error al iniciar Webpay:', err);
    res.status(500).json({ error: err.message || 'Error al conectar con Transbank Webpay Plus.' });
  }
});

/**
 * Retorno oficial de Webpay Plus (Transbank redirige aquí con POST o GET token_ws)
 */
apiRouter.all('/webpay/return', async (req, res) => {
  const tokenWs = (req.body?.token_ws || req.query?.token_ws) as string;
  const tbkToken = (req.body?.TBK_TOKEN || req.query?.TBK_TOKEN) as string;

  // Caso 1: Usuario abortó el pago en formulario de Webpay (TBK_TOKEN presente o token_ws ausente)
  if (!tokenWs && tbkToken) {
    const attempt = db.prepare('SELECT * FROM payment_attempts WHERE tbk_token = ?').get(tbkToken) as any;
    if (attempt) {
      db.prepare("UPDATE payment_attempts SET status = 'ABORTED', updated_at = ? WHERE tbk_token = ?")
        .run(new Date().toISOString(), tbkToken);
      const order = db.prepare('SELECT tracking_token FROM orders WHERE id = ?').get(attempt.order_id) as any;
      return res.redirect(`/webpay-resultado?status=ABORTED&token=${order?.tracking_token || ''}`);
    }
    return res.redirect('/webpay-resultado?status=ABORTED');
  }

  if (!tokenWs) {
    return res.redirect('/webpay-resultado?status=ERROR&msg=Token_de_transaccion_ausente');
  }

  // Buscar intento correspondiente
  const attempt = db.prepare('SELECT * FROM payment_attempts WHERE tbk_token = ?').get(tokenWs) as any;
  if (!attempt) {
    return res.redirect('/webpay-resultado?status=NOT_FOUND');
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(attempt.order_id) as any;
  if (!order) {
    return res.redirect('/webpay-resultado?status=ORDER_NOT_FOUND');
  }

  // Idempotencia: si ya estaba confirmada, redirigir sin volver a comprometer
  if (attempt.status === 'AUTHORIZED' && order.payment_status === 'CONFIRMED') {
    return res.redirect(`/webpay-resultado?status=AUTHORIZED&token=${order.tracking_token}`);
  }

  try {
    // Commit oficial con Transbank
    const commit = await webpayService.commitTransaction(tokenWs);
    const now = new Date().toISOString();

    if (commit.status === 'AUTHORIZED' && commit.amount === order.final_price) {
      db.exec('BEGIN TRANSACTION;');

      db.prepare(`
        UPDATE payment_attempts
        SET status = 'AUTHORIZED', authorization_code = ?, payment_type_code = ?,
            card_number = ?, response_code = ?, raw_response = ?, updated_at = ?
        WHERE tbk_token = ?
      `).run(
        commit.authorization_code || '',
        commit.payment_type_code || '',
        commit.card_detail?.card_number || '',
        commit.response_code,
        JSON.stringify(commit),
        now,
        tokenWs
      );

      db.prepare(`
        UPDATE orders
        SET payment_status = 'CONFIRMED', delivery_status = 'READY_FOR_DISPATCH', updated_at = ?
        WHERE id = ?
      `).run(now, order.id);

      // Registrar notificación de confirmación
      db.prepare(`
        INSERT INTO notifications (id, order_id, recipient, channel, event_type, status, payload, created_at)
        VALUES (?, ?, ?, 'EMAIL', 'PAYMENT_CONFIRMED', 'SENT', ?, ?)
      `).run(
        crypto.randomUUID(),
        order.id,
        order.customer_email,
        JSON.stringify({ reference: order.reference, amount: order.final_price, authCode: commit.authorization_code }),
        now
      );

      db.exec('COMMIT;');
      return res.redirect(`/webpay-resultado?status=AUTHORIZED&token=${order.tracking_token}&auth=${commit.authorization_code}`);
    } else {
      // Rechazado o monto discordante
      db.prepare(`
        UPDATE payment_attempts
        SET status = 'REJECTED', response_code = ?, raw_response = ?, updated_at = ?
        WHERE tbk_token = ?
      `).run(commit.response_code, JSON.stringify(commit), now, tokenWs);

      return res.redirect(`/webpay-resultado?status=REJECTED&token=${order.tracking_token}&code=${commit.response_code}`);
    }
  } catch (err: any) {
    console.error('Error procesando commit Webpay:', err);
    return res.redirect(`/webpay-resultado?status=ERROR&token=${order.tracking_token}`);
  }
});

// =========================================================================
// 3. PANEL ADMINISTRATIVO PRIVADO
// =========================================================================

/**
 * Autenticación administrativa con scrypt y verificación timing-safe
 */
apiRouter.post('/admin/login', (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  // Mitigación estricta de fuerza bruta (máximo 5 intentos por cada 5 minutos)
  if (!checkRateLimit(`admin_login_${clientIp}`, 5, 5 * 60 * 1000)) {
    return res.status(429).json({ error: 'Demasiados intentos de acceso fallidos. Bloqueado temporalmente por 5 minutos.' });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });
  }

  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username.trim()) as any;
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  // Generar token de sesión seguro (64 caracteres)
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 4 * 60 * 60 * 1000; // 4 horas de validez

  activeSessions.set(sessionToken, {
    token: sessionToken,
    username: user.username,
    role: user.role,
    expiresAt
  });

  logAuditEvent(user.username, 'ADMIN_LOGIN', 'admin_users', user.id, null, { success: true }, 'Inicio de sesión exitoso', clientIp);

  res.json({
    token: sessionToken,
    username: user.username,
    role: user.role,
    expiresAt
  });
});

apiRouter.post('/admin/logout', requireAdmin, (req, res) => {
  const token = req.headers.authorization?.slice(7).trim();
  if (token) activeSessions.delete(token);
  res.json({ success: true });
});

apiRouter.get('/admin/me', requireAdmin, (req, res) => {
  const session = (req as any).adminUser as AdminSession;
  res.json({
    username: session.username,
    role: session.role
  });
});

/**
 * Métricas reales del Dashboard Administrativo
 */
apiRouter.get('/admin/dashboard', requireAdmin, (_req, res) => {
  const totalOrders = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as any).count;
  const pendingTransfers = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE payment_status = 'REPORTED'").get() as any).count;
  const readyForDispatch = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE delivery_status = 'READY_FOR_DISPATCH'").get() as any).count;
  const revenueResult = db.prepare("SELECT SUM(final_price) as total FROM orders WHERE payment_status = 'CONFIRMED'").get() as any;
  const totalRevenue = revenueResult?.total || 0;

  // Últimos pedidos
  const recentOrders = db.prepare(`
    SELECT o.id, o.reference, o.customer_name, o.final_price, o.payment_method,
           o.payment_status, o.delivery_status, o.created_at, s.title as service_title
    FROM orders o
    LEFT JOIN services s ON o.service_id = s.id
    ORDER BY o.created_at DESC
    LIMIT 8
  `).all();

  res.json({
    metrics: {
      totalOrders,
      pendingTransfers,
      readyForDispatch,
      totalRevenueCLP: totalRevenue
    },
    recentOrders
  });
});

/**
 * Listado completo de pedidos con filtros
 */
apiRouter.get('/admin/orders', requireAdmin, (req, res) => {
  const { paymentStatus, deliveryStatus, search } = req.query;

  let query = `
    SELECT
      o.id, o.reference, o.tracking_token, o.customer_email, o.customer_name,
      o.customer_whatsapp, o.destination_url, o.quantity, o.payment_method,
      o.public_price, o.discount_amount, o.final_price, o.payment_status,
      o.delivery_status, o.created_at, o.updated_at,
      s.title as service_title, s.platform
    FROM orders o
    LEFT JOIN services s ON o.service_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (paymentStatus) {
    query += ' AND o.payment_status = ?';
    params.push(paymentStatus);
  }

  if (deliveryStatus) {
    query += ' AND o.delivery_status = ?';
    params.push(deliveryStatus);
  }

  if (search) {
    query += ' AND (o.reference LIKE ? OR o.customer_email LIKE ? OR o.customer_name LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY o.created_at DESC LIMIT 100';

  const orders = db.prepare(query).all(...params);
  res.json(orders);
});

/**
 * Detalle profundo de una orden para el administrador
 */
apiRouter.get('/admin/orders/:id', requireAdmin, (req, res) => {
  const order = db.prepare(`
    SELECT o.*, s.title as service_title, s.provider_name, s.provider_service_id, s.provider_cost_usd
    FROM orders o
    LEFT JOIN services s ON o.service_id = s.id
    WHERE o.id = ?
  `).get(req.params.id) as any;

  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado.' });
  }

  const snapshot = db.prepare('SELECT * FROM service_snapshots WHERE order_id = ?').get(order.id);
  const transfers = db.prepare('SELECT * FROM bank_transfers WHERE order_id = ? ORDER BY created_at DESC').all(order.id);
  const paymentAttempts = db.prepare('SELECT * FROM payment_attempts WHERE order_id = ? ORDER BY created_at DESC').all(order.id);
  const dispatches = db.prepare('SELECT * FROM provider_dispatches WHERE order_id = ? ORDER BY created_at DESC').all(order.id);
  const auditTrail = db.prepare('SELECT * FROM audit_logs WHERE entity_id = ? ORDER BY created_at DESC').all(order.id);

  res.json({
    order,
    snapshot,
    transfers,
    paymentAttempts,
    dispatches,
    auditTrail
  });
});

/**
 * Verificación manual de transferencia bancaria Tenpo por el administrador
 * Reglas de negocio:
 * - Registra al operador responsable, fecha/hora, monto verificado recibido y notas.
 * - Requiere IDENTIFICADOR DE MOVIMIENTO BANCARIO ÚNICO (impide reutilizar transferencias).
 * - Actualiza pago a 'CONFIRMED' y entrega a 'READY_FOR_DISPATCH'.
 */
apiRouter.post('/admin/orders/:id/verify-transfer', requireAdmin, (req, res) => {
  const admin = (req as any).adminUser as AdminSession;
  const { verifiedAmount, bankMovementId, adminNotes } = req.body;

  if (!verifiedAmount || !bankMovementId) {
    return res.status(400).json({ error: 'Debe ingresar el monto verificado y el ID único del movimiento bancario Tenpo.' });
  }

  const cleanMovementId = String(bankMovementId).trim();
  if (cleanMovementId.length < 3) {
    return res.status(400).json({ error: 'El ID de movimiento bancario no es válido.' });
  }

  // Comprobar que este ID de movimiento no haya sido usado jamás para otro pedido
  const existingTransfer = db.prepare('SELECT * FROM bank_transfers WHERE bank_movement_id = ?').get(cleanMovementId) as any;
  if (existingTransfer) {
    return res.status(400).json({
      error: `El ID de movimiento bancario "${cleanMovementId}" ya fue conciliado anteriormente en el pedido ${existingTransfer.order_id}. No es posible reutilizar comprobantes bancarios.`
    });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado.' });
  }

  const now = new Date().toISOString();
  const transferAmount = Math.floor(Number(verifiedAmount));

  try {
    db.exec('BEGIN TRANSACTION;');

    // Buscar si existe un reporte previo de cliente o crear uno nuevo
    const existingReport = db.prepare('SELECT id FROM bank_transfers WHERE order_id = ? ORDER BY created_at DESC LIMIT 1').get(order.id) as any;

    if (existingReport) {
      db.prepare(`
        UPDATE bank_transfers
        SET verified_by = ?, verified_at = ?, verified_amount = ?,
            bank_movement_id = ?, admin_notes = ?, status = 'VERIFIED', updated_at = ?
        WHERE id = ?
      `).run(
        admin.username,
        now,
        transferAmount,
        cleanMovementId,
        adminNotes || 'Verificación manual realizada',
        now,
        existingReport.id
      );
    } else {
      const newTransferId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO bank_transfers (
          id, order_id, reported_amount, verified_by, verified_at, verified_amount,
          bank_movement_id, admin_notes, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?, ?)
      `).run(
        newTransferId,
        order.id,
        transferAmount,
        admin.username,
        now,
        transferAmount,
        cleanMovementId,
        adminNotes || 'Verificado directamente por operador',
        now,
        now
      );
    }

    // Actualizar orden
    db.prepare(`
      UPDATE orders
      SET payment_status = 'CONFIRMED', delivery_status = 'READY_FOR_DISPATCH', updated_at = ?
      WHERE id = ?
    `).run(now, order.id);

    // Auditoría
    logAuditEvent(
      admin.username,
      'VERIFY_TENPO_TRANSFER',
      'orders',
      order.id,
      { payment_status: order.payment_status, delivery_status: order.delivery_status },
      { payment_status: 'CONFIRMED', delivery_status: 'READY_FOR_DISPATCH', movementId: cleanMovementId, verifiedAmount: transferAmount },
      adminNotes || 'Aprobación manual de pago por transferencia Tenpo',
      req.ip
    );

    db.exec('COMMIT;');

    res.json({
      success: true,
      message: 'Transferencia bancaria Tenpo verificada y conciliada exitosamente. El pedido pasó a cola de despacho.',
      orderId: order.id,
      paymentStatus: 'CONFIRMED',
      deliveryStatus: 'READY_FOR_DISPATCH'
    });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    console.error('Error al conciliar transferencia:', err);
    res.status(500).json({ error: err.message || 'Error al procesar la conciliación bancaria.' });
  }
});

/**
 * Registro de ejecución manual de compra en el proveedor (SMM PWR)
 * Guarda ID externo, costo, fecha y notas del operador.
 */
apiRouter.post('/admin/orders/:id/dispatch-record', requireAdmin, (req, res) => {
  const admin = (req as any).adminUser as AdminSession;
  const { providerName, externalOrderId, costAmount, costCurrency, notes } = req.body;

  if (!externalOrderId) {
    return res.status(400).json({ error: 'Debe ingresar el ID externo asignado por el proveedor.' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado.' });
  }

  const now = new Date().toISOString();
  const dispatchId = crypto.randomUUID();

  try {
    db.exec('BEGIN TRANSACTION;');

    db.prepare(`
      INSERT INTO provider_dispatches (
        id, order_id, provider_name, external_order_id, cost_amount, cost_currency,
        dispatch_mode, dispatched_by, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'MANUAL', ?, 'SENT', ?, ?, ?)
    `).run(
      dispatchId,
      order.id,
      providerName || 'SMM_PWR',
      String(externalOrderId).trim(),
      Number(costAmount || 0),
      costCurrency || 'USD',
      admin.username,
      notes || 'Despacho manual registrado por operador',
      now,
      now
    );

    db.prepare(`
      UPDATE orders
      SET delivery_status = 'DISPATCHED_TO_PROVIDER', updated_at = ?
      WHERE id = ?
    `).run(now, order.id);

    logAuditEvent(
      admin.username,
      'REGISTER_PROVIDER_DISPATCH',
      'orders',
      order.id,
      { delivery_status: order.delivery_status },
      { delivery_status: 'DISPATCHED_TO_PROVIDER', externalOrderId, costAmount },
      notes,
      req.ip
    );

    db.exec('COMMIT;');

    res.json({
      success: true,
      message: 'Ejecución en proveedor registrada correctamente.',
      deliveryStatus: 'DISPATCHED_TO_PROVIDER'
    });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    console.error('Error al registrar despacho:', err);
    res.status(500).json({ error: 'Error al registrar despacho.' });
  }
});

/**
 * Actualización de estado de entrega con motivo de auditoría
 */
apiRouter.post('/admin/orders/:id/status', requireAdmin, (req, res) => {
  const admin = (req as any).adminUser as AdminSession;
  const { deliveryStatus, reason } = req.body;

  const validStatuses = [
    'UNSENT',
    'READY_FOR_DISPATCH',
    'DISPATCHED_TO_PROVIDER',
    'IN_PROGRESS',
    'COMPLETED',
    'PARTIAL',
    'CANCELLED',
    'INCIDENT'
  ];

  if (!validStatuses.includes(deliveryStatus)) {
    return res.status(400).json({ error: 'Estado de entrega no válido.' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado.' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE orders SET delivery_status = ?, updated_at = ? WHERE id = ?').run(deliveryStatus, now, order.id);

  logAuditEvent(
    admin.username,
    'UPDATE_DELIVERY_STATUS',
    'orders',
    order.id,
    { delivery_status: order.delivery_status },
    { delivery_status: deliveryStatus },
    reason || 'Cambio manual de estado',
    req.ip
  );

  res.json({ success: true, newStatus: deliveryStatus });
});

/**
 * Gestión de Catálogo y Precios (Admin CRUD completo)
 */
apiRouter.get('/admin/services', requireAdmin, (_req, res) => {
  const services = db.prepare('SELECT * FROM services ORDER BY platform ASC, price_per_1000 ASC').all();
  res.json(services);
});

apiRouter.post('/admin/services', requireAdmin, (req, res) => {
  const admin = (req as any).adminUser as AdminSession;
  const {
    id,
    title,
    platform,
    category,
    description,
    order_type,
    min_quantity,
    max_quantity,
    price_per_1000,
    url_pattern,
    url_placeholder,
    delivery_time_hours,
    delivery_conditions,
    refill_days,
    refill_conditions,
    cancellation_conditions,
    provider_name,
    provider_service_id,
    provider_cost_usd,
    status
  } = req.body;

  if (!title || !platform || !category || !min_quantity || !max_quantity || !price_per_1000) {
    return res.status(400).json({ error: 'Faltan campos requeridos para crear el servicio.' });
  }

  const serviceId = id && String(id).trim() ? String(id).trim() : `srv-${Date.now()}`;
  const now = new Date().toISOString();

  try {
    db.prepare(`
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
    `).run(
      serviceId,
      title.trim(),
      platform,
      category,
      description || '',
      order_type || 'quantity',
      Number(min_quantity),
      Number(max_quantity),
      Number(price_per_1000),
      url_pattern || '',
      url_placeholder || '',
      Number(delivery_time_hours || 4),
      delivery_conditions || 'Entrega estándar progresiva.',
      Number(refill_days || 0),
      refill_conditions || 'Sin reposición garantizada.',
      cancellation_conditions || 'Cancelable antes de procesar.',
      provider_name || 'SMM_PWR',
      provider_service_id || '0',
      Number(provider_cost_usd || 0),
      status || 'PUBLISHED',
      now,
      now
    );

    logAuditEvent(
      admin.username,
      'CREATE_SERVICE',
      'services',
      serviceId,
      null,
      req.body,
      'Creación de nuevo servicio en catálogo',
      req.ip
    );

    res.status(201).json({ success: true, message: 'Servicio creado exitosamente.', serviceId });
  } catch (err: any) {
    console.error('Error al crear servicio:', err);
    res.status(500).json({ error: err.message || 'Error al guardar el servicio en base de datos.' });
  }
});

apiRouter.put('/admin/services/:id', requireAdmin, (req, res) => {
  const admin = (req as any).adminUser as AdminSession;
  const {
    title,
    platform,
    category,
    description,
    min_quantity,
    max_quantity,
    price_per_1000,
    url_pattern,
    url_placeholder,
    delivery_time_hours,
    delivery_conditions,
    refill_days,
    refill_conditions,
    cancellation_conditions,
    provider_name,
    provider_service_id,
    provider_cost_usd,
    status
  } = req.body;

  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Servicio no encontrado.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE services
    SET title = ?, platform = ?, category = ?, description = ?,
        price_per_1000 = ?, min_quantity = ?, max_quantity = ?,
        url_pattern = ?, url_placeholder = ?,
        delivery_time_hours = ?, delivery_conditions = ?, refill_days = ?, refill_conditions = ?,
        cancellation_conditions = ?, provider_name = ?, provider_service_id = ?, provider_cost_usd = ?,
        status = ?, updated_at = ?
    WHERE id = ?
  `).run(
    title || existing.title,
    platform || existing.platform,
    category || existing.category,
    description !== undefined ? description : existing.description,
    price_per_1000 !== undefined ? Number(price_per_1000) : existing.price_per_1000,
    min_quantity !== undefined ? Number(min_quantity) : existing.min_quantity,
    max_quantity !== undefined ? Number(max_quantity) : existing.max_quantity,
    url_pattern !== undefined ? url_pattern : existing.url_pattern,
    url_placeholder !== undefined ? url_placeholder : existing.url_placeholder,
    delivery_time_hours !== undefined ? Number(delivery_time_hours) : existing.delivery_time_hours,
    delivery_conditions !== undefined ? delivery_conditions : existing.delivery_conditions,
    refill_days !== undefined ? Number(refill_days) : existing.refill_days,
    refill_conditions !== undefined ? refill_conditions : existing.refill_conditions,
    cancellation_conditions !== undefined ? cancellation_conditions : existing.cancellation_conditions,
    provider_name !== undefined ? provider_name : existing.provider_name,
    provider_service_id !== undefined ? provider_service_id : existing.provider_service_id,
    provider_cost_usd !== undefined ? Number(provider_cost_usd) : existing.provider_cost_usd,
    status || existing.status,
    now,
    existing.id
  );

  logAuditEvent(
    admin.username,
    'UPDATE_SERVICE',
    'services',
    existing.id,
    existing,
    req.body,
    'Actualización de catálogo de servicios',
    req.ip
  );

  res.json({ success: true, message: 'Servicio actualizado correctamente.' });
});

apiRouter.delete('/admin/services/:id', requireAdmin, (req, res) => {
  const admin = (req as any).adminUser as AdminSession;
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Servicio no encontrado.' });
  }

  // Comprobar si existen órdenes vinculadas
  const orderCount = (db.prepare('SELECT COUNT(*) as c FROM orders WHERE service_id = ?').get(existing.id) as any).c;
  const now = new Date().toISOString();

  if (orderCount > 0) {
    // Si tiene órdenes históricas, archivar en vez de eliminar físicamente para preservar integridad referencial
    db.prepare("UPDATE services SET status = 'ARCHIVED', updated_at = ? WHERE id = ?").run(now, existing.id);
    logAuditEvent(admin.username, 'ARCHIVE_SERVICE', 'services', existing.id, existing, { status: 'ARCHIVED' }, 'Servicio archivado por tener pedidos históricos', req.ip);
    return res.json({ success: true, message: 'El servicio cuenta con pedidos históricos asociados y fue archivado en lugar de eliminado para proteger la integridad contable.' });
  }

  db.prepare('DELETE FROM services WHERE id = ?').run(existing.id);
  logAuditEvent(admin.username, 'DELETE_SERVICE', 'services', existing.id, existing, null, 'Eliminación permanente de servicio sin órdenes', req.ip);

  res.json({ success: true, message: 'Servicio eliminado correctamente.' });
});

/**
 * Registro de auditoría
 */
apiRouter.get('/admin/audit-logs', requireAdmin, (_req, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200').all();
  res.json(logs);
});

/**
 * Configuración comercial general (Edición de datos Tenpo, soporte, etc.)
 */
apiRouter.get('/admin/system-config', requireAdmin, (_req, res) => {
  const configs = db.prepare('SELECT * FROM system_config').all();
  res.json(configs);
});

apiRouter.put('/admin/system-config', requireAdmin, (req, res) => {
  const admin = (req as any).adminUser as AdminSession;
  const updates = req.body as Record<string, string>;
  const now = new Date().toISOString();

  // Bloqueo estricto: SMM_PWR_AUTOMATION_ENABLED no puede activarse sin requerimientos de producción
  if (updates['SMM_PWR_AUTOMATION_ENABLED'] === 'true') {
    return res.status(403).json({
      error: 'POLÍTICA BLOQUEADA: La compra automática con SMM PWR no está permitida en esta versión. Requiere auditoría de límites de gasto y autorización comercial previa.'
    });
  }

  const updateStmt = db.prepare('UPDATE system_config SET value = ?, updated_at = ? WHERE key = ?');

  for (const [key, value] of Object.entries(updates)) {
    updateStmt.run(value, now, key);
  }

  logAuditEvent(admin.username, 'UPDATE_SYSTEM_CONFIG', 'system_config', 'global', null, updates, 'Actualización de configuración comercial', req.ip);

  res.json({ success: true, message: 'Configuración actualizada.' });
});
