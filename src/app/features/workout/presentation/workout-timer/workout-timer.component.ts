import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Phase, SessionStatus } from '../../domain/workout-session';
import { formatTime } from '../format-time';
import { WORKOUT_TEXTS } from '../workout.labels';

@Component({
  selector: 'app-workout-timer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="timer__exercise">{{ exerciseName() }}</h2>
    <div class="phase" [class.phase--rest]="phase() === 'rest'">{{ phaseLabel() }}</div>
    <div class="timer" [class.timer--rest]="phase() === 'rest'">{{ time() }}</div>
    <p class="timer__repetitions">
      {{ texts.completedRepetitions }}: {{ completedRepetitions() }} / {{ totalRepetitions() }}
    </p>

    <div class="timer__controls">
      @if (status() === 'running') {
        <button type="button" (click)="pause.emit()">{{ texts.pause }}</button>
      } @else {
        <button type="button" [disabled]="status() === 'finished'" (click)="start.emit()">
          {{ texts.start }}
        </button>
      }
      <button type="button" (click)="reset.emit()">{{ texts.reset }}</button>
    </div>
  `,
  styles: `
    .phase--rest { color: #b9770e; }
    .timer--rest { color: #b9770e; }
  `,
})
export class WorkoutTimerComponent {
  readonly exerciseName = input.required<string>();
  readonly phase = input.required<Phase>();
  readonly phaseLabel = input.required<string>();
  readonly remainingSeconds = input.required<number>();
  readonly completedRepetitions = input.required<number>();
  readonly totalRepetitions = input.required<number>();
  readonly status = input.required<SessionStatus>();

  readonly start = output<void>();
  readonly pause = output<void>();
  readonly reset = output<void>();

  protected readonly texts = WORKOUT_TEXTS;
  protected readonly time = computed(() => formatTime(this.remainingSeconds()));
}
