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
        <a *ngIf="canInventory" routerLink="/reportes" routerLinkActive="active"><span>◒</span> Reportes</a>
        <div class="nav-label">Operación</div>
        <a routerLink="/lotes" routerLinkActive="active"><span>◫</span> Lotes y FEFO</a>
        <a *ngIf="canInventory" routerLink="/conteos" routerLinkActive="active"><span>≡</span> Conteos y ajustes</a>
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
          <div class="theme-picker" [class.theme-picker-open]="themeMenuOpen">
            <button class="theme-trigger" type="button" (click)="themeMenuOpen=!themeMenuOpen" [attr.aria-expanded]="themeMenuOpen" aria-label="Cambiar apariencia" title="Cambiar apariencia">
              <span class="theme-trigger-icon">◐</span><span class="theme-trigger-label">Tema</span><span class="theme-chevron">⌄</span>
            </button>
            <div class="theme-menu" *ngIf="themeMenuOpen" (click)="$event.stopPropagation()">
              <div class="theme-menu-heading"><div><b>Apariencia</b><small>Personaliza tu espacio de trabajo</small></div><button type="button" class="theme-close" (click)="themeMenuOpen=false" aria-label="Cerrar">×</button></div>
              <div class="theme-mode-grid">
                <button type="button" class="theme-mode" [class.selected]="activeTheme==='dark'" (click)="setTheme('dark')"><span class="theme-preview preview-dark"><i></i><i></i><i></i></span><b>Oscuro</b><small>Clásico</small></button>
                <button type="button" class="theme-mode" [class.selected]="activeTheme==='light'" (click)="setTheme('light')"><span class="theme-preview preview-light"><i></i><i></i><i></i></span><b>Claro</b><small>Luminoso</small></button>
              </div>
              <div class="theme-section-label">TEMAS ESPECIALES</div>
              <div class="theme-presets">
                <button type="button" class="theme-preset" [class.selected]="activeTheme==='galaxy'" (click)="setTheme('galaxy')"><span class="preset-swatch swatch-galaxy">✦</span><span><b>Galaxy</b><small>Violeta cósmico</small></span><span class="preset-check">✓</span></button>
                <button type="button" class="theme-preset" [class.selected]="activeTheme==='ocean'" (click)="setTheme('ocean')"><span class="preset-swatch swatch-ocean">≈</span><span><b>Ocean</b><small>Azul profundo</small></span><span class="preset-check">✓</span></button>
                <button type="button" class="theme-preset" [class.selected]="activeTheme==='forest'" (click)="setTheme('forest')"><span class="preset-swatch swatch-forest">❋</span><span><b>Forest</b><small>Verde natural</small></span><span class="preset-check">✓</span></button>
                <button type="button" class="theme-preset" [class.selected]="activeTheme==='sunset'" (click)="setTheme('sunset')"><span class="preset-swatch swatch-sunset">☼</span><span><b>Sunset</b><small>Atardecer cálido</small></span><span class="preset-check">✓</span></button>
                <button type="button" class="theme-preset" [class.selected]="activeTheme==='rose'" (click)="setTheme('rose')"><span class="preset-swatch swatch-rose">♡</span><span><b>Rose</b><small>Rosa elegante</small></span><span class="preset-check">✓</span></button>
              </div>
              <div class="theme-custom">
                <div><b>Personalizado</b><small>Elige tu propio color de fondo</small></div>
                <label class="color-control" title="Elegir color"><input type="color" [value]="customColor" (input)="onCustomColor($event)" aria-label="Color de fondo personalizado"><span>＋</span></label>
              </div>
              <button type="button" class="theme-reset" (click)="setTheme('dark')">Restablecer tema clásico</button>
            </div>
          </div>
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
  themeMenuOpen=false;
  activeTheme='dark';
  customColor='#26384f';
  private readonly themeStorageKey='farmacia-dashboard-theme';
  private readonly customColorStorageKey='farmacia-dashboard-custom-color';

  constructor(){
    if(typeof localStorage!=='undefined'){
      const saved=localStorage.getItem(this.themeStorageKey);
      const allowed=['dark','light','galaxy','ocean','forest','sunset','rose','custom'];
      if(saved && allowed.includes(saved)) this.activeTheme=saved;
      this.customColor=localStorage.getItem(this.customColorStorageKey)||this.customColor;
      this.applyTheme();
    }
  }

  setTheme(theme:string){
    this.activeTheme=theme;
    if(typeof localStorage!=='undefined') localStorage.setItem(this.themeStorageKey,theme);
    this.applyTheme();
    if(theme!=='custom') this.themeMenuOpen=false;
  }

  onCustomColor(event:Event){
    const value=(event.target as HTMLInputElement).value;
    this.customColor=value;
    this.activeTheme='custom';
    if(typeof localStorage!=='undefined'){
      localStorage.setItem(this.customColorStorageKey,value);
      localStorage.setItem(this.themeStorageKey,'custom');
    }
    this.applyTheme();
  }

  private applyTheme(){
    if(typeof document==='undefined') return;
    const root=document.documentElement;
    root.setAttribute('data-theme',this.activeTheme);
    if(this.activeTheme==='custom'){
      const bg=this.customColor;
      root.style.setProperty('--bg',bg);
      root.style.setProperty('--panel',this.mix(bg,'#ffffff',0.075));
      root.style.setProperty('--panel2',this.mix(bg,'#ffffff',0.12));
      root.style.setProperty('--line',this.mix(bg,'#ffffff',0.2));
      root.style.setProperty('--text',this.isLight(bg)?'#17202b':'#f2f6fb');
      root.style.setProperty('--muted',this.isLight(bg)?'#64748b':'#a5b4c5');
      root.style.setProperty('--blue',this.isLight(bg)?'#2563eb':'#72baff');
      root.style.setProperty('--cyan',this.isLight(bg)?'#0f9f91':'#55dfce');
      root.style.setProperty('--surface-shadow',this.isLight(bg)?'rgba(25,40,60,.08)':'rgba(0,0,0,.2)');
    }else{
      ['--bg','--panel','--panel2','--line','--text','--muted','--blue','--cyan','--surface-shadow'].forEach(v=>root.style.removeProperty(v));
    }
  }

  private mix(hex:string,other:string,amount:number){
    const a=hex.replace('#',''); const b=other.replace('#','');
    const n=(i:number)=>Math.round(parseInt(a.slice(i,i+2),16)*(1-amount)+parseInt(b.slice(i,i+2),16)*amount).toString(16).padStart(2,'0');
    return '#'+n(0)+n(2)+n(4);
  }
  private isLight(hex:string){const h=hex.replace('#','');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return (r*299+g*587+b*114)/1000>145;}
  get canInventory(){ return ['Administrador/Gerente','Farmacéutico Regente'].includes(this.auth.user?.rol || ''); }
  get isAdmin(){ return this.auth.user?.rol==='Administrador/Gerente'; }
  get initials(){ return (this.auth.user?.nombre||'U').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase(); }
  get pageTitle(){ const p=this.router.url.split('/')[1]; return ({'':'Resumen','inventario':'Inventario','ventas':'Ventas','reportes':'Reportes','conteos':'Conteos y ajustes','lotes':'Lotes y FEFO','categorias':'Categorías','usuarios':'Usuarios'} as any)[p] || 'Resumen'; }
  logout(){ this.auth.logout(); }
}