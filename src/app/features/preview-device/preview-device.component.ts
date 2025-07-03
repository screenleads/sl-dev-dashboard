import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-preview-device',
  templateUrl: './preview-device.component.html',
  styleUrls: ['./preview-device.component.scss'],
  imports: [CommonModule],
})
export class PreviewDeviceComponent {
  @Input() mediaUrl: string = '';
  @Input() mediaType: 'image' | 'video'= 'image';
  @Input() deviceStyle: 'mobile' | 'tablet' | 'tv'  = 'tv';
}
