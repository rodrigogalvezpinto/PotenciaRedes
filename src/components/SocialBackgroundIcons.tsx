/**
 * Componente de Iconos y Reacciones Sociales 3D Flotantes en el Fondo - PotenciaRedes
 * Inspirado directamente en el arte de marca con Instagram, TikTok, YouTube, burbujas de likes y seguidores.
 * Se posicionan con opacidad sutil, efectos 3D, sombras neón y animaciones flotantes suaves en segundo plano.
 */
import React from 'react';

export const SocialBackgroundIcons: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* 1. Resplandor Ambiental Neón Superior (Magenta a Naranja) */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-r from-fuchsia-600/20 via-purple-600/15 to-orange-500/20 blur-[130px] rounded-full pointer-events-none animate-neon-pulse" />

      {/* 2. Resplandor Ambiental Inferior Izquierdo (Cyan / TikTok) */}
      <div className="absolute top-[45%] -left-40 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* 3. Resplandor Ambiental Inferior Derecho (Violeta / Instagram) */}
      <div className="absolute top-[60%] -right-40 w-[550px] h-[550px] bg-purple-600/15 blur-[130px] rounded-full pointer-events-none" />

      {/* ========================================================
          ICONOS Y BURBUJAS 3D FLOTANTES (Fondo Dinámico)
          ======================================================== */}

      {/* A. Icono 3D Instagram - Superior Izquierda */}
      <div className="absolute top-24 left-[4%] sm:left-[8%] lg:left-[11%] opacity-40 hover:opacity-75 transition-opacity animate-float-gentle">
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] p-[3px] shadow-[0_12px_30px_rgba(225,48,108,0.35)] rotate-[-12deg]">
          <div className="w-full h-full rounded-[14px] bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center relative overflow-hidden">
            {/* Brillo especular 3D */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/25 rounded-t-[14px] pointer-events-none" />
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* B. Icono 3D TikTok - Mitad Izquierda */}
      <div className="absolute top-[38%] left-[2%] sm:left-[5%] lg:left-[7%] opacity-35 hover:opacity-70 transition-opacity animate-float-drift">
        <div className="relative w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-[#090b10] border border-slate-700/60 p-2.5 shadow-[0_10px_28px_rgba(6,182,212,0.3)] rotate-[10deg]">
          {/* Brillo especular */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent rounded-2xl pointer-events-none" />
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Sombra cian y magenta TikTok */}
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7 text-white drop-shadow-[2px_2px_0px_rgba(254,44,85,0.9)] drop-shadow-[-2px_-2px_0px_rgba(37,244,238,0.9)]"
              fill="currentColor"
            >
              <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.887 2.883 2.895 2.895 0 0 1-2.893-2.883 2.895 2.895 0 0 1 2.893-2.883c.404 0 .787.086 1.134.238V9.458a6.34 6.34 0 0 0-1.134-.103C5.973 9.355 3 12.33 3 15.672 3 19.013 5.973 22 9.487 22c3.513 0 6.48-2.987 6.48-6.328V9.167a8.163 8.163 0 0 0 4.622 1.417V7.139a4.808 4.808 0 0 1-1-.453z" />
            </svg>
          </div>
        </div>
      </div>

      {/* C. Burbuja 3D Me Gusta (Heart) - Centro Izquierda */}
      <div className="absolute top-[68%] left-[5%] sm:left-[9%] opacity-35 animate-float-reverse">
        <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-2.5 shadow-[0_10px_25px_rgba(244,63,94,0.4)] rotate-[-14deg] flex items-center justify-center">
          {/* Cola de bocadillo de chat */}
          <div className="absolute -bottom-1.5 left-2.5 w-3 h-3 bg-red-600 rotate-45 rounded-xs" />
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30 rounded-t-2xl pointer-events-none" />
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
            fill="currentColor"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      </div>

      {/* D. Icono 3D YouTube - Superior Derecha */}
      <div className="absolute top-28 right-[4%] sm:right-[7%] lg:right-[10%] opacity-40 hover:opacity-75 transition-opacity animate-float-reverse">
        <div className="relative w-14 h-12 sm:w-17 sm:h-13 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl p-2 shadow-[0_12px_30px_rgba(239,68,68,0.4)] rotate-[8deg] flex items-center justify-center">
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/25 rounded-t-2xl pointer-events-none" />
          <svg
            viewBox="0 0 24 24"
            className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] ml-0.5"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* E. Burbuja 3D Me Gusta (Pink/Magenta) - Mitad Superior Derecha */}
      <div className="absolute top-[42%] right-[3%] sm:right-[6%] lg:right-[8%] opacity-35 animate-float-gentle">
        <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600 rounded-2xl p-2 shadow-[0_10px_25px_rgba(236,72,153,0.4)] rotate-[15deg] flex items-center justify-center">
          <div className="absolute -bottom-1.5 right-3 w-3 h-3 bg-fuchsia-600 rotate-45 rounded-xs" />
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30 rounded-t-2xl pointer-events-none" />
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
            fill="currentColor"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      </div>

      {/* F. Burbuja 3D Comunidad / Seguidores (Azul Social) - Mitad Inferior Derecha */}
      <div className="absolute top-[68%] right-[5%] sm:right-[9%] opacity-35 animate-float-drift">
        <div className="relative w-13 h-13 sm:w-15 sm:h-15 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-2.5 shadow-[0_10px_28px_rgba(59,130,246,0.4)] rotate-[-10deg] flex items-center justify-center">
          <div className="absolute -bottom-1.5 right-4 w-3.5 h-3.5 bg-indigo-600 rotate-45 rounded-xs" />
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/25 rounded-t-2xl pointer-events-none" />
          <svg
            viewBox="0 0 24 24"
            className="w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
            fill="currentColor"
          >
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
        </div>
      </div>

      {/* G. Flecha de Crecimiento Neón (Orange/Amber) - Centro Inferior */}
      <div className="absolute top-[88%] left-[12%] opacity-30 animate-float-gentle">
        <div className="relative w-11 h-11 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl p-2 shadow-[0_10px_24px_rgba(249,115,22,0.4)] rotate-[25deg] flex items-center justify-center">
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30 rounded-t-2xl pointer-events-none" />
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        </div>
      </div>
    </div>
  );
};
