import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';  // ✅ Add NgZone
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filesize',
  standalone: true
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
  styleUrls: ['./success.css']
})
export class SuccessComponent implements OnInit {
  // User
  user: any = null;

  // Repository
  repoUrl: string = '';
  repository: any = null;
  repoContents: any[] = [];
  currentPath: string = '';
  breadcrumbs: Array<{name: string, path: string}> = [];
  loading: boolean = false;
  loadingContents: boolean = false;
  error: string = '';
  activeTab: 'info' | 'contents' = 'info';

  // History
  historyItems: any[] = [];
  loadingHistory: boolean = false;
  activeHistoryId: number | null = null;
  historyError: string = '';

  // File Viewer
  showFileViewer: boolean = false;
  selectedFile: any = null;
  fileContent: string = '';
  loadingFile: boolean = false;
  fileError: string = '';

  // API URLs
  private authApiUrl = 'http://localhost:8000';
  private projectApiUrl = 'http://localhost:8005';

  // Icons mapping
  typeIcons: any = {
    'github_repo': 'fab fa-github',
    'file_upload': 'fas fa-file-upload',
    'project_create': 'fas fa-project-diagram',
    'local_file': 'fas fa-folder-open'
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private ngZone: NgZone  // ✅ Add NgZone
  ) {}

