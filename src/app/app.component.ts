import { Component } from '@angular/core';
import { WorkoutTimerComponent } from './features/workout/components/workout-timer/workout-timer';
@Component({selector:'app-root',standalone:true,imports:[WorkoutTimerComponent],template:`<app-workout-timer />`})
export class AppComponent {}
