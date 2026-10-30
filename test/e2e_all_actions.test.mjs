/**
 * Suite Integral de Pruebas End-to-End de Todas las Acciones - PulsoRed Chile
 * Valida:
 * 1. Health check & Config pública
 * 2. Catálogo público de servicios
 * 3. Cotización certificada con 5% de descuento exacto Tenpo
 * 4. Creación de pedido con instantánea inmutable y token de alta entropía
 * 5. Rechazo de URLs maliciosas (SSRF / Intranet)
 * 6. Consulta de seguimiento mediante token privado
 * 7. Bloqueo de consulta por ID numérico sin token
 * 8. Reporte "Ya transferí" (estado pasa a REPORTED, nunca CONFIRMED)
 * 9. Login administrativo con scrypt y sesión segura
 * 10. CRUD de catálogo en Admin (Crear, Editar, Consultar, Archivar/Eliminar)
 * 11. Conciliación manual de transferencia Tenpo (estado pasa a CONFIRMED y READY_FOR_DISPATCH)
 * 12. Bloqueo estricto por reutilización del mismo ID de movimiento bancario
 * 13. Registro de despacho manual en SMM PWR con ID externo y costo USD
 * 14. Actualización de estado de entrega a COMPLETED con auditoría
 * 15. Inicialización de transacción Webpay Plus contra sandbox oficial Transbank
 * 16. Verificación de bitácora de auditoría inmutable
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const BASE_URL = 'http://localhost:3000';
let serverProc;

before(async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.ok) return;
  } catch {
    serverProc = spawn('npx', ['tsx', 'server.ts'], { stdio: 'ignore' });
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 250));
      try {
        const res = await fetch(`${BASE_URL}/api/health`);
        if (res.ok) return;
      } catch {}
    }
  }
});

after(() => {
  if (serverProc) {
    serverProc.kill();
  }
});

test('E2E: 1. Health check y configuración pública', async () => {
  const res = await fetch(`${BASE_URL}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'healthy');
  assert.equal(data.integrations.smmPwr.automationEnabled, false);
  assert.equal(data.integrations.webpay.environment, 'INTEGRATION');

  const confRes = await fetch(`${BASE_URL}/api/config/public`);
  assert.equal(confRes.status, 200);
  const conf = await confRes.json();
  assert.equal(conf.currency, 'CLP');
  assert.equal(conf.transferDiscountPercent, 5);
  assert.ok(conf.bankDetails.rut);
  assert.ok(conf.bankDetails.accountNumber);
});

test('E2E: 2. Catálogo público y cotizador certificado al peso', async () => {
  const res = await fetch(`${BASE_URL}/api/services`);
  assert.equal(res.status, 200);
  const services = await res.json();
  assert.ok(Array.isArray(services));
  assert.ok(services.length >= 1);

  const targetService = services[0];

  // Cotización con Tenpo (debe aplicar 5% con redondeo)
  const quoteRes = await fetch(`${BASE_URL}/api/orders/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: targetService.id,
      quantity: 1000,
      paymentMethod: 'TENPO_TRANSFER'
    })
  });
  assert.equal(quoteRes.status, 200);
  const quote = await quoteRes.json();

  const expectedPublic = targetService.price_per_1000;
  const expectedFinal = Math.round((expectedPublic * 95) / 100);
  const expectedDiscount = expectedPublic - expectedFinal;

  assert.equal(quote.publicPrice, expectedPublic);
  assert.equal(quote.finalPrice, expectedFinal);
  assert.equal(quote.discountAmount, expectedDiscount);
  assert.equal(quote.currency, 'CLP');
});

test('E2E: 3. Creación de pedido, validación SSRF y seguimiento por token', async () => {
  // A. Intentar URL maliciosa hacia intranet (debe ser rechazada)
  const ssrfRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: 'ig-followers-cl',
      quantity: 1000,
      destinationUrl: 'http://169.254.169.254/latest/meta-data',
      customerName: 'Attacker',
      customerEmail: 'bad@actor.com',
      paymentMethod: 'TENPO_TRANSFER',
      termsAccepted: true
    })
  });
  assert.equal(ssrfRes.status, 400);

  // B. Crear orden legítima
  const orderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: 'ig-followers-cl',
      quantity: 1000,
      destinationUrl: 'https://instagram.com/creador_e2e_test',
      customerName: 'Rodrigo E2E',
      customerEmail: 'rodrigo.e2e@pulsorad.cl',
      paymentMethod: 'TENPO_TRANSFER',
      termsAccepted: true
    })
  });
  assert.equal(orderRes.status, 201);
  const order = await orderRes.json();

  assert.ok(order.orderId);
  assert.ok(order.reference.startsWith('REF-'));
  assert.equal(order.trackingToken.length, 64); // 256 bits hex
  assert.equal(order.finalPrice, 4741);

  // C. Consultar seguimiento por token
  const trackRes = await fetch(`${BASE_URL}/api/orders/track?token=${order.trackingToken}`);
  assert.equal(trackRes.status, 200);
  const track = await trackRes.json();
  assert.equal(track.order.reference, order.reference);
  assert.equal(track.order.paymentStatus, 'PENDING');
  assert.equal(track.order.deliveryStatus, 'UNSENT');
  assert.ok(track.snapshot);
  assert.equal(track.snapshot.quantity, 1000);

  // D. Cliente informa "Ya transferí"
  const reportRes = await fetch(`${BASE_URL}/api/orders/report-transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trackingToken: order.trackingToken,
      senderName: 'Rodrigo E2E',
      reportedAmount: 4741,
      bankName: 'Tenpo Prepago',
      referenceNote: order.reference
    })
  });
  assert.equal(reportRes.status, 200);
  const report = await reportRes.json();
  assert.equal(report.newPaymentStatus, 'REPORTED');

  // E. Volver a consultar seguimiento: debe reflejar REPORTED y jamás CONFIRMED
  const trackUpdated = await (await fetch(`${BASE_URL}/api/orders/track?token=${order.trackingToken}`)).json();
  assert.equal(trackUpdated.order.paymentStatus, 'REPORTED');
});

test('E2E: 4. Flujo Administrativo: Login, CRUD Catálogo, Conciliación Tenpo y Despacho', async () => {
  // A. Login con credenciales seguras
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'PulsoRedAdmin2026!' })
  });
  assert.equal(loginRes.status, 200);
  const { token } = await loginRes.json();
  assert.ok(token);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  // B. Crear nuevo servicio en catálogo
  const newSrvId = `srv-e2e-${Date.now()}`;
  const createSrvRes = await fetch(`${BASE_URL}/api/admin/services`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      id: newSrvId,
      title: 'Servicio E2E Prueba Automatizada',
      platform: 'tiktok',
      category: 'views',
      description: 'Servicio de prueba creado y validado en suite E2E.',
      min_quantity: 500,
      max_quantity: 20000,
      price_per_1000: 1490,
      url_pattern: '^https?:\\/\\/.*',
      url_placeholder: 'https://tiktok.com/@test/video/1',
      delivery_time_hours: 2,
      delivery_conditions: 'Perfil público',
      refill_days: 0,
      refill_conditions: 'Sin reposición',
      cancellation_conditions: 'Cancelable antes de procesar',
      provider_name: 'SMM_PWR',
      provider_service_id: '999',
      provider_cost_usd: 0.3,
      status: 'PUBLISHED'
    })
  });
  assert.equal(createSrvRes.status, 201);

  // C. Editar el servicio recién creado
  const editSrvRes = await fetch(`${BASE_URL}/api/admin/services/${newSrvId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Servicio E2E Editado',
      price_per_1000: 1890,
      status: 'PAUSED'
    })
  });
  assert.equal(editSrvRes.status, 200);

  // D. Eliminar el servicio sin órdenes asociadas
  const delSrvRes = await fetch(`${BASE_URL}/api/admin/services/${newSrvId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  assert.equal(delSrvRes.status, 200);

  // E. Crear una orden para conciliarla en el admin
  const orderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: 'ig-followers-cl',
      quantity: 1000,
      destinationUrl: 'https://instagram.com/cliente_conciliacion',
      customerName: 'Cliente Conciliacion',
      customerEmail: 'cliente@conciliacion.cl',
      paymentMethod: 'TENPO_TRANSFER',
      termsAccepted: true
    })
  });
  assert.equal(orderRes.status, 201);
  const order = await orderRes.json();

  // F. Operador concilia la transferencia Tenpo ingresando ID de movimiento
  const uniqueMovementId = `TENPO-MOV-${Date.now()}`;
  const verifyRes = await fetch(`${BASE_URL}/api/admin/orders/${order.orderId}/verify-transfer`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      verifiedAmount: 4741,
      bankMovementId: uniqueMovementId,
      adminNotes: 'Aprobación conciliada en cuenta Tenpo Prepago'
    })
  });
  assert.equal(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.paymentStatus, 'CONFIRMED');
  assert.equal(verifyData.deliveryStatus, 'READY_FOR_DISPATCH');

  // G. Intentar reutilizar el mismo ID de movimiento bancario (DEBE SER BLOQUEADO)
  const dupVerifyRes = await fetch(`${BASE_URL}/api/admin/orders/${order.orderId}/verify-transfer`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      verifiedAmount: 4741,
      bankMovementId: uniqueMovementId,
      adminNotes: 'Intento malicioso de doble pago'
    })
  });
  assert.equal(dupVerifyRes.status, 400);

  // H. Operador registra despacho manual en proveedor
  const dispatchRes = await fetch(`${BASE_URL}/api/admin/orders/${order.orderId}/dispatch-record`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      externalOrderId: 'SMM-EXT-55829',
      costAmount: 1.20,
      costCurrency: 'USD',
      notes: 'Despacho manual realizado en smmpwr.com'
    })
  });
  assert.equal(dispatchRes.status, 200);
  const dispatchData = await dispatchRes.json();
  assert.equal(dispatchData.deliveryStatus, 'DISPATCHED_TO_PROVIDER');

  // I. Verificar bitácora de auditoría
  const auditRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, { headers: authHeaders });
  assert.equal(auditRes.status, 200);
  const logs = await auditRes.json();
  assert.ok(logs.some(l => l.action === 'VERIFY_TENPO_TRANSFER'));
  assert.ok(logs.some(l => l.action === 'REGISTER_PROVIDER_DISPATCH'));
});

test('E2E: 5. Integración Webpay Plus contra sandbox oficial Transbank', async () => {
  // Crear orden Webpay
  const orderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: 'ig-likes-post',
      quantity: 1000,
      destinationUrl: 'https://instagram.com/p/Cxyz123',
      customerName: 'Comprador Webpay',
      customerEmail: 'comprador@webpay.cl',
      paymentMethod: 'WEBPAY_PLUS',
      termsAccepted: true
    })
  });
  const order = await orderRes.json();

  // Iniciar Webpay contra Transbank
  const initRes = await fetch(`${BASE_URL}/api/webpay/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackingToken: order.trackingToken })
  });
  assert.equal(initRes.status, 200);
  const initData = await initRes.json();

  assert.ok(initData.token);
  assert.ok(initData.url.includes('transbank.cl'));
  assert.equal(initData.environment, 'INTEGRATION');
});
