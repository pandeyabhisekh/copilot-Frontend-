import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  submitted = false;

  // Password strength criteria
  passwordCriteria = {
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  };

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      confirmPassword: ['', Validators.required],
      terms: [false, Validators.requiredTrue]
    }, { validators: this.passwordMatchValidator });
  }

  // Custom validator to check if passwords match
  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    
    if (password !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  // Check password strength in real-time
  checkPasswordStrength() {
    const password = this.registerForm.get('password')?.value || '';
    
    this.passwordCriteria = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password)
    };
  }

  // Get password strength percentage
  getPasswordStrength(): number {
    const criteria = Object.values(this.passwordCriteria);
    const metCount = criteria.filter(Boolean).length;
    return (metCount / criteria.length) * 100;
  }

  // Get password strength color
  getStrengthColor(): string {
    const strength = this.getPasswordStrength();
    if (strength <= 40) return '#f56565'; // Red
    if (strength <= 60) return '#f6ad55'; // Orange
    if (strength <= 80) return '#fbbf24'; // Yellow
    return '#48bb78'; // Green
  }

  // Get strength text
  getStrengthText(): string {
    const strength = this.getPasswordStrength();
    if (strength <= 40) return 'Weak';
    if (strength <= 60) return 'Fair';
    if (strength <= 80) return 'Good';
    return 'Strong';
  }

  // Check if form is valid before API call
  isFormValid(): boolean {
    return this.registerForm.valid && 
           this.getPasswordStrength() === 100 && 
           !this.registerForm.hasError('passwordMismatch');
  }

  onSubmit(): void {
    this.submitted = true;
    
    // Clear previous messages
    this.errorMessage = '';
    this.successMessage = '';

    // Check if form is valid
    if (!this.isFormValid()) {
      console.log('❌ Form invalid - no API call');
      return;
    }

    // Proceed with API call only if form is valid
    this.loading = true;

    const userData = {
      name: this.registerForm.value.name,
      email: this.registerForm.value.email,
      password: this.registerForm.value.password
    };

    console.log('📤 API Call - Form valid, sending data');

    this.http.post(`${environment.apiUrl}/auth/register`, userData)
      .subscribe({
        next: (response: any) => {
          console.log('✅ Registration successful:', response);
          this.loading = false;
          this.successMessage = 'Registration successful! Redirecting to login...';
          
          setTimeout(() => {
            this.router.navigate(['/auth/login'], { 
              queryParams: { registered: 'success' } 
            });
          }, 2000);
        },
        error: (error) => {
          console.error('❌ Registration failed:', error);
          this.loading = false;
          
          if (error.status === 409) {
            this.errorMessage = 'Email already exists. Please use a different email.';
          } else {
            this.errorMessage = 'Registration failed. Please try again.';
          }
        }
      });
  }

  // ✅ FIXED: Helper methods for template with proper boolean returns
  get f() { 
    return this.registerForm.controls; 
  }

  hasError(field: string, error: string): boolean {
    const control = this.registerForm.get(field);
    return (control?.hasError(error) ?? false) && 
           ((control?.touched ?? false) || this.submitted);
  }

  hasMismatchError(): boolean {
    const confirmControl = this.registerForm.get('confirmPassword');
    return (this.registerForm.hasError('passwordMismatch') || false) && 
           ((confirmControl?.touched ?? false) || this.submitted);
  }

  isFieldInvalid(field: string): boolean {
    const control = this.registerForm.get(field);
    return (control?.invalid ?? false) && 
           ((control?.touched ?? false) || this.submitted);
  }

  isFieldValid(field: string): boolean {
    const control = this.registerForm.get(field);
    return (control?.valid ?? false) && 
           ((control?.touched ?? false) || this.submitted);
  }
}