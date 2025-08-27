import { Component, WritableSignal, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CrudService } from '../../core/services/crud.service';
import { MetadataService, EntityInfo } from '../../core/services/meta-data.service';

@Component({
  standalone: true,
  selector: 'app-lists',
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatCardModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './lists.component.html',
  styleUrl: './lists.component.scss'
})
export class ListsComponent implements OnDestroy {
  // Servicios
  private service = inject(CrudService);            // CRUD principal
  private foreignService = inject(CrudService);     // CRUD auxiliar para *Id -> label
  private presenceService = inject(CrudService);    // Para /ws/status
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  public  router = inject(Router);
  private route = inject(ActivatedRoute);
  private metadata = inject(MetadataService);

  // Estado general
  titleList = '';
  isMedia = false;
  isDevice = false;              // ← para mostrar columna de estado
  activeUiPath = '';             // path UI actual (p. ej. 'device-types')

  // Datos / columnas
  items: WritableSignal<any[]> = signal([]);
  properties: string[] = [];
  displayedColumns: string[] = [];

  // Metadatos
  private allEntitiesMeta: EntityInfo[] = [];
  private currentEntityMeta?: EntityInfo;

  // Mapas de ids -> labels
  idLabelMaps: Record<string, Map<number | string, string>> = {};
  // Mapa { relación -> columnaId } p. ej. { company: 'companyId' }
  relationIdColMap: Record<string, string> = {};

  // Exclusiones de columnas visibles
  excludedColumns: string[] = [
    'id', 'devices', 'advices', 'users', 'roles',
    'timeRanges', 'visibilityRules', 'profileImage', 'password'
  ];

  // Entidades que no listamos
  private excludedEntities: string[] = ['AdviceVisibilityRule', 'TimeRange'];

  // Mapas conocidos
  private pathToEntityMap: Record<string, string> = {
    'device': 'Device',
    'device-types': 'DeviceType',
    'media': 'Media',
    'media-types': 'MediaType',
    'promotion': 'Promotion',
    'company': 'Company',
    'advice': 'Advice',
    'user': 'User',
    'role': 'Role',
    'app-version': 'AppVersion'
  };

  private entityToEndpointMap: Record<string, string> = {
    Device: 'devices',
    DeviceType: 'devices/types',
    Media: 'medias',
    MediaType: 'medias/types',
    Promotion: 'promotions',
    Company: 'companies',
    Advice: 'advices',
    User: 'users',
    Role: 'roles',
    AppVersion: 'app-versions'
  };

  private entityToUiPathMap: Record<string, string> = {
    Device: 'device',
    DeviceType: 'device-types',
    Media: 'media',
    MediaType: 'media-types',
    Promotion: 'promotion',
    Company: 'company',
    Advice: 'advice',
    User: 'user',
    Role: 'role',
    AppVersion: 'app-version'
  };

  private labelMap: Record<string, string> = {
    Device: 'Dispositivos',
    DeviceType: 'Tipos de Dispositivo',
    Media: 'Multimedia',
    MediaType: 'Tipos de Multimedia',
    Promotion: 'Promociones',
    Advice: 'Anuncios',
    Company: 'Compañías',
    User: 'Usuarios',
    Role: 'Roles',
    AppVersion: 'Versiones de App'
  };

