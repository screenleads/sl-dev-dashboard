import { Routes } from '@angular/router';

import { deviceRoutes } from './features/device/routes';
import { deviceTypeRoutes } from './features/device-type/routes';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';
// agrega aquí otros routes cuando los tengas listos

export const routes: Routes = [
    {
        path: '',
        component: AppLayoutComponent,
        children: [
            { path: 'device', children: deviceRoutes },
            { path: 'device-types', children: deviceTypeRoutes },
            // más rutas:
            // { path: 'media', children: mediaRoutes },
            // { path: 'company', children: companyRoutes },
            // ...
        ]
    },
    { path: '**', redirectTo: '' }
];
