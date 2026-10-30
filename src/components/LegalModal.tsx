/**
 * Modal de Términos Legales, Privacidad y Políticas de Cancelación - PotenciaRedes Chile
 * Identificado explícitamente como "Borrador de Trabajo en Revisión" según exigencias de auditoría.
 */
import React, { useState, useEffect } from 'react';
import { X, FileText, AlertTriangle } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: 'terms' | 'privacy' | 'refund';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'terms',
  onClose
}) => {
  const [tab, setTab] = useState<'terms' | 'privacy' | 'refund'>(initialTab);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[85vh] bg-[#0d111d] rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150 text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-400" />
            <h3 id="legal-modal-title" className="text-base font-bold text-white">
              Marco Legal y Condiciones Comerciales · PotenciaRedes Chile
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal legal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de Borrador */}
        <div className="px-6 py-2.5 bg-amber-950/50 border-b border-amber-500/30 flex items-center gap-2 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Documento de trabajo pendiente de validación jurídica y tributaria definitiva ante el SII.
          </span>
        </div>

        {/* Selector de Pestañas */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 pt-2">
          <button
            onClick={() => setTab('terms')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              tab === 'terms'
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Términos del Servicio
          </button>
          <button
            onClick={() => setTab('privacy')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              tab === 'privacy'
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Privacidad y Datos
          </button>
          <button
            onClick={() => setTab('refund')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              tab === 'refund'
                ? 'border-orange-400 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Cancelación y Reposición
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {tab === 'terms' && (
            <div className="space-y-4">
              <h4 className="font-bold text-white text-base">Términos Comerciales y Operativos</h4>
              <p>
                <strong>1. Naturaleza de los Servicios:</strong> PotenciaRedes Chile ofrece servicios de amplificación de presencia en redes sociales para perfiles y contenidos de acceso estrictamente público.
              </p>
              <p>
                <strong>2. Prohibición de Acceso a Cuentas:</strong> La plataforma nunca solicitará contraseñas, claves temporales ni accesos de autenticación de las cuentas de sus clientes.
              </p>
              <p>
                <strong>3. Modos de Pago y Precios:</strong> Toda cotización se expresa en Pesos Chilenos (CLP). Las transferencias bancarias a la cuenta Tenpo gozan de un 5% de descuento directo sobre el precio público, redondeado al peso más cercano.
              </p>
              <p>
                <strong>4. Requisitos de las Cuentas:</strong> Las cuentas deben permanecer públicas durante todo el periodo de procesamiento. Cambiar el nombre de usuario o privatizar la cuenta durante la entrega invalidará la garantía.
              </p>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="space-y-4">
              <h4 className="font-bold text-white text-base">Política de Privacidad y Token Seguro</h4>
              <p>
                <strong>1. Seguridad de Trazabilidad:</strong> Cada pedido genera un token criptográfico único e impredecible de 256 bits (64 caracteres hexadecimales). Esto garantiza que únicamente quien posee el token privado puede consultar el estado de la compra.
              </p>
              <p>
                <strong>2. Uso de Datos:</strong> El correo electrónico y el número de contacto solo se utilizan para notificaciones de servicio, reposición y verificación de pagos.
              </p>
            </div>
          )}

          {tab === 'refund' && (
            <div className="space-y-4">
              <h4 className="font-bold text-white text-base">Garantía de Reposición (Refill) y Cancelaciones</h4>
              <p>
                <strong>1. Reposición Manual (Refill):</strong> Para servicios que indiquen contar con periodo de reposición (ej. 30 días), el cliente puede solicitar una reposición sin costo si la métrica experimenta una caída superior al 10% del total adquirido.
              </p>
              <p>
                <strong>2. Devoluciones:</strong> Si un pedido no puede ser activado por causas imputables a la plataforma, se procederá al reembolso íntegro del monto pagado a la cuenta bancaria de origen informada.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-fuchsia-600 to-orange-500 hover:from-fuchsia-500 hover:to-orange-400 rounded-xl transition-all cursor-pointer shadow-md"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
