import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards';
import { LoginComponent } from './login.component';
import { ShellComponent } from './shell.component';
import { DashboardComponent } from './dashboard.component';
import { InventoryComponent } from './inventory.component';
import { SalesComponent } from './sales.component';
import { ReportsComponent } from './reports.component';
import { LotsComponent } from './lots.component';
import { CategoriesComponent } from './categories.component';
import { UsersComponent } from './users.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '', component: ShellComponent, canActivate: [authGuard], children: [
      { path: '', component: DashboardComponent },
      { path: 'inventario', component: InventoryComponent },
      { path: 'ventas', component: SalesComponent },
      { path: 'reportes', component: ReportsComponent },
      { path: 'lotes', component: LotsComponent },
      { path: 'categorias', component: CategoriesComponent, canActivate: [adminGuard] },
      { path: 'usuarios', component: UsersComponent, canActivate: [adminGuard] }
    ]
  },
  { path: '**', redirectTo: '' }
];