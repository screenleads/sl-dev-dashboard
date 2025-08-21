import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';

import { CrudService } from '../../core/services/crud.service';
import { PreviewDeviceComponent } from '../preview-device/preview-device.component';
import { DefaultModelFactory } from '../../core/models/default-model.factory';
import {
  SlButtonComponent,
  SlIconComponent,
  SlModuleTitleComponent
} from 'sl-dev-components';
import { Media, MediaModel } from '../../core/models/media.model';

// Metadatos
import { MetadataService, EntityInfo } from '../../core/services/meta-data.service';

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
  private foreignService = inject(CrudService);
  private http = inject(HttpClient);
  private metadata = inject(MetadataService);

  form: FormGroup | null = null;
  isEditMode = false;

  // Para el bloque específico de Advice (rellenadas desde foreignEntityLists)
  mediaList: any[] = [];
  promotionList: any[] = [];

  foreignEntityLists: Record<string, any[]> = {};
  daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  // Campos que no deben mostrarse/editarse de forma genérica
  excludedFields: string[] = ['id', 'devices', 'advices', 'users', 'roles', 'timeRanges', 'companyId'];

  public entityPath = '';      // 'company' | 'device-types' | 'user' | ...
  public entityClassName = ''; // 'Company' | 'DeviceType' | 'User' | ...
  uploading = false;
  previewUrl: string | null = null;

  // Edición de usuario: recordamos companyId del DTO para preseleccionar la empresa en el select
  private pendingCompanyId: number | null = null;

  private colorFields = ['primaryColor', 'secondaryColor'];

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    const url = this.router.url; // /company/new | /device-types/edit/3 | /user/edit/5
    const pathParts = url.split('/').filter(Boolean);
    this.entityPath = pathParts[0];
    this.entityClassName = this.pathToEntity(this.entityPath);

    const withCount = false;
    this.metadata.getEntities(withCount).subscribe({
      next: (entities) => {
        const allEntityNames = new Set(entities.map(e => e.entityName));
        const currentMeta = entities.find(e => e.entityName === this.entityClassName);

        // Si no hay metadatos, caemos al comportamiento previo
        if (!currentMeta) {
          this.initEndpointAndLoad(id, this.getEndpointFromPath(this.entityPath));
          return;
        }

        // Descubre relaciones: atributos cuyo tipo es otra entidad conocida
        const foreignAttrs = Object.entries(currentMeta.attributes || {})
          .filter(([_, type]) => typeof type === 'string' && allEntityNames.has(type as string))
          .map(([attr, type]) => ({ attr, targetEntity: type as string }));

        // Carga listas de relaciones
        foreignAttrs.forEach(({ attr, targetEntity }) => {
          const endpoint = this.getEndpointForEntity(targetEntity);
          this.foreignService.init(endpoint);
          this.foreignService.getAll().subscribe({
            next: data => {
              this.foreignEntityLists[attr] = data ?? [];

              // Advice: listas específicas
              if (this.entityPath === 'advice') {
                if (attr === 'media') this.mediaList = this.foreignEntityLists[attr];
                if (attr === 'promotion') this.promotionList = this.foreignEntityLists[attr];
              }

              // User: si estamos editando y tenemos companyId, preselecciona la empresa
              if (this.entityPath === 'user' && attr === 'company' && this.pendingCompanyId && this.form?.get('company')) {
                const selected = (this.foreignEntityLists['company'] || []).find((c: any) => c.id === this.pendingCompanyId);
                if (selected) {
                  this.form.get('company')!.setValue(selected);
                }
              }
            },
            error: () => {
              this.foreignEntityLists[attr] = [];
            }
          });
        });

        // Inicializa endpoint y carga datos (o modelo vacío)
        const endpoint = this.getEndpointFromPath(this.entityPath);
        this.initEndpointAndLoad(id, endpoint, currentMeta);
      },
      error: () => {
        // Sin metadatos, intenta como antes
        const endpoint = this.getEndpointFromPath(this.entityPath);
        this.initEndpointAndLoad(id, endpoint);
      }
    });
  }

  /** Inicializa CRUD y construye form (modo edición o creación) */
  private initEndpointAndLoad(id: string | null, endpoint: string, meta?: EntityInfo) {
    this.service.init(endpoint);

    if (id) {
      this.isEditMode = true;
      this.service.getById(+id).subscribe({
        next: (data) => {
          // Si es usuario, guarda el companyId que llega en el DTO
          if (this.entityPath === 'user') {
            this.pendingCompanyId = data?.companyId ?? null;
            // Fuerza existencia del control 'company' para mostrar el select
            if (!('company' in data)) {
              data.company = null;
            }
          }

          this.buildForm(data);

          if (this.entityPath === 'media' && data?.src) {
            this.previewUrl = data.src;
          } else if (this.entityPath === 'company' && data?.logo?.src) {
            this.previewUrl = data.logo.src;
          }
        },
        error: () => {
          this.snackBar.open('No se pudo cargar el elemento', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/' + this.entityPath]);
        }
      });
    } else {
      // Modelo vacío desde metadatos o factory
      const emptyModel = meta ? this.buildEmptyModelFromMeta(meta) : DefaultModelFactory.create(this.entityPath);
      this.buildForm(emptyModel);
    }
  }

  /** Construye un modelo vacío a partir de metadatos */
  private buildEmptyModelFromMeta(meta: EntityInfo): any {
    const model: any = {};
    const attrs = meta.attributes || {};

    for (const [k, t] of Object.entries(attrs)) {
      if (this.excludedFields.includes(k)) continue;

      // Relaciones: deja en null (aparecerá select)
      if (typeof t === 'string' && this.isKnownEntityType(t)) {
        model[k] = null;
        continue;
      }

      // Colecciones
      if (t === 'List' || t === 'Set') {
        model[k] = [];
        continue;
      }

      // Escalares
      switch (t) {
        case 'Boolean':
        case 'boolean':
          model[k] = false;
          break;
        case 'Integer':
        case 'Long':
        case 'Double':
        case 'Float':
        case 'Number':
          model[k] = 0;
          break;
        case 'String':
        default:
          model[k] = this.isColorField(k) ? '#000000' : '';
      }
    }

    // Si es usuario, asegúrate de tener 'company' para que renderice el select
    if (this.entityPath === 'user' && !('company' in model)) {
      model.company = null;
    }

    return model;
  }

  private isKnownEntityType(t: string): boolean {
    // Heurística: entidades con PascalCase
    return /^[A-Z][A-Za-z0-9]*$/.test(t);
  }

  isMediaUploader(key: any) {
    return (this.entityPath === 'media' && key.key === 'src') || (this.entityPath === 'company' && key.key === 'logo');
  }

  /** Endpoint principal desde path (con excepciones para *-types) */
  private getEndpointFromPath(path: string): string {
    const special: Record<string, string> = {
      'device-types': 'devices/types',
      'media-types': 'medias/types'
    };
    if (special[path]) return special[path];
    return this.ensurePlural(path);
  }

  /** Endpoint desde nombre de entidad (PascalCase) – para foreign lists */
  private getEndpointForEntity(entityName: string): string {
    const special: Record<string, string> = {
      DeviceType: 'devices/types',
      MediaType: 'medias/types'
    };
    if (special[entityName]) return special[entityName];
    const kebab = this.toKebabCase(entityName);
    return this.ensurePlural(kebab);
  }

  buildForm(model: any) {
    // Asegura control 'company' en usuario, aunque el modelo venga sin él
    if (this.entityPath === 'user' && !('company' in model)) {
      model.company = null;
    }

    const toTimeString = (arr: [number, number] | undefined): string => {
      if (!arr || arr.length !== 2) return '';
      const [h, m] = arr;
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(h)}:${pad(m)}`;
    };

    const group: Record<string, any> = {};
    console.log("FIELDS", Object.keys(model));
    for (const key of Object.keys(model).filter(arr => !this.excludedFields.includes(arr))) {
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
        group[key] = [model[key]];
      } else if (typeof model[key] === 'boolean') {
        group[key] = [model[key] ?? false];
      } else if (typeof model[key] === 'number') {
        group[key] = [model[key] ?? 0];
      } else {
        if (this.isColorField(key)) {
          const v = model[key] ?? '';
          group[key] = [this.normalizeHexColor(v) || '#000000'];
        } else {
          group[key] = [model[key] ?? ''];
        }
      }
    }

    this.form = this.fb.group(group);
  }

  // ---------- Arrays de Advice ----------
  get visibilityRules(): FormArray {
    return this.form?.get('visibilityRules') as FormArray;
  }
  getTimeRanges(ruleIndex: number): FormArray {
    return this.visibilityRules.at(ruleIndex).get('timeRanges') as FormArray;
  }
  addVisibilityRule() {
    this.visibilityRules.push(this.fb.group({ day: [''], timeRanges: this.fb.array([]) }));
  }
  removeVisibilityRule(index: number) {
    this.visibilityRules.removeAt(index);
  }
  addTimeRange(ruleIndex: number) {
    this.getTimeRanges(ruleIndex).push(this.fb.group({ fromTime: [''], toTime: [''] }));
  }
  removeTimeRange(ruleIndex: number, rangeIndex: number) {
    this.getTimeRanges(ruleIndex).removeAt(rangeIndex);
  }

  // ---------- Guardar ----------
  save() {
    if (!this.form || this.form.invalid) return;

    // Normaliza colores
    this.colorFields.forEach(f => {
      if (this.form!.get(f)) {
        const val = this.form!.get(f)!.value;
        this.form!.get(f)!.setValue(this.normalizeHexColor(val));
      }
    });

    // Copia del valor del form
    let payload: any = { ...this.form.value };

    // User: mapear company -> companyId
    if (this.entityPath === 'user') {
      payload.companyId = payload.company?.id ?? null;
      delete payload.company;

      // Si más adelante añades selección de roles (multi-select), mapéalo aquí:
      // payload.roles = (payload.roles || []).map((r: any) => typeof r === 'string' ? r : r.role);
    }

    const req = this.isEditMode
      ? this.service.update({ id: +this.route.snapshot.paramMap.get('id')!, ...payload })
      : this.service.create(payload);

    req.subscribe(() => {
      this.snackBar.open('Elemento guardado correctamente', 'Cerrar', { duration: 2000 });
      this.router.navigate(['/' + this.entityPath]);
    });
  }

  // ---------- Render helpers ----------
  compareById = (a: any, b: any) => a?.id === b?.id;

  shouldRenderTextField(key: string): boolean {
    const isForeign = !!this.foreignEntityLists[key]; // ahora decide por metadatos
    if (isForeign) return false;
    if (this.isColorField(key)) return false;
    return !['customInterval', 'visibilityRules', 'src', 'logo'].includes(key);
  }

  shouldRenderSelectField(key: string): boolean {
    if (['src', 'logo'].includes(key)) return false;
    // Muestra select si el campo es relación según metadatos (aunque el valor sea null)
    if (this.foreignEntityLists[key]) return true;

    // Fallback: si el valor tiene forma de entidad (editar existente)
    const ctrl = this.form?.get(key);
    const val = ctrl?.value;
    return !!(val && typeof val === 'object' && 'id' in val);
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

  // ---------- Upload media/logo ----------
  uploadFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.form) return;

    const formData = new FormData();
    formData.append('file', file);

    this.uploading = true;

    // Subimos siempre contra 'medias'
    this.service.init('medias');
    this.service.createCustom('upload', formData).subscribe({
      next: res => {
        const filename = res.filename;
        if (!filename) {
          this.snackBar.open('Error: no se recibió el nombre del archivo', 'Cerrar', { duration: 3000 });
          this.uploading = false;
          this.service.init(this.getEndpointFromPath(this.entityPath));
          return;
        }
        this.pollForCompressedUrl(filename);
      },
      error: () => {
        this.snackBar.open('Error al subir el archivo', 'Cerrar', { duration: 3000 });
        this.uploading = false;
        this.service.init(this.getEndpointFromPath(this.entityPath));
      }
    });
  }

  pollForCompressedUrl(filename: string, attempts: number = 0) {
    if (attempts >= 20) {
      this.snackBar.open('Tiempo de espera agotado para compresión', 'Cerrar', { duration: 4000 });
      this.uploading = false;
      return;
    }

    this.service.init('medias');
    this.service.getCustom(`status/${filename}`).subscribe({
      next: (res) => {
        if (res.url) {
          if (this.form!.get('logo')) {
            const auxLogo = this.form!.get('logo')?.value;
            const aux: Media = auxLogo ? auxLogo : new MediaModel();
            aux.src = res.url;
            this.form!.get('logo')?.setValue(aux);
          } else {
            this.form!.get('src')?.setValue(res.url);
          }

          this.previewUrl = res.url;
          this.snackBar.open('Archivo comprimido listo', 'Cerrar', { duration: 2000 });
          this.uploading = false;
          this.service.init(this.getEndpointFromPath(this.entityPath));
        } else {
          setTimeout(() => this.pollForCompressedUrl(filename, attempts + 1), 5000);
        }
      },
      error: () => {
        this.snackBar.open('Error consultando estado', 'Cerrar', { duration: 3000 });
        this.uploading = false;
        this.service.init(this.getEndpointFromPath(this.entityPath));
      }
    });
  }

  // ---------- Color helpers ----------
  isColorField(field: string): boolean {
    return this.colorFields.includes(field);
  }

  onColorInputChange(field: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.form?.get(field)?.setValue(this.normalizeHexColor(value));
  }

  onColorTextChange(field: string, event: Event) {
    const raw = (event.target as HTMLInputElement).value;
    this.form?.get(field)?.setValue(this.normalizeHexColor(raw, false));
  }

  private normalizeHexColor(value: string | null | undefined, forceFull: boolean = true): string {
    if (!value) return forceFull ? '#000000' : '';
    let v = value.trim();
    if (!forceFull) {
      if (!v.startsWith('#')) v = '#' + v;
      return v.toUpperCase();
    }
    v = v.replace(/^#/, '');
    if (/^[0-9A-Fa-f]{3}$/.test(v)) v = v.split('').map(c => c + c).join('');
    if (/^[0-9A-Fa-f]{6}$/.test(v)) return ('#' + v).toUpperCase();
    return '#000000';
  }

  // ---------- String helpers ----------
  private toKebabCase(name: string): string {
    return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
  }
  private ensurePlural(path: string): string {
    if (path.endsWith('s')) return path;
    if (path.endsWith('y') && !/(ay|ey|iy|oy|uy)$/.test(path)) return path.slice(0, -1) + 'ies';
    return `${path}s`;
  }
  private pathToEntity(path: string): string {
    return path.split('-').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  }

  getAutocompleteAttr(field: string): string {
    switch (field) {
      case 'email': return 'email';
      case 'username': return 'username';
      case 'name': return 'given-name';
      case 'lastName': return 'family-name';
      case 'url':
      case 'legal_url': return 'url';
      case 'password': return this.isEditMode ? 'current-password' : 'new-password';
      // Campos que NO queremos que el navegador rellene
      case 'uuid':
      case 'primaryColor':
      case 'secondaryColor':
        return 'off';
      default:
        return 'on';
    }
  }

  getInputType(field: string): string {
    switch (field) {
      case 'email': return 'email';
      case 'password': return 'password';
      case 'url':
      case 'legal_url': return 'url';
      case 'interval':
      case 'width':
      case 'height':
      case 'level': return 'number';
      default: return 'text';
    }
  }

  getInputMode(field: string): string {
    switch (field) {
      case 'interval':
      case 'width':
      case 'height':
      case 'level': return 'numeric';
      default: return 'text';
    }
  }

}
