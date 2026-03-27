'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Embajador, Referido } from '@/lib/types';

function diasParaVencer(cashbackInicio: string): number {
  const inicio = new Date(cashbackInicio);
  const vencimiento = new Date(inicio);
  vencimiento.setDate(vencimiento.getDate() + 365);
  const hoy = new Date();
  return Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'gray' | 'indigo';
}) {
  const styles = {
    blue: 'bg-blue-50 text-blue-800',
    green: 'bg-emerald-50 text-emerald-800',
    gray: 'bg-gray-100 text-gray-700',
    indigo: 'bg-indigo-50 text-indigo-800',
  };
  return (
    <div className={`rounded-xl p-5 ${styles[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{label}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [embajador, setEmbajador] = useState<Embajador | null>(null);
  const [referidos, setReferidos] = useState<Referido[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('embajador');
    if (!stored) {
      router.push('/');
      return;
    }
    const emb: Embajador = JSON.parse(stored);
    setEmbajador(emb);

    supabase
      .from('referidos')
      .select('*')
      .eq('embajador_id', emb.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setReferidos(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 animate-pulse">Cargando...</p>
      </div>
    );
  }

  const activos = referidos.filter((r) => r.estado === 'activo');
  const cerrados = referidos.filter((r) => r.estado === 'cerrado');

  const cashbackValido = cerrados.filter(
    (r) => r.cashback_inicio && diasParaVencer(r.cashback_inicio) > 0
  );
  const cashbackTotal = cashbackValido.reduce((sum, r) => sum + r.cashback_monto, 0);

  const porVencer = cashbackValido.filter(
    (r) => r.cashback_inicio && diasParaVencer(r.cashback_inicio) < 90
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white px-6 py-4 shadow">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">Tablero GLOBA</h1>
            <p className="text-indigo-200 text-sm">Hola, {embajador?.nombre}</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('embajador');
              router.push('/');
            }}
            className="text-sm text-indigo-200 hover:text-white transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total referidos" value={referidos.length} color="blue" />
          <MetricCard label="Activos" value={activos.length} color="green" />
          <MetricCard label="Cerrados" value={cerrados.length} color="gray" />
          <MetricCard
            label="Cashback vigente"
            value={`$${cashbackTotal.toLocaleString('es-AR')}`}
            color="indigo"
          />
        </div>

        {/* Cashback alert */}
        {porVencer.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
            <p className="font-semibold text-amber-800 mb-2">Cashback por vencer (menos de 90 dias)</p>
            <div className="space-y-1">
              {porVencer.map((r) => (
                <div key={r.id} className="flex justify-between text-sm text-amber-700">
                  <span>{r.nombre_referido}</span>
                  <span>
                    ${r.cashback_monto.toLocaleString('es-AR')} — vence en{' '}
                    <strong>{diasParaVencer(r.cashback_inicio!)} dias</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active referrals */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">Referidos Activos</h2>
          {activos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
              Sin referidos activos
            </div>
          ) : (
            <div className="space-y-2">
              {activos.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{r.nombre_referido}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Desde {new Date(r.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                    Activo
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Closed referrals history */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">Historial de Referidos Cerrados</h2>
          {cerrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
              Sin referidos cerrados
            </div>
          ) : (
            <div className="space-y-2">
              {cerrados.map((r) => {
                const dias = r.cashback_inicio ? diasParaVencer(r.cashback_inicio) : null;
                const expirado = dias !== null && dias <= 0;
                return (
                  <div
                    key={r.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">{r.nombre_referido}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Cerrado:{' '}
                        {r.fecha_cierre
                          ? new Date(r.fecha_cierre).toLocaleDateString('es-AR')
                          : '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold text-sm ${
                          expirado ? 'text-gray-400 line-through' : 'text-indigo-600'
                        }`}
                      >
                        ${r.cashback_monto.toLocaleString('es-AR')}
                      </p>
                      {dias !== null && (
                        <p
                          className={`text-xs mt-0.5 ${
                            expirado
                              ? 'text-red-400'
                              : dias < 90
                              ? 'text-amber-500 font-semibold'
                              : 'text-gray-400'
                          }`}
                        >
                          {expirado ? 'Cashback vencido' : `Vence en ${dias} dias`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
