/**
 * Modal de Instrucciones y Notificación de Transferencia Tenpo - PotenciaRedes Chile
 * - Muestra datos bancarios centralizados desde el servidor con diseño oscuro moderno.
 * - Referencia única de pedido con copia en 1 clic.
 * - Formulario "Ya transferí" que actualiza el estado a "REPORTED" (pendiente de revisión).
 * - Advertencia explícita: no confirma el pago automáticamente.
 */
import React, { useState } from 'react';
import { PublicConfig } from '../types.js';
import { Building2, Copy, Check, AlertCircle, ArrowRight, ShieldAlert, CheckCircle2, Sparkles } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  orderInfo: {
    orderId: string;
    reference: string;
    trackingToken: string;
    finalPrice: number;
    publicPrice: number;
    discountAmount: number;
  };
  config: PublicConfig | null;
  onClose: () => void;
  onGoToTracking: (token: string) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  orderInfo,
  config,
  onClose,
  onGoToTracking
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [senderName, setSenderName] = useState<string>('');
  const [reportedAmount, setReportedAmount] = useState<number>(orderInfo.finalPrice);
  const [bankName, setBankName] = useState<string>('BancoEstado');
  const [referenceNote, setReferenceNote] = useState<string>('');
  const [reportedSuccess, setReportedSuccess] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !config) return null;

  const bank = config.bankDetails;

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleReportTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/orders/report-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingToken: orderInfo.trackingToken,
          senderName,
          reportedAmount,
          bankName,
          referenceNote
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al informar la transferencia.');

      setReportedSuccess(true);
      setSubmitting(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
    >
      <div className="w-full max-w-xl bg-[#0d111d] rounded-3xl shadow-2xl border border-slate-800 overflow-hidden my-8 text-left animate-in fade-in zoom-in-95 duration-150 text-white">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-[#0d111d] border-b border-emerald-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="transfer-modal-title" className="text-base font-extrabold text-white">
                Instrucciones de Transferencia Tenpo
              </h3>
              <p className="text-xs text-emerald-300">
                Pedido registrado: <span className="font-mono font-bold text-white">{orderInfo.reference}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Monto Final y Descuento */}
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-300 font-medium block">
                Total a transferir (-5% de descuento aplicado):
              </span>
              <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
                {formatCLP(orderInfo.finalPrice)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Normal: {formatCLP(orderInfo.publicPrice)}</span>
              <span className="text-xs font-bold text-emerald-400 block">Ahorras: {formatCLP(orderInfo.discountAmount)}</span>
            </div>
          </div>

          {/* Datos Bancarios Oficiales */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Datos de la Cuenta Receptora (Tenpo)
            </h4>

            <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Beneficiario:</span>
                <span className="font-bold text-white">{bank.beneficiaryName}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">RUT:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{bank.rut}</span>
                  <button
                    onClick={() => copyToClipboard(bank.rut, 'rut')}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copiar RUT"
                  >
                    {copiedKey === 'rut' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Institución / Banco:</span>
                <span className="font-bold text-white">{bank.bankName}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Tipo de Cuenta:</span>
                <span className="font-bold text-white">{bank.accountType}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Número de Cuenta:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{bank.accountNumber}</span>
                  <button
                    onClick={() => copyToClipboard(bank.accountNumber, 'acc')}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copiar Número"
                  >
                    {copiedKey === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Email de Notificación:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{bank.email}</span>
                  <button
                    onClick={() => copyToClipboard(bank.email, 'email')}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copiar Email"
                  >
                    {copiedKey === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario de reporte */}
          {!reportedSuccess ? (
            <form onSubmit={handleReportTransfer} className="space-y-4 pt-2 border-t border-slate-800">
              <div className="flex items-start gap-2 p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-200">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Al pulsar &quot;Ya transferí&quot;, el pedido pasará a <strong>revisión manual</strong>. Un operador verificará el ingreso efectivo en la cuenta Tenpo antes de activar la orden.
                </span>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nombre del Titular Emisor</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Quien hizo la transferencia"
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Banco de Origen</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="BancoEstado, BCI, Santander, etc."
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ID de Operación / Mensaje Opcional</label>
                <input
                  type="text"
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  placeholder="Número de comprobante de la transferencia"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Transferir más tarde
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Notificando...' : 'Ya transferí'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center mx-auto text-white shadow-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">¡Transferencia Informada!</h4>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                  Tu aviso ha sido registrado. Un operador revisará la cartola de Tenpo para conciliar el pago y activar la entrega de inmediato.
                </p>
              </div>
              <button
                onClick={() => onGoToTracking(orderInfo.trackingToken)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
              >
                <span>Ir al Seguimiento del Pedido</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
