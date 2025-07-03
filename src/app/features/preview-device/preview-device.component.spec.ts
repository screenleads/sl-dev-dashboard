import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreviewDeviceComponent } from './preview-device.component';

describe('PreviewDeviceComponent', () => {
  let component: PreviewDeviceComponent;
  let fixture: ComponentFixture<PreviewDeviceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreviewDeviceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreviewDeviceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
