import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemoteHomeComponent } from './remote-home-component';

describe('RemoteHomeComponent', () => {
  let component: RemoteHomeComponent;
  let fixture: ComponentFixture<RemoteHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemoteHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RemoteHomeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
