import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <main class="login-page">
    <section class="login-brand">
      <div class="brand-mark">Rx</div>
      <span>FARMACIA</span>
      <h1>Gestión inteligente para una farmacia que no se detiene.</h1>
      <p>Inventario, ventas, lotes y reportes conectados directamente a tu backend Express + MySQL.</p>
      <div class="login-points"><span>✓ Datos en tiempo real</span><span>✓ Control FEFO</span><span>✓ Acceso por roles</span></div>
    </section>
    <section class="login-card">
      <div class="eyebrow">PANEL ADMINISTRATIVO</div>
      <h2>Bienvenido</h2><p class="muted">Ingresa con tu usuario del sistema.</p>
      <form (ngSubmit)="submit()">
        <label>Usuario<input name="usuario" [(ngModel)]="usuario" autocomplete="username" placeholder="admin"></label>
        <label>Contraseña<input name="password" [(ngModel)]="password" type="password" autocomplete="current-password" placeholder="••••••••"></label>
        <div class="error" *ngIf="error">{{ error }}</div>
        <button class="btn primary full" [disabled]="loading">{{ loading ? 'Conectando…' : 'Entrar al dashboard →' }}</button>
      </form>
      <small>API: http://localhost:3000 · Angular: http://localhost:4200</small>
    </section>
  </main>`
})
export class LoginComponent {
  private auth = inject(AuthService); private router = inject(Router);
  usuario='admin'; password='admin123'; loading=false; error='';
  submit() {
    this.loading=true; this.error='';
    this.auth.login(this.usuario,this.password).subscribe({
      next: r => { this.loading=false; if(r?.ok) this.router.navigate(['/']); else this.error=r?.mensaje || 'No fue posible iniciar sesión.'; },
      error: e => { this.loading=false; this.error=e?.error?.mensaje || 'No se pudo conectar con el backend. Verifica node index.js.'; }
    });
  }
}