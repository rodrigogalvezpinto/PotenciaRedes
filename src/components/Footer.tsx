/**
 * Pie de Página Institucional - PotenciaRedes Chile
 * Logotipo oficial, resplandor neón, datos de pago en Chile (Tenpo / Webpay) y canales de contacto.
 */
import React from 'react';
import { MessageSquare, Mail, Building2, CheckCircle2, Sparkles } from 'lucide-react';

interface FooterProps {
  onOpenLegal: (tab: 'terms' | 'privacy' | 'refund') => void;
  onNavigate: (tab: 'catalog' | 'tracking' | 'admin' | 'faq') => void;
  onOpenDevModal: (title: string, message: string) => void;
  supportEmail?: string;
  supportWhatsapp?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenLegal,
  onNavigate,
  onOpenDevModal,
  supportEmail = 'soporte@potenciaredes.cl',
  supportWhatsapp = '+56987654321'
}) => {
  return (
    <footer className="bg-[#05070c] text-slate-400 border-t border-slate-800/90 text-xs text-left relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Columna 1: Marca con Logo Oficial */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white font-extrabold text-base tracking-tight">
              <div className="relative w-9 h-9 rounded-full p-[2px] bg-gradient-to-tr from-fuchsia-600 via-purple-500 to-orange-500 shadow-[0_0_15px_rgba(236,72,153,0.35)] shrink-0">
                <img
                  src="/assets/aistudio/PotenciaRedes__Crecimiento_Social_Neo_n_3e17a135.png"
                  alt="PotenciaRedes Logo"
                  className="w-full h-full object-cover rounded-full bg-black"
                />
              </div>
              <span className="text-lg font-black tracking-tight text-white font-sans">
                Potencia<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-rose-400">Redes</span>
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              La plataforma chilena para hacer crecer tu presencia en Instagram, TikTok y YouTube. Facturación en CLP, verificación por Tenpo y entrega segura sin contraseñas.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold pt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Privacidad garantizada por token seguro</span>
            </div>
          </div>

          {/* Columna 2: Navegación */}
          <div className="space-y-2.5">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>Navegación</span>
            </h4>
            <ul className="space-y-2 text-slate-300">
              <li>
                <button
                  onClick={() => onNavigate('catalog')}
                  className="hover:text-orange-400 transition-colors cursor-pointer"
                >
                  Catálogo de Servicios
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('tracking')}
                  className="hover:text-orange-400 transition-colors cursor-pointer"
                >
                  Seguimiento con Token Privado
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('faq')}
                  className="hover:text-orange-400 transition-colors cursor-pointer"
                >
                  Preguntas Frecuentes
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('admin')}
                  className="hover:text-orange-400 transition-colors cursor-pointer"
                >
                  Acceso Administrativo
                </button>
              </li>
            </ul>
          </div>

          {/* Columna 3: Medios de Pago en Chile */}
          <div className="space-y-2.5">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">
              Pagos en Chile
            </h4>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Transferencia Tenpo (-5% Descuento)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span>Webpay Plus (Débito y Crédito)</span>
              </li>
              <li>
                <button
                  onClick={() =>
                    onOpenDevModal(
                      'Pagos en cuotas sin interés',
                      'La habilitación de cuotas sin interés requiere contrato comercial específico con cada banco emisor a través de Transbank. Esta opción se encuentra en gestión.'
                    )
                  }
                  className="hover:text-orange-300 transition-colors text-slate-400 underline cursor-pointer"
                >
                  Cuotas sin interés (En trámite)
                </button>
              </li>
            </ul>
          </div>

          {/* Columna 4: Marco Legal y Soporte */}
          <div className="space-y-2.5">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">
              Soporte y Contacto
            </h4>
            <ul className="space-y-2 text-slate-300">
              <li>
                <button
                  onClick={() => onOpenLegal('terms')}
                  className="hover:text-orange-400 transition-colors cursor-pointer"
                >
                  Términos del Servicio
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal('privacy')}
                  className="hover:text-orange-400 transition-colors cursor-pointer"
                >
                  Política de Privacidad
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal('refund')}
                  className="hover:text-orange-400 transition-colors cursor-pointer"
                >
                  Garantía y Reposición
                </button>
              </li>
              <li className="pt-2 flex flex-col gap-1.5 text-[11px]">
                <a
                  href={`mailto:${supportEmail}`}
                  className="hover:text-white flex items-center gap-1.5 text-slate-300"
                >
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                  <span>{supportEmail}</span>
                </a>
                <a
                  href={`https://wa.me/${supportWhatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white flex items-center gap-1.5 text-emerald-400 font-bold"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp: {supportWhatsapp}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer Legal y Copyright */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>
            © {new Date().getFullYear()} PotenciaRedes Chile. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            <span>Moneda: Pesos Chilenos (CLP) · Santiago de Chile</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
