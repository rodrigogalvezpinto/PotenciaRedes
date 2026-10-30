/**
 * Notificación Flotante de Actividad Reciente de Compras - PulsoRed Chile
 * Aparece de manera aleatoria, permanece visible exactamente 8 segundos y desaparece.
 * Con intervalos espaciados (45-75 seg) para no ser invasivo ni repetitivo.
 */
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, X, Sparkles } from 'lucide-react';

interface PurchaseActivity {
  location: string;
  service: string;
  quantity: string;
  method: string;
  timeAgo: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
}

const ACTIVITIES: PurchaseActivity[] = [
  {
    location: 'Providencia, Santiago',
    service: 'Seguidores de Instagram',
    quantity: '1.000',
    method: 'Transferencia Tenpo (-5%)',
    timeAgo: 'hace 4 minutos',
    platform: 'instagram'
  },
  {
    location: 'Concepción, Biobío',
    service: 'Reproducciones de TikTok',
    quantity: '5.000',
    method: 'Webpay Plus',
    timeAgo: 'hace 8 minutos',
    platform: 'tiktok'
  },
  {
    location: 'Viña del Mar, Valparaíso',
    service: 'Likes para Reels de Instagram',
    quantity: '2.000',
    method: 'Transferencia Tenpo (-5%)',
    timeAgo: 'hace 12 minutos',
    platform: 'instagram'
  },
  {
    location: 'Antofagasta',
    service: 'Visualizaciones YouTube (Alta Retención)',
    quantity: '1.500',
    method: 'Webpay Plus',
    timeAgo: 'hace 15 minutos',
    platform: 'youtube'
  },
  {
    location: 'Las Condes, Santiago',
    service: 'Seguidores de TikTok',
    quantity: '1.000',
    method: 'Transferencia Tenpo (-5%)',
    timeAgo: 'hace 19 minutos',
    platform: 'tiktok'
  },
  {
    location: 'Temuco, Araucanía',
    service: 'Likes para Post de Instagram',
    quantity: '500',
    method: 'Transferencia Tenpo (-5%)',
    timeAgo: 'hace 23 minutos',
    platform: 'instagram'
  },
  {
    location: 'La Serena, Coquimbo',
    service: 'Guardados & Compartidos TikTok',
    quantity: '2.500',
    method: 'Webpay Plus',
    timeAgo: 'hace 28 minutos',
    platform: 'tiktok'
  },
  {
    location: 'Ñuñoa, Santiago',
    service: 'Comentarios Reales en Español',
    quantity: '50',
    method: 'Transferencia Tenpo (-5%)',
    timeAgo: 'hace 35 minutos',
    platform: 'instagram'
  },
  {
    location: 'Puerto Montt, Los Lagos',
    service: 'Horas de Reproducción YouTube',
    quantity: '1.000',
    method: 'Webpay Plus',
    timeAgo: 'hace 41 minutos',
    platform: 'youtube'
  },
  {
    location: 'Rancagua, O\'Higgins',
    service: 'Seguidores Orgánicos TikTok',
    quantity: '2.000',
    method: 'Transferencia Tenpo (-5%)',
    timeAgo: 'hace 48 minutos',
    platform: 'tiktok'
  }
];

export const LivePurchaseNotification: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(() =>
    Math.floor(Math.random() * ACTIVITIES.length)
  );
  const [dismissed, setDismissed] = useState<boolean>(false);

  // Referencias para controlar los timers y evitar fugas
  const showTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastIndexRef = useRef<number>(currentIndex);

  const getRandomIndex = () => {
    let nextIndex = Math.floor(Math.random() * ACTIVITIES.length);
    // Evitar mostrar exactamente el mismo consecutivamente
    if (nextIndex === lastIndexRef.current && ACTIVITIES.length > 1) {
      nextIndex = (nextIndex + 1) % ACTIVITIES.length;
    }
    lastIndexRef.current = nextIndex;
    return nextIndex;
  };

  useEffect(() => {
    if (dismissed) return;

    // Primer retraso aleatorio entre 10 y 15 segundos al cargar
    const initialDelay = Math.floor(10000 + Math.random() * 5000);

    const triggerNotification = () => {
      if (dismissed) return;

      // Seleccionar compra aleatoria
      const nextIdx = getRandomIndex();
      setCurrentIndex(nextIdx);
      setVisible(true);

      // Permanecer exactamente 8 segundos visible y desaparecer
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);

        // Espaciar la siguiente aparición para que NO sea tan seguido (entre 45 y 75 segundos)
        const nextDelay = Math.floor(45000 + Math.random() * 30000);
        showTimerRef.current = setTimeout(triggerNotification, nextDelay);
      }, 8000);
    };

    showTimerRef.current = setTimeout(triggerNotification, initialDelay);

    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [dismissed]);

  if (dismissed || !visible) return null;

  const current = ACTIVITIES[currentIndex];

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return 'from-rose-500 via-pink-600 to-purple-600';
      case 'tiktok':
        return 'from-cyan-400 to-slate-900';
      case 'youtube':
        return 'from-red-600 to-rose-700';
      default:
        return 'from-blue-600 to-indigo-700';
    }
  };

  return (
    <aside
      aria-live="polite"
      className="fixed bottom-5 left-5 z-40 max-w-sm w-[calc(100vw-2.5rem)] sm:w-auto animate-in slide-in-from-bottom-5 fade-in duration-300"
    >
      <div className="bg-[#0d111d]/95 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.6)] p-4 flex items-start gap-3 relative text-left overflow-hidden ring-1 ring-white/10 text-white">
        {/* Barra de progreso de 8 segundos */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-fuchsia-500 to-orange-500 animate-[shrink_8s_linear_forwards]"
            style={{
              animation: 'shrinkProgress 8s linear forwards'
            }}
          />
        </div>

        {/* Indicador de plataforma */}
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getPlatformColor(
            current.platform
          )} flex items-center justify-center text-white shrink-0 shadow-md mt-0.5`}
        >
          <Sparkles className="w-5 h-5 text-white" />
        </div>

        <div className="space-y-0.5 pr-6 pb-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
            <span>Usuario en {current.location}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>

          <p className="text-xs text-slate-300 font-medium leading-snug">
            Compró <strong className="text-orange-400 font-bold">{current.quantity} {current.service}</strong>
          </p>

          <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
            <span className="font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
              {current.method}
            </span>
            <span>·</span>
            <span>{current.timeAgo}</span>
          </div>
        </div>

        {/* Botón de cerrar manual */}
        <button
          onClick={() => {
            setVisible(false);
            setDismissed(true);
            if (showTimerRef.current) clearTimeout(showTimerRef.current);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          }}
          className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          aria-label="Cerrar notificación"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <style>{`
        @keyframes shrinkProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </aside>
  );
};
