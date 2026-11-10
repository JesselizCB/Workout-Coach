import { formatTime } from './format-time';

describe('formatTime', () => {
  const cases: readonly (readonly [number, string])[] = [
    [0, '00:00'],
    [5, '00:05'],
    [59, '00:59'],
    [60, '01:00'],
    [90, '01:30'],
    [600, '10:00'],
  ];

  for (const [seconds, expected] of cases) {
    it(`CA10: shows ${seconds} seconds as ${expected}`, () => {
      expect(formatTime(seconds)).toBe(expected);
    });
  }
});
