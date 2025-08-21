import { Component, WritableSignal, inject, signal } from '@angular/core';
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

// 🔥 Nuevo: metadatos para columnas dinámicas y labels
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
export class ListsComponent {
  private service = inject(CrudService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  public router = inject(Router);
  private route = inject(ActivatedRoute);
  private metadata = inject(MetadataService);

  // Estado de UI
  titleList = '';
  isMedia = false;

  // Datos y columnas
  items: WritableSignal<any[]> = signal([]);
  properties: string[] = [];
  displayedColumns: string[] = [];

  // Exclusiones de columnas
  excludedColumns: string[] = ['id', 'devices', 'advices', 'users', 'roles', 'timeRanges', 'visibilityRules', 'profileImage', 'password'];

  // Entidades que NO quieres listar (si te enlazan por error)
  private excludedEntities: string[] = ['AdviceVisibilityRule', 'TimeRange'];

  // Mapas conocidos (rutas/labels/iconos/orden) – se usan solo donde hay excepciones
  private pathToEntityMap: Record<string, string> = {
    'device': 'Device',
    'device-types': 'DeviceType',
    'media': 'Media',
    'media-types': 'MediaType',
    'promotion': 'Promotion',
    'company': 'Company',
    'advice': 'Advice',
    // opcionales si los usas:
    'user': 'User',
    'role': 'Role',
    'app-version': 'AppVersion'
  };

  // Endpoints “especiales” que no se deducen automáticamente del path
  private entityToEndpointMap: Record<string, string> = {
    Device: 'devices',
    DeviceType: 'devices/types',
    Media: 'medias',
    MediaType: 'medias/types',
    Promotion: 'promotions',
    Company: 'companies',
    Advice: 'advices',
    User: 'users',             // si no existe, quítalo o ajusta
    Role: 'roles',             // idem
    AppVersion: 'app-versions' // idem
  };

  // Labels amigables
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
      this.configureForEntity(entityName, path);
    });
  }

  // ---------- Configuración dinámica ----------

  private configureForEntity(entityName: string, rawPath: string) {
    // Label y flags
    this.titleList = this.labelMap[entityName] ?? this.humanize(entityName);
    this.isMedia = entityName === 'Media';

    // 1) Carga metadatos para decidir columnas
    const withCount = false;
    this.metadata.getEntities(withCount).subscribe({
      next: (entities) => {
        const meta = entities.find(e => e.entityName === entityName);
        if (meta && meta.attributes) {
          this.properties = Object.keys(meta.attributes)
            .filter(k => !this.excludedColumns.includes(k));
        } else {
          // Fallback: si no hay metadata, tomamos claves del primer elemento que venga de la API
          this.properties = [];
        }

        // 2) Resuelve endpoint
        const endpoint = this.resolveEndpoint(entityName, rawPath);

        // 3) Carga datos
        this.service.init(endpoint);
        this.service.getAll().subscribe({
          next: (data: any[]) => {
            this.items.set(data || []);
            // Si no habíamos podido inferir columnas por metadata, usa las del primer elemento
            if (this.properties.length === 0 && data && data.length) {
              this.properties = Object.keys(data[0]).filter(k => !this.excludedColumns.includes(k));
            }
            // Columnas visibles
            this.displayedColumns = [...this.properties, 'acciones'];
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
        // Si falla metadata, seguimos con endpoint e intentamos inferir columnas desde los datos
        const endpoint = this.resolveEndpoint(entityName, rawPath);
        this.service.init(endpoint);
        this.service.getAll().subscribe((data: any[]) => {
          this.items.set(data || []);
          this.properties = data && data.length
            ? Object.keys(data[0]).filter(k => !this.excludedColumns.includes(k))
            : [];
          this.displayedColumns = [...this.properties, 'acciones'];
        });
      }
    });
  }

  private resolveEndpoint(entityName: string, rawPath: string): string {
    // 1) Caso especial conocido
    if (this.entityToEndpointMap[entityName]) return this.entityToEndpointMap[entityName];

    // 2) Deducción desde el path (normalmente el path coincide con el recurso REST)
    //    - si el path ya es plural, lo usamos tal cual
    //    - si parece singular, lo pluralizamos (company -> companies, app-version -> app-versions)
    const candidate = this.ensurePlural(rawPath);
    return candidate;
  }

  // ---------- Utilidades de UI ----------

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
      default: return '';
    }
  }

  delete(id: number) {
    if (confirm('¿Eliminar elemento?')) {
      this.service.delete(id).subscribe(() => {
        this.snackBar.open('Elemento eliminado', 'Cerrar', { duration: 2000 });
        // recarga la tabla actual
        const currentPath = this.router.url.replace(/^\//, '').split('/')[0];
        const entityName = this.pathToEntity(currentPath);
        this.configureForEntity(entityName, currentPath);
      });
    }
  }

  // ---------- Helpers de nombre/paths ----------

  private pathToEntity(path: string): string {
    if (this.pathToEntityMap[path]) return this.pathToEntityMap[path];
    // kebab-case -> PascalCase
    return path
      .split('-')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }

  private humanize(name: string): string {
    return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  }

  private ensurePlural(path: string): string {
    // si ya termina en 's' lo dejamos
    if (path.endsWith('s')) return path;
    // reglas básicas: ...y -> ...ies (company -> companies)
    if (path.endsWith('y') && !path.endsWith('ay') && !path.endsWith('ey') && !path.endsWith('iy') && !path.endsWith('oy') && !path.endsWith('uy')) {
      return path.slice(0, -1) + 'ies';
    }
    // por defecto añade 's'
    return `${path}s`;
  }

  isVideo(url: string | undefined | null): boolean {
    if (!url) return false;
    return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov');
  }

  // Si mantienes el diálogo de campañas por dispositivo:
  openAdviceDialog(deviceId: number): void {
    // Lazy import para no romper si no existe el componente en algunas apps
    import('../device-advices-dialog/device-advices-dialog.component').then(m => {
      this.dialog.open(m.DeviceAdvicesDialogComponent, {
        data: { deviceId },
        width: '600px'
      });
    });
  }
}
