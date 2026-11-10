import { ExerciseStatus, Phase, SessionEvent } from '../domain/workout-session';

export const EXERCISE_STATUS_LABELS: Record<ExerciseStatus, string> = {
  pending: 'Pendiente',
  'in-progress': 'En curso',
  completed: 'Completado',
};

export const PHASE_LABELS: Record<Phase, string> = {
  repetition: 'Ejercicio',
  rest: 'Descanso',
};

export const SESSION_EVENT_MESSAGES: Record<SessionEvent, string> = {
  'rest-started': 'Tiempo de descanso',
  'repetition-started': 'De vuelta al ejercicio',
  'exercise-completed': 'Ejercicio completado. Pasamos al siguiente',
  'workout-completed': 'Entrenamiento completado',
};

export const WORKOUT_TEXTS = {
  start: 'Iniciar',
  pause: 'Pausar',
  reset: 'Reiniciar',
  finished: 'Finalizado',
  completedRepetitions: 'Repeticiones completadas',
  repetitionProgress: 'Progreso de repeticiones',
  of: 'de',
  repetition: 'repetición',
  repetitions: 'repeticiones',
  loading: 'Cargando entrenamiento…',
  loadError: 'No se pudo cargar el entrenamiento. Inténtalo de nuevo más tarde.',
} as const;
