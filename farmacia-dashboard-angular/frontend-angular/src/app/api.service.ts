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