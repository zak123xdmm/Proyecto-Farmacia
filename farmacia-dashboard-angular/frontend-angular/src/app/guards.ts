import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn) return true;
  return inject(Router).createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.user?.rol === 'Administrador/Gerente') return true;
  return inject(Router).createUrlTree(['/']);
};
export const inventarioGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (['Administrador/Gerente','Farmacéutico Regente'].includes(auth.user?.rol || '')) return true;
  return inject(Router).createUrlTree(['/']);
};