  // ---- Presencia WS ----
  private presenceInterval: any = null;
  private activeChannels: string[] = []; // claves del mapa /ws/status (destinos suscritos)

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const path = (params.get('path') || '').replace(/^\//, '');
      if (!path) {
        this.titleList = 'Entidad desconocida';
        return;
      }
      const entityName = this.pathToEntity(path);
      if (this.excludedEntities.includes(entityName)) {
        this.titleList = 'Entidad excluida';
        this.items.set([]);
        this.properties = [];
        this.displayedColumns = [];
        return;
      }
      this.activeUiPath = path;
      this.configureForEntity(entityName, path);

      // Arranca/para el polling de presencia solo en Dispositivos
      if (entityName === 'Device') {
        this.startPresencePolling();
      } else {
        this.stopPresencePolling();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopPresencePolling();
  }

  // ============== CARGA ENTIDAD ==============

  private configureForEntity(entityName: string, rawPath: string) {
    this.titleList = this.labelMap[entityName] ?? this.humanize(entityName);
    this.isMedia  = entityName === 'Media';
    this.isDevice = entityName === 'Device';

    const withCount = false;
    this.metadata.getEntities(withCount).subscribe({
      next: (entities) => {
        this.allEntitiesMeta = entities;
        const meta = entities.find(e => e.entityName === entityName);
        this.currentEntityMeta = meta;

        if (meta?.attributes) {
          this.properties = Object.keys(meta.attributes)
            .filter(k => !this.excludedColumns.includes(k));
        } else {
          this.properties = [];
        }

        const endpoint = this.resolveEndpoint(entityName, rawPath);
        this.service.init(endpoint);
        this.service.getAll().subscribe({
          next: (data: any[]) => {
            this.items.set(data || []);

            if (this.properties.length === 0 && data && data.length) {
              const keys = Object.keys(data[0] ?? {});
              this.properties = keys.filter(k => !this.excludedColumns.includes(k));
            }

            // Detecta { relacion -> *_Id }
            this.relationIdColMap = {};
            const sample = data?.[0] ?? {};
            for (const prop of this.properties) {
              const idCol = `${prop}Id`;
              if (Object.prototype.hasOwnProperty.call(sample, idCol)) {
                this.relationIdColMap[prop] = idCol;
              }
            }

            // Mapas de labels para *Id
            const idColsFromProps = this.properties.filter(k => /Id$/.test(k));
            const idColsFromRelationMap = Object.values(this.relationIdColMap);
            const idCols = Array.from(new Set([...idColsFromProps, ...idColsFromRelationMap]));
            this.prepareIdLabelMaps(idCols);

            // Columnas visibles (con 'estado' al principio si es Device)
            this.displayedColumns = this.isDevice
              ? ['estado', ...this.properties, 'acciones']
              : [...this.properties, 'acciones'];
          },
          error: () => {
            this.snackBar.open('No se pudieron cargar los datos', 'Cerrar', { duration: 2500 });
            this.items.set([]);
            this.properties = [];
            this.displayedColumns = [];
          }
        });
      },
      error: () => {
        const endpoint = this.resolveEndpoint(entityName, rawPath);
        this.service.init(endpoint);
        this.service.getAll().subscribe((data: any[]) => {
          this.items.set(data || []);
          const keys = data && data.length ? Object.keys(data[0]) : [];
          this.properties = keys.filter(k => !this.excludedColumns.includes(k));

          this.relationIdColMap = {};
          const sample = data?.[0] ?? {};
          for (const prop of this.properties) {
            const idCol = `${prop}Id`;
            if (Object.prototype.hasOwnProperty.call(sample, idCol)) {
              this.relationIdColMap[prop] = idCol;
            }
          }

          const idCols = this.properties.filter(k => /Id$/.test(k));
          this.prepareIdLabelMaps(idCols);

          this.displayedColumns = this.isDevice
            ? ['estado', ...this.properties, 'acciones']
            : [...this.properties, 'acciones'];
        });
      }
    });
  }

  private resolveEndpoint(entityName: string, rawPath: string): string {
    if (this.entityToEndpointMap[entityName]) return this.entityToEndpointMap[entityName];
    return this.ensurePlural(rawPath);
  }

  private prepareIdLabelMaps(idColumns: string[]) {
    this.idLabelMaps = {};
    idColumns.forEach(col => {
      const targetEntity = this.inferEntityFromIdColumn(col);
      if (!targetEntity) return;

      const endpoint = this.resolveEndpoint(targetEntity, this.toKebabCase(targetEntity));
      this.foreignService.init(endpoint);
      this.foreignService.getAll().subscribe({
        next: (list: any[]) => {
          const map = new Map<number | string, string>();
          for (const obj of list ?? []) {
            const label = this.pickLabelForEntity(targetEntity, obj);
            map.set(obj.id, label);
          }
          this.idLabelMaps[col] = map;
        },
        error: () => {
          this.idLabelMaps[col] = new Map();
        }
      });
    });
  }

  private inferEntityFromIdColumn(col: string): string | null {
    const special: Record<string, string> = {
      companyId: 'Company',
      mediaId: 'Media',
      promotionId: 'Promotion',
      profileImageId: 'Media',
      typeId: 'DeviceType'
    };
    if (special[col]) return special[col];

    const base = col.replace(/Id$/, '');
    const candidate = base
      .split(/[_-]/g)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');

    const exists = this.allEntitiesMeta.some(e => e.entityName === candidate);
    return exists ? candidate : null;
  }

  private pickLabelForEntity(entityName: string, obj: any): string {
    const byEntity: Record<string, string[]> = {
      Company: ['name'],
      Media: ['src'],
      Promotion: ['description'],
      DeviceType: ['type'],
      MediaType: ['type'],
      User: ['username', 'email', 'name'],
      Role: ['role', 'description']
    };
    const generic = ['name', 'description', 'type', 'username', 'email', 'uuid', 'src'];

    const prefs = byEntity[entityName] ?? generic;
    for (const p of prefs) {
      if (obj && obj[p]) return String(obj[p]);
    }
    return obj?.id != null ? `ID ${obj.id}` : '';
  }

  // ============== PRESENCIA WEBSOCKET ==============

  private startPresencePolling() {
    // carga inicial
    this.loadPresence();

    // refresco periódico (p.ej. 10 s)
    this.stopPresencePolling();
    this.presenceInterval = setInterval(() => this.loadPresence(), 10000);
  }

  private stopPresencePolling() {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
  }

  private loadPresence() {
    // GET /ws/status usando el CRUD genérico
    this.presenceService.init('ws');
    this.presenceService.getCustom('status').subscribe({
      next: (res: Record<string, string[] | Set<string>>) => {
        this.activeChannels = Object.keys(res || {});
      },
      error: () => {
        this.activeChannels = [];
      }
    });
  }

  // Determina si un dispositivo está online buscando su uuid o id en los destinos activos
  isOnline(row: any): boolean {
    if (!row) return false;
    const uuid = (row.uuid ?? '').toString();
    const idStr = (row.id ?? '').toString();
    if (!this.activeChannels?.length) return false;

    // match flexible por si tus topics son /topic/devices/{uuid} o similares
    return this.activeChannels.some(dest =>
      (uuid && dest.includes(uuid)) ||
      (idStr && dest.includes(`/${idStr}`))
    );
  }

  // ============== RENDER & LINKS ==============

  renderCell(row: any, col: string): any {
    if (/Id$/.test(col) && this.idLabelMaps[col]) {
      const id = row?.[col];
      const label = this.idLabelMaps[col].get(id);
      return label ?? (id ?? '—');
    }
    const mappedIdCol = this.relationIdColMap[col];
    if (mappedIdCol && this.idLabelMaps[mappedIdCol]) {
      const id = row?.[mappedIdCol];
      const label = this.idLabelMaps[mappedIdCol].get(id);
      return label ?? (id ?? '—');
    }
    const val = row?.[col];
    if (this.isObject(val)) {
      return this.extractValue(val, col) || '—';
    }
    return (val ?? '—');
  }

  linkForCell(row: any, col: string): any[] | null {
    if (/Id$/.test(col)) {
      const entityName = this.inferEntityFromIdColumn(col);
      const id = row?.[col];
      if (entityName && id != null) {
        return ['/', this.getUiPathForEntity(entityName), 'edit', id];
      }
      return null;
    }
    const mappedIdCol = this.relationIdColMap[col];
    if (mappedIdCol) {
      const entityName = this.inferEntityFromIdColumn(mappedIdCol);
      const id = row?.[mappedIdCol];
      if (entityName && id != null) {
        return ['/', this.getUiPathForEntity(entityName), 'edit', id];
      }
      return null;
    }
    const val = row?.[col];
    if (this.isObject(val) && val?.id != null) {
      const targetType = this.currentEntityMeta?.attributes?.[col];
      if (typeof targetType === 'string' && /^[A-Z]/.test(targetType)) {
        return ['/', this.getUiPathForEntity(targetType), 'edit', val.id];
      }
    }
    return null;
  }

  editLink(id: number): any[] {
    return ['/', this.activeUiPath, 'edit', id];
  }

  private getUiPathForEntity(entityName: string): string {
    return this.entityToUiPathMap[entityName] || this.ensurePlural(this.toKebabCase(entityName));
  }

  columnHeader(col: string): string {
    if (/Id$/.test(col)) {
      const base = col.replace(/Id$/, '');
      return this.humanize(this.toPascal(base));
    }
    return this.humanize(col);
  }

  // ============== ACCIONES ==============

  delete(id: number) {
    if (confirm('¿Eliminar elemento?')) {
      this.service.delete(id).subscribe(() => {
        this.snackBar.open('Elemento eliminado', 'Cerrar', { duration: 2000 });
        const currentPath = this.activeUiPath || this.router.url.replace(/^\//, '').split('/')[0];
        const entityName = this.pathToEntity(currentPath);
        this.configureForEntity(entityName, currentPath);
      });
    }
  }

  // ============== HELPERS ==============

  normalizeColor(value: any): string {
    if (!value) return '';
    const v = String(value).trim();
    if (/^(#([0-9a-f]{3}|[0-9a-f]{6})|rgb(a)?\(|hsl(a)?\(|var\(--)/i.test(v)) return v;
    if (/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v)) return `#${v}`;
    return v;
  }

  isObject(obj: any) {
    return typeof obj === 'object' && obj !== null;
  }

  extractValue(obj: any, reference: string) {
    switch (reference) {
      case 'type': return obj?.type;
      case 'company': return obj?.name;
      case 'media': return obj?.src;
      case 'promotion': return obj?.description;
      case 'logo': return obj?.src;
      default: return obj?.name ?? obj?.description ?? obj?.uuid ?? obj?.id ?? '';
    }
  }

  private pathToEntity(path: string): string {
    if (this.pathToEntityMap[path]) return this.pathToEntityMap[path];
    return path
      .split('-')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }

  private humanize(name: string): string {
    return name
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, s => s.toUpperCase());
  }

  private ensurePlural(path: string): string {
    if (path.endsWith('s')) return path;
    if (path.endsWith('y') && !/(ay|ey|iy|oy|uy)$/.test(path)) return path.slice(0, -1) + 'ies';
    return `${path}s`;
  }

  private toKebabCase(name: string): string {
    return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
               .replace(/[\s_]+/g, '-')
               .toLowerCase();
  }

  private toPascal(name: string): string {
    return name
      .split(/[_-]/g)
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }

  isVideo(url: string | undefined | null): boolean {
    if (!url) return false;
    return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov');
  }

  openAdviceDialog(deviceId: number): void {
    import('../device-advices-dialog/device-advices-dialog.component').then(m => {
      this.dialog.open(m.DeviceAdvicesDialogComponent, {
        data: { deviceId },
        width: '600px'
      });
    });
  }
}
