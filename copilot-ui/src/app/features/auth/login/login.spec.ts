import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login';  // ✅ Fixed import

describe('LoginComponent', () => {  // ✅ Fixed name
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],  // ✅ Import the standalone component
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});