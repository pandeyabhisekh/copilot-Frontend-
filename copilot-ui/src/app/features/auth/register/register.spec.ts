import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register';  // ✅ Fixed import

describe('RegisterComponent', () => {  // ✅ Fixed name
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});