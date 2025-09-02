import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { NgIf, NgFor } from '@angular/common';
import { AuthenticationService } from '../../core/services/authentication/authentication.service';
import { HttpClientModule } from '@angular/common/http';
import { MetadataService, EntityInfo } from '../../core/services/meta-data.service';

type NavItem = { path: string; label: string; icon: string; order?: number };
type RoleLike = { role?: string; description?: string; level?: number };

@Component({
  selector: 'app-layout',
  standalone: true,
  templateUrl: './app-layout.component.html',
  styleUrls: ['./app-layout.component.scss'],
  imports: [
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatButtonModule,
    MatDividerModule,
    NgIf,
    NgFor,
    HttpClientModule
  ]
})
export class AppLayoutComponent implements OnInit {
  user: any;
  navItems: NavItem[] = [];

  excludedEntityNames: string[] = [
    'AdviceVisibilityRule',
    'TimeRange'
  ];

  private routeMap: Record<string, string> = {
    Device: '/device',
    DeviceType: '/device-types',
    Media: '/media',
    MediaType: '/media-types',
    Promotion: '/promotion',
    Advice: '/advice',
    Company: '/company',
    User: '/user',
    Role: '/role',
    AppVersion: '/app-version',
    AdviceVisibilityRule: '/advice-visibility-rule',
    TimeRange: '/time-range'
  };

  private labelMap: Record<string, string> = {
    Device: 'Dispositivos',
    DeviceType: 'Tipos de Dispositivo',
    Media: 'Media',
    MediaType: 'Tipos de Media',
    Promotion: 'Promociones',
    Advice: 'Anuncios',
    Company: 'Compañías',
    User: 'Usuarios',
    Role: 'Roles',
    AppVersion: 'Versiones de App',
    AdviceVisibilityRule: 'Reglas de Visibilidad',
    TimeRange: 'Franjas horarias'
  };

  private iconMap: Record<string, string> = {
    Device: 'devices',
    DeviceType: 'category',
    Media: 'perm_media',
    MediaType: 'collections',
    Promotion: 'local_offer',
    Advice: 'lightbulb',
    Company: 'business',
    User: 'person',
    Role: 'shield',
    AppVersion: 'system_update',
    AdviceVisibilityRule: 'rule',
    TimeRange: 'schedule'
  };

  private orderMap: Record<string, number> = {
    Device: 10,
    DeviceType: 11,
    Media: 20,
    MediaType: 21,
    Promotion: 30,
    Advice: 40,
    Company: 50,
    User: 60,
    Role: 61,
    AppVersion: 70
  };

  constructor(
    private authenticationService: AuthenticationService,
    private metadataService: MetadataService
  ) {
    this.user = this.authenticationService.getUser();
  }

  ngOnInit() {
    const withCount = false;

    this.metadataService.getEntities(withCount).subscribe({
      next: (entities: EntityInfo[]) => {
        const dynamic = this.buildMenuFromEntities(entities);
        this.navItems = this.dedupeByPath(dynamic);
        this.navItems.sort(
          (a: NavItem, b: NavItem) =>
            (a.order ?? 999) - (b.order ?? 999) ||
            a.label.localeCompare(b.label)
        );
      },
      error: () => {
        this.navItems = [
          { path: '/device', label: 'Dispositivos', icon: 'devices', order: 10 },
          { path: '/device-types', label: 'Tipos de Dispositivo', icon: 'category', order: 11 },
          { path: '/media', label: 'Media', icon: 'perm_media', order: 20 },
          { path: '/media-types', label: 'Tipos de Media', icon: 'collections', order: 21 },
          { path: '/promotion', label: 'Promociones', icon: 'local_offer', order: 30 },
          { path: '/advice', label: 'Anuncios', icon: 'lightbulb', order: 40 },
          { path: '/company', label: 'Compañías', icon: 'business', order: 50 }
        ];
      }
    });
  }

  logout() {
    this.authenticationService.logout();
  }

  // ===== Roles mostrados bajo el username =====

  /** Rol “principal”: el de menor level (más privilegio). */
  get mainRoleLabel(): string {
    const roles: RoleLike[] = this.user?.roles ?? [];
    if (!roles.length) return '';
    const top = [...roles].sort(
      (a: RoleLike, b: RoleLike) => (a?.level ?? 999) - (b?.level ?? 999)
    )[0];
    return top?.description || this.prettyRole(top?.role) || '';
  }

  /** (Opcional) Todos los roles como etiquetas legibles. */
  get roleLabels(): string[] {
    const roles: RoleLike[] = this.user?.roles ?? [];
    return roles
      .sort((a: RoleLike, b: RoleLike) => (a?.level ?? 999) - (b?.level ?? 999))
      .map((r: RoleLike) => r?.description || this.prettyRole(r?.role))
      .filter((s: string | undefined): s is string => !!s);
  }

  /** ROLE_COMPANY_ADMIN -> "Company Admin" */
  private prettyRole(role?: string): string {
    if (!role) return '';
    return role
      .replace(/^ROLE_/, '')
      .toLowerCase()
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // ===== Menú dinámico =====

  private buildMenuFromEntities(entities: EntityInfo[]): NavItem[] {
    const excluded = new Set(this.excludedEntityNames.map(n => n.toLowerCase()));

    return entities
      .filter((e: EntityInfo) => !!e?.entityName)
      .filter((e: EntityInfo) => !excluded.has(e.entityName.toLowerCase()))
      .map((e: EntityInfo) => {
        const key = e.entityName;
        const path = this.routeMap[key] ?? ('/' + this.toKebabCase(key));
        const label = this.labelMap[key] ?? this.humanize(key);
        const icon = this.iconMap[key] ?? 'dataset';
        const order = this.orderMap[key];
        return { path, label, icon, order };
      });
  }

  private toKebabCase(name: string): string {
    return name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  private humanize(name: string): string {
    return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  }

  private mergeByPath(primary: NavItem[], secondary: NavItem[]): NavItem[] {
    const map = new Map<string, NavItem>();
    for (const item of [...primary, ...secondary]) {
      if (!map.has(item.path)) map.set(item.path, item);
    }
    return [...map.values()];
  }

  private dedupeByPath(items: NavItem[]): NavItem[] {
    const seen = new Set<string>();
    const out: NavItem[] = [];
    for (const it of items) {
      if (!seen.has(it.path)) {
        seen.add(it.path);
        out.push(it);
      }
    }
    return out;
  }
}
