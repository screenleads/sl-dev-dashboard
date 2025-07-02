// src/app/features/device-type/routes.ts
import { Routes } from '@angular/router';
import { DeviceTypeFormComponent } from './device-type-form/device-type-form.component';
import { DeviceTypeListComponent } from './device-type-list/device-type-list.component';


export const deviceTypeRoutes: Routes = [
    { path: '', component: DeviceTypeListComponent },
    { path: 'new', component: DeviceTypeFormComponent },
    { path: 'edit/:id', component: DeviceTypeFormComponent },
];
