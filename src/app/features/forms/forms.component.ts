import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormsModule, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
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
import { UploadStateService } from '../../core/services/upload-state.service';
import { UploadOverlayComponent } from '../../core/components/upload-overlay/upload-overlay.component';
import { MatExpansionModule } from '@angular/material/expansion';
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
    MatExpansionModule,
    MatSnackBarModule,
    PreviewDeviceComponent,
    MatTableModule,
    SlButtonComponent,
    SlIconComponent,
    SlModuleTitleComponent,
    UploadOverlayComponent, // <app-upload-overlay>
  ]
})
export class FormsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private _route = inject(ActivatedRoute);
  public router = inject(Router);
  private service = inject(CrudService);
  private foreignService = inject(CrudService);
  private http = inject(HttpClient);
  private metadata = inject(MetadataService);
  private auth = inject(AuthenticationService);

  // Overlay uploads
  upload = inject(UploadStateService);

  form: FormGroup | null = null;
  isEditMode = false;

  mediaList: any[] = [];
  promotionList: any[] = [];
  foreignEntityLists: Record<string, any[]> = {};

  daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  excludedFields: string[] = ['id', 'devices', 'advices', 'users', 'timeRanges'];

  public entityPath = '';
  public entityClassName = '';
  previewUrl: string | null = null;

  private colorFields = ['primaryColor', 'secondaryColor'];

  // === Password ===
  hidePassword = true;
  passwordStrength = 0; // 0..4
  get passwordLevelLabel(): string {
    switch (this.passwordStrength) {
      case 1: return 'Débil';
      case 2: return 'Media';
      case 3: return 'Fuerte';
      case 4: return 'Muy fuerte';
      default: return 'Vacía';
    }
  }

  // ===================== ENDPOINTS ======================
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
  // =====================================================

  // ===== PROMOTION/LEADS =====
  promotionId: number | null = null;

  isPromotion(): boolean { return this.entityPath === 'promotion'; }

  leadLimitOptions = [
    { value: 'NO_LIMIT', label: 'Sin límite' },
    { value: 'ONE_PER_24H', label: 'Uno cada 24 h' },
    { value: 'ONE_PER_PERSON', label: 'Uno por persona' },
  ];

  leadIdentifierOptions = [
    { value: 'EMAIL', label: 'Email' },
    { value: 'PHONE', label: 'Teléfono' },
  ];

  promotionEnumFields = new Set(['leadLimitType', 'leadIdentifierType']);

  leads: Array<{
    id: number; promotionId: number; firstName?: string; lastName?: string;
    email?: string; phone?: string; birthDate?: string;
    acceptedPrivacyAt?: string; acceptedTermsAt?: string;
    createdAt: string;
  }> = [];
  loadingLeads = false;

  // Filtros de rango (por defecto últimos 30 días)
  leadsFrom = ''; // 'YYYY-MM-DD'
  leadsTo = '';   // 'YYYY-MM-DD'

  leadSummary: { promotionId: number; totalLeads: number; uniqueIdentifiers: number; leadsByDay: Record<string, number> } | null = null;

  // Lead de prueba
  testIdentifier = '';
  generatingLead = false;

  isEmailIdentifier(): boolean {
    return (this.form?.get('leadIdentifierType')?.value || 'EMAIL') === 'EMAIL';
  }

  private today_yyyy_mm_dd(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  private daysAgo_yyyy_mm_dd(days: number): string {
    const d = new Date(); d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }

  async ngOnInit(): Promise<void> {
    const idStr = this._route.snapshot.paramMap.get('id');
    this.promotionId = idStr ? +idStr : null;

    const pathParts = this.router.url.split('/').filter(Boolean);
    this.entityPath = pathParts[0] || '';
    this.entityClassName = this.pathToEntity(this.entityPath);

    // ROLES (user)
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

    // Metadatos + datos
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
        this.initEndpointAndLoad(idStr, endpoint, currentMeta);
      },
      error: () => {
        const endpoint = this.getEndpointFromPath(this.entityPath);
        this.initEndpointAndLoad(idStr, endpoint);
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
          } else if (this.entityPath === 'advice' && data?.media?.src) {
            this.previewUrl = data.media.src;
          }

          // Si es promoción, cargar leads/summary por defecto (últimos 30 días)
          if (this.isPromotion()) {
            this.leadsTo = this.today_yyyy_mm_dd();
            this.leadsFrom = this.daysAgo_yyyy_mm_dd(30);
            if (this.promotionId) {
              this.fetchLeads(this.promotionId);
              this.fetchLeadSummary(this.promotionId);
            }
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

  // ===================== ENDPOINT HELPERS ======================
  private getEndpointFromPath(path: string): string {
    if (this.PATH_TO_ENDPOINT[path]) return this.PATH_TO_ENDPOINT[path];
    return this.ensurePlural(path);
  }
  private getEndpointForEntity(entityName: string): string {
    if (this.ENTITY_TO_ENDPOINT[entityName]) return this.ENTITY_TO_ENDPOINT[entityName];
    const kebab = this.toKebabCase(entityName);
    return this.ensurePlural(kebab);
  }
  // =============================================================

  // --------- TIME HELPERS ---------
  private toHHmm(v?: string | null): string {
    if (!v) return '';
    const s = String(v).trim();
    if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 5);
    if (/^\d{2}:\d{2}$/.test(s)) return s;
    return '';
  }
  private toHHmmss(v?: string | null): string | null {
    if (!v) return null;
    const s = String(v).trim();
    if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
    if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
    return null;
  }

  // --------- DATE HELPERS (YYYY-MM-DD) ---------
  private toDateInput(v: any): string {
    if (!v) return '';
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
    if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
    const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  }
  private toDateOnlyString(v: any): string | null {
    if (!v) return null;
    if (typeof v === 'string') {
      const s = v.trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    }
    if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
    return null;
  }

  // --------- Form ---------

  isMediaUploader(key: any) {
    return (this.entityPath === 'media' && key.key === 'src')
      || (this.entityPath === 'company' && key.key === 'logo')
      || (this.entityPath === 'user' && key.key === 'profileImage')
      || (this.entityPath === 'advice' && key.key === 'media');
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
    const group: Record<string, any> = {};
    model = this.sanitizeModelWithIdRelations(model);

    for (const key of Object.keys(model).filter(arr => !this.excludedFields.includes(arr))) {
      if (key === 'id') continue;
      if (key === 'password') continue;

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
              startDate: [this.toDateInput(rule.startDate)],
              endDate: [this.toDateInput(rule.endDate)],
              timeRanges: this.fb.array(
                (rule.timeRanges || []).map((t: any) =>
                  this.fb.group({
                    fromTime: [this.toHHmm(t.fromTime)],
                    toTime: [this.toHHmm(t.toTime)]
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

    // Asegurar control para Promotion (en caso de alta)
    if (this.isPromotion()) {
      if (!('leadLimitType' in group)) group['leadLimitType'] = ['NO_LIMIT'];
      if (!('leadIdentifierType' in group)) group['leadIdentifierType'] = ['EMAIL'];
    }

    // Asegurar FormArray de advice aunque no venga
    if (this.entityPath === 'advice' && !('visibilityRules' in group)) {
      group['visibilityRules'] = this.fb.array([]);
    }

    this.form = this.fb.group(group);
    this.rehydrateRoles();

    if (this.entityPath === 'user') {
      this.form.addControl('password', this.fb.control('', this.passwordValidator.bind(this)));
    }

    if (this.entityPath === 'advice') {
      this.ensureAllDaysVisibility();
      this.visibilityRules.controls.forEach((_, idx) => this.normalizeAndMergeRanges(idx));
    }

    // Defaults explícitos para Promotion en formulario recién creado
    if (this.isPromotion()) {
      if (!this.form.get('leadLimitType')) this.form.addControl('leadLimitType', this.fb.control('NO_LIMIT'));
      if (!this.form.get('leadIdentifierType')) this.form.addControl('leadIdentifierType', this.fb.control('EMAIL'));
    }
  }

  // ---------- Arrays de Advice ----------
  get visibilityRules(): FormArray {
    return this.form?.get('visibilityRules') as FormArray;
  }
  getTimeRanges(ruleIndex: number): FormArray {
    return this.visibilityRules.at(ruleIndex).get('timeRanges') as FormArray;
  }

  addRange(dayIdx: number) {
    this.getTimeRanges(dayIdx).push(this.fb.group({ fromTime: [''], toTime: [''] }));
  }
  removeRange(dayIdx: number, rangeIdx: number) {
    this.getTimeRanges(dayIdx).removeAt(rangeIdx);
  }

  copyBuffer: { fromTime: string; toTime: string }[] = [];
  copyDay(dayIdx: number) {
    this.copyBuffer = this.getTimeRanges(dayIdx).controls.map(c => ({
      fromTime: c.get('fromTime')?.value,
      toTime: c.get('toTime')?.value
    }));
  }
  pasteDay(dayIdx: number) {
    if (!this.copyBuffer?.length) return;
    const fa = this.getTimeRanges(dayIdx);
    while (fa.length) fa.removeAt(0);
    this.copyBuffer.forEach(r => fa.push(this.fb.group({ fromTime: [r.fromTime], toTime: [r.toTime] })));
    this.normalizeAndMergeRanges(dayIdx);
  }
  clearDay(dayIdx: number) {
    const fa = this.getTimeRanges(dayIdx);
    while (fa.length) fa.removeAt(0);
  }
  setDay24h(dayIdx: number) {
    const fa = this.getTimeRanges(dayIdx);
    while (fa.length) fa.removeAt(0);
    fa.push(this.fb.group({ fromTime: ['00:00'], toTime: ['23:59'] }));
  }

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
    if (!this.form || this.form.invalid || this.upload.isUploading()) return;

    this.colorFields.forEach(f => {
      if (this.form!.get(f)) {
        const val = this.form!.get(f)!.value;
        this.form!.get(f)!.setValue(this.normalizeHexColor(val));
      }
    });

    const formValue = this.form.value;

    if (this.entityPath === 'user' && (!formValue.password || !String(formValue.password).trim())) {
      delete formValue.password;
    }

    const payload: any = this.buildPayloadForBackend(this.entityPath, formValue);

    const req = this.isEditMode
      ? this.service.update({ id: +this._route.snapshot.paramMap.get('id')!, ...payload })
      : this.service.create(payload);

    req.subscribe({
      next: () => {
        if (this.entityPath === 'user' && this.isEditMode) {
          const editedId = +this._route.snapshot.paramMap.get('id')!;
          const me = this.auth.getUser();
          const myId = me?.id;

          if (myId && editedId === myId) {
            this.auth.refreshMe().subscribe({
              next: () => {
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
                this.router.navigate(['/' + this.entityPath]);
              }
            });
            return;
          }
        }

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
    if (key === 'password') return false;
    if (/Id$/.test(key)) return false;
    if (key === 'roles') return false;
    if (this.isPromotion() && this.promotionEnumFields.has(key)) return false;
    const isForeign = !!this.foreignEntityLists[key];
    if (isForeign) return false;
    if (this.isColorField(key)) return false;
    return !['customInterval', 'visibilityRules', 'src', 'logo', 'profileImage'].includes(key);
  }

  shouldRenderSelectField(key: string): boolean {
    if (key === 'password') return false;
    if (['src', 'logo', 'profileImage'].includes(key)) return false;
    if (this.entityPath === 'advice' && key === 'media') return false;
    if (this.entityPath === 'user' && key === 'roles') return false;
    if (this.isPromotion() && this.promotionEnumFields.has(key)) return false; // UI custom
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

    const localId = crypto.randomUUID();
    this.upload.start(localId, file.name);

    const formData = new FormData();
    formData.append('file', file);

    this.service.init('medias');
    this.service.createCustom('upload', formData).subscribe({
      next: res => {
        const filename = res?.filename;
        if (!filename) {
          this.upload.fail(localId, 'Respuesta inválida');
          this.snackBar.open('Error: no se recibió el nombre del archivo', 'Cerrar', { duration: 3000 });
          this.service.init(this.getEndpointFromPath(this.entityPath));
          this.upload.clearIfAllDone();
          return;
        }

        this.upload.update(localId, 100);

        this.pollForCompressedUrl(filename, localId);
      },
      error: () => {
        this.upload.fail(localId, 'Error al subir');
        this.snackBar.open('Error al subir el archivo', 'Cerrar', { duration: 3000 });
        this.service.init(this.getEndpointFromPath(this.entityPath));
        this.upload.clearIfAllDone();
      }
    });
  }

  private pollForCompressedUrl(filename: string, localId: string, attempts: number = 0) {
    if (attempts >= 20) {
      this.upload.fail(localId, 'Tiempo de espera agotado');
      this.snackBar.open('Tiempo de espera agotado para compresión', 'Cerrar', { duration: 4000 });
      this.service.init(this.getEndpointFromPath(this.entityPath));
      this.upload.clearIfAllDone();
      return;
    }

    this.service.init('medias');
    this.service.getCustom(`status/${filename}`).subscribe({
      next: (res) => {
        if (res?.url) {
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
          } else if (this.form!.get('media')) {
            const current = this.form!.get('media')?.value;
            const aux: Media = current ? current : new MediaModel();
            aux.src = res.url;
            this.form!.get('media')?.setValue(aux);
          } else {
            this.form!.get('src')?.setValue(res.url);
          }

          this.previewUrl = res.url;
          this.snackBar.open('Archivo comprimido listo', 'Cerrar', { duration: 2000 });
          this.service.init(this.getEndpointFromPath(this.entityPath));

          this.upload.finish(localId);
          this.upload.clearIfAllDone();
        } else {
          setTimeout(() => this.pollForCompressedUrl(filename, localId, attempts + 1), 5000);
        }
      },
      error: () => {
        this.upload.fail(localId, 'Error consultando estado');
        this.snackBar.open('Error consultando estado', 'Cerrar', { duration: 3000 });
        this.service.init(this.getEndpointFromPath(this.entityPath));
        this.upload.clearIfAllDone();
      }
    });
  }

  // ----------------------- Color -----------------------
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

  // ----------------------- Strings/Rutas -----------------------
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

  // ---------- Payload backend ----------
  private buildPayloadForBackend(entityPath: string, val: any): any {
    const payload = { ...val };

    // ===== USER =====
    if (entityPath === 'user') {
      const c = payload.company;
      if (c != null) {
        const id = (typeof c === 'number' || typeof c === 'string') ? Number(c) : c?.id;
        if (!Number.isNaN(id)) payload.companyId = id;
      }
      delete payload.company;

      const p = payload.profileImage;
      if (p != null) {
        const pid = (typeof p === 'number' || typeof p === 'string') ? Number(p) : p?.id;
        if (!Number.isNaN(pid)) payload.profileImageId = pid;
      }
      delete payload.profileImage;

      if (Array.isArray(payload.roles)) {
        payload.roles = payload.roles.map((r: any) => r?.role ?? r);
      } else {
        payload.roles = [];
      }

      const pwd = (val.password ?? '').toString().trim();
      if (pwd) payload.password = pwd; else delete payload.password;
    }

    // ===== ADVICE =====
    if (entityPath === 'advice') {
      if (Array.isArray(payload.visibilityRules)) {
        payload.visibilityRules = payload.visibilityRules.map((rule: any) => ({
          day: rule.day,
          startDate: this.toDateOnlyString(rule.startDate),
          endDate: this.toDateOnlyString(rule.endDate),
          timeRanges: Array.isArray(rule.timeRanges) ? rule.timeRanges
            .filter((tr: any) => this.toHHmmss(tr.fromTime) && this.toHHmmss(tr.toTime))
            .map((tr: any) => ({
              fromTime: this.toHHmmss(tr.fromTime),
              toTime: this.toHHmmss(tr.toTime)
            })) : []
        }));
      }

      const m = payload.media;
      if (m == null) {
        payload.media = null;
      } else if (typeof m === 'number' || typeof m === 'string') {
        const mid = Number(m);
        payload.media = Number.isFinite(mid) && mid > 0 ? { id: mid } : null;
      } else if (typeof m === 'object') {
        if (m.id != null) {
          const mid = Number(m.id);
          payload.media = Number.isFinite(mid) && mid > 0 ? { id: mid } : null;
        } else if (m.src) {
          payload.media = { src: String(m.src) };
        } else {
          payload.media = null;
        }
      }

      const pr = payload.promotion;
      if (pr == null || pr === '' || pr === 0 || pr === '0') {
        payload.promotion = null;
      } else if (typeof pr === 'number' || typeof pr === 'string') {
        const pid = Number(pr);
        payload.promotion = Number.isFinite(pid) && pid > 0 ? { id: pid } : null;
      } else if (typeof pr === 'object' && pr.id != null) {
        const pid = Number(pr.id);
        payload.promotion = Number.isFinite(pid) && pid > 0 ? { id: pid } : null;
      } else {
        payload.promotion = null;
      }

      const co = payload.company;
      if (co == null || co === '' || co === 0 || co === '0') {
        payload.company = null;
      } else if (typeof co === 'number' || typeof co === 'string') {
        const cid = Number(co);
        payload.company = Number.isFinite(cid) && cid > 0 ? { id: cid } : null;
      } else if (typeof co === 'object' && co.id != null) {
        const cid = Number(co.id);
        payload.company = Number.isFinite(cid) && cid > 0 ? { id: cid } : null;
      } else {
        payload.company = null;
      }

      if (payload.customInterval === '') payload.customInterval = null;
      if (payload.interval === '') payload.interval = null;

      Object.keys(payload).forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });
    }

    // ===== PROMOTION =====
    if (entityPath === 'promotion') {
      const ll = (val.leadLimitType || '').toString().trim().toUpperCase();
      const li = (val.leadIdentifierType || '').toString().trim().toUpperCase();
      payload.leadLimitType = ['NO_LIMIT', 'ONE_PER_24H', 'ONE_PER_PERSON'].includes(ll) ? ll : 'NO_LIMIT';
      payload.leadIdentifierType = ['EMAIL', 'PHONE'].includes(li) ? li : 'EMAIL';
    }

    return payload;
  }

  // ======= Password strength =======
  onPasswordInput() {
    const pwd = this.form?.get('password')?.value || '';
    this.passwordStrength = this.calculatePasswordStrength(pwd);
    this.form?.get('password')?.updateValueAndValidity({ emitEvent: false });
  }

  private calculatePasswordStrength(pwd: string): number {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
    const variety = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
    if (variety >= 2) score++;
    if (variety >= 3) score++;
    return Math.max(0, Math.min(4, score));
  }

  private passwordValidator(control: AbstractControl): ValidationErrors | null {
    const val: string = (control.value || '').trim();
    if (!val) return null;
    const strength = this.calculatePasswordStrength(val);
    return (strength >= 2) ? null : { weakPassword: true };
  }

  // ======= Tiempo y solapes (Advice) =======
  private isCompleteTime(t: string): boolean {
    return /^\d{2}:\d{2}$/.test(t || '');
  }

  private isValidRangeStr(from: string, to: string): boolean {
    if (!this.isCompleteTime(from) || !this.isCompleteTime(to)) return false;
    const f = this.timeToMinutes(from);
    const t = this.timeToMinutes(to);
    return f >= 0 && t >= 0 && f < t;
  }

  private hasIncompleteOrInvalidRanges(dayIdx: number): boolean {
    const fa = this.getTimeRanges(dayIdx);
    return fa.controls.some(g => {
      const from = g.get('fromTime')?.value || '';
      const to = g.get('toTime')?.value || '';
      return !this.isValidRangeStr(from, to);
    });
  }

  onTimeFieldBlur(dayIdx: number) {
    if (this.hasIncompleteOrInvalidRanges(dayIdx)) return;
    this.normalizeAndMergeRanges(dayIdx);
  }

  private timeToMinutes(t: string): number {
    if (!t) return -1;
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  }
  private minutesToTime(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}`;
  }

  private normalizeAndMergeRanges(dayIdx: number) {
    const rangesFA = this.getTimeRanges(dayIdx);
    const ranges = rangesFA.controls
      .map(g => ({
        from: this.timeToMinutes(g.get('fromTime')?.value),
        to: this.timeToMinutes(g.get('toTime')?.value)
      }))
      .filter(r => r.from >= 0 && r.to >= 0 && r.from < r.to)
      .sort((a, b) => a.from - b.from);

    const merged: { from: number; to: number }[] = [];
    for (const r of ranges) {
      const last = merged[merged.length - 1];
      if (!last || r.from > last.to) merged.push({ ...r });
      else last.to = Math.max(last.to, r.to);
    }

    while (rangesFA.length) rangesFA.removeAt(0, { emitEvent: false });
    merged.forEach(r => rangesFA.push(this.fb.group({
      fromTime: [this.minutesToTime(r.from)],
      toTime: [this.minutesToTime(r.to)]
    }), { emitEvent: false }));
  }

  private ensureAllDaysVisibility() {
    if (this.entityPath !== 'advice') return;
    const order = this.daysOfWeek;
    const fa = this.visibilityRules;
    const existingDays = new Set(fa.controls.map(c => c.get('day')?.value));

    order.forEach(d => {
      if (!existingDays.has(d)) {
        fa.push(this.fb.group({
          day: [d],
          startDate: [''],
          endDate: [''],
          timeRanges: this.fb.array([])
        }));
      }
    });

    const sorted = [...fa.controls].sort((a, b) =>
      order.indexOf(a.get('day')?.value) - order.indexOf(b.get('day')?.value)
    );
    while (fa.length) fa.removeAt(0);
    sorted.forEach(c => fa.push(c));
  }

  // ====== Promotion: Leads/Export/Resumen ======
  private promotionEndpoint(id: number, path: string = ''): string {
    const base = this.getEndpointFromPath('promotion'); // 'promotions'
    return path ? `${base}/${id}/${path}` : `${base}/${id}`;
  }

  fetchLeads(promotionId: number) {
    this.loadingLeads = true;
    this.service.init(this.getEndpointFromPath('promotion'));
    this.service.getCustom(`${promotionId}/leads`).subscribe({
      next: (data: any[]) => {
        const from = this.leadsFrom ? new Date(this.leadsFrom + 'T00:00:00') : null;
        const to = this.leadsTo ? new Date(this.leadsTo + 'T23:59:59') : null;

        this.leads = (data ?? []).filter(l => {
          const raw = l.createdAt ?? l.created_at ?? l.created_at_z ?? l.created_at_utc ?? l.created_at_iso ?? l.created_at_local ?? '';
          const dt = raw ? new Date(raw) : null;
          if (!dt || isNaN(dt.getTime())) return true;
          if (from && dt < from) return false;
          if (to && dt > to) return false;
          return true;
        });
        this.loadingLeads = false;
      },
      error: () => {
        this.loadingLeads = false;
        this.snackBar.open('No se pudieron cargar los leads', 'Cerrar', { duration: 2500 });
      }
    });
  }

  fetchLeadSummary(promotionId: number) {
    const qs: string[] = [];
    if (this.leadsFrom) qs.push(`from=${encodeURIComponent(this.leadsFrom)}`);
    if (this.leadsTo) qs.push(`to=${encodeURIComponent(this.leadsTo)}`);
    const url = `${this.promotionEndpoint(promotionId, 'leads/summary')}${qs.length ? '?' + qs.join('&') : ''}`;

    this.service.init(this.getEndpointFromPath('promotion'));
    this.service.getCustom(url).subscribe({
      next: (data) => this.leadSummary = data,
      error: () => this.leadSummary = null
    });
  }

  exportLeadsCsv(promotionId: number) {
    const qs: string[] = [];
    if (this.leadsFrom) qs.push(`from=${encodeURIComponent(this.leadsFrom)}`);
    if (this.leadsTo) qs.push(`to=${encodeURIComponent(this.leadsTo)}`);

    this.service.init('promotions');
    this.service.getCustom(`${this.promotionId}/leads/export.csv${qs.length ? '?' + qs.join('&') : ''}`, {
      responseType: 'blob',                           // 👈 clave
      headers: { Accept: 'text/csv' }                 // (opcional) ayuda a proxies/interceptores
    }).subscribe({
      next: (csv: string) => {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `promotion-${promotionId}-leads.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
        this.snackBar.open('CSV exportado', 'Cerrar', { duration: 1500 });
      },
      error: (e: any) => {
        console.log("Error exportando CSV", e);
        this.snackBar.open('Error exportando CSV', 'Cerrar', { duration: 2500 })
      }
    });
  }

  applyLeadFilters() {
    if (!this.promotionId) return;
    this.fetchLeads(this.promotionId);
    this.fetchLeadSummary(this.promotionId);
  }

  // === Lead de prueba ===
  generateTestLead() {
    if (!this.promotionId) return;
    this.generatingLead = true;

    const body: any = {};
    const idType = this.isEmailIdentifier() ? 'email' : 'phone';
    if (this.testIdentifier && this.testIdentifier.trim()) {
      body[idType] = this.testIdentifier.trim();
    }

    this.service.init('promotions');
    this.service.createCustom(`${this.promotionId}/leads/test`, body).subscribe({
      next: () => {
        this.snackBar.open('Lead de prueba creado', 'Cerrar', { duration: 1500 });
        this.fetchLeads(this.promotionId!);
        this.fetchLeadSummary(this.promotionId!);
        this.generatingLead = false;
      },
      error: (err) => {
        const msg = err?.error?.error || 'No se pudo crear el lead';
        this.snackBar.open(msg, 'Cerrar', { duration: 3000 });
        this.generatingLead = false;
      }
    });
  }
  get leadCount(): number {
    return (this.leadSummary?.totalLeads ?? this.leads?.length ?? 0);
  }
}
