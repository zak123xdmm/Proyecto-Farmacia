import {Component,inject} from '@angular/core'; import {CommonModule} from '@angular/common'; import {FormsModule} from '@angular/forms'; import {ApiService} from './api.service'; import {AuthService} from './auth.service'; import { SearchSelectComponent } from './search-select.component';
@Component({standalone:true,imports:[CommonModule,FormsModule,SearchSelectComponent],styleUrls:['./control-operativo.css'],template:`
<div class="page-head"><div><div class="eyebrow">PUNTO DE VENTA</div><h1>Ventas</h1><p>Registra ventas con validación de stock y receta. El backend aplica FEFO automáticamente.</p></div></div>
<div class="sales-grid"><section class="panel"><div class="panel-head"><div><b>Nueva venta</b><small>Stock vigente en tiempo real</small></div></div><form class="sale-form" (ngSubmit)="sell()"><label>Medicamento<app-search-select [ngModel]="medId" (ngModelChange)="onMedChange($event)" name="med" [options]="meds" [emptyValue]="0" [searchKeys]="['principio_activo','laboratorio','presentacion']" [detailFn]="medDetail" [disabledFn]="noStock" placeholder="Escribe para buscar (ej. amox, para…) o despliega la lista"></app-search-select></label>
<div class="rx-alert" *ngIf="selected?.requiere_receta"><b>⚠ Receta obligatoria</b><span>Este medicamento solo se puede vender con receta médica. Confirma la receta para habilitar la venta.</span></div>
<div class="form-grid two"><label>Cantidad (1 a {{maxQty}})<input type="number" min="1" [max]="maxQty" step="1" inputmode="numeric" [value]="qty ?? ''" (input)="onQty($event)" (keydown)="blockKeys($event)" name="qty" [disabled]="!selected"><small class="hint" *ngIf="selected">Máximo {{maxQty}} u. · stock disponible: {{selected.stock}} · límite por operación: {{MAX_QTY}}</small></label><label class="check-box" *ngIf="selected?.requiere_receta"><input type="checkbox" [(ngModel)]="receta" name="receta"> Confirmo que el cliente presentó la receta médica</label></div>
<div class="sale-summary"><span>Total estimado</span><strong>{{money(total)}}</strong></div><div [class]="isError?'error':'success'" *ngIf="message">{{message}}</div><button type="submit" class="btn primary full" [disabled]="!canSell">{{loading?'Procesando…':'Confirmar venta'}}</button></form></section>
<section class="panel"><div class="panel-head"><div><b>Últimas ventas</b><small>Registradas en el servidor</small></div><span class="badge green">{{recent.length}} recientes</span></div><div class="sale-row" *ngFor="let v of recent"><div class="sale-id">#{{v.id}}</div><div><b>{{v.estado==='ANULADA'?'Venta anulada':'Venta registrada'}}</b><small>{{v.usuario}}</small></div><div class="row-actions"><strong>{{money(v.total)}}</strong><button *ngIf="isAdmin" class="link-btn" (click)="openSale(v.id)" [disabled]="detailLoading">Ver / anular</button></div></div><div class="empty" *ngIf="!recent.length">No hay ventas.</div></section></div>
<section class="panel compact" *ngIf="isAdmin"><form class="action-line" (ngSubmit)="openSale(lookupId)"><label>Consultar otra venta por número<input type="number" min="1" step="1" name="lookup" [(ngModel)]="lookupId"></label><button class="btn ghost" [disabled]="!lookupId || detailLoading">Buscar venta</button></form></section>
<div class="loading" *ngIf="detailLoading">Consultando venta…</div>
<div class="modal-backdrop" *ngIf="saleDetail"><div class="modal"><div class="modal-head"><b>Venta #{{saleDetail.venta.id}} · {{saleDetail.venta.estado}}</b><button [disabled]="canceling" (click)="saleDetail=null">×</button></div><div class="detail-body"><p>{{saleDetail.venta.fecha | date:'dd/MM/yyyy HH:mm'}} · {{saleDetail.venta.usuario}} · {{money(saleDetail.venta.total)}}</p><div class="table-scroll"><table><thead><tr><th>Medicamento</th><th>Lote</th><th>Cantidad a restituir</th><th>Subtotal</th></tr></thead><tbody><tr *ngFor="let d of saleDetail.detalles"><td>{{d.nombre_comercial}}</td><td>{{d.numero_lote}}</td><td>{{d.cantidad}}</td><td>{{money(d.subtotal)}}</td></tr></tbody></table></div><p *ngIf="saleDetail.venta.estado==='ANULADA'">Anulada por {{saleDetail.venta.anulada_usuario}} el {{saleDetail.venta.anulada_en | date:'dd/MM/yyyy HH:mm'}}. Motivo: {{saleDetail.venta.motivo_anulacion}}</p><div class="error" *ngIf="saleDetail.motivo_bloqueo">{{saleDetail.motivo_bloqueo}}</div><form *ngIf="saleDetail.puede_anular" (ngSubmit)="cancelSale()"><label>Motivo de anulación<textarea name="cancelReason" [(ngModel)]="cancelReason" maxlength="500" required></textarea></label><p>Se anulará la venta completa y se devolverán estas cantidades a sus lotes de origen. Los lotes vencidos seguirán excluidos de las ventas.</p><div class="modal-actions"><button class="btn ghost" type="button" [disabled]="canceling" (click)="saleDetail=null">Cancelar</button><button class="btn primary" [disabled]="canceling || !cancelReason.trim()">{{canceling?'Anulando…':'Confirmar anulación'}}</button></div></form><div class="error" *ngIf="cancelError">{{cancelError}}</div></div></div></div>
`}) export class SalesComponent {
  api=inject(ApiService);auth=inject(AuthService);
  saleDetail:any=null;lookupId:number|null=null;cancelReason='';cancelError='';canceling=false;detailLoading=false;
  get isAdmin(){return this.auth.user?.rol==='Administrador/Gerente'}
  openSale(id:number|null){
    if(!id||this.detailLoading)return;
    this.detailLoading=true;this.cancelError='';this.cancelReason='';
    this.api.detalleVenta(id).subscribe({next:r=>{this.saleDetail=r;this.detailLoading=false},error:e=>{this.detailLoading=false;this.isError=true;this.message=e?.error?.mensaje||'No se pudo consultar la venta.'}})
  }
  cancelSale(){
    if(this.canceling||!this.saleDetail?.puede_anular||!this.cancelReason.trim())return;
    this.canceling=true;this.cancelError='';
    this.api.anularVenta(this.saleDetail.venta.id,this.cancelReason).subscribe({next:r=>{this.canceling=false;this.saleDetail=null;this.isError=false;this.message=r.mensaje;this.load()},error:e=>{this.canceling=false;this.cancelError=e?.error?.mensaje||'No se pudo anular la venta.'}})
  }
  readonly MAX_QTY=100;
  meds:any[]=[];recent:any[]=[];
  medId=0;qty:number|null=1;receta=false;
  loading=false;message='';isError=false;

  ngOnInit(){this.load()}
  load(){this.api.ventasDatos().subscribe(r=>{this.meds=r.medicamentos||[];this.recent=r.ultimas_ventas||[]})}

  get selected(){return this.meds.find(m=>m.id==this.medId)}
  /** Máximo permitido: el menor entre el stock vigente y el límite de 100 por operación. */
  get maxQty(){return this.selected?Math.max(0,Math.min(this.MAX_QTY,Number(this.selected.stock)||0)):this.MAX_QTY}
  get validQty(){return this.qty!==null&&Number.isInteger(this.qty)&&this.qty>=1&&this.qty<=this.maxQty}
  get recetaOk(){return !this.selected?.requiere_receta||this.receta===true}
  get canSell(){return !!this.selected&&this.validQty&&this.recetaOk&&!this.loading}
  get total(){return this.selected&&this.validQty?Number(this.selected.precio)*(this.qty as number):0}

  medDetail=(m:any)=>`${this.money(m.precio)} · ${m.stock<=0?'sin stock':'stock '+m.stock}${m.requiere_receta?' · con receta':''}`;
  noStock=(m:any)=>Number(m.stock)<=0;
  money(v:any){return new Intl.NumberFormat('es-BO',{style:'currency',currency:'BOB'}).format(Number(v||0))}

  onMedChange(id:any){
    this.medId=id;this.receta=false;this.message='';
    if(this.qty!==null&&this.qty>this.maxQty)this.qty=Math.max(1,this.maxQty);
  }
  /** Solo enteros: trunca decimales y limita la cantidad al stock (máx. 100). */
  onQty(ev:Event){
    const el=ev.target as HTMLInputElement;
    if(el.value===''){this.qty=null;return}
    let n=Math.trunc(Number(el.value));
    if(!isFinite(n)){this.qty=null;el.value='';return}
    n=Math.min(Math.max(n,1),Math.max(1,this.maxQty));
    this.qty=n;el.value=String(n);
  }
  /** Evita escribir decimales, signos y notación científica. */
  blockKeys(ev:KeyboardEvent){if(['.',',','e','E','+','-'].includes(ev.key))ev.preventDefault()}

  sell(){
    // Bloqueo del doble clic: si ya hay una petición en curso (o el formulario no es válido) no se envía nada.
    if(this.loading||!this.canSell)return;
    this.loading=true;this.message='';
    this.api.registrarVenta({medicamento_id:this.medId,cantidad:this.qty,receta:this.receta}).subscribe({
      next:r=>{this.loading=false;this.isError=false;this.message=r.mensaje;this.qty=1;this.receta=false;this.load()},
      error:e=>{this.loading=false;this.isError=true;this.message=e?.error?.mensaje||'No se pudo registrar la venta.';this.load()}
    })
  }
}
