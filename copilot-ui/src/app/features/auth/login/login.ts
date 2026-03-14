import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['registered'] === 'success') {
        this.successMessage = 'Registration successful! Please login with your credentials.';
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // ✅ PLAIN PASSWORD - NO HASHING
    const loginData = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    console.log('🔑 Login attempt:', { email: loginData.email });

    this.http.post(`${environment.apiUrl}/auth/login`, loginData)
      .subscribe({
        next: (response: any) => {
          console.log('✅ Login response:', response);
          this.loading = false;
          
          if (response.success) {
            // Store token
            if (this.loginForm.value.rememberMe) {
              localStorage.setItem('token', response.token);
              localStorage.setItem('user', JSON.stringify(response.user));
            } else {
              sessionStorage.setItem('token', response.token);
              sessionStorage.setItem('user', JSON.stringify(response.user));
            }
            
            this.router.navigate(['/auth/success']);
          } else {
            this.errorMessage = response.message || 'Login failed';
          }
        },
        error: (error) => {
          console.error('❌ Login error:', error);
          this.loading = false;
          
          if (error.status === 401) {
            this.errorMessage = 'Invalid email or password.';
          } else if (error.status === 404) {
            this.errorMessage = 'User not found. Please register first.';
          } else if (error.status === 0) {
            this.errorMessage = 'Cannot connect to server. Make sure backend is running on port 8000.';
          } else {
            this.errorMessage = error.error?.message || 'Login failed. Please try again later.';
          }
        }
      });
  }
}