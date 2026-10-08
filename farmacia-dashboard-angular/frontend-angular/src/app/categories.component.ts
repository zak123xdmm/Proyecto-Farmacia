import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-head">
      <div>
        <div class="eyebrow">CATÁLOGO</div>
        <h1>Categorías</h1>
        <p>Clasificación del catálogo administrada desde la API.</p>
      </div>
    </div>
    
    <section class="panel compact">
      <form class="inline-form" (ngSubmit)="create()">
        <input [(ngModel)]="name" name="name" placeholder="Nombre de nueva categoría" required>
        
        <!-- NUEVO: Selector para crear subcategorías -->
        <select [(ngModel)]="parentId" name="parentId" style="margin-left: 10px; padding: 8px; border-radius: 4px; background: #1e293b; color: white; border: 1px solid #334155;">
          <option [ngValue]="null">Categoría Principal (Sin padre)</option>
          <option *ngFor="let p of mainCategories()" [ngValue]="p.id">Sub de: {{p.nombre}}</option>
        </select>
        
        <button class="btn primary" style="margin-left: 10px;">+ Crear</button>
      </form>

      <!-- NUEVO: Alertas de error/éxito integradas en la vista -->
      <div *ngIf="errorMessage" style="background:#ef4444; color:white; padding:10px; border-radius:5px; margin-top:15px;">
        {{ errorMessage }}
      </div>
      <div *ngIf="successMessage" style="background:#10b981; color:white; padding:10px; border-radius:5px; margin-top:15px;">
        {{ successMessage }}
      </div>

      <div class="tag-grid" style="margin-top: 20px;">
        <div class="category-card" *ngFor="let c of cats">
          <span>◈</span>
          <div>
            <!-- Muestra si es subcategoría de alguien -->
            <b>{{c.nombre}} <small *ngIf="c.padre" style="color:#94a3b8; font-weight: normal;">(Sub de: {{c.padre}})</small></b>
            
            <!-- NUEVO: Contador de medicamentos ({{c.meds}}) -->
            <small>{{c.activo ? 'Activa' : 'Inactiva'}} • {{c.meds || 0}} medicamento(s) vinculados</small>
          </div>
          <button class="danger-link" (click)="remove(c.id)">Eliminar</button>
        </div>
      </div>
    </section>
  `
})
export class CategoriesComponent {
  api = inject(ApiService);
  cats: any[] = [];
  name = '';
  parentId: number | null = null;
  errorMessage = '';
  successMessage = '';

  ngOnInit() { this.load(); }
  
  load() { 
    this.api.categorias().subscribe(r => this.cats = r.categorias || []); 
  }

  // Extraemos solo las categorías de nivel 1 para el selector (evita anidar 3 niveles)
  mainCategories() {
    return this.cats.filter(c => !c.parent_id);
  }

  create() {
    this.errorMessage = '';
    this.successMessage = '';
    
    this.api.crearCategoria({ nombre: this.name, parent_id: this.parentId }).subscribe({
      next: (r: any) => {
        this.name = '';
        this.parentId = null;
        this.successMessage = r.mensaje || 'Categoría creada';
        this.load();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: e => {
        // Captura errores de express-validator (ej: nombre corto/símbolos) y duplicados
        let errText = e?.error?.mensaje || 'No se pudo crear la categoría.';
        if (e?.error?.errores && Array.isArray(e.error.errores)) {
          errText = e.error.errores.map((err: any) => err.msg).join(' | ');
        }
        this.errorMessage = errText;
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  remove(id: number) {
    if (!confirm('¿Eliminar esta categoría permanentemente?')) return;
    
    this.errorMessage = '';
    this.successMessage = '';
    
    this.api.eliminarCategoria(id).subscribe({
      next: (r: any) => {
        this.successMessage = r.mensaje || 'Categoría eliminada';
        this.load();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: e => {
        // ESTO EVITA QUE FALLE EN SILENCIO: muestra si tiene medicamentos o subcategorías
        this.errorMessage = e?.error?.mensaje || 'No se pudo eliminar la categoría.';
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }
}