import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AuthRoutingModule } from './auth-routing.module';

// Import components
import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';
import { SuccessComponent } from './success/success';
import { GitHubCallbackComponent } from './github-callback/github-callback';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    AuthRoutingModule,
    LoginComponent,        // ✅ All standalone components
    RegisterComponent,
    SuccessComponent,
    GitHubCallbackComponent
  ]
})
export class AuthModule { }