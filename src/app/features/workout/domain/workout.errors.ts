export class InvalidWorkoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidWorkoutError';
  }
}
