import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { CrudService } from '../../core/services/crud.service';
import { PreviewDeviceComponent } from "../preview-device/preview-device.component";
import { DefaultModelFactory } from '../../core/models/default-model.factory';
import { MatTableModule } from '@angular/material/table';
import {
  SlButtonComponent,
  SlIconComponent,
  SlModuleTitleComponent
} from 'sl-dev-components';

@Component({
  standalone: true,
  selector: 'app-generic-form',
  templateUrl: './forms.component.html',
  styleUrl: './forms.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    HttpClientModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
    PreviewDeviceComponent,
    MatTableModule,
    SlButtonComponent,
    SlIconComponent,
    SlModuleTitleComponent
  ]
})
export class FormsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  public router = inject(Router);
  private service = inject(CrudService);
  private mediaService = inject(CrudService);
  private promoService = inject(CrudService);
  private foreignService = inject(CrudService);
  private http = inject(HttpClient);

  form: FormGroup | null = null;
  isEditMode = false;
  mediaList: any[] = [];
  promotionList: any[] = [];
  foreignEntityLists: Record<string, any[]> = {};
  daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  public entityName = '';
  uploading = false;
  previewUrl: string | null = null;

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    const url = this.router.url;
    const pathParts = url.split('/');
    this.entityName = pathParts[1];

    if (this.entityName === 'advice') {
      this.mediaService.init('medias');
      this.mediaService.getAll().subscribe(media => this.mediaList = media ?? []);

      this.promoService.init('promotion');
      this.promoService.getAll().subscribe({
        next: promotions => this.promotionList = promotions ?? [],
        error: () => this.promotionList = []
      });
    } else {
      const foreignConfigs: { key: string, endpoint: string }[] = [
        { key: 'company', endpoint: 'companies' },
        { key: 'type', endpoint: this.entityName === 'media' ? 'medias/types' : 'devices/types' }
      ];

      foreignConfigs.forEach(cfg => {
        this.foreignService.init(cfg.endpoint);
        this.foreignService.getAll().subscribe(data => this.foreignEntityLists[cfg.key] = data ?? []);
      });
    }

    this.service.init(this.getEndpoint(this.entityName));

    if (id) {
      this.isEditMode = true;
      this.service.getById(+id).subscribe({
        next: (data) => {
          this.buildForm(data);
          if (this.entityName === 'media' && data.src) {
            this.previewUrl = data.src;
          }
        },
        error: () => {
          this.snackBar.open('No se pudo cargar el elemento', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/' + this.entityName]);
        }
      });
    } else {
      const emptyModel = DefaultModelFactory.create(this.entityName);
      this.buildForm(emptyModel);
    }
  }

  private getEndpoint(entity: string): string {
    const map: Record<string, string> = {
      advice: 'advices',
      media: 'medias',
      'media-types': 'medias/types',
      promotion: 'promotion',
      device: 'devices',
      'device-types': 'devices/types',
      company: 'companies'
    };
    return map[entity] ?? entity;
  }

  buildForm(model: any) {
    const toTimeString = (arr: [number, number] | undefined): string => {
      if (!arr || arr.length !== 2) return '';
      const [h, m] = arr;
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(h)}:${pad(m)}`;
    };

    const group: Record<string, any> = {};

    for (const key of Object.keys(model)) {
      if (key === 'id') continue;

      if (key === 'visibilityRules') {
        group[key] = this.fb.array(
          (model.visibilityRules || []).map((rule: any) =>
            this.fb.group({
              day: [rule.day],
              timeRanges: this.fb.array(
                (rule.timeRanges || []).map((t: any) =>
                  this.fb.group({
                    fromTime: [toTimeString(t.fromTime)],
                    toTime: [toTimeString(t.toTime)]
                  })
                )
              )
            })
          )
        );
      } else if (typeof model[key] === 'object' && model[key] !== null && 'id' in model[key]) {
        group[key] = [model[key] ?? null];
      } else if (typeof model[key] === 'boolean') {
        group[key] = [model[key] ?? false];
      } else if (typeof model[key] === 'number') {
        group[key] = [model[key] ?? 0];
      } else {
        group[key] = [model[key] ?? ''];
      }
    }

    this.form = this.fb.group(group);
  }

  get visibilityRules(): FormArray {
    return this.form?.get('visibilityRules') as FormArray;
  }

  getTimeRanges(ruleIndex: number): FormArray {
    return this.visibilityRules.at(ruleIndex).get('timeRanges') as FormArray;
  }

  addVisibilityRule() {
    this.visibilityRules.push(
      this.fb.group({
        day: [''],
        timeRanges: this.fb.array([])
      })
    );
  }

  removeVisibilityRule(index: number) {
    this.visibilityRules.removeAt(index);
  }

  addTimeRange(ruleIndex: number) {
    this.getTimeRanges(ruleIndex).push(
      this.fb.group({
        fromTime: [''],
        toTime: ['']
      })
    );
  }

  removeTimeRange(ruleIndex: number, rangeIndex: number) {
    this.getTimeRanges(ruleIndex).removeAt(rangeIndex);
  }

  save() {
    if (!this.form || this.form.invalid) return;
    const formValue = this.form.value;

    const req = this.isEditMode
      ? this.service.update({ id: +this.route.snapshot.paramMap.get('id')!, ...formValue })
      : this.service.create(formValue);

    req.subscribe(() => {
      this.snackBar.open('Elemento guardado correctamente', 'Cerrar', { duration: 2000 });
      this.router.navigate(['/' + this.entityName]);
    });
  }

  compareById = (a: any, b: any) => a?.id === b?.id;

  shouldRenderTextField(key: string): boolean {
    const ctrl = this.form?.get(key);
    const val = ctrl?.value;
    return (!val || typeof val !== 'object' || !('id' in val)) && !['customInterval', 'visibilityRules', 'src'].includes(key);
  }

  shouldRenderSelectField(key: string): boolean {
    const ctrl = this.form?.get(key);
    const val = ctrl?.value;
    return val && typeof val === 'object' && 'id' in val;
  }

  getOptionLabel(option: any, key: string): string {
    if (!option) return '';
    const labelMap: Record<string, string> = {
      company: option.name,
      type: option.type,
      media: option.src,
      promotion: option.description,
      description: option.description,
      name: option.name,
      uuid: option.uuid
    };
    return labelMap[key] || option.name || option.description || option.uuid || ('ID ' + option.id);
  }

  uploadFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.form) return;

    const formData = new FormData();
    formData.append('file', file);

    this.uploading = true;

    this.service.init('medias');
    this.service.createCustom('upload', formData)
      .subscribe({
        next: res => {
          this.form!.get('src')?.setValue(res.url);
          this.previewUrl = res.url;
          this.snackBar.open('Archivo subido correctamente', 'Cerrar', { duration: 2000 });
        },
        error: err => {
          console.error(err);
          this.snackBar.open('Error al subir el archivo', 'Cerrar', { duration: 3000 });
        },
        complete: () => this.uploading = false
      });
  }
}
