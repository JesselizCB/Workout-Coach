import { Injectable } from '@angular/core';
@Injectable({providedIn:'root'})
export class WorkoutService {
  getWorkout(): any {
    return { exercise_name:'Squats', repetitions_number:3, repetition_time:5, rest_time:3 };
  }
}
