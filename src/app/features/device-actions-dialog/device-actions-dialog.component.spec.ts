import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceActionsDialogComponent } from './device-actions-dialog.component';

describe('DeviceActionsDialogComponent', () => {
  let component: DeviceActionsDialogComponent;
  let fixture: ComponentFixture<DeviceActionsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviceActionsDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviceActionsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
