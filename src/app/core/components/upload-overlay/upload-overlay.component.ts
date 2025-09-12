// upload-overlay.component.ts
import { Component, effect, inject, Input } from '@angular/core';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { UploadStateService } from '../../services/upload-state.service';


@Component({
  standalone: true,
  selector: 'app-upload-overlay',
  imports: [NgIf, NgFor, NgClass, MatProgressBarModule, MatIconModule],
  templateUrl: './upload-overlay.component.html',
  styleUrl: './upload-overlay.component.scss'
})
export class UploadOverlayComponent {
  upload = inject(UploadStateService);
}
