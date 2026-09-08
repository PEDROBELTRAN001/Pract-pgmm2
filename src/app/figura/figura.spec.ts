import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FiguraComponent } from './figura'; // Nombre corregido

describe('FiguraComponent', () => {
  let component: FiguraComponent;
  let fixture: ComponentFixture<FiguraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FiguraComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FiguraComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});