import {Component,inject} from '@angular/core'; import {CommonModule} from '@angular/common'; import {FormsModule} from '@angular/forms'; import {ApiService} from './api.service';
@Component({standalone:true,imports:[CommonModule,FormsModule],template:`
<div class="page-head"><div><div class="eyebrow">PUNTO DE VENTA</div><h1>Ventas</h1><p>Registra ventas con validación de stock y receta. El backend aplica FEFO automáticamente.</p></div></div>
<div class="sales-grid"><section class="panel"><div class="panel-head"><div><b>Nueva venta</b><small>Stock vigente en tiempo real</small></div></div><form class="sale-form" (ngSubmit)="sell()"><label>Medicamento<select [ngModel]="medId" (ngModelChange)="onMedChange($event)" name="med"><option [ngValue]="0">Selecciona un medicamento</option><option *ngFor="let m of meds" [ngValue]="m.id" [disabled]="m.stock<=0">{{m.nombre_comercial}} · {{money(m.precio)}} · stock {{m.stock}}{{m.requiere_receta?' · con receta':''}}</option></select></label>
<div class="rx-alert" *ngIf="selected?.requiere_receta"><b>⚠ Receta obligatoria</b><span>Este medicamento solo se puede vender con receta médica. Confirma la receta para habilitar la venta.</span></div>
<div class="form-grid two"><label>Cantidad (1 a {{maxQty}})<input type="number" min="1" [max]="maxQty" step="1" inputmode="numeric" [value]="qty ?? ''" (input)="onQty($event)" (keydown)="blockKeys($event)" name="qty" [disabled]="!selected"><small class="hint" *ngIf="selected">Máximo {{maxQty}} u. · stock disponible: {{selected.stock}} · límite por operación: {{MAX_QTY}}</small></label><label class="check-box" *ngIf="selected?.requiere_receta"><input type="checkbox" [(ngModel)]="receta" name="receta"> Confirmo que el cliente presentó la receta médica</label></div>
<div class="sale-summary"><span>Total estimado</span><strong>{{money(total)}}</strong></div><div [class]="isError?'error':'success'" *ngIf="message">{{message}}</div><button type="submit" class="btn primary full" [disabled]="!canSell">{{loading?'Procesando…':'Confirmar venta'}}</button></form></section>
<section class="panel"><div class="panel-head"><div><b>Últimas ventas</b><small>Registradas en el servidor</small></div><span class="badge green">{{recent.length}} recientes</span></div><div class="sale-row" *ngFor="let v of recent"><div class="sale-id">#{{v.id}}</div><div><b>Venta registrada</b><small>{{v.usuario}}</small></div><strong>{{money(v.total)}}</strong></div><div class="empty" *ngIf="!recent.length">No hay ventas.</div></section></div>
`}) export class SalesComponent {
  api=inject(ApiService);
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
