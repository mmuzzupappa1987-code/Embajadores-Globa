'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Embajador, Referido, EstadoReferido } from '@/lib/types';

function diasParaVencer(cashbackInicio: string): number {
  const vencimiento = new Date(cashbackInicio);
  vencimiento.setDate(vencimiento.getDate() + 365);
  return Math.ceil((vencimiento.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const ESTADO_STYLES: Record<EstadoReferido, string> = {
  'Contactado': 'bg-blue-100 text-blue-700',
  'En asesoramiento': 'bg-purple-100 text-purple-700',
  'Cotizado': 'bg-amber-100 text-amber-700',
  'Confirmado': 'bg-emerald-100 text-emerald-700',
  'No concretado': 'bg-gray-100 text-gray-500',
};

export default function Dashboard() {
  const [embajador, setEmbajador] = useState<Embajador | null>(null);
  const [referidos, setReferidos] = useState<Referido[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/'); return; }

      const { data: emb } = await supabase
        .from('embajadores')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (!emb) { router.replace('/'); return; }
      if (emb.es_admin) { router.replace('/admin'); return; }
      setEmbajador(emb);

      const { data: refs } = await supabase
        .from('referidos')
        .select('*')
        .eq('embajador_id', emb.id)
        .order('created_at', { ascending: false });

      if (refs) setReferidos(refs);
      setLoading(false);
    };
    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 animate-pulse text-sm">Cargando...</p>
      </div>
    );
  }

  const enProceso = referidos.filter(r => !['Confirmado', 'No concretado'].includes(r.estado));
  const confirmados = referidos.filter(r => r.estado === 'Confirmado');
  const noConcretados = referidos.filter(r => r.estado === 'No concretado');

  const cashbackVigente = confirmados.filter(
    r => r.cashback_inicio && diasParaVencer(r.cashback_inicio) > 0
  );
  const cashbackTotal = cashbackVigente.reduce((sum, r) => sum + r.cashback_monto, 0);
  const porVencer = cashbackVigente.filter(
    r => r.cashback_inicio && diasParaVencer(r.cashback_inicio) < 90
  );

  return (
    <main className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-indigo-600 text-white px-4 py-4 shadow-md sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div>
            <p className="text-xs text-indigo-200 uppercase tracking-widest font-medium">GLOBA</p>
            <h1 className="font-bold text-lg leading-tight">Hola, {embajador?.nombre}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-indigo-200 hover:text-white active:text-indigo-100 transition-colors py-2 px-3"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Total</p>
            <p className="text-4xl font-bold text-gray-800 mt-1">{referidos.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">En proceso</p>
            <p className="text-4xl font-bold text-violet-600 mt-1">{enProceso.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Confirmados</p>
            <p className="text-4xl font-bold text-emerald-600 mt-1">{confirmados.length}</p>
          </div>
          <div className="bg-indigo-600 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-indigo-200 uppercase tracking-wide font-medium">Cashback vigente</p>
            <p className="text-2xl font-bold text-white mt-1 leading-tight">
              ${cashbackTotal.toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        {/* Alerta vencimiento */}
        {porVencer.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="font-semibold text-amber-800 text-sm mb-2">Cashback por vencer (menos de 90 días)</p>
            <div className="space-y-1.5">
              {porVencer.map(r => (
                <div key={r.id} className="flex justify-between text-sm text-amber-700">
                  <span>{r.nombre_referido}</span>
                  <span className="font-bold">{diasParaVencer(r.cashback_inicio!)} días</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referidos activos */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Referidos activos ({enProceso.length})
          </h2>
          {enProceso.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
              Sin referidos activos
            </div>
          ) : (
            <div className="space-y-2">
              {enProceso.map(r => (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex justify-between items-center gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{r.nombre_referido}</p>
                    {r.destino && (
                      <p className="text-xs text-gray-400 mt-0.5">{r.destino}</p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 ${ESTADO_STYLES[r.estado]}`}>
                    {r.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Cuenta corriente cashback */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Cuenta corriente cashback
          </h2>
          {confirmados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
              Sin cashback acumulado aún
            </div>
          ) : (
            <div className="space-y-2">
              {confirmados.map(r => {
                const dias = r.cashback_inicio ? diasParaVencer(r.cashback_inicio) : null;
                const expirado = dias !== null && dias <= 0;
                const vencDate = r.cashback_inicio
                  ? new Date(
                      new Date(r.cashback_inicio).getTime() + 365 * 86400000
                    ).toLocaleDateString('es-AR')
                  : '-';
                return (
                  <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{r.nombre_referido}</p>
                        {r.destino && <p className="text-xs text-gray-400 mt-0.5">{r.destino}</p>}
                        <div className="text-xs text-gray-400 mt-2 space-y-0.5">
                          <p>
                            Inicio:{' '}
                            {r.cashback_inicio
                              ? new Date(r.cashback_inicio).toLocaleDateString('es-AR')
                              : '-'}
                          </p>
                          <p>Vence: {vencDate}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`font-bold text-xl ${
                            expirado ? 'text-gray-300 line-through' : 'text-indigo-600'
                          }`}
                        >
                          ${r.cashback_monto.toLocaleString('es-AR')}
                        </p>
                        {dias !== null && (
                          <p
                            className={`text-xs mt-1 font-medium ${
                              expirado
                                ? 'text-red-400'
                                : dias < 90
                                ? 'text-amber-500'
                                : 'text-gray-400'
                            }`}
                          >
                            {expirado ? 'Vencido' : `${dias} días`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Historial */}
        {noConcretados.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              No concretados ({noConcretados.length})
            </h2>
            <div className="space-y-2">
              {noConcretados.map(r => (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex justify-between items-center opacity-60 gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-700 truncate">{r.nombre_referido}</p>
                    {r.destino && <p className="text-xs text-gray-400">{r.destino}</p>}
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
                    No concretado
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
