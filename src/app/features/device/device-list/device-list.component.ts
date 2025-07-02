// src/app/features/device/device-list.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { signal } from '@angular/core';
import { DeviceService } from '../../../core/services/device.service';
import { Device } from '../models/device.model';

@Component({
  standalone: true,
  selector: 'app-device-list',
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatSlideToggle,
    MatIconModule,
    MatToolbarModule,
    MatCardModule,
    MatSnackBarModule
  ],
  templateUrl: './device-list.component.html',
  styleUrls: ['./device-list.component.scss']
})
export class DeviceListComponent {
  private deviceService = inject(DeviceService);
  private snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['id', 'uuid', 'descriptionName', 'width', 'height', 'type', 'enabled', 'actions'];
  devices = signal<Device[]>([]);

  constructor() {
    this.loadDevices();
  }

  loadDevices() {
    this.deviceService.getAll().subscribe(data => this.devices.set(data));
  }

  delete(id: number) {
    if (confirm('¿Eliminar dispositivo?')) {
      this.deviceService.delete(id).subscribe(() => {
        this.snackBar.open('Dispositivo eliminado', 'Cerrar', { duration: 2000 });
        this.loadDevices();
      });
    }
  }
}
