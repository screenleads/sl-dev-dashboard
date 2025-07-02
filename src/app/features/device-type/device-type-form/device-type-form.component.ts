// src/app/features/device-type/device-type-form.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DeviceTypeService } from '../../../core/services/device-type.service';
import { DeviceType } from '../models/device-type.model';

@Component({
  standalone: true,
  selector: 'app-device-type-form',
  templateUrl: './device-type-form.component.html',
  styleUrls: ['./device-type-form.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSnackBarModule,
    MatSlideToggleModule
  ]
})
export class DeviceTypeFormComponent {
  private fb = inject(FormBuilder);
  private deviceTypeService = inject(DeviceTypeService);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  router = inject(Router);

  form = this.fb.group({
    id: [null as number | null],
    type: ['', Validators.required],
    enabled: [true, Validators.required],
  });

  isEditMode = false;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.deviceTypeService.getById(+id).subscribe(deviceType => {
        this.form.patchValue({
          id: deviceType.id ?? null,
          type: deviceType.type ?? '',
          enabled: deviceType.enabled ?? true
        });
      });
    }
  }

  save() {
    if (this.form.invalid) return;
    const formValue = this.form.value;
    const deviceType: DeviceType = {
      id: formValue.id ?? undefined,
      type: formValue.type ?? '',
      enabled: formValue.enabled ?? true
    };
    const req = this.isEditMode
      ? this.deviceTypeService.update(deviceType)
      : this.deviceTypeService.create(deviceType);

    req.subscribe(() => {
      this.snackBar.open('Tipo de dispositivo guardado', 'Cerrar', { duration: 2000 });
      this.router.navigate(['/device-types']);
    });
  }
}