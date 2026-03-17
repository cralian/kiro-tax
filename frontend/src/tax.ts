export interface TaxBand {
  from: number;
  to: number | null; // null = no upper limit
  rate: number;
}

export interface AllowanceTaper {
  threshold: number;
  rate: number;
}

export interface TaxParams {
  personalAllowance: number;
  bands: TaxBand[]; // absolute income thresholds, e.g. [{from:0,to:50270,rate:0.2}, ...]
  allowanceTaper: AllowanceTaper;
}

export interface TaxBreakdownItem {
  from: number;
  to: number;
  rate: number;
  tax: number;
}

export interface TaxResult {
  grossIncome: number;
  effectiveAllowance: number;
  taxableIncome: number;
  incomeTax: number;
  netIncome: number;
  netMonthly: number;
  pension: number;
  pensionMonthly: number;
  taxSaved: number;
  grandTotal: number;
  grandTotalMonthly: number;
  breakdown: TaxBreakdownItem[];
}

export function calculateIncomeTax(
  params: TaxParams,
  totalIncome: number,
  salarySacrifice: number = 0
): TaxResult {
  const grossIncome = Math.max(0, totalIncome - salarySacrifice);

  const overTaper = Math.max(0, grossIncome - params.allowanceTaper.threshold);
  const reduction = overTaper * params.allowanceTaper.rate;
  const effectiveAllowance = Math.max(0, params.personalAllowance - reduction);

  const taxableIncome = Math.max(0, grossIncome - effectiveAllowance);

  const breakdown: TaxBreakdownItem[] = [];
  const floor = effectiveAllowance;
  const ceiling = grossIncome;

  for (const band of params.bands) {
    const bandTop = band.to ?? Infinity;
    const sliceFrom = Math.max(band.from, floor);
    const sliceTo = Math.min(bandTop, ceiling);
    const width = sliceTo - sliceFrom;
    if (width <= 0) continue;

    breakdown.push({
      from: sliceFrom,
      to: sliceTo,
      rate: band.rate,
      tax: width * band.rate,
    });
  }

  const incomeTax = breakdown.reduce((sum, b) => sum + b.tax, 0);
  const incomeTaxWithout = salarySacrifice > 0
    ? calculateIncomeTax(params, totalIncome, 0).incomeTax
    : incomeTax;
  const taxSaved = incomeTaxWithout - incomeTax;
  const netIncome = grossIncome - incomeTax;
  const pension = Math.max(0, Math.min(salarySacrifice, totalIncome));

  return {
    grossIncome,
    effectiveAllowance,
    taxableIncome,
    incomeTax,
    netIncome,
    netMonthly: netIncome / 12,
    pension,
    pensionMonthly: pension / 12,
    taxSaved,
    grandTotal: netIncome + pension,
    grandTotalMonthly: (netIncome + pension) / 12,
    breakdown,
  };
}
