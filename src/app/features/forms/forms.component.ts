// src/app/features/device/device-form.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { Device } from '../../core/models/device.model';
import { DeviceType } from '../../core/models/device-type.model';
import { CrudService } from '../../core/services/crud.service';

@Component({
  standalone: true,
  selector: 'app-device-form',
  templateUrl: './forms.component.html',
  styleUrl: './forms.component.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSnackBarModule,
    MatSelectModule,
    HttpClientModule
  ]
})
export class FormsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private deviceService = inject(CrudService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  router = inject(Router);

  form = this.fb.group({
    id: [null],
    uuid: ['', Validators.required],
    descriptionName: ['', Validators.required],
    width: [0, [Validators.required, Validators.min(1)]],
    height: [0, [Validators.required, Validators.min(1)]],
    typeId: [undefined as number | undefined, Validators.required],
  });

  isEditMode = false;
  deviceTypes = signal<DeviceType[]>([]);

  constructor(){
    this.getFields();
  }

  ngOnInit(): void {
    this.http.get<DeviceType[]>(
      'http://localhost:3000/devices/types'
    ).subscribe(data => this.deviceTypes.set(data));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.deviceService.getById(+id).subscribe(device => {
        this.form.patchValue({
          id: null,
          uuid: device.uuid ?? '',
          descriptionName: device.descriptionName ?? '',
          width: device.width ?? 0,
          height: device.height ?? 0,
          typeId: device.type?.id ?? undefined
        });
      });
    }
  }

  save() {
    if (this.form.invalid) return;
    const formValue = this.form.value;

    const selectedType = this.deviceTypes().find(t => t.id === formValue.typeId);
    if (!selectedType) {
      this.snackBar.open('Tipo de dispositivo inválido', 'Cerrar', { duration: 2000 });
      return;
    }

    const device: Device = {
      id: this.isEditMode ? +this.route.snapshot.paramMap.get('id')! : undefined,
      uuid: formValue.uuid ?? '',
      descriptionName: formValue.descriptionName ?? '',
      width: formValue.width ?? 0,
      height: formValue.height ?? 0,
      type: selectedType
    };

    const req = this.isEditMode ? this.deviceService.update(device) : this.deviceService.create(device);

    req.subscribe(() => {
      this.snackBar.open('Dispositivo guardado correctamente', 'Cerrar', { duration: 2000 });
      this.router.navigate(['/device']);
    });
  }





  getFields(){
    console.log(this.router.url);
    switch (this.router.url) {
      // case value:
        
      //   break;
    
      default:
        break;
    }
  }
}
