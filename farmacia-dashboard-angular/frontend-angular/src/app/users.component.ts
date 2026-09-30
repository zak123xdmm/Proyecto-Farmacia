import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

@Component({standalone:true,imports:[CommonModule,FormsModule],template:`
<div class="page-head"><div><div class="eyebrow">SEGURIDAD</div><h1>Usuarios</h1><p>Usuarios y estado de acceso del sistema.</p></div><button class="btn primary" (click)="openForm()">+ Nuevo usuario</button></div>
<div class="toolbar"><input [(ngModel)]="q" placeholder="Buscar por usuario o nombre…"><select [(ngModel)]="rolFiltro"><option value="">Todos los roles</option><option *ngFor="let r of roles" [value]="r.id">{{r.nombre}}</option></select><select [(ngModel)]="estadoFiltro"><option value="">Todos los estados</option><option value="1">Activos</option><option value="0">Inactivos</option></select></div>
<section class="panel table-panel"><div class="panel-head"><div><b>Usuarios registrados</b><small>{{filtrados().length}} de {{users.length}} registros</small></div><span class="badge green">API /usuarios</span></div>
<div class="table-scroll"><table><thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>
<tr *ngFor="let u of filtrados()"><td><b>{{u.usuario}}</b></td><td>{{u.nombre}}</td><td><span class="badge blue">{{u.rol}}</span></td><td><span class="badge" [class.green]="u.activo" [class.bad]="!u.activo">{{u.activo?'Activo':'Inactivo'}}</span></td><td><button class="link-btn" (click)="edit(u)">Editar</button><button class="link-btn" (click)="toggle(u.id)">{{u.activo?'Desactivar':'Activar'}}</button></td></tr>
</tbody></table></div>
<div class="empty" *ngIf="!filtrados().length">No se encontraron usuarios.</div></section>
<div class="modal-backdrop" *ngIf="formOpen"><div class="modal"><div class="modal-head"><b>{{form.id?'Editar':'Nuevo'}} usuario</b><button (click)="formOpen=false">×</button></div><form (ngSubmit)="save()"><div class="form-grid"><label>Usuario<input [(ngModel)]="form.usuario" name="usuario" [disabled]="!!form.id" required></label><label>Nombre completo<input [(ngModel)]="form.nombre" name="nombre" required></label><label>Rol<select [(ngModel)]="form.rol_id" name="rol_id" required><option [ngValue]="null" disabled>Seleccionar…</option><option *ngFor="let r of roles" [ngValue]="r.id">{{r.nombre}}</option></select></label><label>{{form.id?'Nueva contraseña':'Contraseña'}}<input type="password" [(ngModel)]="form.password" name="password" [placeholder]="form.id?'Dejar vacío para no cambiar':''" [required]="!form.id"></label></div><label class="check" *ngIf="form.id"><input type="checkbox" [(ngModel)]="form.activo" name="activo"> Usuario activo</label><div class="modal-actions"><button type="button" class="btn ghost" (click)="formOpen=false">Cancelar</button><button class="btn primary" [disabled]="saving">{{saving?'Guardando…':'Guardar'}}</button></div></form></div></div>
<div class="toast" *ngIf="message">{{message}}</div>
`})
export class UsersComponent {
  api = inject(ApiService);
  auth = inject(AuthService);
  users: any[] = [];
  roles: any[] = [];
  q = '';
  rolFiltro = '';
  estadoFiltro = '';
  formOpen = false;
  saving = false;
  message = '';
  form: any = {};

  ngOnInit() { this.load(); }

  load() {
    this.api.usuarios().subscribe({
      next: r => { this.users = r.usuarios || []; this.roles = r.roles || []; },
      error: e => this.showMessage(e?.error?.mensaje || 'No se pudo cargar usuarios.')
    });
  }

  filtrados() {
    const q = this.q.trim().toLowerCase();
    return this.users.filter(u =>
      (!q || u.usuario?.toLowerCase().includes(q) || u.nombre?.toLowerCase().includes(q)) &&
      (!this.rolFiltro || String(u.rol_id) === String(this.rolFiltro)) &&
      (this.estadoFiltro === '' || String(u.activo) === this.estadoFiltro)
    );
  }

  openForm() { this.form = { rol_id: null, activo: true }; this.formOpen = true; }

  edit(u: any) { this.form = { ...u, password: '' }; this.formOpen = true; }

  save() {
    if (this.saving) return;
    this.saving = true;
    const esPropio = this.form.id && this.auth.user?.id === this.form.id;
    if (esPropio && this.form.activo === false) {
      this.showMessage('No puedes desactivar tu propio usuario.');
      this.saving = false;
      return;
    }
    this.api.guardarUsuario(this.form).subscribe({
      next: r => { this.showMessage(r.mensaje); this.formOpen = false; this.saving = false; this.load(); },
      error: e => { this.showMessage(e?.error?.mensaje || 'Error al guardar.'); this.saving = false; }
    });
  }

  toggle(id: number) {
    if (this.auth.user?.id === id) { this.showMessage('No puedes desactivar tu propio usuario.'); return; }
    this.api.toggleUsuario(id).subscribe({
      next: r => { this.showMessage(r.mensaje || 'Estado modificado.'); this.load(); },
      error: e => this.showMessage(e?.error?.mensaje || 'No se pudo cambiar el estado.')
    });
  }

  showMessage(msg: string) { this.message = msg; setTimeout(() => this.message = '', 3000); }
}
