'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Embajador, Referido, EstadoReferido } from '@/lib/types';

const ESTADOS: EstadoReferido[] = [
  'Contactado',
  'En asesoramiento',
  'Cotizado',
  'Confirmado',
  'No concretado',
];

const ESTADO_STYLES: Record<EstadoReferido, string> = {
  'Contactado': 'bg-blue-100 text-blue-700',
  'En asesoramiento': 'bg-purple-100 text-purple-700',
  'Cotizado': 'bg-amber-100 text-amber-700',
  'Confirmado': 'bg-emerald-100 text-emerald-700',
  'No concretado': 'bg-gray-100 text-gray-500',
};

type Tab = 'referidos' | 'embajadores';

type NuevoRef = {
  embajador_id: string;
  nombre_referido: string;
  destino: string;
  estado: EstadoReferido;
  cashback_monto: string;
  cashback_inicio: string;
};

type NuevoEmb = { nombre: string; email: string; password: string };

export default function Admin() {
  const [tab, setTab] = useState<Tab>('referidos');
  const [embajadores, setEmbajadores] = useState<Embajador[]>([]);
  const [referidos, setReferidos] = useState<(Referido & { embajadores?: { nombre: string } })[]>([]);
  const [nuevoRef, setNuevoRef] = useState<NuevoRef>({
    embajador_id: '',
    nombre_referido: '',
    destino: '',
    estado: 'Contactado',
    cashback_monto: '',
    cashback_inicio: '',
  });
  const [nuevoEmb, setNuevoEmb] = useState<NuevoEmb>({ nombre: '', email: '', password: '' });
  const [filtroEmbajador, setFiltroEmbajador] = useState('');
  const [editandoEstado, setEditandoEstado] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/'); return; }
      const { data: emb } = await supabase
        .from('embajadores')
        .select('es_admin')
        .eq('user_id', session.user.id)
        .single();
      if (!emb?.es_admin) { router.replace('/dashboard'); return; }
      fetchData();
    };
    init();
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
    if (refs) setReferidos(refs as (Referido & { embajadores?: { nombre: string } })[]);
  };

  const crearEmbajador = async () => {
    if (!nuevoEmb.nombre.trim() || !nuevoEmb.email.trim() || !nuevoEmb.password.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(nuevoEmb),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ text: `Embajador "${nuevoEmb.nombre}" creado`, ok: true });
      setNuevoEmb({ nombre: '', email: '', password: '' });
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setMsg({ text: `Error: ${message}`, ok: false });
    }
    setLoading(false);
  };

  const agregarReferido = async () => {
    if (!nuevoRef.embajador_id || !nuevoRef.nombre_referido.trim()) return;
    setLoading(true);
    const hoy = new Date().toISOString().split('T')[0];
    await supabase.from('referidos').insert({
      embajador_id: nuevoRef.embajador_id,
      nombre_referido: nuevoRef.nombre_referido.trim(),
      destino: nuevoRef.destino.trim() || null,
      estado: nuevoRef.estado,
      cashback_monto: parseFloat(nuevoRef.cashback_monto) || 0,
      cashback_inicio:
        nuevoRef.cashback_inicio ||
        (nuevoRef.estado === 'Confirmado' ? hoy : null),
      fecha_cierre:
        ['Confirmado', 'No concretado'].includes(nuevoRef.estado)
          ? nuevoRef.cashback_inicio || hoy
          : null,
    });
    setNuevoRef({
      embajador_id: '',
      nombre_referido: '',
      destino: '',
      estado: 'Contactado',
      cashback_monto: '',
      cashback_inicio: '',
    });
    await fetchData();
    setLoading(false);
  };

  const actualizarEstado = async (id: string, estado: EstadoReferido) => {
    setLoading(true);
    const hoy = new Date().toISOString().split('T')[0];
    const update: Partial<Referido> = { estado };
    if (estado === 'Confirmado') {
      update.cashback_inicio = hoy;
      update.fecha_cierre = hoy;
    } else if (estado === 'No concretado') {
      update.fecha_cierre = hoy;
    }
    await supabase.from('referidos').update(update).eq('id', id);
    setEditandoEstado(null);
    await fetchData();
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const embajadoresNoAdmin = embajadores.filter(e => !e.es_admin);
  const referidosFiltrados = filtroEmbajador
    ? referidos.filter(r => r.embajador_id === filtroEmbajador)
    : referidos;

  return (
    <main className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-indigo-600 text-white px-4 py-4 shadow-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <p className="text-xs text-indigo-200 uppercase tracking-widest font-medium">Admin · GLOBA</p>
            <h1 className="font-bold text-lg leading-tight">Panel de Gestión</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-indigo-200 hover:text-white active:text-indigo-100 transition-colors py-2 px-3"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-[64px] z-10">
        <div className="max-w-2xl mx-auto flex">
          {(['referidos', 'embajadores'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3.5 text-sm font-semibold border-b-2 transition-colors capitalize ${
                tab === t
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t === 'referidos' ? 'Referidos' : 'Embajadores'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Tab: Embajadores */}
        {tab === 'embajadores' && (
          <>
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-4">Nuevo Embajador</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  value={nuevoEmb.nombre}
                  onChange={e => setNuevoEmb(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                />
                <input
                  type="email"
                  value={nuevoEmb.email}
                  onChange={e => setNuevoEmb(p => ({ ...p, email: e.target.value }))}
                  placeholder="Email"
                  inputMode="email"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                />
                <input
                  type="password"
                  value={nuevoEmb.password}
                  onChange={e => setNuevoEmb(p => ({ ...p, password: e.target.value }))}
                  placeholder="Contraseña"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                />
                <button
                  onClick={crearEmbajador}
                  disabled={loading || !nuevoEmb.nombre || !nuevoEmb.email || !nuevoEmb.password}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-base hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Creando...' : 'Crear Embajador'}
                </button>
                {msg && (
                  <p className={`text-sm text-center py-2 rounded-lg ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {msg.text}
                  </p>
                )}
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-3">
                Embajadores ({embajadoresNoAdmin.length})
              </h2>
              {embajadoresNoAdmin.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin embajadores aún</p>
              ) : (
                <div className="space-y-2">
                  {embajadoresNoAdmin.map(e => (
                    <div key={e.id} className="bg-gray-50 rounded-xl px-4 py-3">
                      <p className="font-semibold text-gray-800">{e.nombre}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* Tab: Referidos */}
        {tab === 'referidos' && (
          <>
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-800 mb-4">Cargar Referido</h2>
              <div className="space-y-3">
                <select
                  value={nuevoRef.embajador_id}
                  onChange={e => setNuevoRef(p => ({ ...p, embajador_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-base"
                >
                  <option value="">Embajador</option>
                  {embajadoresNoAdmin.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={nuevoRef.nombre_referido}
                  onChange={e => setNuevoRef(p => ({ ...p, nombre_referido: e.target.value }))}
                  placeholder="Nombre del referido"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                />
                <input
                  type="text"
                  value={nuevoRef.destino}
                  onChange={e => setNuevoRef(p => ({ ...p, destino: e.target.value }))}
                  placeholder="Destino"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                />
                <select
                  value={nuevoRef.estado}
                  onChange={e => setNuevoRef(p => ({ ...p, estado: e.target.value as EstadoReferido }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-base"
                >
                  {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <input
                  type="number"
                  value={nuevoRef.cashback_monto}
                  onChange={e => setNuevoRef(p => ({ ...p, cashback_monto: e.target.value }))}
                  placeholder="Cashback $"
                  inputMode="numeric"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                />
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Fecha de confirmación</label>
                  <input
                    type="date"
                    value={nuevoRef.cashback_inicio}
                    onChange={e => setNuevoRef(p => ({ ...p, cashback_inicio: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                  />
                </div>
                <button
                  onClick={agregarReferido}
                  disabled={loading || !nuevoRef.embajador_id || !nuevoRef.nombre_referido.trim()}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold text-base hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Guardando...' : 'Cargar Referido'}
                </button>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex justify-between items-center mb-4 gap-3">
                <h2 className="font-bold text-gray-800">
                  Todos los referidos ({referidosFiltrados.length})
                </h2>
                <select
                  value={filtroEmbajador}
                  onChange={e => setFiltroEmbajador(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white flex-shrink-0"
                >
                  <option value="">Todos</option>
                  {embajadoresNoAdmin.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>

              {referidosFiltrados.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Sin referidos cargados</p>
              ) : (
                <div className="space-y-3">
                  {referidosFiltrados.map(r => (
                    <div key={r.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{r.nombre_referido}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {r.embajadores?.nombre}
                            {r.destino ? ` · ${r.destino}` : ''}
                          </p>
                          {r.cashback_monto > 0 && (
                            <p className="text-xs text-indigo-600 font-semibold mt-1">
                              ${r.cashback_monto.toLocaleString('es-AR')}
                              {r.cashback_inicio &&
                                ` · desde ${new Date(r.cashback_inicio).toLocaleDateString('es-AR')}`}
                            </p>
                          )}
                        </div>
                        {editandoEstado === r.id ? (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <select
                              defaultValue={r.estado}
                              onChange={e =>
                                actualizarEstado(r.id, e.target.value as EstadoReferido)
                              }
                              className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              autoFocus
                            >
                              {ESTADOS.map(e => (
                                <option key={e} value={e}>{e}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => setEditandoEstado(null)}
                              className="text-gray-400 hover:text-gray-600 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditandoEstado(r.id)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 ${ESTADO_STYLES[r.estado]} hover:opacity-80 transition-opacity`}
                          >
                            {r.estado}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
