export interface TaxBand {
  width: number | null; // null = no upper limit
  rate: number;
}

export interface AllowanceTaper {
  threshold: number;
  rate: number;
}

export interface TaxParams {
  personalAllowance: number;
  bands: TaxBand[];
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
  taxSaved: number;
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
  let taxed = 0;

  for (const band of params.bands) {
    if (taxed >= taxableIncome) break;
    const bandCeiling = band.width != null ? taxed + band.width : Infinity;
    const taxableInBand = Math.min(taxableIncome, bandCeiling) - taxed;
    if (taxableInBand <= 0) continue;

    breakdown.push({
      from: effectiveAllowance + taxed,
      to: effectiveAllowance + taxed + taxableInBand,
      rate: band.rate,
      tax: taxableInBand * band.rate,
    });

    taxed += taxableInBand;
  }

  const incomeTax = breakdown.reduce((sum, b) => sum + b.tax, 0);
  const taxSaved = salarySacrifice > 0
    ? calculateIncomeTax(params, totalIncome, 0).incomeTax - incomeTax
    : 0;

  return { grossIncome, effectiveAllowance, taxableIncome, incomeTax, taxSaved, breakdown };
}
