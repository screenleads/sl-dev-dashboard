import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly tokenKey = 'access_token';
  private readonly companyKey = 'company';
  private readonly userKey = 'user';

  constructor(
    private router: Router,
    private http: HttpClient
  ) { }

  // === Helpers de storage ===
  private setToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }
  private setCompanyId(companyId: number | string) {
    localStorage.setItem(this.companyKey, String(companyId));
  }
  private setUser(user: any) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  // === Lecturas ===
  getUser(): any {
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  }
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
  getUserPayload(): any {
    const token = this.getToken();
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  // === Login / Logout ===
  isCorrect(res: any) {
    return (res?.token && res?.user && res?.user?.company);
  }

  loginSuccess(res: any) {
    this.setToken(res.token);
    this.setCompanyId(res.user.company.id);
    this.setUser(res.user);
    this.router.navigate(['/']);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.companyKey);
    localStorage.removeItem(this.userKey);
    this.router.navigate(['/login']);
  }

  // === Auth estado ===
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp && payload.exp > now;
    } catch {
      return false;
    }
  }

  // === REFRESH de MI USUARIO (/auth/me) ===
  /**
   * Vuelve a descargar /auth/me y actualiza el localStorage: 'user' y 'company'
   * Devuelve el usuario nuevo.
   */
  refreshMe(): Observable<any> {
    // Si NO tienes interceptor de Auth, forzamos header. Si lo tienes, también funciona.
    const token = this.getToken();
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.get<any>('/auth/me', { headers }).pipe(
      tap((user) => {
        if (user) {
          this.setUser(user);
          if (user.company?.id != null) {
            this.setCompanyId(user.company.id);
          }
        }
      })
    );
  }

  // === REFRESH de TOKEN (/auth/refresh) (opcional) ===
  /**
   * Si tu backend expone /auth/refresh y quieres refrescar el JWT tras cambiar roles/datos,
   * usa este método. Guarda el nuevo token.
   */
  refreshToken(): Observable<string> {
    const token = this.getToken();
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;

    return this.http.post<{ token: string }>('/auth/refresh', {}, { headers }).pipe(
      map(res => res?.token),
      tap(newToken => {
        if (newToken) this.setToken(newToken);
      })
    );
  }
}
