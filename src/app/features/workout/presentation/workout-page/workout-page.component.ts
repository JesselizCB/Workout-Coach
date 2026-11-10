import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { WorkoutSessionStore } from '../../application/workout-session.store';
import { ExerciseListComponent, ExerciseListItem } from '../exercise-list/exercise-list.component';
import { WorkoutTimerComponent } from '../workout-timer/workout-timer.component';
import { WorkoutToastComponent } from '../workout-toast/workout-toast.component';
import {
  EXERCISE_STATUS_LABELS,
  PHASE_LABELS,
  SESSION_EVENT_MESSAGES,
  WORKOUT_TEXTS,
} from '../workout.labels';

/**
 * Container of the workout screen: the only component that talks to the store.
 * It turns the session into what each presentational component needs.
 */
@Component({
  selector: 'app-workout-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WorkoutTimerComponent, WorkoutToastComponent, ExerciseListComponent],
  providers: [WorkoutSessionStore],
  template: `
    <main class="card">
      <h1>Workout Coach</h1>

      @switch (store.loadStatus()) {
        @case ('loading') {
          <p>{{ texts.loading }}</p>
        }
        @case ('error') {
          <p role="alert">{{ texts.loadError }}</p>
        }
        @case ('ready') {
          @if (store.session(); as session) {
            <app-workout-timer
              [exerciseName]="session.exercises[session.currentIndex].name"
              [phase]="session.phase"
              [phaseLabel]="phaseLabel()"
              [remainingSeconds]="session.remainingSeconds"
              [completedRepetitions]="session.completedRepetitions"
              [totalRepetitions]="session.exercises[session.currentIndex].repetitions"
              [status]="session.status"
              (start)="store.start()"
              (pause)="store.pause()"
              (reset)="store.reset()"
            />
            <app-workout-toast [message]="toastMessage()" />
            <app-exercise-list [items]="exerciseItems()" />
          }
        }
      }
    </main>
  `,
})
export class WorkoutPageComponent {
  protected readonly store = inject(WorkoutSessionStore);
  protected readonly texts = WORKOUT_TEXTS;

  protected readonly phaseLabel = computed(() => {
    const session = this.store.session();
    if (!session) {
      return '';
    }
    return session.status === 'finished' ? WORKOUT_TEXTS.finished : PHASE_LABELS[session.phase];
  });

  protected readonly toastMessage = computed(() => {
    const event = this.store.session()?.lastEvent;
    return event ? SESSION_EVENT_MESSAGES[event] : null;
  });

  protected readonly exerciseItems = computed<readonly ExerciseListItem[]>(() => {
    const exercises = this.store.session()?.exercises ?? [];
    const statuses = this.store.exerciseStatuses();
    return exercises.map((exercise, index) => ({
      name: exercise.name,
      repetitions: exercise.repetitions,
      status: statuses[index],
      statusLabel: EXERCISE_STATUS_LABELS[statuses[index]],
    }));
  });

  constructor() {
    void this.store.load();
  }
}
