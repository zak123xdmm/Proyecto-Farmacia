import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private tokenKey = 'farmacia_token';
  private userKey = 'farmacia_user';
  private userSubject = new BehaviorSubject<User | null>(this.readUser());
  user$ = this.userSubject.asObservable();

  get token(): string { return localStorage.getItem(this.tokenKey) || ''; }
  get user(): User | null { return this.userSubject.value; }
  get isLoggedIn(): boolean { return !!this.token; }

  login(usuario: string, password: string): Observable<any> {
    return this.http.post<any>('/api/auth/login', { usuario, password }).pipe(
      tap(res => {
        if (res?.ok && res.token) {
          localStorage.setItem(this.tokenKey, res.token);
          localStorage.setItem(this.userKey, JSON.stringify(res.usuario));
          this.userSubject.next(res.usuario);
        }
      })
    );
  }

  me(): Observable<any> { return this.http.get<any>('/api/auth/me'); }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  private readUser(): User | null {
    try { return JSON.parse(localStorage.getItem(this.userKey) || 'null'); } catch { return null; }
  }
}