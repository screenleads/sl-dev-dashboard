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

import { CrudService } from '../../core/services/crud.service';
import { DeviceModel } from '../../core/models/device.model';
import { DeviceTypeModel } from '../../core/models/device-type.model';
import { MediaModel } from '../../core/models/media.model';
import { MediaTypeModel } from '../../core/models/media-type.model';
import { PromotionModel } from '../../core/models/promotion.model';

import { AdviceModel } from '../../core/models/advice.model';
import { DeviceAdvicesDialogComponent } from '../device-advices-dialog/device-advices-dialog.component';

import { MatTooltipModule } from '@angular/material/tooltip';
import { CompanyModel } from '../../core/models/company.model';

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

  titleList = '';
  isMedia = false;
  items: WritableSignal<any[]> = signal([]);
  properties: string[] = [];
  displayedColumns: string[] = [];
  excludedColumns: string[] = ['id', 'devices', 'advices'];

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const path = params.get('path');
      if (path) {
        this.configureForPath('/' + path);
      }
    });
  }
  normalizeColor(value: any): string {
    if (!value) return '';
    const v = String(value).trim();
    if (/^(#([0-9a-f]{3}|[0-9a-f]{6})|rgb(a)?\(|hsl(a)?\(|var\(--)/i.test(v)) return v;
    if (/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v)) return `#${v}`;
    return v; // permite nombres CSS como 'red'
  }
  configureForPath(path: string) {
    const configMap: Record<string, { endpoint: string, model: any, title: string }> = {
      '/device': { endpoint: 'devices', model: new DeviceModel(), title: 'Dispositivos' },
      '/device-types': { endpoint: 'devices/types', model: new DeviceTypeModel(), title: 'Tipos de Dispositivos' },
      '/media': { endpoint: 'medias', model: new MediaModel(), title: 'Multimedia' },
      '/media-types': { endpoint: 'medias/types', model: new MediaTypeModel(), title: 'Tipos de Multimedia' },
      '/promotion': { endpoint: 'promotions', model: new PromotionModel(), title: 'Promociones' },
      '/company': { endpoint: 'companies', model: new CompanyModel(), title: 'Compañías' },
      '/advice': { endpoint: 'advices', model: new AdviceModel(), title: 'Anuncios' },
    };

    const config = configMap[path];
    if (!config) {
      this.titleList = 'Entidad desconocida';
      return;
    }

    this.titleList = config.title;
    this.isMedia = path === '/media';
    this.properties = Object.keys(config.model);
    this.properties = this.properties.filter(arr => !this.excludedColumns.includes(arr));
    this.displayedColumns = [...this.properties, 'acciones'];

    this.service.init(config.endpoint);
    this.service.getAll().subscribe((data: any[]) => {
      this.items.set(data);
    });
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
      default: return '';
    }
  }

  delete(id: number) {
    if (confirm('¿Eliminar elemento?')) {
      this.service.delete(id).subscribe(() => {
        this.snackBar.open('Elemento eliminado', 'Cerrar', { duration: 2000 });
        this.configureForPath(this.router.url);
      });
    }
  }

  openAdviceDialog(deviceId: number): void {
    this.dialog.open(DeviceAdvicesDialogComponent, {
      data: { deviceId },
      width: '600px'
    });
  }

  isVideo(url: string | undefined | null): boolean {
    if (!url) return false;
    return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov');
  }
}
