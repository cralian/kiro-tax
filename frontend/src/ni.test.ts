import { describe, it, expect } from 'vitest';
import { calculateNI, NIParams } from './ni';

const UK_NI: NIParams = {
  bands: [
    { from: 0, to: 12_570, rate: 0 },
    { from: 12_570, to: 50_270, rate: 0.08 },
    { from: 50_270, to: null, rate: 0.02 },
  ],
};

const ni = (income: number) => calculateNI(UK_NI, income).nationalInsurance;

describe('calculateNI', () => {
  it('zero income', () => {
    expect(ni(0)).toBe(0);
  });

  it('below primary threshold', () => {
    expect(ni(12_570)).toBe(0);
    expect(ni(10_000)).toBe(0);
  });

  it('just above primary threshold', () => {
    expect(ni(12_571)).toBeCloseTo(0.08);
  });

  it('basic NI only - 30k', () => {
    // (30000 - 12570) * 0.08 = 1394.40
    expect(ni(30_000)).toBeCloseTo(1_394.40);
  });

  it('at upper earnings limit - 50270', () => {
    // (50270 - 12570) * 0.08 = 3016
    expect(ni(50_270)).toBeCloseTo(3_016);
  });

  it('above upper earnings limit - 60k', () => {
    // (50270 - 12570) * 0.08 + (60000 - 50270) * 0.02
    // = 3016 + 194.60 = 3210.60
    expect(ni(60_000)).toBeCloseTo(3_210.60);
  });

  it('100k', () => {
    // (50270 - 12570) * 0.08 + (100000 - 50270) * 0.02
    // = 3016 + 994.60 = 4010.60
    expect(ni(100_000)).toBeCloseTo(4_010.60);
  });

  it('150k', () => {
    // 3016 + (150000 - 50270) * 0.02 = 3016 + 1994.60 = 5010.60
    expect(ni(150_000)).toBeCloseTo(5_010.60);
  });

  it('gov.uk example: £1000/week = £52000/yr', () => {
    // Weekly: £58 + £0.66 = £58.66
    // Annual: (50270-12570)*0.08 + (52000-50270)*0.02 = 3016 + 34.60 = 3050.60
    expect(ni(52_000)).toBeCloseTo(3_050.60);
  });

  it('salary sacrifice reduces NI', () => {
    const full = ni(60_000);
    const sacrificed = ni(55_000); // as if 5k sacrificed
    expect(sacrificed).toBeLessThan(full);
  });
});
