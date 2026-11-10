import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

// Global test setup: a top-level beforeEach runs before every spec in the suite,
// so every TestBed uses the same zoneless change detection as the application.
beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
});
