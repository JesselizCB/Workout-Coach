import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Phase, SessionStatus } from '../../domain/workout-session';
import { formatTime } from '../format-time';
import { WORKOUT_TEXTS } from '../workout.labels';

interface ProgressSegment {
  readonly fill: number;
  readonly done: boolean;
}

@Component({
  selector: 'app-workout-timer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="timer__exercise">{{ exerciseName() }}</h2>
    <div class="phase" [class.phase--rest]="resting()">{{ phaseLabel() }}</div>
    <div class="timer" [class.timer--rest]="resting()">{{ time() }}</div>

    <div class="progress__header">
      <span class="progress__label">{{ texts.completedRepetitions }}</span>
      <span class="progress__count">{{ completedRepetitions() }} / {{ totalRepetitions() }}</span>
    </div>
    <div
      class="progress"
      role="progressbar"
      aria-valuemin="0"
      [attr.aria-valuenow]="completedRepetitions()"
      [attr.aria-valuemax]="totalRepetitions()"
      [attr.aria-valuetext]="progressText()"
      [attr.aria-label]="texts.repetitionProgress"
    >
      @for (segment of segments(); track $index) {
        <div
          class="progress__segment"
          [class.progress__segment--done]="segment.done"
          [class.progress__segment--rest]="resting() && $index === completedRepetitions()"
        >
          <div class="progress__fill" [style.width.%]="segment.fill"></div>
        </div>
      }
    </div>

    <div class="timer__controls">
      @if (status() === 'running') {
        <button type="button" class="button button--pause" (click)="pause.emit()">{{ texts.pause }}</button>
      } @else {
        <button
          type="button"
          class="button button--primary"
          [disabled]="status() === 'finished'"
          (click)="start.emit()"
        >
          {{ texts.start }}
        </button>
      }
      <button type="button" class="button button--secondary" (click)="reset.emit()">{{ texts.reset }}</button>
    </div>
  `,
  styles: `
    .phase--rest { color: #b9770e; }
    .timer--rest { color: #b9770e; }
    .progress__header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin: 0.5rem 0 0.4rem;
    }
    .progress__label { color: #5d6d7e; }
    .progress__count { font-size: 1.75rem; font-weight: 700; }
    .progress {
      display: flex;
      gap: 0.375rem;
      height: 0.75rem;
      margin: 0 0 1.25rem;
    }
    .progress__segment {
      flex: 1;
      overflow: hidden;
      background: #e5e8ec;
      border-radius: 999px;
    }
    .progress__fill {
      height: 100%;
      background: #1f6feb;
      border-radius: inherit;
      transition: width 0.4s ease;
    }
    .progress__segment--done .progress__fill { background: #1e8449; }
    .progress__segment--rest .progress__fill { background: #b9770e; }
    .timer__controls { display: flex; gap: 0.5rem; }
    .button {
      margin: 0;
      padding: 0.55rem 1.1rem;
      font: inherit;
      font-weight: 600;
      border: 2px solid #1f6feb;
      border-radius: 8px;
      cursor: pointer;
    }
    .button--primary { background: #1f6feb; color: #ffffff; }
    .button--primary:hover:not(:disabled) { background: #1a5fd0; border-color: #1a5fd0; }
    .button--pause { background: #f5b041; border-color: #f5b041; color: #17202a; }
    .button--pause:hover { background: #e59d2c; border-color: #e59d2c; }
    .button--secondary { background: #ffffff; color: #1f6feb; }
    .button--secondary:hover { background: #e8f4ff; }
    .button:disabled {
      background: #e5e8ec;
      border-color: #e5e8ec;
      color: #6b7682;
      cursor: not-allowed;
    }
    .button:focus-visible { outline: 3px solid #17202a; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) {
      .progress__fill { transition: none; }
    }
  `,
})
export class WorkoutTimerComponent {
  readonly exerciseName = input.required<string>();
  readonly phase = input.required<Phase>();
  readonly phaseLabel = input.required<string>();
  readonly remainingSeconds = input.required<number>();
  readonly repetitionSeconds = input.required<number>();
  readonly restSeconds = input.required<number>();
  readonly completedRepetitions = input.required<number>();
  readonly totalRepetitions = input.required<number>();
  readonly status = input.required<SessionStatus>();

  readonly start = output<void>();
  readonly pause = output<void>();
  readonly reset = output<void>();

  protected readonly texts = WORKOUT_TEXTS;
  protected readonly time = computed(() => formatTime(this.remainingSeconds()));
  protected readonly resting = computed(() => this.phase() === 'rest' && this.status() !== 'finished');

  // A repetition only counts when its rest ends, so its cycle is exercise plus rest.
  private readonly currentCycleShare = computed(() => {
    const cycleSeconds = this.repetitionSeconds() + this.restSeconds();
    const phaseOffset = this.phase() === 'repetition' ? this.repetitionSeconds() : cycleSeconds;
    return (phaseOffset - this.remainingSeconds()) / cycleSeconds;
  });

  protected readonly segments = computed<readonly ProgressSegment[]>(() => {
    const completed = this.completedRepetitions();
    const currentFill = Math.min(100, Math.round(this.currentCycleShare() * 100));
    return Array.from({ length: this.totalRepetitions() }, (_, index) => ({
      fill: index < completed ? 100 : index === completed ? currentFill : 0,
      done: index < completed,
    }));
  });

  protected readonly progressText = computed(
    () => `${this.completedRepetitions()} ${this.texts.of} ${this.totalRepetitions()}`,
  );
}
