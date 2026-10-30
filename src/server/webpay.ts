/**
 * Cliente Oficial Webpay Plus REST v1.2 - Transbank
 *
 * Implementa la especificación REST de Transbank Webpay Plus:
 * - Creación de transacción (POST /transactions)
 * - Confirmación / Commit oficial (PUT /transactions/{token})
 * - Consulta de estado (GET /transactions/{token})
 *
 * En integración usa las credenciales públicas de prueba provistas por Transbank:
 * Código de comercio: 597055555532
 * Llave secreta: 579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C
 *
 * En producción verifica la existencia de credenciales comerciales válidas.
 * Si faltan, el backend informa honestamente que está en desarrollo / aprobación de rubro.
 */

export interface WebpayInitResult {
  token: string;
  url: string;
  error?: string;
  environment: 'INTEGRATION' | 'PRODUCTION';
}

export interface WebpayCommitResult {
  vci?: string;
  amount: number;
  status: 'AUTHORIZED' | 'FAILED' | 'REJECTED' | 'ABORTED';
  buy_order: string;
  session_id: string;
  card_detail?: {
    card_number: string;
  };
  accounting_date?: string;
  transaction_date?: string;
  authorization_code?: string;
  payment_type_code?: string;
  response_code: number; // 0 = Aprobada
  installments_number?: number;
  error?: string;
}

export class WebpayPlusService {
  private environment: 'INTEGRATION' | 'PRODUCTION';
  private commerceCode: string;
  private apiKeySecret: string;
  private isConfigured: boolean;

  constructor() {
    const envVar = (process.env.WEBPAY_ENVIRONMENT || 'INTEGRATION').toUpperCase();
    this.environment = envVar === 'PRODUCTION' ? 'PRODUCTION' : 'INTEGRATION';

    if (this.environment === 'PRODUCTION') {
      this.commerceCode = process.env.WEBPAY_COMMERCE_CODE || '';
      this.apiKeySecret = process.env.WEBPAY_API_KEY || '';
      // En producción solo es operativa si se configuraron credenciales reales de Transbank
      this.isConfigured = Boolean(this.commerceCode && this.apiKeySecret);
    } else {
      // Credenciales de prueba oficiales de Transbank
      this.commerceCode = process.env.WEBPAY_COMMERCE_CODE || '597055555532';
      this.apiKeySecret = process.env.WEBPAY_API_KEY || '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C';
      this.isConfigured = true;
    }
  }

  getEnvironmentInfo() {
    return {
      environment: this.environment,
      isConfigured: this.isConfigured,
      isProduction: this.environment === 'PRODUCTION',
      isIntegrationTest: this.environment === 'INTEGRATION',
      commerceCode: this.commerceCode,
      notice: this.environment === 'PRODUCTION' && !this.isConfigured
        ? 'Webpay Plus en producción requiere contrato comercial de Transbank y aprobación de rubro para activar credenciales definitivas.'
        : 'Webpay Plus en ambiente de integración con tarjetas de prueba Transbank.'
    };
  }

  private getBaseUrl(): string {
    return this.environment === 'PRODUCTION'
      ? 'https://webpay3g.transbank.cl/rswebpaytransaction/api/webpay/v1.0'
      : 'https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.0';
  }

  /**
   * Inicializa la transacción en Transbank
   */
  async createTransaction(
    buyOrder: string,
    sessionId: string,
    amount: number,
    returnUrl: string
  ): Promise<WebpayInitResult> {
    if (this.environment === 'PRODUCTION' && !this.isConfigured) {
      throw new Error(
        'Webpay Plus en producción está temporalmente en desarrollo: pendiente contrato comercial Transbank y validación de rubro.'
      );
    }

    const endpoint = `${this.getBaseUrl()}/transactions`;
    const payload = {
      buy_order: buyOrder,
      session_id: sessionId,
      amount: Math.round(amount),
      return_url: returnUrl
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Tbk-Api-Key-Id': this.commerceCode,
        'Tbk-Api-Key-Secret': this.apiKeySecret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as any;

    if (!response.ok || !data.token) {
      throw new Error(data.error_message || `Fallo al inicializar Webpay Plus: HTTP ${response.status}`);
    }

    return {
      token: data.token,
      url: data.url,
      environment: this.environment
    };
  }

  /**
   * Confirma la transacción en Transbank (Commit oficial)
   * Debe ejecutarse obligatoriamente al recibir el retorno antes de dar por pagado un pedido
   */
  async commitTransaction(token: string): Promise<WebpayCommitResult> {
    const endpoint = `${this.getBaseUrl()}/transactions/${encodeURIComponent(token)}`;

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Tbk-Api-Key-Id': this.commerceCode,
        'Tbk-Api-Key-Secret': this.apiKeySecret,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json() as any;

    if (!response.ok) {
      return {
        amount: 0,
        status: 'FAILED',
        buy_order: '',
        session_id: '',
        response_code: -1,
        error: data.error_message || `Error en commit de Webpay: HTTP ${response.status}`
      };
    }

    // response_code == 0 indica autorización exitosa de Transbank
    const isAuthorized = data.response_code === 0 && data.status === 'AUTHORIZED';

    return {
      vci: data.vci,
      amount: data.amount,
      status: isAuthorized ? 'AUTHORIZED' : 'REJECTED',
      buy_order: data.buy_order,
      session_id: data.session_id,
      card_detail: data.card_detail,
      accounting_date: data.accounting_date,
      transaction_date: data.transaction_date,
      authorization_code: data.authorization_code,
      payment_type_code: data.payment_type_code,
      response_code: data.response_code,
      installments_number: data.installments_number
    };
  }

  /**
   * Consulta el estado de una transacción existente
   */
  async getTransactionStatus(token: string): Promise<any> {
    const endpoint = `${this.getBaseUrl()}/transactions/${encodeURIComponent(token)}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Tbk-Api-Key-Id': this.commerceCode,
        'Tbk-Api-Key-Secret': this.apiKeySecret,
        'Content-Type': 'application/json'
      }
    });

    return response.json();
  }
}

export const webpayService = new WebpayPlusService();
