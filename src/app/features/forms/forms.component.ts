import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { CrudService } from '../../core/services/crud.service';
import { PreviewDeviceComponent } from "../preview-device/preview-device.component";
import { DefaultModelFactory } from '../../core/models/default-model.factory';


@Component({
  standalone: true,
  selector: 'app-generic-form',
  templateUrl: './forms.component.html',
  styleUrl: './forms.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
    PreviewDeviceComponent
  ]
})
export class FormsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  public router = inject(Router);
  private service = inject(CrudService);
  private mediaService = inject(CrudService);
  private promoService = inject(CrudService);

  form: FormGroup | null = null;
  isEditMode = false;
  mediaList: any[] = [];
  promotionList: any[] = [];
  daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  public entityName = '';

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    const url = this.router.url;
    const pathParts = url.split('/');
    this.entityName = pathParts[1];

    if (this.entityName === 'advice') {
      this.mediaService.init('medias');
      this.mediaService.getAll().subscribe(media => this.mediaList = media ?? []);

      this.promoService.init('promotion');
      this.promoService.getAll().subscribe({
        next: promotions => this.promotionList = promotions ?? [],
        error: () => this.promotionList = []
      });
    }

    this.service.init(this.getEndpoint(this.entityName));

    if (id) {
      this.isEditMode = true;
      this.service.getById(+id).subscribe({
        next: (data) => this.buildForm(data),
        error: () => {
          this.snackBar.open('No se pudo cargar el elemento', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/' + this.entityName]);
        }
      });
    } else {
      const emptyModel = DefaultModelFactory.create(this.entityName);
      this.buildForm(emptyModel);
    }
  }

  private getEndpoint(entity: string): string {
    const map: Record<string, string> = {
      advice: 'advices',
      media: 'medias',
      promotion: 'promotion',
      device: 'devices',
      'device-types': 'devices/types'
    };
    return map[entity] ?? entity;
  }

  buildForm(model: any) {
    const toTimeString = (arr: [number, number] | undefined): string => {
      if (!arr || arr.length !== 2) return '';
      const [h, m] = arr;
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(h)}:${pad(m)}`;
    };

    const group: Record<string, any> = {};

    for (const key of Object.keys(model)) {
      if (key === 'id') continue;

      if (key === 'visibilityRules') {
        group[key] = this.fb.array(
          (model.visibilityRules || []).map((rule: any) =>
            this.fb.group({
              day: [rule.day],
              timeRanges: this.fb.array(
                (rule.timeRanges || []).map((t: any) =>
                  this.fb.group({
                    fromTime: [toTimeString(t.fromTime)],
                    toTime: [toTimeString(t.toTime)]
                  })
                )
              )
            })
          )
        );
      } else if (key === 'media' || key === 'promotion') {
        const list: any[] = key === 'media' ? this.mediaList : this.promotionList;
        const match = list.find(item => item?.id === model[key]?.id);
        group[key] = [match ?? null];
      } else if (typeof model[key] === 'boolean') {
        group[key] = [model[key] ?? false];
      } else if (typeof model[key] === 'number') {
        group[key] = [model[key] ?? 0];
      } else {
        group[key] = [model[key] ?? ''];
      }
    }

    this.form = this.fb.group(group);
  }

  get visibilityRules(): FormArray {
    return this.form?.get('visibilityRules') as FormArray;
  }

  getVisibilityRulesIndexes(): number[] {
    return this.visibilityRules?.controls?.map((_, i) => i) ?? [];
  }

  getTimeRanges(ruleIndex: number): FormArray {
    return this.visibilityRules.at(ruleIndex).get('timeRanges') as FormArray;
  }

  addVisibilityRule() {
    this.visibilityRules.push(
      this.fb.group({
        day: [''],
        timeRanges: this.fb.array([])
      })
    );
  }

  removeVisibilityRule(index: number) {
    this.visibilityRules.removeAt(index);
  }

  addTimeRange(ruleIndex: number) {
    this.getTimeRanges(ruleIndex).push(
      this.fb.group({
        fromTime: [''],
        toTime: ['']
      })
    );
  }

  removeTimeRange(ruleIndex: number, rangeIndex: number) {
    this.getTimeRanges(ruleIndex).removeAt(rangeIndex);
  }

  save() {
    if (!this.form || this.form.invalid) return;
    const formValue = this.form.value;

    const req = this.isEditMode
      ? this.service.update({ id: +this.route.snapshot.paramMap.get('id')!, ...formValue })
      : this.service.create(formValue);

    req.subscribe(() => {
      this.snackBar.open('Elemento guardado correctamente', 'Cerrar', { duration: 2000 });
      this.router.navigate(['/' + this.entityName]);
    });
  }

  compareById = (a: any, b: any) => a?.id === b?.id;
}
