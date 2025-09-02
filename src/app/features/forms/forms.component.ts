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
import { PreviewDeviceComponent } from "../preview-device/preview-device.component";
import { DefaultModelFactory } from '../../core/models/default-model.factory';
import {
  SlButtonComponent,
  SlIconComponent,
  SlModuleTitleComponent
} from 'sl-dev-components';
import { Media, MediaModel } from '../../core/models/media.model';
import { MetadataService, EntityInfo } from '../../core/services/meta-data.service';
import { AuthenticationService } from '../../core/services/authentication/authentication.service';


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
  private auth = inject(AuthenticationService);

  form: FormGroup | null = null;
  isEditMode = false;

  mediaList: any[] = [];
  promotionList: any[] = [];
  foreignEntityLists: Record<string, any[]> = {};

  daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  // Ojo: 'roles' YA NO está excluido para poder pintarlo
  excludedFields: string[] = ['id', 'devices', 'advices', 'users', 'timeRanges'];

  public entityPath = '';
  public entityClassName = '';
  uploading = false;
  previewUrl: string | null = null;

  private colorFields = ['primaryColor', 'secondaryColor'];

  // ===================== MAPEOS CANÓNICOS ======================
  private readonly PATH_TO_ENDPOINT: Record<string, string> = {
    'device-types': 'devices/types',
    'media-types': 'medias/types',
    'device': 'devices',
    'media': 'medias',
    'promotion': 'promotions',
    'company': 'companies',
    'advice': 'advices',
    'user': 'users',
    'role': 'roles',
    'app-version': 'app-versions'
  };

  private readonly ENTITY_TO_ENDPOINT: Record<string, string> = {
    DeviceType: 'devices/types',
    MediaType: 'medias/types',
    Device: 'devices',
    Media: 'medias',
    Promotion: 'promotions',
    Company: 'companies',
    Advice: 'advices',
    User: 'users',
    Role: 'roles',
    AppVersion: 'app-versions'
  };
  // ============================================================

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    const pathParts = this.router.url.split('/').filter(Boolean);
    this.entityPath = pathParts[0] || '';
    this.entityClassName = this.pathToEntity(this.entityPath);

    // 1) Carga ROLES asignables si estamos en 'user'
    if (this.entityPath === 'user') {
      this.foreignService.init('roles/assignable');
      this.foreignService.getAll().subscribe({
        next: data => {
          this.foreignEntityLists['roles'] = data ?? [];
          this.rehydrateRoles();
        },
        error: () => this.foreignEntityLists['roles'] = []
      });
    }

    // 2) Carga metadatos y datos del recurso
    const withCount = false;
    this.metadata.getEntities(withCount).subscribe({
      next: (entities) => {
        const allEntityNames = new Set(entities.map(e => e.entityName));
        const currentMeta = entities.find(e => e.entityName === this.entityClassName);

        if (currentMeta?.attributes) {
          const foreignAttrs = Object.entries(currentMeta.attributes)
            .filter(([_, type]) => typeof type === 'string' && allEntityNames.has(type as string))
            .map(([attr, type]) => ({ attr, targetEntity: type as string }));

          foreignAttrs.forEach(({ attr, targetEntity }) => {
            const endpoint = this.getEndpointForEntity(targetEntity);
            this.foreignService.init(endpoint);
            this.foreignService.getAll().subscribe({
              next: data => {
                this.foreignEntityLists[attr] = data ?? [];

                // Rehidrata control si contenía id primitivo
                if (this.form?.get(attr)) {
                  const ctrl = this.form.get(attr)!;
                  const v = ctrl.value;
                  const idVal = (typeof v === 'number' || typeof v === 'string') ? v : v?.id;
                  if (idVal != null) {
                    const found = (this.foreignEntityLists[attr] ?? []).find((o: any) => o?.id == idVal);
                    if (found) ctrl.setValue(found, { emitEvent: false });
                  }
                }

                if (this.entityPath === 'advice') {
                  if (attr === 'media') this.mediaList = this.foreignEntityLists[attr];
                  if (attr === 'promotion') this.promotionList = this.foreignEntityLists[attr];
                }
              },
              error: () => this.foreignEntityLists[attr] = []
            });
          });
        }

        const endpoint = this.getEndpointFromPath(this.entityPath);
        this.initEndpointAndLoad(id, endpoint, currentMeta);
      },
      error: () => {
        const endpoint = this.getEndpointFromPath(this.entityPath);
        this.initEndpointAndLoad(id, endpoint);
      }
    });
  }

  private initEndpointAndLoad(id: string | null, endpoint: string, meta?: EntityInfo) {
    this.service.init(endpoint);

    if (id) {
      this.isEditMode = true;
      this.service.getById(+id).subscribe({
        next: (data) => {
          this.buildForm(data);
          if (this.entityPath === 'media' && data?.src) {
            this.previewUrl = data.src;
          } else if (this.entityPath === 'company' && data?.logo?.src) {
            this.previewUrl = data.logo.src;
          } else if (this.entityPath === 'user' && data?.profileImage?.src) {
            this.previewUrl = data.profileImage.src;
          }
        },
        error: () => {
          this.snackBar.open('No se pudo cargar el elemento', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/' + this.entityPath]);
        }
      });
    } else {
      const emptyModel = meta ? this.buildEmptyModelFromMeta(meta) : DefaultModelFactory.create(this.entityPath);
      this.buildForm(emptyModel);
    }
  }

  private buildEmptyModelFromMeta(meta: EntityInfo): any {
    const model: any = {};
    for (const [k, t] of Object.entries(meta.attributes || {})) {
      if (this.excludedFields.includes(k)) continue;

      if (typeof t === 'string' && this.isKnownEntityType(t)) {
        model[k] = null;
        continue;
      }
      if (t === 'List' || t === 'Set') {
        model[k] = [];
        continue;
      }
      switch (t) {
        case 'Boolean': case 'boolean': model[k] = false; break;
        case 'Integer': case 'Long': case 'Double': case 'Float': case 'Number': model[k] = 0; break;
        case 'String': default:
          model[k] = this.isColorField(k) ? '#000000' : '';
      }
    }
    return model;
  }

  private isKnownEntityType(t: string): boolean {
    return /^[A-Z][A-Za-z0-9]*$/.test(t);
  }

  // ===================== RESOLUCIÓN DE ENDPOINTS ======================
  private getEndpointFromPath(path: string): string {
    if (this.PATH_TO_ENDPOINT[path]) return this.PATH_TO_ENDPOINT[path];
    return this.ensurePlural(path);
  }
  private getEndpointForEntity(entityName: string): string {
    if (this.ENTITY_TO_ENDPOINT[entityName]) return this.ENTITY_TO_ENDPOINT[entityName];
    const kebab = this.toKebabCase(entityName);
    return this.ensurePlural(kebab);
  }
  // ====================================================================

  // --------- Form ---------

  isMediaUploader(key: any) {
    return (this.entityPath === 'media' && key.key === 'src')
      || (this.entityPath === 'company' && key.key === 'logo')
      || (this.entityPath === 'user' && key.key === 'profileImage');
  }

  private sanitizeModelWithIdRelations(model: any): any {
    if (!model || typeof model !== 'object') return model;
    const clone: any = { ...model };
    for (const k of Object.keys(model)) {
      if (/Id$/.test(k)) {
        const base = k.slice(0, -2);
        if (!(base in clone)) {
          clone[base] = model[k];
        }
        delete clone[k];
      }
    }
    return clone;
  }

  buildForm(model: any) {
    const toTimeString = (arr: [number, number] | undefined): string => {
      if (!arr || arr.length !== 2) return '';
      const [h, m] = arr;
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(h)}:${pad(m)}`;
    };

    const group: Record<string, any> = {};
    model = this.sanitizeModelWithIdRelations(model);

    for (const key of Object.keys(model).filter(arr => !this.excludedFields.includes(arr))) {
      if (key === 'id') continue;

      // roles: acepta array de strings u objetos
      if (key === 'roles') {
        const arr = Array.isArray(model.roles) ? model.roles : [];
        group[key] = [arr];
        continue;
      }

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
        continue;
      }

      if (this.foreignEntityLists[key] && (typeof model[key] === 'number' || typeof model[key] === 'string')) {
        const found = (this.foreignEntityLists[key] ?? []).find((o: any) => o?.id == model[key]);
        group[key] = [found ?? model[key] ?? null];
        continue;
      }

      if (typeof model[key] === 'object' && model[key] !== null && 'id' in model[key]) {
        group[key] = [model[key]];
        continue;
      }

      if (typeof model[key] === 'boolean') {
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
    this.rehydrateRoles();
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

  /** Rehidrata el control 'roles' con objetos de la lista asignable */
  private rehydrateRoles() {
    if (!this.form) return;
    const ctrl = this.form.get('roles');
    if (!ctrl) return;

    const current = ctrl.value;
    const options = this.foreignEntityLists['roles'] ?? [];
    if (!Array.isArray(current) || options.length === 0) return;

    const mapped = current.map((r: any) => {
      const roleName = typeof r === 'string' ? r : r?.role;
      const roleId = typeof r === 'object' ? r?.id : null;
      let found: any = null;
      if (roleId != null) found = options.find((o: any) => o?.id == roleId);
      if (!found && roleName) found = options.find((o: any) => o?.role === roleName);
      return found ?? r;
    });

    ctrl.setValue(mapped, { emitEvent: false });
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

    const formValue = this.form.value;
    const payload: any = this.buildPayloadForBackend(this.entityPath, formValue);

    const req = this.isEditMode
      ? this.service.update({ id: +this.route.snapshot.paramMap.get('id')!, ...payload })
      : this.service.create(payload);

    req.subscribe({
      next: (saved: any) => {
        // Si estoy editando MI usuario, refrescar /auth/me (y opcionalmente token)
        if (this.entityPath === 'user' && this.isEditMode) {
          const editedId = +this.route.snapshot.paramMap.get('id')!;
          const me = this.auth.getUser();
          const myId = me?.id;

          if (myId && editedId === myId) {
            this.auth.refreshMe().subscribe({
              next: () => {
                // Opcional: refrescar token si tu UI depende de claims del JWT (roles, etc.)
                this.auth.refreshToken().subscribe({
                  next: () => {
                    this.snackBar.open('Tu sesión se ha actualizado', 'Cerrar', { duration: 2000 });
                    this.router.navigate(['/' + this.entityPath]);
                  },
                  error: () => {
                    this.snackBar.open('Datos actualizados (token sin refrescar).', 'Cerrar', { duration: 2500 });
                    this.router.navigate(['/' + this.entityPath]);
                  }
                });
              },
              error: () => {
                // Aunque falle /auth/me, navegamos igualmente
                this.router.navigate(['/' + this.entityPath]);
              }
            });
            return; // Evita doble navegación
          }
        }

        // Flujo normal si no edité mi usuario
        this.snackBar.open('Elemento guardado correctamente', 'Cerrar', { duration: 2000 });
        this.router.navigate(['/' + this.entityPath]);
      },
      error: () => {
        this.snackBar.open('Error al guardar', 'Cerrar', { duration: 3000 });
      }
    });
  }

  // ---------- Render helpers ----------
  compareById = (a: any, b: any) => (a?.id ?? a) === (b?.id ?? b);

  shouldRenderTextField(key: string): boolean {
    if (/Id$/.test(key)) return false;
    if (key === 'roles') return false;
    const isForeign = !!this.foreignEntityLists[key];
    if (isForeign) return false;
    if (this.isColorField(key)) return false;
    return !['customInterval', 'visibilityRules', 'src', 'logo', 'profileImage'].includes(key);
  }

  shouldRenderSelectField(key: string): boolean {
    if (['src', 'logo', 'profileImage'].includes(key)) return false;
    if (this.entityPath === 'user' && key === 'roles') return false;
    return !!this.foreignEntityLists[key];
  }

  getOptionLabel(option: any, key: string): string {
    if (!option) return '';
    if (key === 'roles' || option.role) return `${option.role} (nivel ${option.level ?? '-'})`;
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

  // ---------- Upload media/logo/profileImage ----------
  uploadFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.form) return;

    const formData = new FormData();
    formData.append('file', file);

    this.uploading = true;

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
          } else if (this.form!.get('profileImage')) {
            const current = this.form!.get('profileImage')?.value;
            const aux: Media = current ? current : new MediaModel();
            aux.src = res.url;
            this.form!.get('profileImage')?.setValue(aux);
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

  // ----------------------- Helpers de Color -----------------------
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

  // ----------------------- Helpers de string/rutas -----------------------
  private toKebabCase(name: string): string {
    return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
  private ensurePlural(path: string): string {
    if (path.endsWith('s')) return path;
    if (path.endsWith('y') && !/(ay|ey|iy|oy|uy)$/.test(path)) return path.slice(0, -1) + 'ies';
    return `${path}s`;
  }
  private pathToEntity(path: string): string {
    return path.split('-').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  }

  // ---------- Mapeo payload backend ----------
  private buildPayloadForBackend(entityPath: string, val: any): any {
    const payload = { ...val };

    if (entityPath === 'user') {
      const c = payload.company;
      if (c != null) {
        const id = (typeof c === 'number' || typeof c === 'string') ? Number(c) : c?.id;
        if (id != null) payload.companyId = id;
      }
      delete payload.company;

      const p = payload.profileImage;
      if (p != null) {
        const pid = (typeof p === 'number' || typeof p === 'string') ? Number(p) : p?.id;
        if (pid != null) payload.profileImageId = pid;
      }
      delete payload.profileImage;

      if (Array.isArray(payload.roles)) {
        payload.roles = payload.roles.map((r: any) => r?.role ?? r);
      } else {
        payload.roles = [];
      }
    }

    return payload;
  }
}
