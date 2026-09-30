export interface User { id?: number; nombre: string; usuario?: string; rol: string; }
export interface Medicine {
  id: number; nombre_comercial: string; principio_activo: string; laboratorio: string;
  categoria?: string; categoria_id?: number; presentacion: string; precio: number;
  stock: number; stock_minimo?: number; requiere_receta?: number; sintoma?: string; accion_terapeutica?: string;
}
export interface ReportData {
  periodo: string; valor_inventario: number;
  ventas_corte: Array<{dia: string; operaciones: number; total: number}>;
  productos_top: Array<{nombre_comercial: string; unidades: number; total: number}>;
  proximos_caducar: Array<any>;
}
export interface ApiResponse<T = any> { ok: boolean; mensaje?: string; [key: string]: any; data?: T; }