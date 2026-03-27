export interface Embajador {
  id: string;
  user_id: string;
  nombre: string;
  es_admin: boolean;
  created_at: string;
}

export type EstadoReferido =
  | 'Contactado'
  | 'En asesoramiento'
  | 'Cotizado'
  | 'Confirmado'
  | 'No concretado';

export interface Referido {
  id: string;
  embajador_id: string;
  nombre_referido: string;
  destino: string | null;
  estado: EstadoReferido;
  cashback_monto: number;
  cashback_inicio: string | null;
  fecha_cierre: string | null;
  created_at: string;
  embajadores?: { nombre: string };
}
