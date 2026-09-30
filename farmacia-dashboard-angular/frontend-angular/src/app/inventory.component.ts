import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';

@Component({standalone:true,imports:[CommonModule,FormsModule],template:`
<div class="page-head"><div><div class="eyebrow">CONTROL DE STOCK</div><h1>Inventario</h1><p>Consulta, registra y desactiva medicamentos desde la API.</p></div><button class="btn primary" (click)="openForm()">+ Nuevo medicamento</button></div>
<div class="toolbar"><input [(ngModel)]="q" (keyup.enter)="load()" placeholder="Buscar por nombre, principio activo o laboratorio…"><select [(ngModel)]="lab" (change)="load()"><option value="">Todos los laboratorios</option><option *ngFor="let x of filters?.laboratorios" [value]="x.laboratorio">{{x.laboratorio}}</option></select><button class="btn ghost" (click)="load()">Buscar</button></div>
<section class="panel table-panel"><div class="panel-head"><div><b>Medicamentos</b><small>{{total}} registros encontrados</small></div><span class="badge green">API /medicamentos</span></div>
<div class="table-scroll"><table><thead><tr><th>Medicamento</th><th>Principio activo</th><th>Laboratorio</th><th>Presentación</th><th>Stock</th><th>Precio</th><th></th></tr></thead><tbody>
<tr *ngFor="let m of meds"><td><b>{{m.nombre_comercial}}</b><small>{{m.categoria || 'Sin categoría'}}</small></td><td>{{m.principio_activo}}</td><td>{{m.laboratorio}}</td><td>{{m.presentacion}}</td><td><span class="stock" [class.low]="m.stock <= (m.stock_minimo||0)">{{m.stock}}</span></td><td>{{money(m.precio)}}</td><td><button class="link-btn" (click)="edit(m)">Editar</button><button class="danger-link" (click)="remove(m)">Eliminar</button></td></tr>
</tbody></table></div><div class="pagination"><button class="btn ghost sm" [disabled]="page<=1" (click)="page=page-1;load()">←</button><span>Página {{page}} / {{pages}}</span><button class="btn ghost sm" [disabled]="page>=pages" (click)="page=page+1;load()">→</button></div>
<div class="empty" *ngIf="!meds.length">No se encontraron medicamentos.</div></section>
<div class="modal-backdrop" *ngIf="formOpen"><div class="modal"><div class="modal-head"><b>{{form.id?'Editar':'Nuevo'}} medicamento</b><button (click)="formOpen=false">×</button></div><form (ngSubmit)="save()"><div class="form-grid"><label>Nombre comercial<input [(ngModel)]="form.nombre_comercial" name="nombre" required></label><label>Principio activo<input [(ngModel)]="form.principio_activo" name="principio"></label><label>Laboratorio<input [(ngModel)]="form.laboratorio" name="lab"></label><label>Presentación<input [(ngModel)]="form.presentacion" name="pres"></label><label>Precio<input type="number" step=".01" [(ngModel)]="form.precio" name="precio"></label><label>Stock mínimo<input type="number" [(ngModel)]="form.stock_minimo" name="min"></label><label>Síntoma<input [(ngModel)]="form.sintoma" name="sintoma"></label><label>Acción terapéutica<input [(ngModel)]="form.accion_terapeutica" name="accion"></label></div><label class="check"><input type="checkbox" [(ngModel)]="form.requiere_receta" name="receta"> Requiere receta médica</label><div class="modal-actions"><button type="button" class="btn ghost" (click)="formOpen=false">Cancelar</button><button class="btn primary">Guardar</button></div></form></div></div>
<div class="toast" *ngIf="message">{{message}}</div>
`})
export class InventoryComponent {
 api=inject(ApiService); meds:any[]=[]; filters:any; q=''; lab=''; page=1; pages=1; total=0; formOpen=false; message=''; form:any={};
 ngOnInit(){this.load();}
 load(){this.api.medicamentos({q:this.q,laboratorio:this.lab,page:this.page}).subscribe({next:r=>{this.meds=r.medicamentos||[];this.filters=r.filtros;this.page=r.paginacion?.page||1;this.pages=r.paginacion?.totalPages||1;this.total=r.paginacion?.totalRows||0;},error:e=>this.message=e?.error?.mensaje||'No se pudo cargar inventario.'});}
 openForm(){this.form={precio:0,stock_minimo:0,requiere_receta:false};this.formOpen=true;}
 edit(m:any){this.form={...m,requiere_receta:!!m.requiere_receta};this.formOpen=true;}
 save(){this.api.guardarMedicamento(this.form).subscribe({next:r=>{this.message=r.mensaje;this.formOpen=false;this.load();setTimeout(()=>this.message='',3000)},error:e=>this.message=e?.error?.mensaje||'Error al guardar.'});}
 remove(m:any){if(!confirm(`¿Inactivar ${m.nombre_comercial}?`))return;this.api.inactivarMedicamento(m.id).subscribe({next:r=>{this.message=r.mensaje;this.load()},error:e=>this.message=e?.error?.mensaje||'No autorizado.'});}
 money(v:any){return new Intl.NumberFormat('es-BO',{style:'currency',currency:'BOB'}).format(Number(v||0));}
}