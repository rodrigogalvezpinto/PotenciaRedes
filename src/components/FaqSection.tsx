/**
 * Sección de Preguntas Frecuentes (FAQ) - PotenciaRedes Chile
 * Claridad comercial, explicaciones de redondeo, tiempos de entrega y políticas de seguridad.
 */
import React from 'react';
import { HelpCircle, ChevronDown, Sparkles } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const faqs = [
    {
      q: '¿Cómo se calcula el descuento del 5% al pagar con Transferencia Tenpo?',
      a: 'Por política de ahorro operativo en comisiones bancarias, aplicamos un 5% de descuento directo sobre el precio público a toda transferencia realizada a nuestra cuenta Tenpo. El valor se calcula en el servidor redondeando al peso chileno entero más cercano: Math.round(precio público × 0.95). El ahorro exacto se muestra detallado antes de confirmar el pedido.'
    },
    {
      q: '¿Por qué no puedo consultar mi pedido usando solo un número secuencial o mi correo?',
      a: 'Para resguardar estrictamente tu privacidad conforme a directrices de seguridad OWASP (protección contra IDOR), cada orden genera un token criptográfico no deducible de 64 caracteres (256 bits). Esto impide que terceros puedan adivinar números de pedido o rastrear las compras de otras personas.'
    },
    {
      q: 'Al pulsar "Ya transferí", ¿mi pedido queda pagado de inmediato?',
      a: 'No. Al notificar la transferencia, el estado cambia a "Pago informado / pendiente de revisión". Para evitar fraudes y suplantaciones de comprobantes, un operador humano verifica el ingreso efectivo del dinero y concilia el identificador único de movimiento en la cuenta Tenpo antes de dar por confirmada la orden y pasarla a cola de despacho.'
    },
    {
      q: '¿Se requiere la contraseña de mi red social para procesar el servicio?',
      a: 'Bajo ninguna circunstancia. Nunca solicitaremos contraseñas, claves temporales ni accesos administrativos. Toda amplificación se efectúa exclusivamente hacia enlaces web públicos de tu perfil o publicación.'
    },
    {
      q: '¿Qué condiciones debe cumplir mi cuenta de red social?',
      a: 'El perfil y el contenido deben ser estrictamente PÚBLICOS y permanecer así durante todo el proceso de entrega. Si cambias el nombre de usuario (@handle), privatizas la cuenta o eliminas la publicación durante la entrega, el proceso se interrumpirá de forma irreversible y no aplicará reposición.'
    },
    {
      q: '¿Cómo funciona la garantía de reposición (Refill)?',
      a: 'Los servicios que indican contar con reposición (por ejemplo, 30 días) permiten solicitar una recarga manual a través de tu enlace privado de seguimiento si se registra una caída superior al 10% del total contratado, previa verificación técnica del estado del perfil.'
    }
  ];

  return (
    <section id="faq" className="py-16 bg-[#07090e] border-b border-slate-800 text-left relative z-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>Transparencia y Condiciones</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
          Preguntas Frecuentes
        </h2>
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          Respuestas claras sobre la operativa de pago, cálculo de descuentos y entrega en PotenciaRedes Chile.
        </p>

        <div className="divide-y divide-slate-800 bg-slate-900/60 rounded-3xl border border-slate-800 p-6 sm:p-8">
          {faqs.map((faq, idx) => (
            <details key={idx} className="group py-5 text-left first:pt-0 last:pb-0">
              <summary className="flex items-center justify-between cursor-pointer list-none font-bold text-white text-sm sm:text-base hover:text-orange-400 transition-colors">
                <span>{faq.q}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-4" />
              </summary>
              <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};
