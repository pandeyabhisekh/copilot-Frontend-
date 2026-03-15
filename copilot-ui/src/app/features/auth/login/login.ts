import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  githubLoading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });

    this.route.queryParams.subscribe(params => {
      if (params['registered'] === 'success') {
        this.successMessage = 'Registration successful! Please login.';
      }
      if (params['error'] === 'github_auth_failed') {
        this.errorMessage = 'GitHub login failed. Please try again.';
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

    console.log('📤 Attempting login for:', this.loginForm.value.email);

    this.authService.login(
      this.loginForm.value.email,
      this.loginForm.value.password
    ).subscribe({
      next: (response) => {
        console.log('✅ Login response:', response);
        this.loading = false;
        
        if (response.success) {
          console.log('🚀 Redirecting to success page...');
          // ✅ CHANGE HERE: Redirect to /auth/success
          this.router.navigateByUrl('/auth/success').then(success => {
            if (success) {
              console.log('Navigation to success page successful');
            } else {
              console.error('Navigation failed');
              window.location.href = '/auth/success';
            }
          }).catch(err => {
            console.error('Navigation error:', err);
            window.location.href = '/auth/success';
          });
        } else {
          this.errorMessage = response.message || 'Login failed';
        }
      },
      error: (error) => {
        console.error('❌ Login error:', error);
        this.loading = false;
        
        if (error.status === 401) {
          this.errorMessage = 'Invalid email or password';
        } else if (error.status === 404) {
          this.errorMessage = 'User not found. Please register first.';
        } else {
          this.errorMessage = error.error?.message || 'Login failed. Please try again.';
        }
      }
    });
  }

  onGitHubLogin(): void {
    this.githubLoading = true;
    this.errorMessage = '';
    console.log('🚀 Initiating GitHub login...');
    this.authService.githubLogin();
  }

  fillTestUser(): void {
    const test = this.authService.getTestCredentials();
    this.loginForm.patchValue({
      email: test.email,
      password: test.password
    });
  }
}