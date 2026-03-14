// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: any;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private BASE_URL = environment.apiUrl;
  private useMock = !!environment.mockAuth;
  private readonly STORAGE_USERS = 'mockUsers';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    if (!this.useMock) {
      return this.http.post<AuthResponse>(`${this.BASE_URL}/auth/login`, { email, password });
    }

    const users = this.getStoredUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      return of({ success: false, message: 'Invalid email or password.' }).pipe(delay(400));
    }

    const token = this.generateToken();
    return of({ success: true, token, user: { id: user.id, name: user.name, email: user.email } }).pipe(delay(400));
  }

  register(data: any): Observable<AuthResponse> {
    if (!this.useMock) {
      return this.http.post<AuthResponse>(`${this.BASE_URL}/auth/register`, data);
    }

    const users = this.getStoredUsers();
    const exists = users.some(u => u.email === data.email);
    if (exists) {
      return of({ success: false, message: 'Email already exists.' }).pipe(delay(400));
    }

    const newUser = {
      id: Date.now(),
      name: data.name,
      email: data.email,
      password: data.password,
    };
    users.push(newUser);
    this.saveUsers(users);

    const token = this.generateToken();
    return of({ success: true, token, user: { id: newUser.id, name: newUser.name, email: newUser.email } }).pipe(delay(400));
  }

  private getStoredUsers(): any[] {
    const raw = localStorage.getItem(this.STORAGE_USERS);
    return raw ? JSON.parse(raw) : [];
  }

  private saveUsers(users: any[]): void {
    localStorage.setItem(this.STORAGE_USERS, JSON.stringify(users));
  }

  private generateToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
