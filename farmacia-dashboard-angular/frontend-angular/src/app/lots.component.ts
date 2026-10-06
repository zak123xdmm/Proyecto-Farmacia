import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ApiService } from "./api.service";

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-head">
      <div>
        <div class="eyebrow">INVENTARIO</div>
        <h1>Lotes y FEFO</h1>
        <p>Entradas, devoluciones y movimientos de inventario.</p>
      </div>
      <button class="btn primary" (click)="openForm()">+ Ingresar lote</button>
    </div>

    <div class="toast" *ngIf="toastMessage">{{ toastMessage }}</div>

    <section class="panel">
      <div class="panel-head">
        <div><b>Lotes</b><small>Ordenados por vencimiento</small></div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Medicamento</th><th>Lote</th><th>Vencimiento</th><th>Stock</th><th>Costo</th><th>Estado</th><th>Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of lots">
              <td><b>{{ l.nombre_comercial }}</b></td>
              <td>{{ l.numero_lote }}</td>
              <td>{{ l.fecha_vencimiento | date: "dd/MM/yyyy" }}</td>
              <td>{{ l.cantidad }}</td>
              <td>{{ money(l.costo_unitario) }}</td>
              <td>
                <span class="badge"
                  [class.bad]="l.dias < 0 || l.cantidad <= 0"
                  [class.warn]="l.dias >= 0 && l.dias <= 90"
                  [class.green]="l.dias > 90 && l.cantidad > 0">
                  {{ l.dias < 0 ? "Vencido" : l.cantidad <= 0 ? "Agotado" : l.dias + " días" }}
                </span>
              </td>
              <td>
                <button class="link-btn" (click)="openDevolucion(l)" *ngIf="l.cantidad > 0">Devolver</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Modal Ingreso -->
    <div class="modal-backdrop" *ngIf="open">
      <div class="modal">
        <div class="modal-head"><b>Ingreso de lote</b><button (click)="open = false">×</button></div>
        <form #loteForm="ngForm" (ngSubmit)="save()">
          <div class="form-grid">
            <label>Medicamento
              <select [(ngModel)]="form.medicamento_id" name="med" required>
                <option [ngValue]="null">Selecciona</option>
                <option *ngFor="let m of data?.medicamentos" [ngValue]="m.id">{{ m.nombre_comercial }}</option>
              </select>
            </label>
            <label>Proveedor
              <select [(ngModel)]="form.proveedor_id" name="prov">
                <option [ngValue]="null">Sin proveedor</option>
                <option *ngFor="let p of data?.proveedores" [ngValue]="p.id">{{ p.nombre }}</option>
              </select>
            </label>
            <label>Número de lote
              <input [(ngModel)]="form.numero_lote" name="lote" required minlength="3" maxlength="80" pattern="^\\S+$" #loteRef="ngModel" />
              <small style="color: #d32f2f;" *ngIf="loteRef.invalid && (loteRef.dirty || loteRef.touched)">Sin espacios, de 3 a 80 caracteres.</small>
            </label>
            <label>Fecha ingreso
              <input type="date" [(ngModel)]="form.fecha_ingreso" name="ing" [max]="hoy" required />
            </label>
            <label>Fecha vencimiento
              <input type="date" [(ngModel)]="form.fecha_vencimiento" name="ven" [min]="manana" required />
            </label>
            <label>Cantidad
              <input type="number" [(ngModel)]="form.cantidad" name="cant" min="1" max="100000" required #cantRef="ngModel" />
              <small style="color: #d32f2f;" *ngIf="cantRef.invalid && (cantRef.dirty || cantRef.touched)">Debe ser entre 1 y 100,000.</small>
            </label>
            <label>Costo unitario
              <input type="number" step=".01" [(ngModel)]="form.costo_unitario" name="costo" min="0" required #costoRef="ngModel" />
              <small style="color: #d32f2f;" *ngIf="costoRef.invalid && (costoRef.dirty || costoRef.touched)">Mínimo 0.</small>
            </label>
          </div>
          <div class="error" *ngIf="errorMessage">{{ errorMessage }}</div>
          <div class="modal-actions">
            <button type="button" class="btn ghost" (click)="open = false">Cancelar</button>
            <button class="btn primary" [disabled]="!loteForm.valid || saving">{{ saving ? 'Registrando...' : 'Registrar lote' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Devolución -->
    <div class="modal-backdrop" *ngIf="openDev">
      <div class="modal" style="max-width: 400px;">
        <div class="modal-head"><b>Devolver a laboratorio</b><button (click)="openDev = false">×</button></div>
        <form #devForm="ngForm" (ngSubmit)="saveDevolucion()">
          <p>Lote: <b>{{ formDev.loteNombre }}</b> (Máx: {{ formDev.maxCantidad }})</p>
          <div class="form-grid" style="grid-template-columns: 1fr;">
            <label>Cantidad a devolver
              <input type="number" [(ngModel)]="formDev.cantidad_devolucion" name="cantDev" min="1" [max]="formDev.maxCantidad" required />
            </label>
            <label>Referencia (opcional)
              <input [(ngModel)]="formDev.referencia" name="ref" maxlength="60" />
            </label>
          </div>
          <div class="error" *ngIf="errorMessage">{{ errorMessage }}</div>
          <div class="modal-actions">
            <button type="button" class="btn ghost" (click)="openDev = false">Cancelar</button>
            <button class="btn primary" [disabled]="!devForm.valid || saving">Confirmar devolución</button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class LotsComponent {
  api = inject(ApiService);
  lots: any[] = [];
  data: any;
  open = false;
  openDev = false;
  saving = false;
  hoy = new Date().toISOString().split('T')[0];
  manana = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  errorMessage = '';
  toastMessage = '';
  form: any = {};
  formDev: any = {};

  ngOnInit() { this.load(); }

  load() {
    this.api.lotes().subscribe(r => { this.data = r; this.lots = r.lotes || []; });
  }

  openForm() {
    this.errorMessage = '';
    this.form = { medicamento_id: null, proveedor_id: null, cantidad: 1, costo_unitario: 0, fecha_ingreso: this.hoy };
    this.open = true;
  }

  openDevolucion(lote: any) {
    this.errorMessage = '';
    this.formDev = { lote_id: lote.id, loteNombre: lote.numero_lote, maxCantidad: lote.cantidad, cantidad_devolucion: 1, referencia: '' };
    this.openDev = true;
  }

  save() {
    if (this.saving) return;
    this.saving = true;
    this.errorMessage = '';
    this.api.ingresarLote(this.form).subscribe({
      next: (r) => {
        this.open = false;
        this.saving = false;
        this.showMessage(r.mensaje);
        this.load();
      },
      error: (e) => {
        this.saving = false;
        this.errorMessage = e?.error?.mensaje || "Error al procesar la solicitud.";
      }
    });
  }

  saveDevolucion() {
    if (this.saving) return;
    this.saving = true;
    this.errorMessage = '';
    this.api.devolverLote(this.formDev).subscribe({
      next: (r) => {
        this.openDev = false;
        this.saving = false;
        this.showMessage(r.mensaje);
        this.load();
      },
      error: (e) => {
        this.saving = false;
        this.errorMessage = e?.error?.mensaje || "No se pudo realizar la devolución.";
      }
    });
  }

  showMessage(msg: string) {
    this.toastMessage = msg;
    setTimeout(() => this.toastMessage = '', 3000);
  }

  money(v: any) {
    return new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(Number(v || 0));
  }
}