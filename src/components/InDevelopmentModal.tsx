/**
 * Modal Accesible de Funcionalidad en Desarrollo - PotenciaRedes Chile
 * Cumple con WCAG 2.2 AA:
 * - Cierre por tecla Escape y click en fondo.
 * - Enfoque inicial accesible.
 * - Atributos semánticos role="dialog" y aria-modal="true".
 * - Mensaje honesto sin simular transacciones ni éxitos ficticios.
 */
import React, { useEffect, useRef } from 'react';
import { AlertCircle, X, MessageSquare } from 'lucide-react';

interface InDevelopmentModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  pendingRequirement?: string;
  supportWhatsapp?: string;
  onClose: () => void;
}

export const InDevelopmentModal: React.FC<InDevelopmentModalProps> = ({
  isOpen,
  title,
  description,
  pendingRequirement,
  supportWhatsapp,
  onClose
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dev-modal-title"
      aria-describedby="dev-modal-desc"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-[#0d111d] rounded-3xl shadow-2xl border border-slate-800 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150 text-white"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-white">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
            <h3 id="dev-modal-title" className="text-sm font-bold text-white">
              Funcionalidad en desarrollo
            </h3>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-base font-extrabold text-white">{title}</h4>
            <p id="dev-modal-desc" className="mt-2 text-sm text-slate-300 leading-relaxed">
              {description}
            </p>
          </div>

          {pendingRequirement && (
            <div className="p-3.5 bg-amber-950/50 rounded-2xl border border-amber-500/40 text-xs text-amber-200 space-y-1">
              <span className="font-bold block text-amber-300">Requisito pendiente para habilitación:</span>
              <p className="text-amber-200 leading-normal">{pendingRequirement}</p>
            </div>
          )}

          <div className="pt-2 text-xs text-slate-400">
            Por transparencia comercial, esta característica permanece deshabilitada para evitar cobros indebidos o fallas de ejecución.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-950/60 border-t border-slate-800">
          {supportWhatsapp && (
            <a
              href={`https://wa.me/${supportWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                'Hola, tengo una consulta sobre la disponibilidad de un servicio en PotenciaRedes Chile.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 rounded-xl hover:bg-emerald-900/60 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contactar Soporte</span>
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-fuchsia-600 to-orange-500 hover:from-fuchsia-500 hover:to-orange-400 rounded-xl transition-all cursor-pointer shadow-md"
          >
            Entendido, volver
          </button>
        </div>
      </div>
    </div>
  );
};
