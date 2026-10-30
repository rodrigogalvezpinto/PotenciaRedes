/**
 * Barra Superior - PotenciaRedes Chile
 * Identidad oficial con el logotipo principal, resplandor neón magenta/naranja y navegación rápida.
 */
import React from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

interface TopBarProps {
  activeTab: 'catalog' | 'tracking' | 'admin' | 'faq';
  onNavigate: (tab: 'catalog' | 'tracking' | 'admin' | 'faq') => void;
  onOpenOrderModal?: () => void;
  onOpenDevModal: (title: string, message: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onNavigate,
  onOpenOrderModal
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#090c14]/90 backdrop-blur-xl border-b border-slate-800/80 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-17 flex items-center justify-between gap-6">
        {/* Zona 1: Logo Principal Oficial de PotenciaRedes */}
        <button
          onClick={() => onNavigate('catalog')}
          className="group flex items-center gap-3 text-left hover:opacity-95 transition-opacity cursor-pointer"
        >
          {/* Emblema Circular Neón */}
          <div className="relative w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-fuchsia-600 via-purple-500 to-orange-500 shadow-[0_0_15px_rgba(236,72,153,0.4)] group-hover:shadow-[0_0_22px_rgba(249,115,22,0.6)] group-hover:scale-105 transition-all">
            <img
              src="/assets/aistudio/PotenciaRedes__Crecimiento_Social_Neo_n_3e17a135.png"
              alt="PotenciaRedes Icono Principal"
              className="w-full h-full object-cover rounded-full bg-black"
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-white font-sans">
                Potencia<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-rose-400">Redes</span>
              </span>
              <span className="text-[10px] font-extrabold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 uppercase tracking-wider">
                Chile
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
              Seguidores, Likes & Vistas en CLP
            </p>
          </div>
        </button>

        {/* Zona 2: Enlaces de Navegación */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-300">
          <button
            onClick={() => onNavigate('catalog')}
            className={`whitespace-nowrap shrink-0 transition-all py-1 cursor-pointer ${
              activeTab === 'catalog'
                ? 'text-orange-400 border-b-2 border-orange-400 shadow-[0_2px_10px_rgba(249,115,22,0.4)]'
                : 'hover:text-white'
            }`}
          >
            Catálogo y Precios
          </button>
          <button
            onClick={() => onNavigate('tracking')}
            className={`whitespace-nowrap shrink-0 transition-all py-1 cursor-pointer ${
              activeTab === 'tracking'
                ? 'text-orange-400 border-b-2 border-orange-400 shadow-[0_2px_10px_rgba(249,115,22,0.4)]'
                : 'hover:text-white'
            }`}
          >
            Seguimiento de Pedido
          </button>
          <button
            onClick={() => onNavigate('faq')}
            className={`whitespace-nowrap shrink-0 transition-all py-1 cursor-pointer ${
              activeTab === 'faq'
                ? 'text-orange-400 border-b-2 border-orange-400 shadow-[0_2px_10px_rgba(249,115,22,0.4)]'
                : 'hover:text-white'
            }`}
          >
            Preguntas Frecuentes
          </button>
          <button
            onClick={() => onNavigate('admin')}
            className={`whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all py-1 cursor-pointer ${
              activeTab === 'admin'
                ? 'text-orange-400 border-b-2 border-orange-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
            <span>Administración</span>
          </button>
        </nav>

        {/* Zona 3: Botón de Acción Principal Neón */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenOrderModal ? onOpenOrderModal : () => onNavigate('catalog')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-fuchsia-600 via-purple-600 to-orange-500 rounded-xl hover:from-fuchsia-500 hover:to-orange-400 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 shadow-lg shadow-orange-500/25 border border-white/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Hacer Pedido</span>
          </button>
        </div>
      </div>
    </header>
  );
};
