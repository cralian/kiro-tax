export interface NIBand {
  from: number;
  to: number | null;
  rate: number;
}

export interface NIParams {
  bands: NIBand[];
}

export interface NIResult {
  nationalInsurance: number;
}

export function calculateNI(
  params: NIParams,
  grossIncome: number
): NIResult {
  let ni = 0;

  for (const band of params.bands) {
    const bandTop = band.to ?? Infinity;
    const sliceFrom = Math.max(band.from, 0);
    const sliceTo = Math.min(bandTop, grossIncome);
    const width = sliceTo - sliceFrom;
    if (width <= 0) continue;
    ni += width * band.rate;
  }

  return { nationalInsurance: Math.max(0, ni) };
}
