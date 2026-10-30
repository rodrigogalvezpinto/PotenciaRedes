/**
 * Sección Hero Dinámica - PotenciaRedes Chile
 * Identidad visual basada en el logotipo oficial, colores neón (magenta, púrpura, naranja, cian)
 * e iconos 3D de redes sociales flotando en el entorno.
 */
import React from 'react';
import { ArrowRight, ShieldCheck, Percent, Zap, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react';

interface HeroSectionProps {
  onExploreCatalog: () => void;
  onOpenTracking: () => void;
  onOpenLegal: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreCatalog,
  onOpenTracking
}) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#07090e] via-[#0d111d] to-[#07090e] border-b border-slate-800 text-left pt-10 pb-16">
      {/* Resplandor neón ambiental central */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-r from-fuchsia-600/15 via-purple-600/15 to-orange-500/15 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Columna 1: Propuesta de Valor y Llamado a la Acción */}
          <div className="lg:col-span-7 space-y-6">
            {/* Pill llamativo con identidad oficial */}
            <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 bg-slate-900/90 rounded-full border border-fuchsia-500/40 shadow-[0_0_20px_rgba(236,72,153,0.25)] text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5 text-fuchsia-400">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>PotenciaRedes Chile</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-300">Precios en CLP</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 font-extrabold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                -5% Transferencia Tenpo
              </span>
            </div>

            {/* Título Principal con los Colores de Marca */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] text-balance">
              Impulsa tu cuenta con{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-purple-400 to-orange-400 drop-shadow-[0_0_25px_rgba(236,72,153,0.35)]">
                Seguidores, Likes y Reproducciones
              </span>
            </h1>

            {/* Subtítulo enfocado en creadores y marcas */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-normal">
              Aumenta tu visibilidad y credibilidad en <strong>Instagram, TikTok y YouTube</strong>. 
              Servicios garantizados, activación rápida en horas y 100% seguros sin necesidad de contraseñas.
            </p>

            {/* Botones de Acción Neón */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onExploreCatalog}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-black text-white bg-gradient-to-r from-fuchsia-600 via-purple-600 to-orange-500 rounded-xl hover:from-fuchsia-500 hover:to-orange-400 transition-all shadow-[0_0_30px_rgba(249,115,22,0.35)] active:scale-[0.98] border border-white/20 cursor-pointer"
              >
                <span>Ver Servicios y Precios CLP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenTracking}
                className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-bold text-slate-200 bg-slate-900/90 border border-slate-700/80 rounded-xl hover:bg-slate-800 hover:text-white transition-all shadow-sm cursor-pointer"
              >
                <span>Rastrear mi Pedido</span>
              </button>
            </div>

            {/* Beneficios Clave */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2.5 text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 rounded-lg border border-slate-700/80 shadow-xs">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Inicio en 1 a 6 horas</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 rounded-lg border border-slate-700/80 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% Seguro (Sin contraseñas)</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 rounded-lg border border-slate-700/80 shadow-xs">
                <Percent className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>-5% de Descuento en Tenpo</span>
              </div>
            </div>
          </div>

          {/* Columna 2: Presentación del Logo Principal Oficial con Aura Neón y Reacciones */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md">
              {/* Resplandor neón pulsante detrás del logo */}
              <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-600/30 via-purple-600/30 to-orange-500/35 rounded-full blur-2xl transform scale-110 pointer-events-none animate-neon-pulse" />

              {/* Marco Central con la Imagen Oficial */}
              <div className="relative rounded-3xl p-3 bg-gradient-to-tr from-fuchsia-600 via-purple-500 to-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.3)]">
                <div className="relative rounded-[22px] overflow-hidden bg-black aspect-square flex items-center justify-center group">
                  <img
                    src="/assets/aistudio/PotenciaRedes__Crecimiento_Social_Neo_n_3e17a135.png"
                    alt="PotenciaRedes Crecimiento Social Neón"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Insignia Flotante de Crecimiento */}
                  <div className="absolute bottom-4 left-4 right-4 bg-slate-950/85 backdrop-blur-md rounded-xl p-3 border border-fuchsia-500/30 shadow-xl flex items-center justify-between text-left">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <TrendingUp className="w-4 h-4 text-orange-400" />
                        <span>Crecimiento 100% Garantizado</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Instagram · TikTok · YouTube · Redes Sociales
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-300 bg-orange-950/90 px-2 py-1 rounded-lg border border-orange-500/40">
                      Chile
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tarjetas de Plataformas con Colores Vivos */}
        <div className="mt-14 pt-8 border-t border-slate-800/90 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {/* Instagram */}
          <div className="p-4 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-rose-500/20 hover:border-rose-500/50 transition-colors shadow-xs space-y-1">
            <div className="flex items-center gap-2 text-rose-400 font-extrabold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-rose-500" />
              <span>Instagram</span>
            </div>
            <h4 className="text-sm font-bold text-white">Seguidores y Likes</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Para perfiles públicos, fotos y Reels con entrega progresiva y natural.
            </p>
          </div>

          {/* TikTok */}
          <div className="p-4 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-cyan-500/20 hover:border-cyan-500/50 transition-colors shadow-xs space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>TikTok</span>
            </div>
            <h4 className="text-sm font-bold text-white">Vistas y Seguidores</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Haz viral tu contenido aumentando reproducciones y guardados al instante.
            </p>
          </div>

          {/* YouTube */}
          <div className="p-4 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-red-500/20 hover:border-red-500/50 transition-colors shadow-xs space-y-1">
            <div className="flex items-center gap-2 text-red-400 font-extrabold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-red-500" />
              <span>YouTube</span>
            </div>
            <h4 className="text-sm font-bold text-white">Vistas y Suscriptores</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Reproducciones de alta retención para alcanzar requisitos de monetización.
            </p>
          </div>

          {/* Pago Seguro en Chile */}
          <div className="p-4 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-emerald-500/20 hover:border-emerald-500/50 transition-colors shadow-xs space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Pago Local en Chile</span>
            </div>
            <h4 className="text-sm font-bold text-white">Tenpo y Webpay Plus</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ahorra 5% pagando por transferencia bancaria directa o usa tarjetas nacionales.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
