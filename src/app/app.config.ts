import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideWorkout } from './features/workout/workout.providers';

export const appConfig: ApplicationConfig = {
  providers: [provideZonelessChangeDetection(), provideWorkout()],
};
