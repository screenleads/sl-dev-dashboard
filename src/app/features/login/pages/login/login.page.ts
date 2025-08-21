import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { CommonModule } from '@angular/common';
import { AuthenticationService } from '../../../../core/services/authentication/authentication.service';

import {
  SlButtonComponent,
  SlIconComponent,
  SlModuleTitleComponent,
  SlTextFieldModule
} from 'sl-dev-components';
import { environment } from '../../../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    CommonModule,
    FormsModule,
    SlButtonComponent,
    SlIconComponent,
    SlModuleTitleComponent,
    SlTextFieldModule
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private auth = inject(AuthenticationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private apiUrl = '';
  public showPassword = false;
  form = this.fb.group({
    username: ['jato', Validators.required],
    password: ['52866617jJ@', Validators.required]
  });

  constructor() {
    this.apiUrl = environment.apiUrl;
  }

  login() {
    const returnUrl = '/connect';
    this.http.post<{ token: string }>(`${this.apiUrl}auth/login`, this.form.value)
      .subscribe({
        next: res => {
          console.log(res);
          if (this.auth.isCorrect(res)) this.auth.loginSuccess(res);
          else alert('Usuario mal configurado ponte en contacto con el administrador')
        },
        error: () => alert('Credenciales inválidas')
      });
  }
}
