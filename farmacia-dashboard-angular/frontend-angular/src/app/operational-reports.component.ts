import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SearchSelectComponent } from './search-select.component';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

@Component({ selector: 'app-operational-reports', standalone: true, imports: [CommonModule, FormsModule, SearchSelectComponent], styleUrls: ['./control-operativo.css'], template: `
<section class="panel compact"><h2>Reportes con filtros</h2><p class="muted">Consulta ventas o existencias y descarga todos los registros del resultado.</p><div class="report-tabs"><button *ngIf="isAdmin" class="btn ghost" [class.active]="type==='ventas'" (click)="changeType('ventas')">Ventas</button><button class="btn ghost" [class.active]="type==='inventario'" (click)="changeType('inventario')">Inventario</button></div>
<form class="report-filters" (ngSubmit)="search()"><div class="form-grid">
<label *ngIf="type==='ventas'">Desde<input type="date" name="desde" [(ngModel)]="filters.desde" (ngModelChange)="invalidate()"></label><label *ngIf="type==='ventas'">Hasta<input type="date" name="hasta" [(ngModel)]="filters.hasta" (ngModelChange)="invalidate()"></label>
<label>Medicamento<app-search-select name="med" [(ngModel)]="filters.medicamento_id" (ngModelChange)="filters.lote_id='';invalidate()" [options]="options.medicamentos" [labelFn]="medLabel" [searchKeys]="['principio_activo','laboratorio']" emptyValue="" emptyLabel="Todos" placeholder="Todos · escribe para buscar (ej. amox)…"></app-search-select></label>
<label *ngIf="type==='ventas'">Vendedor<select name="vendedor" [(ngModel)]="filters.vendedor_id" (ngModelChange)="invalidate()"><option value="">Todos</option><option *ngFor="let v of options.vendedores" [value]="v.id">{{v.nombre}}</option></select></label>
<label *ngIf="type==='ventas'">Estado<select name="estado" [(ngModel)]="filters.estado" (ngModelChange)="invalidate()"><option value="">Vigentes y anuladas</option><option value="VIGENTE">Vigentes</option><option value="ANULADA">Anuladas</option></select></label>
<label *ngIf="type==='inventario'">Categoría<app-search-select name="categoria" [(ngModel)]="filters.categoria_id" (ngModelChange)="invalidate()" [options]="options.categorias" labelKey="nombre" emptyValue="" emptyLabel="Todas" placeholder="Todas · escribe para buscar…"></app-search-select></label>
<label *ngIf="type==='inventario'">Lote<app-search-select name="lote" [(ngModel)]="filters.lote_id" (ngModelChange)="invalidate()" [options]="filteredLots" labelKey="numero_lote" emptyValue="" emptyLabel="Todos" placeholder="Todos · escribe para buscar…"></app-search-select></label>
<label *ngIf="type==='inventario'">Vencimiento<select name="vencimiento" [(ngModel)]="filters.vencimiento" (ngModelChange)="invalidate()"><option value="">Todas las condiciones</option><option value="VENCIDO">Vencidos</option><option value="PROXIMO">Próximos a vencer en 90 días</option><option value="VIGENTE">Vigentes</option></select></label>
<label *ngIf="type==='inventario'">Stock<select name="stock" [(ngModel)]="filters.stock_bajo" (ngModelChange)="invalidate()"><option value="">Todos</option><option value="1">Solo stock bajo</option></select></label>
</div><div class="modal-actions"><button type="button" class="btn ghost" (click)="clear()">Limpiar</button><button class="btn primary" [disabled]="loading">{{loading?'Consultando…':'Consultar'}}</button></div></form>
<div class="error" *ngIf="error">{{error}}</div><div class="loading" *ngIf="loading">Generando reporte…</div>
<div *ngIf="data"><div class="stat-grid" *ngIf="type==='ventas'"><article class="stat-card"><div><small>TOTAL VIGENTE</small><strong>{{money(data.totales.total_vigente)}}</strong><em>{{data.totales.ventas_vigentes}} ventas</em></div></article><article class="stat-card"><div><small>TOTAL ANULADO</small><strong>{{money(data.totales.total_anulado)}}</strong><em>{{data.totales.ventas_anuladas}} ventas anuladas</em></div></article><article class="stat-card"><div><small>UNIDADES VIGENTES</small><strong>{{data.totales.unidades_vigentes}}</strong></div></article></div>
<div class="stat-grid" *ngIf="type==='inventario'"><article class="stat-card"><div><small>STOCK FÍSICO</small><strong>{{data.totales.stock_fisico}}</strong><em>Incluye vencidos e inactivos</em></div></article><article class="stat-card"><div><small>DISPONIBLE PARA VENTA</small><strong>{{data.totales.stock_disponible}}</strong><em>Medicamentos activos y lotes vigentes</em></div></article><article class="stat-card"><div><small>VALOR FÍSICO</small><strong>{{money(data.totales.valor_fisico)}}</strong><em>A costo</em></div></article><article class="stat-card"><div><small>VALOR DISPONIBLE</small><strong>{{money(data.totales.valor_disponible)}}</strong></div></article></div>
<div class="action-line"><span class="hint">Consulta del {{data.generado_en}} · {{data.paginacion.totalRows}} registros</span><button class="btn ghost sm" [disabled]="downloading || loading" (click)="download('pdf')">Descargar PDF</button><button class="btn ghost sm" [disabled]="downloading || loading" (click)="download('csv')">Descargar CSV</button></div><p class="hint">Las descargas conservan los datos de esta consulta e incluyen todas las páginas. Pulsa Consultar para actualizar.</p>
<div class="table-scroll"><table *ngIf="type==='ventas'"><thead><tr><th>Venta / fecha</th><th>Vendedor</th><th>Medicamento / lote</th><th>Unidades</th><th>Precio</th><th>Importe</th><th>Estado</th></tr></thead><tbody><tr *ngFor="let r of data.registros"><td><b>#{{r.venta_id}}</b><small>{{r.fecha | date:'dd/MM/yyyy HH:mm'}}</small></td><td>{{r.vendedor}}</td><td>{{r.medicamento}}<small>{{r.numero_lote || 'Sin detalle de lote'}}</small></td><td>{{r.cantidad ?? 'Sin dato'}}</td><td>{{r.precio_unitario===null?'Sin dato':money(r.precio_unitario)}}</td><td>{{money(r.importe)}}</td><td><span class="badge" [class.bad]="r.estado==='ANULADA'" [class.green]="r.estado==='VIGENTE'">{{r.estado}}</span><small *ngIf="r.estado==='ANULADA'" class="cell-note">{{r.motivo_anulacion}} · {{r.anulada_usuario}}</small></td></tr></tbody></table>
<table *ngIf="type==='inventario'"><thead><tr><th>Medicamento</th><th>Categoría</th><th>Lote</th><th>Vencimiento</th><th>Físico</th><th>Disponible</th><th>Condición</th><th>Valor físico</th></tr></thead><tbody><tr *ngFor="let r of data.registros"><td>{{r.medicamento}}<small *ngIf="!r.activo">Inactivo</small></td><td>{{r.categoria}}</td><td>{{r.numero_lote}}</td><td>{{r.fecha_vencimiento | date:'dd/MM/yyyy'}}</td><td>{{r.stock_fisico}}</td><td>{{r.stock_disponible}}</td><td><span class="badge" [class.bad]="r.vencimiento==='VENCIDO'" [class.warn]="r.vencimiento==='PROXIMO'">{{r.vencimiento}}</span><small *ngIf="r.stock_bajo">Stock bajo · mínimo {{r.stock_minimo}}</small></td><td>{{money(r.valor_fisico)}}</td></tr></tbody></table></div>
<div class="empty" *ngIf="!data.registros.length">No hay registros para los filtros seleccionados.</div><div class="pagination"><button class="btn ghost sm" [disabled]="loading || data.paginacion.page<=1" (click)="loadPage(data.paginacion.page-1)">←</button><span>Página {{data.paginacion.page}} / {{data.paginacion.totalPages}}</span><button class="btn ghost sm" [disabled]="loading || data.paginacion.page>=data.paginacion.totalPages" (click)="loadPage(data.paginacion.page+1)">→</button></div></div>
<p *ngIf="type==='inventario'" class="hint">El inventario corresponde al momento de consultar. Stock bajo significa que el disponible total del medicamento es menor o igual al mínimo.</p>
</section>` })
export class OperationalReportsComponent {
  private api = inject(ApiService); private auth = inject(AuthService); private request?: Subscription;
  get isAdmin() { return this.auth.user?.rol === 'Administrador/Gerente'; }
  type = this.isAdmin ? 'ventas' : 'inventario';
  options: any = { medicamentos: [], categorias: [], vendedores: [], lotes: [] };
  filters = this.emptyFilters(); data: any = null; loading = false; downloading = false; error = '';
  emptyFilters() { return { desde:'', hasta:'', medicamento_id:'', vendedor_id:'', estado:'', categoria_id:'', lote_id:'', stock_bajo:'', vencimiento:'' }; }
  private _flSrc: any = null; private _flMed: any = null; private _fl: any[] = [];
  /** Se memoriza para que el selector reciba el mismo arreglo mientras no cambien los datos. */
  get filteredLots() {
    if (this._flSrc !== this.options.lotes || this._flMed !== this.filters.medicamento_id) {
      this._flSrc = this.options.lotes; this._flMed = this.filters.medicamento_id;
      this._fl = (this.options.lotes || []).filter((l: any) => !this.filters.medicamento_id || Number(l.medicamento_id) === Number(this.filters.medicamento_id));
    }
    return this._fl;
  }
  medLabel = (m: any) => m.nombre_comercial + (m.activo ? '' : ' · Inactivo');
  ngOnInit() { this.api.opcionesReportes().subscribe({ next: r => this.options = r, error: e => this.error = e?.error?.mensaje || 'No se pudieron cargar los filtros.' }); this.search(); }
  ngOnDestroy() { this.request?.unsubscribe(); }
  invalidate() { this.request?.unsubscribe(); this.data = null; this.loading = false; this.error = ''; }
  changeType(type: string) { if (type === this.type) return; this.type = type; this.filters = this.emptyFilters(); this.invalidate(); this.search(); }
  clear() { this.filters = this.emptyFilters(); this.invalidate(); this.search(); }
  search() {
    if (this.type === 'ventas' && this.filters.desde && this.filters.hasta && this.filters.desde > this.filters.hasta) { this.error = 'La fecha inicial no puede ser posterior a la fecha final.'; return; }
    this.query({ ...this.filters });
  }
  loadPage(page: number) { if (this.data && !this.loading) this.query({ snapshot:this.data.snapshot, page }); }
  query(params: Record<string,string|number>) {
    this.request?.unsubscribe(); this.loading = true; this.error = '';
    this.request = this.api.reporteOperativo(this.type, params).subscribe({ next: r => { this.data = r; this.loading = false; }, error: e => { this.error = e?.error?.mensaje || 'No se pudo consultar el reporte.'; this.data = null; this.loading = false; } });
  }
  download(formato: string) {
    if (!this.data || this.downloading || this.loading) return;
    this.downloading = true; this.error = '';
    const type = this.type;
    this.api.exportarReporte(type, this.data.snapshot, formato).subscribe({
      next: archivo => { const url = URL.createObjectURL(archivo); const a = document.createElement('a'); a.href = url; a.download = 'reporte-' + type + '.' + formato; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); this.downloading = false; },
      error: async e => { this.downloading = false; let mensaje = 'No se pudo descargar el reporte.'; try { mensaje = JSON.parse(await e.error.text()).mensaje || mensaje; } catch {} this.error = mensaje; if (e.status === 410) this.data = null; }
    });
  }
  money(v: any) { return new Intl.NumberFormat('es-BO',{style:'currency',currency:'BOB'}).format(Number(v || 0)); }
}
