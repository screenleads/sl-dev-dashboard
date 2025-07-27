import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly tokenKey = 'access_token';
  private readonly companyKey = 'company';

  constructor(private router: Router) { }

  getUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  loginSuccess(res: any) {
    localStorage.setItem(this.tokenKey, res.token);
    localStorage.setItem(this.companyKey, res.user.company.id);
    localStorage.setItem('user', JSON.stringify(res.user));
    this.router.navigate(['/']);
  }

  isCorrect(res: any) {
    return (res.token && res.user && res.user.company)
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Opcional: decodificar y validar expiración del token
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp && payload.exp > now;
    } catch (e) {
      return false;
    }
  }

  getUserPayload(): any {
    const token = this.getToken();
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1]));
  }
}
