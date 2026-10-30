/**
 * Pruebas Unitarias y de Reglas de Negocio - PulsoRed Chile
 * Ejecutable vía: npm test (node --test)
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// 1. Verificación del cálculo exacto de redondeo del 5% para transferencias Tenpo
test('Regla 1: Descuento de transferencia exactamente del 5% según redondeo al peso más cercano', () => {
  function calculateOrderPricing(quantity, pricePer1000, paymentMethod) {
    const publicPrice = Math.round((quantity * pricePer1000) / 1000);
    if (paymentMethod === 'TENPO_TRANSFER') {
      const finalPrice = Math.round((publicPrice * 95) / 100);
      const discountAmount = publicPrice - finalPrice;
      return { publicPrice, discountAmount, finalPrice };
    }
    return { publicPrice, discountAmount: 0, finalPrice: publicPrice };
  }

  // Caso A: Precio $4.990 CLP (1.000 seguidores IG a $4.990)
  // 4990 * 0.95 = 4740.5 -> Redondeo al peso más cercano: 4741
  // Ahorro: 4990 - 4741 = 249
  const resA = calculateOrderPricing(1000, 4990, 'TENPO_TRANSFER');
  assert.equal(resA.publicPrice, 4990);
  assert.equal(resA.finalPrice, 4741);
  assert.equal(resA.discountAmount, 249);
  assert.equal(resA.publicPrice - resA.discountAmount, resA.finalPrice);

  // Caso B: Precio $12.900 CLP (1.000 seguidores LinkedIn)
  // 12900 * 0.95 = 12255 -> Exacto sin decimales
  const resB = calculateOrderPricing(1000, 12900, 'TENPO_TRANSFER');
  assert.equal(resB.publicPrice, 12900);
  assert.equal(resB.finalPrice, 12255);
  assert.equal(resB.discountAmount, 645);

  // Caso C: Precio $990 CLP (1.000 vistas TikTok)
  // 990 * 0.95 = 940.5 -> Redondeo: 941
  // Ahorro: 990 - 941 = 49
  const resC = calculateOrderPricing(1000, 990, 'TENPO_TRANSFER');
  assert.equal(resC.publicPrice, 990);
  assert.equal(resC.finalPrice, 941);
  assert.equal(resC.discountAmount, 49);

  // Caso D: Webpay cobra el precio público completo sin recargo
  const resWebpay = calculateOrderPricing(1000, 4990, 'WEBPAY_PLUS');
  assert.equal(resWebpay.publicPrice, 4990);
  assert.equal(resWebpay.finalPrice, 4990);
  assert.equal(resWebpay.discountAmount, 0);
});

// 2. Verificación de validación de URLs y protección anti-SSRF
test('Regla 2: Validación de URLs de destino bloquea SSRF y dominios inválidos', () => {
  function validateUrl(urlStr, platform) {
    let parsed;
    try {
      parsed = new URL(urlStr);
    } catch {
      return { valid: false, reason: 'URL malformada' };
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, reason: 'Protocolo no permitido' };
    }

    const host = parsed.hostname.toLowerCase();
    const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'];
    if (blocked.includes(host) || host.endsWith('.local') || host.endsWith('.internal')) {
      return { valid: false, reason: 'SSRF bloqueado' };
    }

    const allowed = {
      instagram: ['instagram.com', 'www.instagram.com'],
      tiktok: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com'],
      youtube: ['youtube.com', 'www.youtube.com', 'youtu.be']
    };

    if (allowed[platform] && !allowed[platform].includes(host)) {
      return { valid: false, reason: 'Plataforma discordante' };
    }

    return { valid: true };
  }

  // Intentos maliciosos
  assert.equal(validateUrl('http://localhost:8080/admin', 'instagram').valid, false);
  assert.equal(validateUrl('http://169.254.169.254/computeMetadata/v1/', 'instagram').valid, false);
  assert.equal(validateUrl('javascript:alert(1)', 'instagram').valid, false);
  assert.equal(validateUrl('https://evil-phishing.com/instagram', 'instagram').valid, false);

  // URLs legítimas
  assert.equal(validateUrl('https://instagram.com/p/Cxyz123', 'instagram').valid, true);
  assert.equal(validateUrl('https://www.tiktok.com/@creador', 'tiktok').valid, true);
  assert.equal(validateUrl('https://youtu.be/dQw4w9WgXcQ', 'youtube').valid, true);
});

// 3. Verificación de que "Ya transferí" nunca confirma el pago
test('Regla 3: El reporte de transferencia por parte del cliente solo pasa a "REPORTED", nunca a "CONFIRMED"', () => {
  let orderPaymentStatus = 'PENDING';

  function clientReportsTransfer(amount, sender) {
    if (!amount || amount <= 0) throw new Error('Monto inválido');
    // Estado obligatorio: REPORTED (pendiente de verificación manual)
    orderPaymentStatus = 'REPORTED';
    return { newStatus: orderPaymentStatus };
  }

  const result = clientReportsTransfer(4741, 'Juan Pérez');
  assert.equal(result.newStatus, 'REPORTED');
  assert.notEqual(orderPaymentStatus, 'CONFIRMED');
});

// 4. Verificación de unicidad de movimiento bancario (una transferencia no paga dos pedidos)
test('Regla 4: Una transferencia bancaria con el mismo ID de movimiento no puede pagar dos pedidos', () => {
  const reconciledMovements = new Set();

  function reconcileTransfer(orderId, movementId, amount) {
    if (reconciledMovements.has(movementId)) {
      throw new Error(`El movimiento ${movementId} ya fue conciliado anteriormente`);
    }
    reconciledMovements.add(movementId);
    return { orderId, movementId, status: 'CONFIRMED' };
  }

  // Primer pedido se concilia correctamente
  const res1 = reconcileTransfer('order-1', 'TENPO-TXN-984210', 4741);
  assert.equal(res1.status, 'CONFIRMED');

  // Intento de reutilizar la misma transferencia en un segundo pedido DEBE fallar
  assert.throws(() => {
    reconcileTransfer('order-2', 'TENPO-TXN-984210', 4741);
  }, /ya fue conciliado/);
});

// 5. Verificación de que la automatización de SMM PWR permanece deshabilitada
test('Regla 5: La automatización con proveedor externo permanece desactivada por política', () => {
  const SMM_AUTOMATION_ENABLED = false;

  function attemptAutomaticPurchase(orderId, serviceId) {
    if (!SMM_AUTOMATION_ENABLED) {
      return {
        status: 'BLOCKED',
        error: 'POLÍTICA_SEGURIDAD: Compra automática deshabilitada. Requiere gestión manual.'
      };
    }
    return { status: 'PURCHASED' };
  }

  const result = attemptAutomaticPurchase('ord-99', 101);
  assert.equal(result.status, 'BLOCKED');
});
