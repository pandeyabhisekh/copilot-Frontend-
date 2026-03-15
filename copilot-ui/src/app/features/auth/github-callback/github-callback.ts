import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-github-callback',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './github-callback.html',
  styleUrls: ['./github-callback.css']
})
export class GitHubCallbackComponent implements OnInit, OnDestroy {
  error: string = '';
  loading: boolean = true;
  countdown: number = 3;
  private subscription: Subscription = new Subscription();
  private countdownInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    console.log('🔄 GitHub Callback Component Initialized');
    
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const error = params['error'];
      
      console.log('📨 Callback params:', { 
        token: token ? token.substring(0, 10) + '...' : 'missing', 
        error 
      });

      if (error) {
        this.handleError(error);
      } else if (token) {
        this.exchangeToken(token);
      } else {
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const hashToken = hashParams.get('token');
        
        if (hashToken) {
          console.log('🔑 Found token in hash');
          this.exchangeToken(hashToken);
        } else {
          console.error('❌ No token found in URL');
          this.handleError('No token received from GitHub');
        }
      }
    });
  }

  private exchangeToken(token: string): void {
    console.log('🔑 Exchanging token with backend...');
    
    this.http.get(`${environment.apiUrl}/auth/github/token?token=${token}`)
      .subscribe({
        next: (response: any) => {
          console.log('✅ Token exchange response:', response);
          
          if (response.success) {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('auth_user', JSON.stringify(response.user));
            console.log('✅ User data saved:', response.user.email);
            
            this.loading = false;
            
            // ✅ FORCE REDIRECT TO SUCCESS PAGE
            console.log('🚀 Redirecting to success page...');
            window.location.href = '/auth/success';
          } else {
            this.handleError(response.message || 'GitHub login failed');
          }
        },
        error: (err) => {
          console.error('❌ Token exchange error:', err);
          this.handleError(err.error?.message || 'Failed to complete GitHub login');
        }
      });
  }

  private handleError(errorMsg: string): void {
    console.error('❌ GitHub callback error:', errorMsg);
    this.error = errorMsg;
    this.loading = false;
    this.startCountdown(true);
  }

  private startCountdown(isError: boolean = false): void {
    this.countdown = 3;
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        if (isError) {
          window.location.href = '/auth/login';
        } else {
          window.location.href = '/auth/success';
        }
      }
    }, 1000);
  }

  manualRedirect(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    window.location.href = '/auth/login';
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
}