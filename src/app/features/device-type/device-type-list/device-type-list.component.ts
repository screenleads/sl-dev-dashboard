// src/app/features/device-type/device-type-list.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { signal } from '@angular/core';
import { DeviceTypeService } from '../../../core/services/device-type.service';
import { DeviceType } from '../models/device-type.model';

@Component({
  standalone: true,
  selector: 'app-device-type-list',
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatCardModule,
    MatSnackBarModule,
    MatSlideToggleModule
  ],
  templateUrl: './device-type-list.component.html',
  styleUrls: ['./device-type-list.component.scss']
})
export class DeviceTypeListComponent {
  private deviceTypeService = inject(DeviceTypeService);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['id', 'type', 'enabled', 'actions'];
  deviceTypes = signal<DeviceType[]>([]);

  constructor() {
    this.loadDeviceTypes();
  }

  loadDeviceTypes() {
    this.deviceTypeService.getAll().subscribe(data => this.deviceTypes.set(data));
  }

  delete(id: number) {
    if (confirm('¿Eliminar tipo de dispositivo?')) {
      this.deviceTypeService.delete(id).subscribe(() => {
        this.snackBar.open('Tipo eliminado', 'Cerrar', { duration: 2000 });
        this.loadDeviceTypes();
      });
    }
  }
}
