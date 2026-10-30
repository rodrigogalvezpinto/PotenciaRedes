/**
 * Interfaz Desacoplada y Adaptador para Proveedor SMM PWR (API v2)
 *
 * POLÍTICA DE SEGURIDAD OPERACIONAL:
 * - Esta versión NO ejecuta compras automáticas en SMM PWR.
 * - SMM_AUTOMATION_ENABLED permanece estrictamente en 'false'.
 * - Todo pedido confirmado pasa a cola de gestión manual administrativa.
 * - Toda interacción automática futura requiere:
 *   1. Credenciales en gestor de secretos (SMM_PWR_API_KEY).
 *   2. Autorización explícita del administrador en panel.
 *   3. Límite de gasto diario y corte de emergencia (circuit breaker).
 *   4. Prohibición de reintentos ciegos en timeouts ambiguos.
 */

export interface SmmServiceItem {
  service: string | number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill: boolean;
  cancel: boolean;
}

export interface SmmCreateOrderParams {
  serviceId: string | number;
  link: string;
  quantity: number;
  runs?: number;
  interval?: number;
}

export interface SmmCreateOrderResult {
  order?: number;
  error?: string;
}

export interface SmmOrderStatusResult {
  charge?: string;
  start_count?: string;
  status?: 'Pending' | 'In progress' | 'Completed' | 'Partial' | 'Canceled' | 'Processing';
  remains?: string;
  currency?: string;
  error?: string;
}

export class SmmPwrProviderClient {
  private readonly apiUrl: string;
  private readonly apiKey: string | null;
  public readonly isAutomationEnabled: boolean;

  constructor() {
    this.apiUrl = process.env.SMM_PWR_API_URL || 'https://smmpwr.com/api/v2';
    this.apiKey = process.env.SMM_PWR_API_KEY || null;
    // Bloqueo explícito obligatorio por especificación
    this.isAutomationEnabled = false;
  }

  /**
   * Consulta el saldo disponible en la cuenta del proveedor
   * Acción: balance
   */
  async getBalance(): Promise<{ balance?: string; currency?: string; error?: string }> {
    if (!this.apiKey) {
      return { error: 'Faltan credenciales del proveedor (SMM_PWR_API_KEY no configurada).' };
    }
    return this.postRequest<{ balance: string; currency: string }>({ action: 'balance' });
  }

  /**
   * Obtiene la lista completa de servicios vigentes en SMM PWR
   * Acción: services
   */
  async getServices(): Promise<{ services?: SmmServiceItem[]; error?: string }> {
    if (!this.apiKey) {
      return { error: 'Faltan credenciales del proveedor (SMM_PWR_API_KEY no configurada).' };
    }
    const res = await this.postRequest<SmmServiceItem[]>({ action: 'services' });
    if (res.error) return { error: res.error };
    return { services: res.data };
  }

  /**
   * Creación de pedido en SMM PWR
   * Bloqueada por diseño en esta versión comercial para evitar compras automáticas sin supervisión.
   */
  async createOrder(params: SmmCreateOrderParams): Promise<SmmCreateOrderResult> {
    if (!this.isAutomationEnabled) {
      return {
        error: 'POLÍTICA_SEGURIDAD: La compra automática con SMM PWR está deshabilitada en esta versión. El administrador debe registrar el pedido de forma manual tras verificar la orden.'
      };
    }

    if (!this.apiKey) {
      return { error: 'Clave de API de proveedor no establecida en variables de entorno.' };
    }

    // Protocolo oficial: POST application/x-www-form-urlencoded
    const body: Record<string, string> = {
      action: 'add',
      service: String(params.serviceId),
      link: params.link,
      quantity: String(params.quantity)
    };

    const res = await this.postRequest<{ order: number }>(body);
    if (res.error) return { error: res.error };
    return { order: res.data?.order };
  }

  /**
   * Consulta de estado de un pedido en SMM PWR
   * Acción: status
   */
  async getOrderStatus(orderId: number | string): Promise<SmmOrderStatusResult> {
    if (!this.apiKey) {
      return { error: 'Clave de API de proveedor ausente.' };
    }
    const res = await this.postRequest<SmmOrderStatusResult>({
      action: 'status',
      order: String(orderId)
    });
    if (res.error) return { error: res.error };
    return res.data || {};
  }

  /**
   * Consulta por lote (hasta 100 pedidos)
   * Acción: status (con órdenes separadas por coma)
   */
  async getMultiOrderStatus(orderIds: (number | string)[]): Promise<Record<string, SmmOrderStatusResult> | { error: string }> {
    if (!this.apiKey) {
      return { error: 'Clave de API ausente.' };
    }
    if (orderIds.length === 0) return {};
    if (orderIds.length > 100) {
      return { error: 'El proveedor solo admite lotes de hasta 100 identificadores por consulta.' };
    }

    const res = await this.postRequest<Record<string, SmmOrderStatusResult>>({
      action: 'status',
      orders: orderIds.join(',')
    });
    if (res.error) return { error: res.error };
    return res.data || {};
  }

  /**
   * Ejecutor interno HTTP con validación estricta de estructura y no asunción de HTTP 200
   */
  private async postRequest<T>(params: Record<string, string>): Promise<{ data?: T; error?: string }> {
    try {
      const formData = new URLSearchParams();
      formData.append('key', this.apiKey || '');
      for (const [k, v] of Object.entries(params)) {
        formData.append(k, v);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString(),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const text = await response.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        return { error: `Respuesta no JSON del proveedor (HTTP ${response.status}): ${text.slice(0, 100)}` };
      }

      // SMM PWR retorna HTTP 200 con { error: "..." } en caso de fallo
      if (json && json.error) {
        return { error: `Error del proveedor: ${json.error}` };
      }

      if (!response.ok) {
        return { error: `HTTP ${response.status} recibido del proveedor.` };
      }

      return { data: json as T };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { error: 'Timeout de conexión con el proveedor. No reintentar automáticamente sin verificar.' };
      }
      return { error: `Fallo de comunicación de red: ${err.message || String(err)}` };
    }
  }
}

export const smmClient = new SmmPwrProviderClient();
