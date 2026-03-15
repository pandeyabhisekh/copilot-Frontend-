import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  github_id?: string;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private BASE_URL = environment.apiUrl;
  private useMock = !!environment.mockAuth;
  private readonly STORAGE_USERS = 'mockUsers';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // ========== EMAIL/PASSWORD AUTH ==========

  login(email: string, password: string): Observable<AuthResponse> {
    if (!this.useMock) {
      return this.http.post<AuthResponse>(`${this.BASE_URL}/auth/login`, { email, password }).pipe(
        tap(response => {
          if (response.success && response.token) {
            this.setSession(response);
          }
        })
      );
    }

    // Mock implementation
    const users = this.getStoredUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      return of({ 
        success: false, 
        message: 'Invalid email or password.' 
      }).pipe(delay(400));
    }

    const token = this.generateToken();
    const response: AuthResponse = { 
      success: true, 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        created_at: new Date().toISOString()
      },
      message: 'Login successful'
    };
    
    this.setSession(response);
    return of(response).pipe(delay(400));
  }

  register(data: { name: string; email: string; password: string }): Observable<AuthResponse> {
    if (!this.useMock) {
      return this.http.post<AuthResponse>(`${this.BASE_URL}/auth/register`, data).pipe(
        tap(response => {
          if (response.success && response.token) {
            this.setSession(response);
          }
        })
      );
    }

    // Mock implementation
    const users = this.getStoredUsers();
    const exists = users.some(u => u.email === data.email);
    
    if (exists) {
      return of({ 
        success: false, 
        message: 'Email already exists.' 
      }).pipe(delay(400));
    }

    const newUser = {
      id: Date.now(),
      name: data.name,
      email: data.email,
      password: data.password,
      created_at: new Date().toISOString()
    };
    
    users.push(newUser);
    this.saveUsers(users);

    const token = this.generateToken();
    const response: AuthResponse = { 
      success: true, 
      token, 
      user: { 
        id: newUser.id, 
        name: newUser.name, 
        email: newUser.email,
        created_at: newUser.created_at
      },
      message: 'Registration successful'
    };
    
    this.setSession(response);
    return of(response).pipe(delay(400));
  }

  // ========== GITHUB AUTH ==========

  githubLogin(): void {
    if (this.useMock) {
      // Mock GitHub login - create a test GitHub user
      const mockGithubUser = {
        id: Date.now(),
        name: 'GitHub User',
        email: `github_${Date.now()}@example.com`,
        avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
        github_id: '12345678',
        created_at: new Date().toISOString()
      };
      
      const token = this.generateToken();
      const response: AuthResponse = {
        success: true,
        token,
        user: mockGithubUser,
        message: 'GitHub login successful'
      };
      
      this.setSession(response);
      this.router.navigate(['/dashboard']);
      return;
    }

    // Real GitHub OAuth
    window.location.href = `${this.BASE_URL}/auth/github/login`;
  }

  handleGitHubCallback(token: string): Observable<AuthResponse> {
    if (this.useMock) {
      // Mock handling - should not happen in mock mode
      return of({ 
        success: false, 
        message: 'Mock mode does not support GitHub callback' 
      });
    }

    return this.http.get<AuthResponse>(`${this.BASE_URL}/auth/github/token?token=${token}`).pipe(
      tap(response => {
        if (response.success) {
          this.setSession(response);
        }
      })
    );
  }

  // ========== SESSION MANAGEMENT ==========

  private setSession(response: AuthResponse): void {
    if (response.token) {
      localStorage.setItem(this.TOKEN_KEY, response.token);
    }
    if (response.user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    }
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    if (!this.useMock) {
      // Call backend logout endpoint (optional)
      this.http.post(`${this.BASE_URL}/auth/logout`, {}).subscribe({
        error: (err) => console.error('Logout error:', err)
      });
    }
    
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUser(): User | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // ========== MOCK HELPERS ==========

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

  // Initialize with some mock users
  initializeMockUsers(): void {
    if (this.useMock) {
      const users = this.getStoredUsers();
      if (users.length === 0) {
        const mockUsers = [
          {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            password: 'Test@123',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            name: 'John Doe',
            email: 'john@example.com',
            password: 'Test@123',
            created_at: new Date().toISOString()
          }
        ];
        this.saveUsers(mockUsers);
      }
    }
  }

  // For demo purposes - fill test credentials (UPDATED with working user)
  getTestCredentials(): { email: string; password: string } {
    return {
      email: 'test5@example.com',  // ✅ Changed to working user
      password: 'Test@123'
    };
  }
}