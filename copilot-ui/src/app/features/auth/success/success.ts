import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filesize',
  standalone: true,
  pure: true
})
export class FileSizePipe implements PipeTransform {
  transform(bytes: number): string {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

@Component({
  selector: 'app-success',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FileSizePipe],
  templateUrl: './success.html',
  styleUrls: ['./success.css'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class SuccessComponent implements OnInit {

  user: any = null;
  repoUrl: string = '';
  repository: any = null;

  repoContents: any[] = [];
  currentPath: string = '';

  breadcrumbs: Array<{name: string, path: string}> = [];

  loading: boolean = false;
  loadingContents: boolean = false;
  error: string = '';

  activeTab: 'info' | 'contents' = 'info';

  debug: boolean = true;

  constructor(
    private router: Router,
    private http: HttpClient,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {

    console.log('🔄 SuccessComponent initialized');

    const userData =
      localStorage.getItem('auth_user') ||
      localStorage.getItem('user') ||
      sessionStorage.getItem('user');

    if (userData) {
      this.user = JSON.parse(userData);
      console.log('👤 Logged in user:', this.user);
    } else {
      console.log('❌ No user data found');
      this.router.navigate(['/auth/login']);
    }
  }

  getToken(): string | null {
    return (
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('token')
    );
  }

  logout(): void {
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigate(['/auth/login']);
  }

  fetchRepository(): void {

    console.log('🔍 Fetching repository...');

    this.error = '';
    this.repository = null;
    this.repoContents = [];

    if (!this.repoUrl?.trim()) {
      this.error = 'Please enter a GitHub repository URL';
      return;
    }

    let cleanUrl = this.repoUrl.trim();

    if (cleanUrl.endsWith('.git')) {
      cleanUrl = cleanUrl.slice(0, -4);
    }

    const repoMatch = cleanUrl.match(/github\.com[\/:]([^\/]+)\/([^\/\s]+)/);

    if (!repoMatch) {
      this.error = 'Invalid GitHub repository URL';
      return;
    }

    const [, owner, repo] = repoMatch;

    const token = this.getToken();

    if (!token) {
      this.error = 'Not authenticated';
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    this.loading = true;

    this.http
      .get(`${environment.apiUrl}/github/repo/${owner}/${repo}`, { headers })
      .subscribe({
        next: (data: any) => {

          console.log('✅ Repository fetched:', data);

          this.repository = data;
          this.loading = false;

          this.activeTab = 'info';

          this.loadContents('');
        },

        error: (err) => {
          console.error('❌ Repo fetch error:', err);

          this.loading = false;
          this.error = err.error?.message || 'Failed to fetch repository';
        }
      });
  }

  loadContents(path: string = ''): void {

    if (!this.repository) return;

    console.log('📁 Loading contents for:', path);

    this.loadingContents = true;
    this.currentPath = path;

    this.updateBreadcrumbs(path);

    const token = this.getToken();

    if (!token) {
      this.error = 'Authentication token missing';
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    const url = path
      ? `${environment.apiUrl}/github/repo/${this.repository.full_name}/contents/${path}`
      : `${environment.apiUrl}/github/repo/${this.repository.full_name}/contents`;

    this.http.get(url, { headers }).subscribe({

      next: (data: any) => {

        console.log('✅ Contents loaded:', data?.length);

        if (this.debug) {
          console.log('📦 First item:', data?.[0]);
        }

        this.repoContents = [...data];   // IMPORTANT FIX

        this.loadingContents = false;

        this.activeTab = 'contents';

        this.cd.detectChanges();
      },

      error: (err) => {

        console.error('❌ Contents load error:', err);

        this.loadingContents = false;
        this.error = 'Failed to load repository contents';
      }
    });
  }

  updateBreadcrumbs(path: string): void {

    if (!path) {
      this.breadcrumbs = [];
      return;
    }

    const parts = path.split('/');

    let current = '';

    const crumbs: Array<{name: string, path: string}> = [];

    for (const part of parts) {

      current = current ? `${current}/${part}` : part;

      crumbs.push({
        name: part,
        path: current
      });
    }

    this.breadcrumbs = crumbs;
  }

  navigateToFolder(item: any): void {

    if (item.type === 'dir') {

      console.log('📂 Folder clicked:', item.path);

      this.loadContents(item.path);
    }
  }

  goToBreadcrumb(index: number): void {

    const path = index === -1 ? '' : this.breadcrumbs[index].path;

    console.log('🔝 Breadcrumb navigation:', path);

    this.loadContents(path);
  }

  formatNumber(num: number): string {

    if (!num) return '0';

    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }

    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }

    return num.toString();
  }

  getDisplayName(): string {

    return (
      this.user?.name?.split(' ')[0] ||
      this.user?.login ||
      'User'
    );
  }

  trackByFn(index: number, item: any): string {

    return item?.path || item?.name || index.toString();
  }
}