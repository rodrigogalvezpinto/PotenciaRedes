/**
 * Modal de Creación y Cotización de Pedido - PotenciaRedes Chile
 * Interfaz moderna de alto impacto con acentos neón, soporte para inputs vacíos (sin bloqueo en 0)
 * y desglose certificado con 5% de descuento en Tenpo.
 */
import React, { useState, useEffect } from 'react';
import { Service, PaymentMethod } from '../types.js';
import { X, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, CreditCard, Building2, Lock, Sparkles } from 'lucide-react';

interface OrderModalProps {
  isOpen: boolean;
  service: Service | null;
  services: Service[];
  onClose: () => void;
  onOrderCreated: (orderData: {
    orderId: string;
    reference: string;
    trackingToken: string;
    finalPrice: number;
    publicPrice: number;
    discountAmount: number;
    paymentMethod: PaymentMethod;
  }) => void;
  onOpenLegal: () => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  service: initialService,
  services,
  onClose,
  onOrderCreated,
  onOpenLegal
}) => {
  const [selectedService, setSelectedService] = useState<Service | null>(initialService);
  const [quantity, setQuantity] = useState<number | ''>(1000);
  const [destinationUrl, setDestinationUrl] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TENPO_TRANSFER');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  // Estados de cotización y carga
  const [pricing, setPricing] = useState<{
    publicPrice: number;
    discountAmount: number;
    finalPrice: number;
  } | null>(null);
  const [loadingQuote, setLoadingQuote] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialService) {
      setSelectedService(initialService);
      setQuantity(Math.max(initialService.min_quantity, 1000));
    } else if (services.length > 0 && !selectedService) {
      setSelectedService(services[0]);
      setQuantity(Math.max(services[0].min_quantity, 1000));
    }
  }, [initialService, services]);

  // Recalcular cotización en el servidor cada vez que cambia el servicio, cantidad o método de pago
  useEffect(() => {
    if (!selectedService || quantity === '' || quantity <= 0) {
      setPricing(null);
      return;
    }

    setLoadingQuote(true);
    setErrorMessage(null);

    const controller = new AbortController();

    fetch('/api/orders/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: selectedService.id,
        quantity: quantity,
        paymentMethod
      }),
      signal: controller.signal
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Error al cotizar');
        }
        return res.json();
      })
      .then((data) => {
        setPricing({
          publicPrice: data.publicPrice,
          discountAmount: data.discountAmount,
          finalPrice: data.finalPrice
        });
        setLoadingQuote(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error(err);
          setLoadingQuote(false);
        }
      });

    return () => controller.abort();
  }, [selectedService, quantity, paymentMethod]);

  if (!isOpen || !selectedService) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (quantity === '' || quantity < selectedService.min_quantity || quantity > selectedService.max_quantity) {
      setErrorMessage(`La cantidad debe ser entre ${selectedService.min_quantity.toLocaleString('es-CL')} y ${selectedService.max_quantity.toLocaleString('es-CL')}.`);
      return;
    }

    if (!destinationUrl.trim()) {
      setErrorMessage('Por favor ingrese el enlace público de destino.');
      return;
    }

    if (!customerEmail.trim()) {
      setErrorMessage('Por favor ingrese su correo electrónico para recibir el token de seguimiento.');
      return;
    }

    if (!termsAccepted) {
      setErrorMessage('Debe aceptar los términos comerciales y condiciones del servicio.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService.id,
          quantity: quantity,
          destinationUrl: destinationUrl.trim(),
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerWhatsapp: customerWhatsapp.trim() || undefined,
          paymentMethod
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo crear el pedido');
      }

      onOrderCreated({
        orderId: data.orderId,
        reference: data.reference,
        trackingToken: data.trackingToken,
        finalPrice: data.finalPrice,
        publicPrice: data.publicPrice,
        discountAmount: data.discountAmount,
        paymentMethod: data.paymentMethod
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al registrar el pedido.');
      setSubmitting(false);
    }
  };

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 text-left">
      <div className="relative bg-[#0d111d] rounded-3xl border border-slate-800 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200 text-white">
        {/* Cabecera del Modal con Logo de Marca */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-fuchsia-600 via-purple-500 to-orange-500 shadow-md">
              <img
                src="/assets/aistudio/PotenciaRedes__Crecimiento_Social_Neo_n_3e17a135.png"
                alt="Logo"
                className="w-full h-full object-cover rounded-full bg-black"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Configurar Pedido · PotenciaRedes</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Cotizar y Crear Orden
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-950/80 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Selector de Servicio */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Servicio Seleccionado
            </label>
            <select
              value={selectedService.id}
              onChange={(e) => {
                const s = services.find((x) => x.id === e.target.value);
                if (s) {
                  setSelectedService(s);
                  const curr = typeof quantity === 'number' ? quantity : 1000;
                  setQuantity(Math.max(s.min_quantity, Math.min(s.max_quantity, curr)));
                }
              }}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-fuchsia-500 focus:outline-none"
            >
              {services.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  [{srv.platform.toUpperCase()}] {srv.title} — {formatCLP(srv.price_per_1000)} / 1k
                </option>
              ))}
            </select>
          </div>

          {/* 2. Cantidad y Enlace de Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Cantidad ({selectedService.min_quantity.toLocaleString('es-CL')} - {selectedService.max_quantity.toLocaleString('es-CL')})
                </label>
              </div>
              <input
                type="number"
                min={selectedService.min_quantity}
                max={selectedService.max_quantity}
                step={100}
                value={quantity === '' ? '' : quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setQuantity('');
                  } else {
                    const parsed = parseInt(val, 10);
                    setQuantity(isNaN(parsed) ? '' : parsed);
                  }
                }}
                onBlur={() => {
                  if (quantity === '' || quantity < selectedService.min_quantity) {
                    setQuantity(selectedService.min_quantity);
                  } else if (quantity > selectedService.max_quantity) {
                    setQuantity(selectedService.max_quantity);
                  }
                }}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-fuchsia-500 focus:outline-none font-mono"
                required
              />
              {/* Botones de incremento rápido */}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-400 font-medium mr-1">Rápido:</span>
                <button
                  type="button"
                  onClick={() => {
                    const current = typeof quantity === 'number' ? quantity : selectedService.min_quantity;
                    setQuantity(Math.min(selectedService.max_quantity, current + 500));
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold text-orange-400 bg-orange-950/60 hover:bg-orange-900/60 rounded-md border border-orange-500/30 transition-colors cursor-pointer"
                >
                  +500
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = typeof quantity === 'number' ? quantity : selectedService.min_quantity;
                    setQuantity(Math.min(selectedService.max_quantity, current + 1000));
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold text-orange-400 bg-orange-950/60 hover:bg-orange-900/60 rounded-md border border-orange-500/30 transition-colors cursor-pointer"
                >
                  +1.000
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = typeof quantity === 'number' ? quantity : selectedService.min_quantity;
                    setQuantity(Math.min(selectedService.max_quantity, current + 5000));
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold text-orange-400 bg-orange-950/60 hover:bg-orange-900/60 rounded-md border border-orange-500/30 transition-colors cursor-pointer"
                >
                  +5.000
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Enlace Público de Destino ({selectedService.platform})
              </label>
              <input
                type="url"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder={selectedService.url_placeholder}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-fuchsia-500 focus:outline-none placeholder:text-slate-500 font-mono"
                required
              />
            </div>
          </div>

          {/* 3. Datos de Contacto y Seguimiento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nombre o Marca</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej. Rodrigo Gálvez"
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-fuchsia-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email (para el token)</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="tu@correo.cl"
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-fuchsia-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">WhatsApp (Opcional)</label>
              <input
                type="tel"
                value={customerWhatsapp}
                onChange={(e) => setCustomerWhatsapp(e.target.value)}
                placeholder="+569..."
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-fuchsia-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* 4. Selector de Medio de Pago */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-300">Método de Pago en Chile</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opción A: Transferencia Tenpo con 5% de descuento */}
              <button
                type="button"
                onClick={() => setPaymentMethod('TENPO_TRANSFER')}
                className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  paymentMethod === 'TENPO_TRANSFER'
                    ? 'border-emerald-500 bg-emerald-950/50 ring-2 ring-emerald-500/40 shadow-xs'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      Transferencia Tenpo
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                      -5% Ahorro
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Transferencia bancaria directa a cuenta Tenpo. Descuento aplicado automáticamente.
                  </p>
                </div>
              </button>

              {/* Opción B: Webpay Plus */}
              <button
                type="button"
                onClick={() => setPaymentMethod('WEBPAY_PLUS')}
                className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  paymentMethod === 'WEBPAY_PLUS'
                    ? 'border-fuchsia-500 bg-fuchsia-950/40 ring-2 ring-fuchsia-500/40 shadow-xs'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                      <CreditCard className="w-4 h-4 text-fuchsia-400" />
                      Webpay Plus
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                      Tarjetas
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Tarjetas de débito, crédito o prepago chilenas a través de Transbank Webpay Plus.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 5. Desglose Certificado de Cotización */}
          <div className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Precio público base:</span>
              <span className="font-mono tabular-nums text-white">
                {pricing ? formatCLP(pricing.publicPrice) : '...'}
              </span>
            </div>

            {paymentMethod === 'TENPO_TRANSFER' && (
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Descuento Transferencia Tenpo (5%):
                </span>
                <span className="font-mono tabular-nums">
                  -{pricing ? formatCLP(pricing.discountAmount) : '...'}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline font-bold text-white text-sm">
              <span className="text-slate-300">Total a pagar en CLP:</span>
              <span className="text-xl font-black text-amber-400 font-mono tabular-nums">
                {pricing ? formatCLP(pricing.finalPrice) : '...'}
              </span>
            </div>
          </div>

          {/* 6. Checkbox de Términos */}
          <div className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              id="accept-terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-fuchsia-600 focus:ring-fuchsia-500 cursor-pointer"
              required
            />
            <label htmlFor="accept-terms" className="text-xs text-slate-400 leading-normal">
              Acepto los{' '}
              <button
                type="button"
                onClick={onOpenLegal}
                className="text-orange-400 font-bold underline hover:text-orange-300 cursor-pointer"
              >
                términos comerciales, política de reposición y condiciones
              </button>
              . Declaro que el enlace corresponde a un perfil o contenido de acceso público.
            </label>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !termsAccepted || !pricing}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs font-black text-white bg-gradient-to-r from-fuchsia-600 via-purple-600 to-orange-500 hover:from-fuchsia-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/25 active:scale-[0.98] rounded-xl cursor-pointer"
            >
              <span>{submitting ? 'Registrando orden...' : 'Confirmar y Pagar'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
