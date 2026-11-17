import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { SearchSelectComponent } from './search-select.component';

@Component({ standalone: true, imports: [CommonModule, FormsModule, SearchSelectComponent], styleUrls: ['./control-operativo.css'], template: `
<div class="page-head"><div><div class="eyebrow">CONCILIACIÓN DE INVENTARIO</div><h1>Conteos y ajustes</h1><p>Cuenta las unidades físicas de cada lote y solicita la confirmación del ajuste.</p></div></div>
<div class="error" *ngIf="error">{{error}}</div><div class="success" *ngIf="message">{{message}}</div>
<section class="panel compact"><form (ngSubmit)="start()"><div class="form-grid"><label>Medicamento<app-search-select name="med" [(ngModel)]="medId" (ngModelChange)="loteId=0" [options]="medicines" [emptyValue]="0" placeholder="Escribe para buscar (ej. amox)…"></app-search-select></label><label>Lote<app-search-select name="lote" [(ngModel)]="loteId" [disabled]="!medId" [options]="filteredLots" valueKey="id" labelKey="numero_lote" [detailFn]="lotDetail" [emptyValue]="0" placeholder="Escribe para buscar el lote…"></app-search-select></label></div><p class="hint">Al iniciar se guarda el stock del sistema. Si cambia antes de confirmar, será necesario comenzar otro conteo.</p><div class="modal-actions"><button class="btn primary" [disabled]="busy || !loteId">Iniciar conteo</button></div></form></section>
<div class="toolbar"><select [(ngModel)]="estado" (change)="load()"><option value="">Todos los estados</option><option value="PENDIENTE">Pendientes</option><option value="APLICADO">Aplicados</option><option value="SIN_DIFERENCIA">Sin diferencia</option></select><button class="btn ghost" [disabled]="loading" (click)="load()">Actualizar</button></div>
<div class="loading" *ngIf="loading">Cargando conteos…</div>
<section class="panel"><div class="table-scroll"><table><thead><tr><th>Conteo / lote</th><th>Medicamento</th><th>Sistema al iniciar</th><th>Físico</th><th>Diferencia</th><th>Motivo</th><th>Responsables</th><th>Estado</th><th>Acción</th></tr></thead><tbody><tr *ngFor="let c of counts"><td><b>#{{c.id}} · {{c.numero_lote}}</b><small>{{c.iniciado_en | date:'dd/MM/yyyy HH:mm'}}</small></td><td>{{c.nombre_comercial}}</td><td>{{c.cantidad_sistema}}</td><td>{{c.cantidad_fisica ?? 'Pendiente'}}</td><td>{{c.diferencia ?? '—'}}</td><td class="cell-note">{{c.motivo || '—'}}</td><td>{{c.contado_usuario || c.iniciado_usuario}}<small *ngIf="c.confirmado_usuario">Confirmó: {{c.confirmado_usuario}}<br>{{c.confirmado_en | date:'dd/MM/yyyy HH:mm'}}</small></td><td><span class="badge" [class.green]="c.estado!=='PENDIENTE'" [class.warn]="c.estado==='PENDIENTE'">{{c.estado}}</span></td><td><button class="link-btn" *ngIf="c.estado==='PENDIENTE'" [disabled]="busy" (click)="edit(c)">Registrar conteo</button><button class="link-btn" *ngIf="isAdmin && c.estado==='PENDIENTE' && c.cantidad_fisica!==null" [disabled]="busy" (click)="review(c)">Revisar y confirmar</button></td></tr></tbody></table></div><div class="empty" *ngIf="!loading && !counts.length">No hay conteos para este filtro.</div><div class="pagination"><button class="btn ghost sm" [disabled]="loading || page<=1" (click)="load(page-1)">←</button><span>Página {{page}} / {{pages}}</span><button class="btn ghost sm" [disabled]="loading || page>=pages" (click)="load(page+1)">→</button></div></section>
<div class="modal-backdrop" *ngIf="draft"><div class="modal"><div class="modal-head"><b>Registrar conteo #{{draft.id}}</b><button [disabled]="busy" (click)="draft=null">×</button></div><form (ngSubmit)="save()"><p class="muted">Stock del sistema al iniciar: {{draft.cantidad_sistema}} unidades. La cantidad física debe incluir también las unidades vencidas.</p><div class="form-grid"><label>Unidades contadas<input type="number" name="fisica" min="0" max="2147483647" step="1" [(ngModel)]="physical" required></label><label>Diferencia<input [value]="validPhysical ? physical!-draft.cantidad_sistema : 'Pendiente'" readonly></label></div><label>Motivo<textarea name="motivo" [(ngModel)]="reason" maxlength="500" required placeholder="Describe la diferencia o el resultado del conteo"></textarea></label><div class="error" *ngIf="modalError">{{modalError}}</div><div class="modal-actions"><button class="btn ghost" type="button" [disabled]="busy" (click)="draft=null">Cerrar</button><button class="btn primary" [disabled]="busy || !validPhysical || !reason.trim()">Guardar conteo</button></div></form></div></div>
<div class="modal-backdrop" *ngIf="confirmation"><div class="modal"><div class="modal-head"><b>Confirmar conteo #{{confirmation.id}}</b><button [disabled]="busy" (click)="confirmation=null">×</button></div><div class="detail-body"><p>{{confirmation.nombre_comercial}} · Lote {{confirmation.numero_lote}}</p><div class="count-summary"><span>Anterior: <b>{{confirmation.cantidad_sistema}}</b></span><span>Contado: <b>{{confirmation.cantidad_fisica}}</b></span><span>Diferencia: <b>{{confirmation.diferencia}}</b></span></div><p>Motivo: {{confirmation.motivo}}</p><p>Contó: {{confirmation.contado_usuario}}</p><p>{{confirmation.diferencia===0 ? 'Se cerrará sin modificar el stock.' : 'El stock del lote quedará en la cantidad contada y se registrará el ajuste.'}}</p><div class="error" *ngIf="modalError">{{modalError}}</div><div class="modal-actions"><button class="btn ghost" [disabled]="busy" (click)="confirmation=null">Cancelar</button><button class="btn primary" [disabled]="busy" (click)="confirm()">{{busy?'Confirmando…':'Confirmar ajuste'}}</button></div></div></div></div>` })
export class CountsComponent {
  private api = inject(ApiService); private auth = inject(AuthService);
  medicines: any[] = []; lots: any[] = []; counts: any[] = [];
  medId = 0; loteId = 0; estado = ''; page = 1; pages = 1;
  loading = false; busy = false; error = ''; message = ''; modalError = '';
  draft: any = null; confirmation: any = null; physical: number | null = null; reason = '';
  get isAdmin() { return this.auth.user?.rol === 'Administrador/Gerente'; }
  private _flLots: any[] | null = null; private _flMed: number | null = null; private _fl: any[] = [];
  /** Se memoriza para que el selector reciba el mismo arreglo mientras no cambien los datos. */
  get filteredLots() {
    if (this._flLots !== this.lots || this._flMed !== Number(this.medId)) { this._flLots = this.lots; this._flMed = Number(this.medId); this._fl = this.lots.filter(l => Number(l.medicamento_id) === Number(this.medId)); }
    return this._fl;
  }
  lotDetail = (l: any) => `${l.cantidad} unidades${l.dias < 0 ? ' · Vencido' : ''}`;
  get validPhysical() { return this.physical !== null && Number.isInteger(this.physical) && this.physical >= 0 && this.physical <= 2147483647; }
  ngOnInit() { this.loadLots(); this.load(); }
  loadLots() { this.api.lotes().subscribe({ next: r => { this.lots = r.lotes || []; this.medicines = [...new Map(this.lots.map(l => [l.medicamento_id, {id:l.medicamento_id,nombre_comercial:l.nombre_comercial}])).values()]; }, error: e => this.error = e?.error?.mensaje || 'No se pudieron cargar los lotes.' }); }
  load(page = 1) {
    this.loading = true;
    this.api.conteos({ estado: this.estado, page }).subscribe({ next: r => { this.counts = r.conteos; this.page = r.paginacion.page; this.pages = r.paginacion.totalPages; this.loading = false; }, error: e => { this.error = e?.error?.mensaje || 'No se pudieron cargar los conteos.'; this.loading = false; } });
  }
  start() {
    if (this.busy || !this.loteId) return;
    this.busy = true; this.error = ''; this.message = '';
    this.api.iniciarConteo(this.loteId).subscribe({ next: r => { this.busy = false; this.edit(r.conteo); this.load(); }, error: e => { this.busy = false; this.error = e?.error?.mensaje || 'No se pudo iniciar el conteo.'; } });
  }
  edit(c: any) { this.draft = c; this.physical = c.cantidad_fisica ?? null; this.reason = c.motivo || ''; this.modalError = ''; }
  save() {
    if (this.busy || !this.validPhysical || !this.reason.trim() || !this.draft) return;
    this.busy = true; this.modalError = '';
    this.api.registrarConteo(this.draft.id, { cantidad_fisica: this.physical, motivo: this.reason }).subscribe({ next: r => { this.busy = false; this.draft = null; this.message = r.mensaje; this.load(); }, error: e => { this.busy = false; this.modalError = e?.error?.mensaje || 'No se pudo registrar el conteo.'; } });
  }
  review(c: any) { this.confirmation = c; this.modalError = ''; }
  confirm() {
    if (this.busy || !this.confirmation) return;
    this.busy = true; this.modalError = '';
    this.api.confirmarConteo(this.confirmation.id, this.confirmation.revision).subscribe({ next: r => { this.busy = false; this.confirmation = null; this.message = r.mensaje; this.load(); this.loadLots(); }, error: e => { this.busy = false; this.modalError = e?.error?.mensaje || 'No se pudo confirmar el ajuste.'; this.load(); } });
  }
}
