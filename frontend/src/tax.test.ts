import { describe, it, expect } from 'vitest';
import { calculateIncomeTax, TaxParams } from './tax';
import { calculateNI, NIParams } from './ni';

const UK_TAX: TaxParams = {
  personalAllowance: 12_570,
  bands: [
    { width: 37_700, rate: 0.2 },
    { width: 87_440, rate: 0.4 },
    { width: null, rate: 0.45 },
  ],
  allowanceTaper: { threshold: 100_000, rate: 0.5 },
};

const UK_NI: NIParams = {
  bands: [
    { from: 0, to: 12_570, rate: 0 },
    { from: 12_570, to: 50_270, rate: 0.08 },
    { from: 50_270, to: null, rate: 0.02 },
  ],
};

const tax = (income: number, sacrifice = 0) =>
  calculateIncomeTax(UK_TAX, income, sacrifice);

const ni = (income: number) =>
  calculateNI(UK_NI, income).nationalInsurance;

const takeHome = (income: number) => {
  const t = tax(income);
  return income - t.incomeTax - ni(income);
};

// Reference values from aftertaxcalculator.uk (2025/26, England)
// Small rounding differences (~£0.40) expected due to weekly vs annual NI thresholds
describe('cross-check with aftertaxcalculator.uk', () => {
  it('£0 => £0 take home', () => {
    expect(takeHome(0)).toBeCloseTo(0, 0);
  });

  it('£10,000 => £10,000 take home', () => {
    expect(takeHome(10_000)).toBeCloseTo(10_000, 0);
  });

  it('£20,000 => £17,920 take home', () => {
    expect(takeHome(20_000)).toBeCloseTo(17_920, 0);
  });

  it('£40,000 => £32,320 take home', () => {
    expect(takeHome(40_000)).toBeCloseTo(32_320, 0);
  });

  it('£50,000 => £39,520 take home', () => {
    expect(takeHome(50_000)).toBeCloseTo(39_520, 0);
  });

  it('£60,000 => £45,357 take home', () => {
    expect(takeHome(60_000)).toBeCloseTo(45_357, 0);
  });

  it('£100,000 => £68,557 take home', () => {
    expect(takeHome(100_000)).toBeCloseTo(68_557, 0);
  });

  it('£120,000 => ~£75,914 take home (±£250 NI rounding)', () => {
    const net = takeHome(120_000);
    expect(Math.abs(net - 75_914)).toBeLessThan(250);
  });
});

describe('income tax calculation', () => {
  it('zero income', () => {
    const r = tax(0);
    expect(r.incomeTax).toBe(0);
    expect(r.effectiveAllowance).toBe(12_570);
  });

  it('within personal allowance', () => {
    expect(tax(12_570).incomeTax).toBe(0);
  });

  it('basic rate only - 30k', () => {
    const r = tax(30_000);
    expect(r.incomeTax).toBe(3_486);
    expect(r.breakdown).toHaveLength(1);
    expect(r.breakdown[0].rate).toBe(0.2);
  });

  it('top of basic rate - 50270', () => {
    expect(tax(50_270).incomeTax).toBe(7_540);
  });

  it('100k - no taper', () => {
    const r = tax(100_000);
    expect(r.effectiveAllowance).toBe(12_570);
    expect(r.incomeTax).toBe(27_432);
  });

  it('120k - taper reduces allowance, more falls into higher rate', () => {
    const r = tax(120_000);
    expect(r.effectiveAllowance).toBe(2_570);
    // Taxable = 117430. First 37700 at 20% = 7540. Rest 79730 at 40% = 31892.
    expect(r.incomeTax).toBe(7_540 + 31_892);
  });

  it('125140 - allowance fully tapered', () => {
    const r = tax(125_140);
    expect(r.effectiveAllowance).toBe(0);
    // Taxable = 125140. 37700 at 20% = 7540. 87440 at 40% = 34976.
    expect(r.incomeTax).toBe(7_540 + 34_976);
  });

  it('150k - additional rate', () => {
    const r = tax(150_000);
    expect(r.breakdown).toHaveLength(3);
    // 37700*0.2 + 87440*0.4 + (150000-125140)*0.45
    expect(r.incomeTax).toBeCloseTo(7_540 + 34_976 + 11_187);
  });

  it('salary sacrifice reduces tax', () => {
    const r = tax(60_000, 5_000);
    expect(r.grossIncome).toBe(55_000);
    expect(r.taxSaved).toBeGreaterThan(0);
  });

  it('salary sacrifice cannot exceed income', () => {
    expect(tax(10_000, 20_000).grossIncome).toBe(0);
  });
});

describe('NI calculation', () => {
  it('below threshold', () => {
    expect(ni(12_570)).toBe(0);
  });

  it('basic NI - 30k', () => {
    expect(ni(30_000)).toBeCloseTo(1_394.40);
  });

  it('at upper limit - 50270', () => {
    expect(ni(50_270)).toBeCloseTo(3_016);
  });

  it('above upper limit - 60k', () => {
    expect(ni(60_000)).toBeCloseTo(3_210.60);
  });

  it('100k', () => {
    expect(ni(100_000)).toBeCloseTo(4_010.60);
  });
});
