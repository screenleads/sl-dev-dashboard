import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceAdvicesDialogComponent } from './device-advices-dialog.component';

describe('DeviceAdvicesDialogComponent', () => {
  let component: DeviceAdvicesDialogComponent;
  let fixture: ComponentFixture<DeviceAdvicesDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviceAdvicesDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviceAdvicesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
