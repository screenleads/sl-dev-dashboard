// src/app/features/device/device-list.component.ts
import { Component, WritableSignal, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PreviewDeviceComponent } from '../preview-device/preview-device.component';

import { CrudService } from '../../core/services/crud.service';
import { DeviceModel } from '../../core/models/device.model';
import { DeviceTypeModel } from '../../core/models/device-type.model';
import { MediaModel } from '../../core/models/media.model';
import { MediaTypeModel } from '../../core/models/media-type.model';
import { PromotionModel } from '../../core/models/promotion.model';
import { CompanyModel } from '../../core/models/company.model';
import { AdviceModel } from '../../core/models/advice.model';

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
    PreviewDeviceComponent
  ],
  templateUrl: './lists.component.html',
  styleUrl: './lists.component.scss'
})
export class ListsComponent {
  private service = inject(CrudService);
  private snackBar = inject(MatSnackBar);
  public router = inject(Router);
  private route = inject(ActivatedRoute);

  titleList = '';
  items: WritableSignal<any[]> = signal([]);
  properties: string[] = [];
  displayedColumns: string[] = [];

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const path = params.get('path');
      if (path) {
        this.configureForPath('/' + path);
      }
    });
  }

  configureForPath(path: string) {
    const configMap: Record<string, { endpoint: string, model: any, title: string }> = {
      '/device': { endpoint: 'devices', model: new DeviceModel(), title: 'Dispositivos' },
      '/device-types': { endpoint: 'devices/types', model: new DeviceTypeModel(), title: 'Tipos de Dispositivos' },
      '/media': { endpoint: 'medias', model: new MediaModel(), title: 'Multimedia' },
      '/media-types': { endpoint: 'medias/types', model: new MediaTypeModel(), title: 'Tipos de Multimedia' },
      '/promotion': { endpoint: 'promotion', model: new PromotionModel(), title: 'Promociones' },
      '/company': { endpoint: 'companies', model: new CompanyModel(), title: 'Compañías' },
      '/advice': { endpoint: 'advices', model: new AdviceModel(), title: 'Anuncios' },
    };

    const config = configMap[path];
    if (!config) {
      this.titleList = 'Entidad desconocida';
      return;
    }

    this.titleList = config.title;
    this.properties = Object.keys(config.model);
    this.displayedColumns = [...this.properties, 'acciones'];

    this.service.init(config.endpoint);
    this.service.getAll().subscribe((data: any[]) => {
      this.items.set(data);
      console.log('Items loaded:', this.items());
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
}
