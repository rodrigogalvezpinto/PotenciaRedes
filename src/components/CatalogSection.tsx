/**
 * Sección de Catálogo Comercial y Tabla de Precios - PotenciaRedes Chile
 * Estilo visual oscuro de alto impacto con acentos neón oficiales (magenta, púrpura, naranja),
 * filtros por plataforma y desglose transparente de ahorros con Tenpo en CLP.
 */
import React, { useState } from 'react';
import { Service } from '../types.js';
import { Search, Clock, RefreshCw, ArrowUpRight, CheckCircle2, Tag, Sparkles } from 'lucide-react';

interface CatalogSectionProps {
  services: Service[];
  onSelectService: (service: Service) => void;
  onOpenDevModal: (title: string, message: string) => void;
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({
  services,
  onSelectService
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const platforms = [
    { id: 'all', label: 'Todos los Servicios' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'linkedin', label: 'LinkedIn' }
  ];

  const filteredServices = services.filter((s) => {
    const matchesPlatform = selectedPlatform === 'all' || s.platform.toLowerCase() === selectedPlatform;
    const matchesSearch =
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPlatformBadge = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-500/40 shadow-xs">
            Instagram
          </span>
        );
      case 'tiktok':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-500/40 shadow-xs">
            TikTok
          </span>
        );
      case 'youtube':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-red-400 bg-red-950/80 px-2 py-0.5 rounded-md border border-red-500/40 shadow-xs">
            YouTube
          </span>
        );
      case 'linkedin':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-500/40 shadow-xs">
            LinkedIn
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
            {platform}
          </span>
        );
    }
  };

  return (
    <section id="catalogo" className="py-16 bg-[#07090e] border-b border-slate-800 text-left relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabecera de Sección con Acentos Neón */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tarifas Oficiales en Pesos Chilenos (CLP)</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Catálogo Oficial de Servicios
            </h2>
            <p className="text-sm text-slate-400 mt-1.5 max-w-xl">
              Precios por cada 1.000 unidades. <strong>5% de descuento automático</strong> calculado al pagar con transferencia Tenpo.
            </p>
          </div>

          {/* Buscador de Servicios con Estilo Oscuro */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar servicio (Seguidores, Likes, Vistas)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent shadow-xs"
            />
          </div>
        </div>

        {/* Barra de Filtros Segmentados por Plataforma */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl mb-10 max-w-fit shadow-md">
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlatform(p.id)}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                selectedPlatform === p.id
                  ? 'bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Rejilla de Tarjetas de Servicio */}
        {filteredServices.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
            <p className="text-sm text-slate-400">No se encontraron servicios disponibles para este filtro o búsqueda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => {
              const publicRate = service.price_per_1000;
              const tenpoRate = Math.round((publicRate * 95) / 100);

              return (
                <div
                  key={service.id}
                  className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/90 p-6 flex flex-col justify-between hover:border-fuchsia-500/50 hover:shadow-[0_0_30px_rgba(236,72,153,0.15)] transition-all relative overflow-hidden group"
                >
                  {/* Línea superior neón según plataforma */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      service.platform === 'instagram'
                        ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600'
                        : service.platform === 'tiktok'
                        ? 'bg-gradient-to-r from-cyan-400 to-fuchsia-500'
                        : service.platform === 'youtube'
                        ? 'bg-gradient-to-r from-red-500 to-orange-500'
                        : service.platform === 'linkedin'
                        ? 'bg-blue-500'
                        : 'bg-slate-700'
                    }`}
                  />

                  <div className="space-y-3.5 pt-1">
                    {/* Header de la tarjeta */}
                    <div className="flex items-center justify-between">
                      {getPlatformBadge(service.platform)}
                      <span className="text-[11px] font-mono text-slate-400">
                        Mín {service.min_quantity.toLocaleString('es-CL')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug group-hover:text-amber-300 transition-colors">
                      {service.title}
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {service.description}
                    </p>

                    {/* Fila de Condiciones de Entrega */}
                    <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>Inicio estimado: <strong>{service.delivery_time_hours} a 6 horas</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>
                          {service.refill_days > 0
                            ? `Garantía reposición manual: ${service.refill_days} días`
                            : 'Entrega estable sin reposición'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fila de Precios y Acción */}
                  <div className="pt-5 mt-4 border-t border-slate-800 flex items-end justify-between">
                    <div>
                      <span className="block text-[11px] text-slate-400 font-medium">
                        Precio público / 1.000:
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-extrabold text-white tabular-nums">
                          {formatCLP(publicRate)}
                        </span>
                      </div>
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Con Tenpo: {formatCLP(tenpoRate)}</span>
                        <span className="text-emerald-300 font-normal">(-5%)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectService(service)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-black text-white bg-gradient-to-r from-fuchsia-600 via-purple-600 to-orange-500 hover:from-fuchsia-500 hover:to-orange-400 rounded-xl active:scale-[0.98] transition-all shadow-md shadow-orange-500/20 cursor-pointer border border-white/10"
                    >
                      <span>Cotizar</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sección de Proceso Transparente */}
        <div className="mt-16 p-8 bg-slate-900/60 rounded-3xl border border-slate-800 shadow-xl">
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block mb-1">
              Paso a Paso
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              ¿Cómo procesamos tu pedido en PotenciaRedes Chile?
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                1
              </span>
              <h4 className="text-sm font-bold text-white">Eliges y Cotizas</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seleccionas tu servicio, cantidad requerida e ingresas el enlace público de tu perfil o publicación.
              </p>
            </div>

            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                2
              </span>
              <h4 className="text-sm font-bold text-white">Pagas con Ahorro</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Paga con Webpay Plus o transfiere a nuestra cuenta Tenpo obteniendo un 5% de descuento directo en CLP.
              </p>
            </div>

            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-purple-600 to-orange-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                3
              </span>
              <h4 className="text-sm font-bold text-white">Activación Segura</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Revisamos manualmente el abono y programamos la entrega natural hacia tu cuenta sin pedir contraseñas.
              </p>
            </div>

            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2">
              <span className="w-7 h-7 rounded-lg bg-orange-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                4
              </span>
              <h4 className="text-sm font-bold text-white">Seguimiento Privado</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Monitoreas el avance con tu token único privado y cuentas con garantía de reposición de 30 días.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
