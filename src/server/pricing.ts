/**
 * Motor de Precios y Cotización Certificada - PulsoRed Chile
 * Reglas de negocio:
 * - Moneda: CLP (Pesos Chilenos, enteros sin decimales).
 * - Webpay Plus: cobra el precio público completo sin recargo.
 * - Transferencia Bancaria (Tenpo): 5% de descuento sobre el precio público.
 * - Fórmula estricta:
 *     totalTransferencia = Math.round((precioPublico * 95) / 100)
 *     ahorro = precioPublico - totalTransferencia
 * - Cálculo 100% en el servidor. Nunca se confía en valores recibidos del cliente.
 */

export interface PricingBreakdown {
  serviceId: string;
  quantity: number;
  pricePer1000: number;
  publicPrice: number;       // Precio público en CLP
  discountPercent: number;   // 5% si es transferencia, 0% si es Webpay
  discountAmount: number;    // Ahorro exacto en CLP
  finalPrice: number;        // Total a pagar en CLP
  currency: 'CLP';
  paymentMethod: 'TENPO_TRANSFER' | 'WEBPAY_PLUS';
}

/**
 * Calcula el precio público para un servicio y una cantidad dada.
 * Nota: price_per_1000 es la tasa base.
 * publicPrice = Math.round((quantity * pricePer1000) / 1000)
 */
export function calculatePublicPrice(quantity: number, pricePer1000: number): number {
  if (quantity <= 0 || pricePer1000 <= 0) {
    throw new Error('La cantidad y el precio por mil deben ser valores positivos.');
  }
  return Math.round((quantity * pricePer1000) / 1000);
}

/**
 * Calcula el desglose final según el método de pago respetando la fórmula
 * legal de redondeo al peso más cercano.
 */
export function calculateOrderPricing(
  quantity: number,
  pricePer1000: number,
  paymentMethod: 'TENPO_TRANSFER' | 'WEBPAY_PLUS'
): { publicPrice: number; discountAmount: number; finalPrice: number } {
  const publicPrice = calculatePublicPrice(quantity, pricePer1000);

  if (paymentMethod === 'TENPO_TRANSFER') {
    // Redondear al peso más cercano(precio público × 95 / 100)
    const finalPrice = Math.round((publicPrice * 95) / 100);
    const discountAmount = publicPrice - finalPrice;
    return {
      publicPrice,
      discountAmount,
      finalPrice
    };
  } else {
    // Webpay cobra el precio público íntegro sin recargo oculto
    return {
      publicPrice,
      discountAmount: 0,
      finalPrice: publicPrice
    };
  }
}

/**
 * Formateador de moneda en estándar chileno: $12.990 CLP
 */
export function formatCLP(amount: number): string {
  const formatted = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
  return `${formatted} CLP`;
}
