import { Component, inject, Inject, OnInit } from '@angular/core';
import { NgIf, NgForOf } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Advice } from '../../core/models/advice.model';
import { CrudService } from '../../core/services/crud.service';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  imports: [
    HttpClientModule,
    MatDialogModule,
    MatSnackBarModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    NgIf,
    NgForOf,
    RouterModule
  ],
  selector: 'app-device-advices-dialog',
  templateUrl: './device-advices-dialog.component.html',
  styleUrls: ['./device-advices-dialog.component.scss']
})
export class DeviceAdvicesDialogComponent implements OnInit {
  deviceId: number;
  assignedAdvices: Advice[] = [];
  allAdvices: Advice[] = [];
  private service = inject(CrudService);

  /** Marca si ha habido cambios (asignar/desasignar) para informar al padre */
  private dirty = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { deviceId: number },
    private dialogRef: MatDialogRef<DeviceAdvicesDialogComponent>,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.deviceId = data.deviceId;
  }

  ngOnInit(): void {
    this.fetchAssignedAdvices();
    this.fetchAllAdvices();
  }

  fetchAssignedAdvices() {
    this.service.init('devices');
    this.service.getCustom(`${this.deviceId}/advices`).subscribe({
      next: (advices) => this.assignedAdvices = advices,
      error: () => this.snackBar.open('Error al obtener anuncios asignados', 'Cerrar', { duration: 3000 })
    });
  }

  fetchAllAdvices() {
    this.service.init('advices');
    this.service.getAll().subscribe({
      next: (advices) => this.allAdvices = advices,
      error: () => this.snackBar.open('Error al obtener todos los anuncios', 'Cerrar', { duration: 3000 })
    });
  }

  isAssigned(advice: Advice): boolean {
    return this.assignedAdvices.some(a => a.id === advice.id);
  }

  assignAdvice(adviceId: number) {
    this.service.init('devices');
    this.service.createCustom(`${this.deviceId}/advices/${adviceId}`, {}).subscribe({
      next: () => {
        this.dirty = true; // Hubo cambio
        this.snackBar.open('Anuncio asignado correctamente', 'Cerrar', { duration: 3000 });
        this.fetchAssignedAdvices();
      },
      error: () => this.snackBar.open('Error al asignar el anuncio', 'Cerrar', { duration: 3000 })
    });
  }

  unassignAdvice(adviceId: number) {
    this.service.init('devices');
    this.service.deleteCustom(`${this.deviceId}/advices/${adviceId}`, {}).subscribe({
      next: () => {
        this.dirty = true; // Hubo cambio
        this.snackBar.open('Anuncio desasignado correctamente', 'Cerrar', { duration: 3000 });
        this.fetchAssignedAdvices();
      },
      error: () => this.snackBar.open('Error al desasignar el anuncio', 'Cerrar', { duration: 3000 })
    });
  }

  close() {
    // Si hubo cambios, informa al padre para que pregunte por el refresh
    if (this.dirty) {
      this.dialogRef.close({ updated: true, deviceId: this.deviceId });
    } else {
      this.dialogRef.close();
    }
  }
}
