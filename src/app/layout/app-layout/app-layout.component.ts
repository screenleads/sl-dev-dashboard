// src/app/layout/app-layout.component.ts
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { NgIf, NgFor } from '@angular/common';

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
    NgIf,
    NgFor
  ]
})
export class AppLayoutComponent {
  navItems = [
    { path: '/device', label: 'Dispositivos', icon: 'devices' },
    { path: '/device-types', label: 'Tipos de Dispositivo', icon: 'category' },
    { path: '/media', label: 'Media', icon: 'perm_media' },
    { path: '/media-types', label: 'Tipos de Media', icon: 'collections' },
    { path: '/promotion', label: 'Promociones', icon: 'local_offer' },
    { path: '/advice', label: 'Consejos', icon: 'lightbulb' },
    { path: '/chat-message', label: 'Mensajes', icon: 'chat' },
    { path: '/company', label: 'Compañías', icon: 'business' }
  ];
}
