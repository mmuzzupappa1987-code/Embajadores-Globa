'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Embajador, Referido } from '@/lib/types';

function CerrarReferidoBtn({
  id,
  onCerrar,
  disabled,
}: {
  id: string;
  onCerrar: (id: string, monto: number) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [monto, setMonto] = useState('');

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full hover:bg-amber-200 transition-colors font-medium"
      >
        Cerrar referido
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <input
        type="number"
        value={monto}
        onChange={(e) => setMonto(e.target.value)}
        placeholder="Cashback $"
        className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        autoFocus
      />
      <button
        onClick={() => {
          onCerrar(id, parseFloat(monto) || 0);
          setOpen(false);
          setMonto('');
        }}
        disabled={disabled}
        className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-full hover:bg-red-200 transition-colors font-medium disabled:opacity-50"
      >
        Confirmar
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Cancelar
      </button>
    </div>
  );
}

export default function Admin() {
  const [embajadores, setEmbajadores] = useState<Embajador[]>([]);
  const [referidos, setReferidos] = useState<(Referido & { embajadores?: { nombre: string } })[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRef, setNuevoRef] = useState({ embajador_id: '', nombre_referido: '' });
  const [loading, setLoading] = useState(false);
  const [filtroEmbajador, setFiltroEmbajador] = useState('');
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('embajador');
    if (!stored) {
      router.push('/');
      return;
    }
    const emb: Embajador = JSON.parse(stored);
    if (emb.nombre !== 'Sol') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: embs }, { data: refs }] = await Promise.all([
      supabase.from('embajadores').select('*').order('nombre'),
      supabase
        .from('referidos')
        .select('*, embajadores(nombre)')
        .order('created_at', { ascending: false }),
    ]);
    if (embs) setEmbajadores(embs);
    if (refs) setReferidos(refs as any);
  };

  const agregarEmbajador = async () => {
    if (!nuevoNombre.trim()) return;
    setLoading(true);
    await supabase.from('embajadores').insert({ nombre: nuevoNombre.trim() });
    setNuevoNombre('');
    await fetchData();
    setLoading(false);
  };

  const agregarReferido = async () => {
    if (!nuevoRef.embajador_id || !nuevoRef.nombre_referido.trim()) return;
    setLoading(true);
    await supabase.from('referidos').insert({
      embajador_id: nuevoRef.embajador_id,
      nombre_referido: nuevoRef.nombre_referido.trim(),
      estado: 'activo',
      cashback_monto: 0,
    });
    setNuevoRef({ embajador_id: '', nombre_referido: '' });
    await fetchData();
    setLoading(false);
  };

  const cerrarReferido = async (id: string, cashback_monto: number) => {
    setLoading(true);
    const hoy = new Date().toISOString().split('T')[0];
    await supabase
      .from('referidos')
      .update({
        estado: 'cerrado',
        cashback_monto,
        cashback_inicio: hoy,
        fecha_cierre: hoy,
      })
      .eq('id', id);
    await fetchData();
    setLoading(false);
  };

  const referidosFiltrados = filtroEmbajador
    ? referidos.filter((r) => r.embajador_id === filtroEmbajador)
    : referidos;

  const activos = referidos.filter((r) => r.estado === 'activo').length;
  const cerrados = referidos.filter((r) => r.estado === 'cerrado').length;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white px-6 py-4 shadow">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">Admin — Tablero GLOBA</h1>
            <p className="text-indigo-200 text-sm">
              {embajadores.length} embajadores · {activos} activos · {cerrados} cerrados
            </p>
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

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Add Ambassador */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">Agregar Embajador</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && agregarEmbajador()}
              placeholder="Nombre del embajador"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={agregarEmbajador}
              disabled={loading || !nuevoNombre.trim()}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Agregar
            </button>
          </div>
          {embajadores.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {embajadores.map((e) => (
                <span
                  key={e.id}
                  className="bg-indigo-50 text-indigo-700 text-sm px-3 py-1 rounded-full font-medium"
                >
                  {e.nombre}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Add Referral */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">Cargar Referido</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={nuevoRef.embajador_id}
              onChange={(e) => setNuevoRef((p) => ({ ...p, embajador_id: e.target.value }))}
              className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Seleccionar embajador</option>
              {embajadores.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={nuevoRef.nombre_referido}
              onChange={(e) => setNuevoRef((p) => ({ ...p, nombre_referido: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && agregarReferido()}
              placeholder="Nombre del referido"
              className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={agregarReferido}
              disabled={loading || !nuevoRef.embajador_id || !nuevoRef.nombre_referido.trim()}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cargar Referido
            </button>
          </div>
        </section>

        {/* All Referrals */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-gray-800">Todos los Referidos</h2>
            <select
              value={filtroEmbajador}
              onChange={(e) => setFiltroEmbajador(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Todos los embajadores</option>
              {embajadores.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>

          {referidosFiltrados.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Sin referidos cargados</p>
          ) : (
            <div className="space-y-2">
              {referidosFiltrados.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{r.nombre_referido}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.embajadores?.nombre} ·{' '}
                      {new Date(r.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.estado === 'activo' ? (
                      <>
                        <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                          Activo
                        </span>
                        <CerrarReferidoBtn
                          id={r.id}
                          onCerrar={cerrarReferido}
                          disabled={loading}
                        />
                      </>
                    ) : (
                      <div className="text-right">
                        <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full">
                          Cerrado
                        </span>
                        <p className="text-xs text-indigo-600 font-bold mt-1">
                          ${r.cashback_monto.toLocaleString('es-AR')} cashback
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
