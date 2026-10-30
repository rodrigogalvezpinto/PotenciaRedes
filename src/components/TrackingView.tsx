/**
 * Vista de Seguimiento Privado de Pedidos - PotenciaRedes Chile
 * - Acceso protegido exclusivamente por token criptográfico de 256 bits (anti-IDOR).
 * - Visualización enriquecida de doble estado: Pago (Tenpo / Webpay) y Entrega.
 * - Muestra la instantánea inmutable capturada al momento de comprar.
 * - Soporte directo vía WhatsApp con referencia oficial.
 */
import React, { useState, useEffect } from 'react';
import { TrackedOrder, ServiceSnapshot } from '../types.js';
import { Clock, CheckCircle2, AlertCircle, MessageSquare, ExternalLink, Copy, Check, Lock, Sparkles } from 'lucide-react';

interface TrackingViewProps {
  initialToken?: string;
  onOpenTransferModal: (orderData: any) => void;
  onOpenWebpayModal: (orderData: any) => void;
  onOpenDevModal: (title: string, message: string) => void;
  supportWhatsapp?: string;
}

export const TrackingView: React.FC<TrackingViewProps> = ({
  initialToken = '',
  onOpenTransferModal,
  onOpenWebpayModal,
  onOpenDevModal,
  supportWhatsapp = '+56987654321'
}) => {
  const [tokenInput, setTokenInput] = useState<string>(initialToken);
  const [orderData, setOrderData] = useState<{
    order: TrackedOrder;
    snapshot: ServiceSnapshot | null;
    transferReport: any;
    dispatchStatus: any;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

  const fetchOrder = (token: string) => {
    if (!token || token.trim().length < 32) {
      setErrorMsg('El token de seguimiento debe ser un identificador criptográfico válido de al menos 32 caracteres.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    fetch(`/api/orders/track?token=${encodeURIComponent(token.trim())}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('Pedido no encontrado. Verifique el enlace o token ingresado.');
          if (res.status === 429) throw new Error('Límite de consultas excedido. Espere un momento.');
          throw new Error('Error al consultar el seguimiento.');
        }
        return res.json();
      })
      .then((data) => {
        setOrderData(data);
        setLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Error al recuperar los datos del pedido.');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (initialToken && initialToken.length >= 32) {
      fetchOrder(initialToken);
    }
  }, [initialToken]);

  const copyRef = (refText: string) => {
    navigator.clipboard.writeText(refText);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full text-xs">
            Pago Aprobado y Confirmado
          </span>
        );
      case 'PENDING_VERIFICATION':
        return (
          <span className="font-extrabold text-amber-400 bg-amber-950/80 border border-amber-500/40 px-3 py-1 rounded-full text-xs">
            Pago Informado / En Revisión Tenpo
          </span>
        );
      case 'REJECTED':
        return (
          <span className="font-extrabold text-red-400 bg-red-950/80 border border-red-500/40 px-3 py-1 rounded-full text-xs">
            Pago Rechazado
          </span>
        );
      default:
        return (
          <span className="font-extrabold text-slate-300 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-xs">
            Pendiente de Pago
          </span>
        );
    }
  };

  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Entrega Completada
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="font-extrabold text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-3 py-1 rounded-full text-xs flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            En Proceso de Difusión
          </span>
        );
      case 'DISPATCHED_TO_PROVIDER':
        return (
          <span className="font-extrabold text-purple-400 bg-purple-950/80 border border-purple-500/40 px-3 py-1 rounded-full text-xs">
            Despachado a Proveedor
          </span>
        );
      case 'READY_FOR_DISPATCH':
        return (
          <span className="font-extrabold text-blue-400 bg-blue-950/80 border border-blue-500/40 px-3 py-1 rounded-full text-xs">
            Listo para Despacho
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="font-extrabold text-red-400 bg-red-950/80 border border-red-500/40 px-3 py-1 rounded-full text-xs">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="font-extrabold text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-xs">
            En Espera de Pago
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-left relative z-10">
      {/* Buscador de Token */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl mb-8">
        <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
          <Lock className="w-4 h-4" />
          <span>Acceso Criptográfico de Alta Entropía</span>
        </div>
        <h2 className="text-xl sm:text-3xl font-black text-white mb-2">
          Seguimiento Privado de Pedido
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed max-w-2xl">
          Para resguardar la privacidad de tu perfil, cada compra genera un token único de 256 bits. Pega aquí el enlace recibido o ingresa tu token para consultar el estado en tiempo real.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchOrder(tokenInput);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Pega aquí tu token o enlace privado (ej. 9e0d640f...)"
            className="flex-1 px-4 py-3 text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-fuchsia-500 focus:outline-none shadow-xs"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 text-xs font-black text-white bg-gradient-to-r from-fuchsia-600 via-purple-600 to-orange-500 hover:from-fuchsia-500 hover:to-orange-400 rounded-xl transition-all shrink-0 shadow-lg shadow-orange-500/20 active:scale-[0.98] cursor-pointer"
          >
            {loading ? 'Consultando...' : 'Consultar Estado'}
          </button>
        </form>

        {errorMsg && (
          <div className="mt-4 p-3.5 bg-red-950/80 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Resultados de la Orden */}
      {orderData && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Tarjeta de Resumen con Barra de Estado */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                  Referencia Oficial de Pedido:
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-black text-white font-mono">
                    {orderData.order.reference}
                  </span>
                  <button
                    onClick={() => copyRef(orderData.order.reference)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer"
                    title="Copiar Referencia"
                  >
                    {copiedRef ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div>{getPaymentStatusBadge(orderData.order.paymentStatus)}</div>
                <div>{getDeliveryStatusBadge(orderData.order.deliveryStatus)}</div>
              </div>
            </div>

            {/* Detalles de la Transacción */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
              <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-semibold block mb-1">Cliente / Contacto:</span>
                <span className="text-white font-bold">{orderData.order.customerName} <span className="text-slate-400 font-normal">({orderData.order.maskedEmail})</span></span>
              </div>
              <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-semibold block mb-1">Método de Pago:</span>
                <span className="text-white font-bold">
                  {orderData.order.paymentMethod === 'TENPO_TRANSFER'
                    ? 'Transferencia Tenpo (-5%)'
                    : 'Webpay Plus Transbank'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-semibold block mb-1">Monto Pagado / Final:</span>
                <span className="text-white font-black text-sm">
                  {formatCLP(orderData.order.finalPrice)}
                </span>
                {orderData.order.discountAmount > 0 && (
                  <span className="text-emerald-400 block text-[10px] font-semibold">
                    Ahorraste {formatCLP(orderData.order.discountAmount)} por transferencia
                  </span>
                )}
              </div>
            </div>

            {/* Enlace Destino */}
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="truncate mr-4">
                <span className="text-slate-400 font-semibold block text-[11px] mb-0.5">Enlace de Destino Validado:</span>
                <span className="text-white font-mono truncate block">{orderData.order.destinationUrl}</span>
              </div>
              <a
                href={orderData.order.destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-slate-800 rounded-lg text-orange-400 shrink-0"
                title="Abrir Enlace"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Acciones según estado */}
            {orderData.order.paymentStatus === 'PENDING' && (
              <div className="pt-4 flex flex-wrap gap-3">
                {orderData.order.paymentMethod === 'TENPO_TRANSFER' ? (
                  <button
                    onClick={() =>
                      onOpenTransferModal({
                        orderId: orderData.order.id,
                        reference: orderData.order.reference,
                        trackingToken: orderData.order.trackingToken,
                        finalPrice: orderData.order.finalPrice,
                        publicPrice: orderData.order.publicPrice,
                        discountAmount: orderData.order.discountAmount,
                        paymentMethod: 'TENPO_TRANSFER'
                      })
                    }
                    className="px-5 py-2.5 bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                  >
                    Ver Datos de Transferencia Tenpo
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      onOpenWebpayModal({
                        orderId: orderData.order.id,
                        reference: orderData.order.reference,
                        trackingToken: orderData.order.trackingToken,
                        finalPrice: orderData.order.finalPrice,
                        publicPrice: orderData.order.publicPrice,
                        discountAmount: orderData.order.discountAmount,
                        paymentMethod: 'WEBPAY_PLUS'
                      })
                    }
                    className="px-5 py-2.5 bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                  >
                    Reintentar Pago con Webpay Plus
                  </button>
                )}
              </div>
            )}

            {/* Soporte WhatsApp */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span className="text-xs text-slate-400">
                ¿Necesitas soporte o consultar por reposición?
              </span>
              <a
                href={`https://wa.me/${supportWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Hola, necesito asistencia con mi pedido ${orderData.order.reference} en PotenciaRedes Chile.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Contactar a Soporte por WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
