import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CrudService } from '../../core/services/crud.service';

type DeviceAction = 'REFRESH_ADS' | 'RESTART_APP' | 'MAINTENANCE_MODE' | 'NOTIFY';

@Component({
  standalone: true,
  selector: 'app-device-actions-dialog',
  templateUrl: './device-actions-dialog.component.html',
  styleUrls: ['./device-actions-dialog.component.scss'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatSnackBarModule
  ]
})
export class DeviceActionsDialogComponent {

  notifyForm!: FormGroup;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { device: any; roomId: string },
    private dialogRef: MatDialogRef<DeviceActionsDialogComponent>,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private crud: CrudService
  ) {
    // Inicializamos el formulario y CrudService una vez inyectadas las dependencias
    this.notifyForm = this.fb.group({
      message: ['', [Validators.required, Validators.maxLength(500)]]
    });

    // Inicializa CrudService con /ws
    this.crud.init('ws');
  }

  action(act: DeviceAction) {
    this.sendCommand(act);
  }

  sendNotification() {
    if (this.notifyForm.invalid) return;
    this.sendCommand('NOTIFY', this.notifyForm.value.message ?? '');
  }

  private sendCommand(type: 'REFRESH_ADS' | 'RESTART_APP' | 'MAINTENANCE_MODE' | 'NOTIFY', messageText?: string) {
    const body: any = {
      type,
      message: messageText || type,          // texto plano para compatibilidad
      senderId: 'dashboard',
      senderName: 'Dashboard',
      systemGenerated: true,
      metadata: type === 'NOTIFY' ? {
        ui: 'toast',                          // 'toast' | 'snackbar' | 'banner'
        text: messageText ?? '',              // contenido visible
        title: 'Operación',                   // opcional
        level: 'success'                      // 'success' | 'info' | 'warning' | 'error'
      } : undefined
    };

    this.crud.createCustom(`command/${encodeURIComponent(this.data.roomId)}`, body)
      .subscribe({
        next: () => { this.snack.open('Comando enviado', 'Cerrar', { duration: 1500 }); this.dialogRef.close(true); },
        error: () => { this.snack.open('No se pudo enviar el comando', 'Cerrar', { duration: 2000 }); }
      });
  }
}
