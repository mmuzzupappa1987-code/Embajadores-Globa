export interface Embajador {
  id: string;
  nombre: string;
  created_at: string;
}

export interface Referido {
  id: string;
  embajador_id: string;
  nombre_referido: string;
  estado: 'activo' | 'cerrado';
  cashback_monto: number;
  cashback_inicio: string | null;
  fecha_cierre: string | null;
  created_at: string;
  embajadores?: { nombre: string };
}
