import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'app-preview-device',
  templateUrl: './preview-device.component.html',
  styleUrls: ['./preview-device.component.scss'],
  imports: [CommonModule, MatIconModule],
})
export class PreviewDeviceComponent {
  @Input() mediaUrl: string = '';
  @Input() mediaType: 'image' | 'video' = 'image';
  @Input() deviceStyle: 'mobile' | 'tablet' | 'tv' = 'tv';

  isPlaying = false;

  playVideo(): void {
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (videoElement) {
      videoElement.play();
      this.isPlaying = true;
    }
  }

  togglePlayPause(video: HTMLVideoElement): void {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }
}
