import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private get<T>(url: string, params?: Record<string, string | number>): Observable<T> {
    let p = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => p = p.set(k, String(v)));
    return this.http.get<T>(url, { params: p });
  }
  historialMedicamento(id: number, params: Record<string,string|number> = {}) { return this.get<any>(`/api/medicamentos/${id}/movimientos`, params); }
  conteos(params: Record<string,string|number> = {}) { return this.get<any>('/api/conteos', params); }
  iniciarConteo(lote_id: number) { return this.http.post<any>('/api/conteos', { lote_id }); }
  registrarConteo(id: number, body: any) { return this.http.patch<any>(`/api/conteos/${id}`, body); }
  confirmarConteo(id: number, revision: number) { return this.http.post<any>(`/api/conteos/${id}/confirmar`, { revision }); }
  detalleVenta(id: number) { return this.http.get<any>(`/api/ventas/${id}`); }
  anularVenta(id: number, motivo: string) { return this.http.post<any>(`/api/ventas/${id}/anular`, { motivo }); }
  opcionesReportes() { return this.http.get<any>('/api/reportes/opciones'); }
  reporteOperativo(tipo: string, params: Record<string,string|number> = {}) { return this.get<any>(`/api/reportes/${tipo}`, params); }
  exportarReporte(tipo: string, snapshot: string, formato: string) {
    return this.http.get(`/api/reportes/${tipo}/exportar`, { params: { snapshot, formato }, responseType: 'blob' });
  }
  catalogo(q = '') { return this.get<any>('/api/catalogo', { q }); }
  medicamentos(params: Record<string,string|number> = {}) { return this.get<any>('/api/medicamentos', params); }
  medicamento(id: number) { return this.http.get<any>(`/api/medicamentos/${id}`); }
  guardarMedicamento(body: any) { return this.http.post<any>('/api/medicamentos', body); }
  inactivarMedicamento(id: number) { return this.http.delete<any>(`/api/medicamentos/${id}`); }
  ventasDatos() { return this.http.get<any>('/api/ventas/datos'); }
  registrarVenta(body: any) { return this.http.post<any>('/api/ventas', body); }
  reportes(periodo = 'mensual') { return this.get<any>('/api/reportes', { periodo }); }
  categorias() { return this.http.get<any>('/api/categorias'); }
  crearCategoria(body: any) { return this.http.post<any>('/api/categorias', body); }
  eliminarCategoria(id: number) { return this.http.delete<any>(`/api/categorias/${id}`); }
  lotes() { return this.http.get<any>('/api/lotes'); }
  movimientos() { return this.http.get<any>('/api/lotes/movimientos'); }
  ingresarLote(body: any) { return this.http.post<any>('/api/lotes/ingreso', body); }
  devolverLote(body: any) { return this.http.post<any>('/api/lotes/devolucion', body); }
  usuarios() { return this.http.get<any>('/api/usuarios'); }
  usuario(id: number) { return this.http.get<any>(`/api/usuarios/${id}`); }
  guardarUsuario(body: any) { return this.http.post<any>('/api/usuarios', body); }
  toggleUsuario(id: number) { return this.http.patch<any>(`/api/usuarios/${id}/toggle`, {}); }
}