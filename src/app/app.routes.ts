import { Routes } from '@angular/router';

import { AppLayoutComponent } from './layout/app-layout/app-layout.component';
// agrega aquí otros routes cuando los tengas listos

import { ListsComponent } from './features/lists/lists.component';
import { FormsComponent } from './features/forms/forms.component';

export const routes: Routes = [
    {
        path: '',
        component: AppLayoutComponent,
        children: [
            { path: ':path', component: ListsComponent },
            { path: ':path/new', component: FormsComponent },
            { path: ':path/edit/:id', component: FormsComponent },
            // más rutas:
            // { path: 'media', children: mediaRoutes },
            // { path: 'company', children: companyRoutes },
            // ...
        ]
    },
    { path: '**', redirectTo: '' }
];
