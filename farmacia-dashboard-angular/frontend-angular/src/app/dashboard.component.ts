import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from './api.service';
import { ReportData, Medicine } from './models';

@Component({standalone:true,imports:[CommonModule],template:`
<div class="page-head"><div><div class="eyebrow">RESUMEN OPERATIVO</div><h1>Dashboard</h1><p>Visión general de tu farmacia con datos reales del backend.</p></div><button class="btn ghost" (click)="load()">↻ Actualizar</button></div>
<div *ngIf="loading" class="loading">Sincronizando con Express…</div>
<div class="stat-grid">
  <article class="stat-card"><span class="stat-icon blue">Bs</span><div><small>VALOR INVENTARIO</small><strong>{{money(report?.valor_inventario)}}</strong><em>Stock vigente</em></div></article>
  <article class="stat-card"><span class="stat-icon green">↗</span><div><small>VENTAS DEL PERIODO</small><strong>{{money(totalSales)}}</strong><em>{{report?.ventas_corte?.length || 0}} días con movimiento</em></div></article>
  <article class="stat-card"><span class="stat-icon amber">!</span><div><small>PRÓXIMOS A CADUCAR</small><strong>{{report?.proximos_caducar?.length || 0}}</strong><em>Dentro de 90 días</em></div></article>
  <article class="stat-card"><span class="stat-icon violet">▦</span><div><small>MEDICAMENTOS ACTIVOS</small><strong>{{medCount}}</strong><em>Catálogo conectado</em></div></article>
</div>
<div class="dashboard-grid">
 <section class="panel"><div class="panel-head"><div><b>Ventas recientes</b><small>Último periodo consultado</small></div><span class="live"><i></i> EN VIVO</span></div>
  <div class="chart-bars" *ngIf="report?.ventas_corte?.length; else noSales"><div class="bar-col" *ngFor="let v of report!.ventas_corte"><div class="bar" [style.height.%]="barHeight(v.total)"></div><small>{{v.dia | date:'dd/MM'}}</small></div></div>
  <ng-template #noSales><div class="empty">Aún no hay ventas en el periodo.</div></ng-template>
 </section>
 <section class="panel"><div class="panel-head"><div><b>Top medicamentos</b><small>Por unidades vendidas</small></div></div>
  <div class="rank-row" *ngFor="let p of report?.productos_top; let i=index"><span class="rank">{{i+1}}</span><div><b>{{p.nombre_comercial}}</b><small>{{p.unidades}} unidades</small></div><strong>{{money(p.total)}}</strong></div>
  <div class="empty" *ngIf="!report?.productos_top?.length">Sin datos todavía.</div>
 </section>
</div>
<section class="panel"><div class="panel-head"><div><b>Alertas de vencimiento</b><small>Lotes con fecha cercana</small></div><span class="badge warn">{{report?.proximos_caducar?.length || 0}} alertas</span></div>
<table *ngIf="report?.proximos_caducar?.length"><thead><tr><th>Medicamento</th><th>Lote</th><th>Vencimiento</th><th>Días</th><th>Stock</th></tr></thead><tbody><tr *ngFor="let l of report!.proximos_caducar"><td><b>{{l.nombre_comercial}}</b></td><td>{{l.numero_lote}}</td><td>{{l.fecha_vencimiento | date:'dd/MM/yyyy'}}</td><td><span class="badge" [class.bad]="l.dias<=30" [class.warn]="l.dias>30">{{l.dias}} días</span></td><td>{{l.cantidad}}</td></tr></tbody></table>
<div class="empty" *ngIf="!report?.proximos_caducar?.length">No hay lotes próximos a caducar.</div>
</section>
`,})
export class DashboardComponent {
 api=inject(ApiService); report?:ReportData; medCount=0; loading=true;
 ngOnInit(){this.load();}
 load(){this.loading=true; this.api.reportes('mensual').subscribe({next:r=>{this.report=r;this.loading=false;},error:()=>this.loading=false}); this.api.medicamentos({page:1}).subscribe(r=>this.medCount=r?.paginacion?.totalRows||r?.medicamentos?.length||0);}
 get totalSales(){return (this.report?.ventas_corte||[]).reduce((a,v)=>a+Number(v.total||0),0);}
 barHeight(v:number){const vals=(this.report?.ventas_corte||[]).map(x=>Number(x.total)); const max=Math.max(...vals,1); return Math.max(8,Math.round(v/max*100));}
 money(v:any){return new Intl.NumberFormat('es-BO',{style:'currency',currency:'BOB'}).format(Number(v||0));}
}