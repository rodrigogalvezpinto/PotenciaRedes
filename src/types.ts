/**
 * Tipos de Datos Compartidos - PulsoRed Chile
 */

export interface Service {
  id: string;
  title: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'x';
  category: 'followers' | 'likes' | 'views' | 'subscribers';
  description: string;
  order_type: 'quantity';
  min_quantity: number;
  max_quantity: number;
  price_per_1000: number; // En CLP
  url_pattern: string;
  url_placeholder: string;
  delivery_time_hours: number;
  delivery_conditions: string;
  refill_days: number;
  refill_conditions: string;
  cancellation_conditions: string;
  provider_name?: string;
  provider_service_id?: string;
  provider_cost_usd?: number;
  status: 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';
  updated_at: string;
}

export type PaymentMethod = 'TENPO_TRANSFER' | 'WEBPAY_PLUS';

export type PaymentStatus =
  | 'PENDING'
  | 'REPORTED'
  | 'UNDER_REVIEW'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type DeliveryStatus =
  | 'UNSENT'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED_TO_PROVIDER'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'CANCELLED'
  | 'INCIDENT';

export interface TrackedOrder {
  id: string;
  reference: string;
  trackingToken: string;
  customerName: string;
  maskedEmail: string;
  destinationUrl: string;
  quantity: number;
  paymentMethod: PaymentMethod;
  publicPrice: number;
  discountAmount: number;
  finalPrice: number;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  reference: string;
  tracking_token: string;
  customer_email: string;
  customer_name: string;
  customer_whatsapp?: string;
  destination_url: string;
  service_id: string;
  quantity: number;
  payment_method: PaymentMethod;
  public_price: number;
  discount_amount: number;
  final_price: number;
  payment_status: PaymentStatus;
  delivery_status: DeliveryStatus;
  created_at: string;
  updated_at: string;
  service_title?: string;
  platform?: string;
}

export interface ServiceSnapshot {
  id: string;
  order_id: string;
  service_id: string;
  title: string;
  platform: string;
  category: string;
  unit_price_clp: number;
  quantity: number;
  delivery_conditions: string;
  refill_conditions: string;
  cancellation_conditions: string;
  captured_at: string;
}

export interface BankTransferRecord {
  id: string;
  order_id: string;
  reported_amount: number;
  reported_sender_name?: string;
  reported_bank?: string;
  reported_reference?: string;
  customer_notes?: string;
  verified_by?: string;
  verified_at?: string;
  verified_amount?: number;
  bank_movement_id?: string;
  admin_notes?: string;
  status: 'REPORTED' | 'VERIFIED' | 'REJECTED' | 'DISCREPANCY';
  created_at: string;
}

export interface PublicConfig {
  storeName: string;
  country: string;
  currency: 'CLP';
  transferDiscountPercent: number;
  bankDetails: {
    beneficiaryName: string;
    rut: string;
    bankName: string;
    accountType: string;
    accountNumber: string;
    email: string;
  };
  support: {
    whatsapp: string;
    email: string;
  };
  webpay: {
    environment: 'INTEGRATION' | 'PRODUCTION';
    isConfigured: boolean;
    isProduction: boolean;
    isIntegrationTest: boolean;
    commerceCode: string;
    notice: string;
  };
  legalNotice: {
    status: string;
    text: string;
  };
}

export interface AuditLog {
  id: string;
  admin_user: string;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_state?: string;
  new_state?: string;
  reason?: string;
  ip_address?: string;
  created_at: string;
}
