import { Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';
import { ListsComponent } from './features/lists/lists.component';
import { FormsComponent } from './features/forms/forms.component';
import { AuthGuard } from './core/guards/authentication.guard';


export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/pages/login/login.page').then(m => m.LoginPage) },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [AuthGuard], // protege TODAS las rutas hijas
    children: [
      { path: ':path', component: ListsComponent },
      { path: ':path/new', component: FormsComponent },
      { path: ':path/edit/:id', component: FormsComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
