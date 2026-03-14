import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AuthRoutingModule } from './auth-routing.module';  // ✅ .module with dot

import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';
import { SuccessComponent } from './success/success';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    AuthRoutingModule,  // ✅ Routing module yahan import hona chahiye
    LoginComponent,
    RegisterComponent,
    SuccessComponent
  ]
})
export class AuthModule { }