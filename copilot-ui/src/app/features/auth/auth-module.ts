import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthRoutingModule } from './auth-routing-module';

import { LoginComponent } from './login/login';
import { Register } from './register/register';
import { LoginSuccess } from './success/success';

@NgModule({
  imports: [
    CommonModule,
    AuthRoutingModule,
    LoginComponent,       // standalone component imported
    Register,
    LoginSuccess
  ],
})
export class AuthModule { }