  ngOnInit(): void {
    console.log('🔄 SuccessComponent initialized');
    
    const userData = localStorage.getItem('auth_user') || 
                     localStorage.getItem('user') || 
                     sessionStorage.getItem('user');
    
    if (userData) {
      this.user = JSON.parse(userData);
      console.log('👤 User loaded:', this.user);
      console.log('🔑 Token exists:', !!this.getToken());
      this.loadHistory();
    } else {
      console.log('❌ No user data found, redirecting to login');
      this.router.navigate(['/auth/login']);
    }
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token') || 
           localStorage.getItem('token') || 
           sessionStorage.getItem('token');
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    console.log('🔑 getAuthHeaders - Token exists:', !!token);
    
    if (!token) {
      console.warn('⚠️ No token found in storage');
      return new HttpHeaders();
    }
    
    console.log('🔑 Token being used:', token.substring(0, 20) + '...');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  logout(): void {
    console.log('👋 Logging out...');
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigate(['/auth/login']);
  }

  // ========== HISTORY METHODS ==========

  loadHistory(): void {
    this.loadingHistory = true;
    this.historyError = '';
    
    const token = this.getToken();
    console.log('📜 loadHistory - Token check:', {
      exists: !!token,
      value: token ? token.substring(0, 20) + '...' : 'none',
      from: {
        auth_token: !!localStorage.getItem('auth_token'),
        token: !!localStorage.getItem('token'),
        session: !!sessionStorage.getItem('token')
      }
    });
    
    if (!token) {
      this.loadingHistory = false;
      this.historyError = 'No authentication token found. Please login again.';
      console.error('❌ No token found in storage');
      setTimeout(() => this.logout(), 3000);
      return;
    }

    const headers = this.getAuthHeaders();
    console.log('📡 Calling history API at:', `${this.projectApiUrl}/history`);
    console.log('🔑 With headers:', headers);

    this.http.get(`${this.projectApiUrl}/history`, { headers })
      .subscribe({
        next: (data: any) => {
          this.ngZone.run(() => {  // ✅ Wrap in NgZone
            this.historyItems = data || [];
            this.loadingHistory = false;
            console.log('✅ History loaded successfully:', this.historyItems.length, 'items');
            this.cd.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.loadingHistory = false;
            console.error('❌ History error:', err);
            
            if (err.status === 401) {
              this.historyError = 'Session expired. Please login again.';
              setTimeout(() => this.logout(), 3000);
            } else if (err.status === 404) {
              this.historyError = 'History endpoint not found.';
            } else {
              this.historyError = 'Failed to load history. Please try again.';
            }
            this.cd.detectChanges();
          });
        }
      });
  }

  loadFromHistory(item: any): void {
    this.activeHistoryId = item.id;
    console.log('📜 Loading from history:', item);
    
    if (item.search_type === 'github_repo') {
      this.repoUrl = item.query;
      this.fetchRepository();
    } else if (item.search_type === 'project_create') {
      this.loadProjectDetails(item.query);
    } else if (item.search_type === 'file_upload') {
      this.loadFileDetails(item.query);
    }
  }

  loadProjectDetails(projectName: string): void {
    const headers = this.getAuthHeaders();

    this.http.get(`${this.projectApiUrl}/projects`, { headers })
      .subscribe({
        next: (data: any) => {
          this.ngZone.run(() => {
            const project = data?.find((p: any) => p.name === projectName);
            if (project) {
              console.log('📁 Project found:', project);
            }
            this.cd.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('❌ Error loading project:', err);
            this.cd.detectChanges();
          });
        }
      });
  }

  loadFileDetails(filename: string): void {
    const headers = this.getAuthHeaders();

    this.http.get(`${this.projectApiUrl}/files`, { headers })
      .subscribe({
        next: (data: any) => {
          this.ngZone.run(() => {
            const file = data?.find((f: any) => f.filename === filename);
            if (file) {
              console.log('📄 File found:', file);
            }
            this.cd.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('❌ Error loading file:', err);
            this.cd.detectChanges();
          });
        }
      });
  }

  clearHistory(): void {
    console.log('Clear history clicked');
  }

  getIcon(type: string): string {
    return this.typeIcons[type] || 'fas fa-history';
  }

  getTypeColor(type: string): string {
    const colors: any = {
      'github_repo': '#24292e',
      'file_upload': '#4CAF50',
      'project_create': '#2196F3',
      'local_file': '#FF9800'
    };
    return colors[type] || '#9E9E9E';
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  }

  // ========== REPOSITORY METHODS ==========

  fetchRepository(): void {
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
    const headers = this.getAuthHeaders();
    this.loading = true;

    console.log('🔍 Fetching repository:', { owner, repo });

    // Try through auth service first (port 8000)
    this.http.get(`${this.authApiUrl}/github/repo/${owner}/${repo}`, { headers })
      .subscribe({
        next: (data: any) => {
          this.ngZone.run(() => {
            this.repository = data;
            this.loading = false;
            this.activeTab = 'info';
            this.loadContents('');
            
            // Save to history
            this.saveToHistory('github_repo', this.repoUrl, data);
            
            // Multiple change detections to be safe
            this.cd.detectChanges();
            setTimeout(() => this.cd.detectChanges(), 50);
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('❌ Error via auth service:', err);
            
            // Try direct GitHub API as fallback
            this.fetchRepositoryDirect(owner, repo);
          });
        }
      });
  }

  fetchRepositoryDirect(owner: string, repo: string): void {
    const headers = this.getAuthHeaders();

    this.http.get(`https://api.github.com/repos/${owner}/${repo}`, { headers })
      .subscribe({
        next: (data: any) => {
          this.ngZone.run(() => {
            this.repository = data;
            this.loading = false;
            this.activeTab = 'info';
            this.loadContentsDirect(owner, repo, '');
            
            // Save to history
            this.saveToHistory('github_repo', this.repoUrl, data);
            
            this.cd.detectChanges();
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.loading = false;
            this.error = err.error?.message || 'Failed to fetch repository';
            this.cd.detectChanges();
          });
        }
      });
  }

  loadContents(path: string = ''): void {
    if (!this.repository) return;

    this.loadingContents = true;
    this.currentPath = path;
    this.updateBreadcrumbs(path);

    const headers = this.getAuthHeaders();
    const url = path
      ? `${this.authApiUrl}/github/repo/${this.repository.full_name}/contents/${path}`
      : `${this.authApiUrl}/github/repo/${this.repository.full_name}/contents`;

    console.log('📁 Loading contents from:', url);

    this.http.get(url, { headers }).subscribe({
      next: (data: any) => {
        this.ngZone.run(() => {
          this.repoContents = Array.isArray(data) ? [...data] : [];
          this.loadingContents = false;
          this.activeTab = 'contents';
          console.log('✅ Contents loaded:', this.repoContents.length, 'items');
          this.cd.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('❌ Error loading contents via auth:', err);
          
          // Try direct GitHub API
          const [owner, repo] = this.repository.full_name.split('/');
          this.loadContentsDirect(owner, repo, path);
        });
      }
    });
  }

  loadContentsDirect(owner: string, repo: string, path: string): void {
    const headers = this.getAuthHeaders();
    const url = path
      ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
      : `https://api.github.com/repos/${owner}/${repo}/contents`;

    this.http.get(url, { headers }).subscribe({
      next: (data: any) => {
        this.ngZone.run(() => {
          this.repoContents = Array.isArray(data) ? [...data] : [];
          this.loadingContents = false;
          this.activeTab = 'contents';
          this.cd.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loadingContents = false;
          this.error = 'Failed to load contents';
          this.cd.detectChanges();
        });
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
      crumbs.push({ name: part, path: current });
    }

    this.breadcrumbs = crumbs;
    this.cd.detectChanges();
  }

  navigateToFolder(item: any): void {
    if (item.type === 'dir') {
      console.log('📂 Navigating to folder:', item.path);
      this.loadContents(item.path);
    }
  }

  goToBreadcrumb(index: number): void {
    const path = index === -1 ? '' : this.breadcrumbs[index].path;
    console.log('🔝 Breadcrumb navigation to:', path || 'root');
    this.loadContents(path);
  }

  // ========== FILE VIEWER METHODS ==========

  openFile(item: any): void {
    if (item.type === 'file') {
      console.log('📄 Opening file:', item.name);
      this.selectedFile = item;
      this.showFileViewer = true;
      this.loadFileContent();
      
      // Force view update
      this.cd.detectChanges();
    }
  }

  closeFileViewer(): void {
    this.showFileViewer = false;
    this.selectedFile = null;
    this.fileContent = '';
    this.fileError = '';
    this.cd.detectChanges();
  }

  loadFileContent(): void {
    if (!this.selectedFile || !this.repository) return;

    this.loadingFile = true;
    this.fileError = '';

    const headers = this.getAuthHeaders();
    const [owner, repo] = this.repository.full_name.split('/');

    console.log('📄 Loading file content for:', this.selectedFile.path);

    // Try through auth service
    this.http.get(`${this.authApiUrl}/github/repo/${owner}/${repo}/file/${this.selectedFile.path}`, { headers })
      .subscribe({
        next: (data: any) => {
          this.ngZone.run(() => {
            if (data.type === 'text') {
              this.fileContent = data.content;
            }
            this.loadingFile = false;
            console.log('✅ File content loaded');
            
            // Multiple change detections to ensure view updates
            this.cd.detectChanges();
            setTimeout(() => this.cd.detectChanges(), 50);
            setTimeout(() => this.cd.detectChanges(), 100);
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('❌ Error loading file via auth:', err);
            
            // Try direct download
            this.loadFileContentDirect();
          });
        }
      });
  }

  loadFileContentDirect(): void {
    this.loadingFile = true;
    this.fileError = '';
    
    console.log('📡 Loading file directly from GitHub:', this.selectedFile.download_url);
    
    fetch(this.selectedFile.download_url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(data => {
        this.ngZone.run(() => {
          this.fileContent = data;
          this.loadingFile = false;
          console.log('✅ File content loaded directly, length:', data.length);
          
          // Multiple change detections with delays
          this.cd.detectChanges();
          setTimeout(() => this.cd.detectChanges(), 10);
          setTimeout(() => this.cd.detectChanges(), 50);
          setTimeout(() => this.cd.detectChanges(), 100);
          setTimeout(() => this.cd.detectChanges(), 200);
        });
      })
      .catch(err => {
        this.ngZone.run(() => {
          console.error('❌ Error loading file directly:', err);
          this.loadingFile = false;
          this.fileError = err.message || 'Failed to load file';
          this.cd.detectChanges();
        });
      });
  }

  getFileIcon(file: any): string {
    if (!file) return 'fas fa-file';
    const ext = file.name?.split('.').pop()?.toLowerCase();
    const icons: any = {
      'js': 'fab fa-js',
      'ts': 'fab fa-ts',
      'py': 'fab fa-python',
      'java': 'fab fa-java',
      'html': 'fab fa-html5',
      'css': 'fab fa-css3',
      'json': 'fas fa-code',
      'md': 'fab fa-markdown',
      'txt': 'fas fa-file-alt',
      'pdf': 'fas fa-file-pdf',
      'jpg': 'fas fa-file-image',
      'jpeg': 'fas fa-file-image',
      'png': 'fas fa-file-image',
      'gif': 'fas fa-file-image',
      'svg': 'fas fa-file-image'
    };
    return icons[ext] || 'fas fa-file';
  }

  isImage(file: any): boolean {
    if (!file) return false;
    const ext = file.name?.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext);
  }

  // ========== UTILITY METHODS ==========

  saveToHistory(type: string, query: string, data: any): void {
    const token = this.getToken();
    if (!token || !data) return;

    const headers = this.getAuthHeaders();
    const payload = {
      repo_url: query,
      repo_data: {
        full_name: data.full_name,
        description: data.description
      }
    };

    console.log('💾 Saving to history:', query);

    this.http.post(`${this.projectApiUrl}/history/github?repo_url=${encodeURIComponent(query)}`, 
                   payload.repo_data, { headers })
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            console.log('✅ Search saved to history');
            this.loadHistory(); // Reload history
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('❌ Error saving to history:', err);
          });
        }
      });
  }

  formatNumber(num: number): string {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }

  getDisplayName(): string {
    return this.user?.name?.split(' ')[0] || this.user?.login || 'User';
  }

  trackByFn(index: number, item: any): string {
    return item?.path || item?.name || index.toString();
  }
}