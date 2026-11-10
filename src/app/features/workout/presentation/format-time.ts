/** Formats a number of seconds as mm:ss, for example 90 as "01:30". */
export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
