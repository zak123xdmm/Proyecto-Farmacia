import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from './api.service';
import { SearchSelectComponent } from './search-select.component';

@Component({
  standalone: true, imports: [CommonModule, FormsModule, RouterLink, SearchSelectComponent],
  styleUrls: ['./control-operativo.css'],
  template: `
<div class="page-head"><div><div class="eyebrow">TRAZABILIDAD</div><h1>{{medicine?.nombre_comercial || 'Detalle del medicamento'}}</h1><p>Existencias por lote y operaciones que explican los cambios de stock.</p></div><a class="btn ghost" routerLink="/inventario">Volver al inventario</a></div>
<div class="error" *ngIf="detailError">{{detailError}}</div>
<section class="panel" *ngIf="medicine"><div class="panel-head"><div><b>{{medicine.principio_activo}}</b><small>{{medicine.laboratorio}} · {{medicine.presentacion}}</small></div><span class="badge green">{{available}} unidades disponibles</span></div>
<div class="table-scroll"><table><thead><tr><th>Lote</th><th>Proveedor</th><th>Vencimiento</th><th>Stock físico</th><th>Disponible</th></tr></thead><tbody><tr *ngFor="let l of lots"><td>{{l.numero_lote}}</td><td>{{l.proveedor || 'Sin proveedor'}}</td><td>{{l.fecha_vencimiento | date:'dd/MM/yyyy'}} <span class="badge bad" *ngIf="l.dias<0">Vencido</span></td><td>{{l.cantidad}}</td><td>{{l.dias>=0 ? l.cantidad : 0}}</td></tr></tbody></table></div><div class="empty" *ngIf="!lots.length">Este medicamento no tiene lotes.</div></section>
<section class="panel compact"><form (ngSubmit)="search()"><div class="form-grid">
<label>Desde<input type="date" name="desde" [(ngModel)]="filters.desde"></label><label>Hasta<input type="date" name="hasta" [(ngModel)]="filters.hasta"></label>
<label>Tipo de movimiento<select name="tipo" [(ngModel)]="filters.tipo"><option value="">Todos</option><option *ngFor="let t of types" [value]="t">{{label(t)}}</option></select></label>
<label>Lote<app-search-select name="lote" [(ngModel)]="filters.lote_id" [options]="lots" labelKey="numero_lote" emptyValue="" emptyLabel="Todos" placeholder="Todos · escribe para buscar…"></app-search-select></label>
<label>Orden<select name="orden" [(ngModel)]="filters.orden"><option value="desc">Más recientes primero</option><option value="asc">Más antiguos primero</option></select></label>
</div><div class="modal-actions"><button type="button" class="btn ghost" (click)="clear()">Limpiar</button><button class="btn primary" [disabled]="loading">Consultar historial</button></div></form></section>
<p class="muted">El saldo inicial marca la activación del historial. Los registros anteriores conservan solo los datos comprobables; un guion indica un dato que no se registró.</p>
<div class="error" *ngIf="error">{{error}}</div><div class="loading" *ngIf="loading">Consultando movimientos…</div>
<section class="panel"><div class="panel-head"><b>Historial de movimientos</b><small>{{total}} registros</small></div><div class="table-scroll"><table><thead><tr><th>Fecha y hora</th><th>Lote</th><th>Operación</th><th>Entrada</th><th>Salida</th><th>Saldo anterior</th><th>Saldo posterior</th><th>Responsable</th><th>Origen</th></tr></thead><tbody>
<tr *ngFor="let m of movements"><td>{{m.creado_en | date:'dd/MM/yyyy HH:mm:ss'}}</td><td>{{m.numero_lote}}</td><td>{{label(m.tipo)}}<small *ngIf="m.saldo_anterior===null">Registro anterior</small></td><td>{{m.entrada ?? '—'}}</td><td>{{m.salida ?? '—'}}</td><td>{{m.saldo_anterior ?? '—'}}</td><td>{{m.saldo_posterior ?? '—'}}</td><td>{{m.usuario || (m.tipo==='SALDO_INICIAL' ? 'Sistema' : 'No registrado')}}</td><td>{{m.referencia}}<small *ngIf="m.origen_id">{{m.origen_tipo}} #{{m.origen_id}}</small></td></tr>
</tbody></table></div><div class="empty" *ngIf="!loading && !movements.length">No hay movimientos para los filtros seleccionados.</div>
<div class="pagination"><button class="btn ghost sm" [disabled]="loading || page<=1" (click)="load(page-1)">←</button><span>Página {{page}} / {{pages}}</span><button class="btn ghost sm" [disabled]="loading || page>=pages" (click)="load(page+1)">→</button></div></section>`
})
export class MedicineHistoryComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private request?: Subscription;
  id = Number(this.route.snapshot.paramMap.get('id'));
  medicine: any; lots: any[] = []; movements: any[] = [];
  filters = { desde: '', hasta: '', tipo: '', lote_id: '', orden: 'desc' };
  applied = { ...this.filters };
  types = ['SALDO_INICIAL','INGRESO','VENTA','DEVOLUCION','AJUSTE_ENTRADA','AJUSTE_SALIDA','ANULACION'];
  loading = false; error = ''; detailError = ''; page = 1; pages = 1; total = 0;
  ngOnInit() {
    this.api.medicamento(this.id).subscribe({ next: r => { this.medicine = r.medicamento; this.lots = r.lotes || []; }, error: e => this.detailError = e?.error?.mensaje || 'No se pudo cargar el detalle.' });
    this.load();
  }
  ngOnDestroy() { this.request?.unsubscribe(); }
  get available() { return this.lots.reduce((n, l) => n + (l.dias >= 0 ? Number(l.cantidad) : 0), 0); }
  label(tipo: string) { return ({ SALDO_INICIAL:'Saldo inicial', INGRESO:'Ingreso', VENTA:'Venta', DEVOLUCION:'Devolución a proveedor', AJUSTE_ENTRADA:'Ajuste de entrada', AJUSTE_SALIDA:'Ajuste de salida', ANULACION:'Anulación de venta' } as Record<string,string>)[tipo] || tipo; }
  search() {
    if (this.filters.desde && this.filters.hasta && this.filters.desde > this.filters.hasta) { this.error = 'La fecha inicial no puede ser posterior a la final.'; return; }
    this.applied = { ...this.filters }; this.load();
  }
  clear() { this.filters = { desde:'', hasta:'', tipo:'', lote_id:'', orden:'desc' }; this.search(); }
  load(page = 1) {
    this.request?.unsubscribe(); this.loading = true; this.error = ''; this.movements = [];
    this.request = this.api.historialMedicamento(this.id, { ...this.applied, page }).subscribe({
      next: r => { this.movements = r.movimientos || []; this.page = r.paginacion.page; this.pages = r.paginacion.totalPages; this.total = r.paginacion.totalRows; this.loading = false; },
      error: e => { this.error = e?.error?.mensaje || 'No se pudo consultar el historial.'; this.loading = false; }
    });
  }
}
