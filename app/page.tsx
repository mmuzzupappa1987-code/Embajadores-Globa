'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Embajador } from '@/lib/types';

export default function Home() {
  const [embajadores, setEmbajadores] = useState<Embajador[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase
      .from('embajadores')
      .select('*')
      .order('nombre')
      .then(({ data }) => {
        if (data) setEmbajadores(data);
        setLoading(false);
      });
  }, []);

  const handleIngresar = () => {
    if (!selected) return;
    const emb = embajadores.find((e) => e.id === selected);
    if (!emb) return;
    localStorage.setItem('embajador', JSON.stringify(emb));
    if (emb.nombre === 'Sol') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Tablero Embajadores</h1>
          <p className="text-indigo-600 font-semibold tracking-widest text-sm mt-1">GLOBA</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seleccioná tu nombre
            </label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800 disabled:bg-gray-50"
            >
              <option value="">
                {loading ? 'Cargando...' : '-- Elegir embajador --'}
              </option>
              {embajadores.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleIngresar}
            disabled={!selected || loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Ingresar
          </button>
        </div>
      </div>
    </main>
  );
}
