import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  standalone:true, imports:[CommonModule,RouterLink,RouterLinkActive,RouterOutlet],
  template: `
  <div class="app-shell">
    <aside class="sidebar" [class.open]="mobileOpen">
      <div class="brand"><div class="brand-mark">Rx</div><div><b>FARMACIA</b><small>CONTROL CENTER</small></div></div>
      <nav>
        <div class="nav-label">Principal</div>
        <a routerLink="/" [routerLinkActiveOptions]="{exact:true}" routerLinkActive="active"><span>⌂</span> Dashboard</a>
        <a routerLink="/inventario" routerLinkActive="active"><span>▣</span> Inventario</a>
        <a routerLink="/ventas" routerLinkActive="active"><span>▤</span> Ventas</a>
        <a routerLink="/reportes" routerLinkActive="active"><span>◒</span> Reportes</a>
        <div class="nav-label">Operación</div>
        <a routerLink="/lotes" routerLinkActive="active"><span>◫</span> Lotes y FEFO</a>
        <a *ngIf="isAdmin" routerLink="/categorias" routerLinkActive="active"><span>◈</span> Categorías</a>
        <a *ngIf="isAdmin" routerLink="/usuarios" routerLinkActive="active"><span>♙</span> Usuarios</a>
      </nav>
      <div class="side-footer"><span class="status-dot"></span> Backend conectado</div>
    </aside>
    <div class="mobile-overlay" *ngIf="mobileOpen" (click)="mobileOpen=false"></div>
    <section class="content">
      <header class="topbar">
        <button class="icon-btn mobile-menu" (click)="mobileOpen=!mobileOpen">☰</button>
        <div><span class="breadcrumb">FARMACIA / </span><strong>{{pageTitle}}</strong></div>
        <div class="top-actions">
          <div class="user-chip"><div class="avatar">{{initials}}</div><div><b>{{auth.user?.nombre}}</b><small>{{auth.user?.rol}}</small></div></div>
          <button class="icon-btn" title="Cerrar sesión" (click)="logout()">↪</button>
        </div>
      </header>
      <main class="page"><router-outlet /></main>
    </section>
  </div>`
})
export class ShellComponent {
  auth=inject(AuthService); router=inject(Router); mobileOpen=false;
  get isAdmin(){ return this.auth.user?.rol==='Administrador/Gerente'; }
  get initials(){ return (this.auth.user?.nombre||'U').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase(); }
  get pageTitle(){ const p=this.router.url.split('/')[1]; return ({'':'Resumen','inventario':'Inventario','ventas':'Ventas','reportes':'Reportes','lotes':'Lotes y FEFO','categorias':'Categorías','usuarios':'Usuarios'} as any)[p] || 'Resumen'; }
  logout(){ this.auth.logout(); }
}