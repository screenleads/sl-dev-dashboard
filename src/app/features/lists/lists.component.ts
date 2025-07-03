// src/app/features/device/device-list.component.ts
import { Component, effect, inject, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { signal } from '@angular/core';
import { DeviceType, DeviceTypeModel } from '../../core/models/device-type.model';
import { CrudService } from '../../core/services/crud.service';
import { Device, DeviceModel } from '../../core/models/device.model';
import { ActivatedRoute } from '@angular/router';
import { Media, MediaModel } from '../../core/models/media.model';
import { MediaType, MediaTypeModel } from '../../core/models/media-type.model';
import { Promotion, PromotionModel } from '../../core/models/promotion.model';
import { Company, CompanyModel } from '../../core/models/company.model';
import { Advice, AdviceModel } from '../../core/models/advice.model';
import { PreviewDeviceComponent } from "../preview-device/preview-device.component";
@Component({
  standalone: true,
  selector: 'app-lists',
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatSlideToggle,
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
  private service =  inject(CrudService);;
  private snackBar = inject(MatSnackBar);
  titleList = "";
  router = inject(Router);
  route = inject(ActivatedRoute);
  properties: string[] = [];
  items!: WritableSignal<any[]>;
  path: WritableSignal<string> = signal<string>('');
  constructor() {
    this.initConfig();
      this.initList();
      this.loadDevices();
    effect(() => {
      console.log('Contador cambió a:',this.path);
      this.initConfig();
      this.initList();
      this.loadDevices();
    });
  }


   ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.path.set(params.get('path')!);
    });
  }

  loadDevices() {
    this.service.getAll().subscribe((data: any[]) => {
      this.items.set(data);
      console.log('Items loaded:', this.items());
    });
  }

  delete(id: number) {
    if (confirm('¿Eliminar dispositivo?')) {
      this.service.delete(id).subscribe(() => {
        this.snackBar.open('Dispositivo eliminado', 'Cerrar', { duration: 2000 });
        this.loadDevices();
      });
    }
  }
  initConfig() {
     switch (this.router.url) {
      case '/device':
        this.items = signal<Device[]>([]);
        this.service.init('device');
        this.titleList = "Dispositivos"
        return;
      case '/device-types':
        this.items = signal<DeviceType[]>([]);
        this.service.init('device-types');
        this.titleList = "Tipos de dispositivos"
        return;
      case '/media':
        this.items = signal<Media[]>([]);
        this.service.init('media');
        this.titleList = "Multmedia"
        return;
      case '/media-types':
        this.items = signal<MediaType[]>([]);
        this.service.init('media-types');
        this.titleList = "Tipos de multimedia"
        return;
      case '/promotion':
        this.items = signal<Promotion[]>([]);
        this.service.init('promotion');
        this.titleList = "Promociones"
        return;
      case '/company':
        this.items = signal<Company[]>([]);
        this.service.init('company');
        this.titleList = "Compañías"
        return;
      case '/advice':
        this.items = signal<Advice[]>([]);
        this.service.init('advice');
        this.titleList = "Anuncios"
        return;
      default:
        this.items = signal<any[]>([]);
        this.titleList = "Lista de elementos";
        return;
     }
  }
   initList(){
    const modelMap: Record<string, () => object> = {
      '/device': () => new DeviceModel(),
      '/device-types': () => new DeviceTypeModel(),
      '/media': () => new MediaModel(),
      '/media-types': () => new MediaTypeModel(),
      '/promotion': () => new PromotionModel(),
      '/company': () => new CompanyModel(),
      '/advice': () => new AdviceModel()
    };

    const currentPath = this.router.url;
    console.log(currentPath);

    const modelFactory = modelMap[currentPath];

    if (modelFactory) {
      const instance = modelFactory();
      this.properties = Object.keys(instance);
      console.log('Properties:', this.properties);
    }
}

}