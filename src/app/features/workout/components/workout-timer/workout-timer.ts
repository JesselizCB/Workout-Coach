import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { WorkoutService } from '../../services/workout.service';
@Component({selector:'app-workout-timer',standalone:true,imports:[CommonModule],templateUrl:'./workout-timer.html'})
export class WorkoutTimerComponent {
  exercise:any; seconds=0; completed=0; running=false; resting=false; toast=''; timer:any;
  constructor(private service:WorkoutService){ this.exercise=this.service.getWorkout(); this.seconds=this.exercise.repetition_time; }
  start(){ if(this.running)return; this.running=true; this.timer=setInterval(()=>{ this.seconds--; if(this.seconds<=0){ if(this.resting){ this.completed++; this.resting=false; this.toast='Back to exercise'; this.seconds=this.exercise.repetition_time; if(this.completed>=this.exercise.repetitions_number){ this.running=false; clearInterval(this.timer); this.toast='Workout completed'; }} else { this.resting=true; this.toast='Rest time'; this.seconds=this.exercise.rest_time; } } },1000); }
  pause(){ this.running=false; clearInterval(this.timer); }
  reset(){ clearInterval(this.timer); this.running=false; this.resting=false; this.completed=0; this.seconds=this.exercise.repetition_time; this.toast=''; }
}
