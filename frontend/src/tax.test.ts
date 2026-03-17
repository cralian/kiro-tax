import { describe, it, expect } from 'vitest';
import { calculateIncomeTax, TaxParams } from './tax';

const UK_PARAMS: TaxParams = {
  personalAllowance: 12_570,
  bands: [
    { from: 0, to: 50_270, rate: 0.2 },
    { from: 50_270, to: 125_140, rate: 0.4 },
    { from: 125_140, to: null, rate: 0.45 },
  ],
  allowanceTaper: { threshold: 100_000, rate: 0.5 },
};

const tax = (income: number, sacrifice = 0) =>
  calculateIncomeTax(UK_PARAMS, income, sacrifice);

describe('calculateIncomeTax', () => {
  it('zero income', () => {
    const r = tax(0);
    expect(r.incomeTax).toBe(0);
    expect(r.effectiveAllowance).toBe(12_570);
    expect(r.breakdown).toHaveLength(0);
  });

  it('income within personal allowance', () => {
    const r = tax(12_570);
    expect(r.incomeTax).toBe(0);
    expect(r.taxableIncome).toBe(0);
  });

  it('basic rate only - 30k', () => {
    const r = tax(30_000);
    expect(r.effectiveAllowance).toBe(12_570);
    expect(r.incomeTax).toBe(3_486);
    expect(r.breakdown).toHaveLength(1);
    expect(r.breakdown[0].rate).toBe(0.2);
    expect(r.breakdown[0].from).toBe(12_570);
    expect(r.breakdown[0].to).toBe(30_000);
  });

  it('top of basic rate - 50270', () => {
    const r = tax(50_270);
    expect(r.incomeTax).toBe(7_540);
    expect(r.breakdown).toHaveLength(1);
  });

  it('basic + higher rate - 100k', () => {
    const r = tax(100_000);
    expect(r.effectiveAllowance).toBe(12_570);
    expect(r.incomeTax).toBe(27_432);
    expect(r.breakdown).toHaveLength(2);
    expect(r.breakdown[0]).toMatchObject({ from: 12_570, to: 50_270, rate: 0.2 });
    expect(r.breakdown[1]).toMatchObject({ from: 50_270, to: 100_000, rate: 0.4 });
  });

  it('120k - allowance tapered, band thresholds stay absolute', () => {
    const r = tax(120_000);
    expect(r.effectiveAllowance).toBe(2_570);
    expect(r.taxableIncome).toBe(117_430);
    // Key check: bands still use absolute thresholds
    expect(r.breakdown[0]).toMatchObject({ from: 2_570, to: 50_270, rate: 0.2 });
    expect(r.breakdown[1]).toMatchObject({ from: 50_270, to: 120_000, rate: 0.4 });
    expect(r.incomeTax).toBeCloseTo(0.2 * (50_270 - 2_570) + 0.4 * (120_000 - 50_270));
  });

  it('125140 - allowance fully tapered', () => {
    const r = tax(125_140);
    expect(r.effectiveAllowance).toBe(0);
    expect(r.breakdown[0]).toMatchObject({ from: 0, to: 50_270, rate: 0.2 });
    expect(r.breakdown[1]).toMatchObject({ from: 50_270, to: 125_140, rate: 0.4 });
    expect(r.incomeTax).toBeCloseTo(0.2 * 50_270 + 0.4 * (125_140 - 50_270));
  });

  it('150k - into additional rate', () => {
    const r = tax(150_000);
    expect(r.effectiveAllowance).toBe(0);
    expect(r.breakdown).toHaveLength(3);
    expect(r.breakdown[2]).toMatchObject({ from: 125_140, rate: 0.45 });
    expect(r.incomeTax).toBeCloseTo(
      0.2 * 50_270 + 0.4 * (125_140 - 50_270) + 0.45 * (150_000 - 125_140)
    );
  });

  it('net income = gross - tax', () => {
    const r = tax(80_000);
    expect(r.netIncome).toBe(80_000 - r.incomeTax);
    expect(r.netMonthly).toBeCloseTo(r.netIncome / 12);
  });

  it('salary sacrifice reduces gross', () => {
    const without = tax(60_000);
    const with5k = tax(60_000, 5_000);
    expect(with5k.grossIncome).toBe(55_000);
    expect(with5k.incomeTax).toBeLessThan(without.incomeTax);
  });

  it('salary sacrifice cannot exceed income', () => {
    const r = tax(10_000, 20_000);
    expect(r.grossIncome).toBe(0);
    expect(r.incomeTax).toBe(0);
  });
});
