import { useState } from 'react'
import { calculateIncomeTax, TaxBand, TaxParams } from './tax'

const defaultBands: TaxBand[] = [
  { from: 0, to: 50_270, rate: 0.2 },
  { from: 50_270, to: 125_140, rate: 0.4 },
  { from: 125_140, to: null, rate: 0.45 },
]

const fmt = (n: number) =>
  n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })

const pct = (n: number) => `${(n * 100).toFixed(0)}%`

type SacrificeMode = 'yearly' | 'monthly' | 'percent'

function App() {
  const [personalAllowance, setPersonalAllowance] = useState(12_570)
  const [taperThreshold, setTaperThreshold] = useState(100_000)
  const [taperRate, setTaperRate] = useState(0.5)
  const [bands, setBands] = useState(defaultBands)
  const [totalIncome, setTotalIncome] = useState(50_000)
  const [sacrificeValue, setSacrificeValue] = useState(0)
  const [sacrificeMode, setSacrificeMode] = useState<SacrificeMode>('yearly')

  const salarySacrifice =
    sacrificeMode === 'yearly' ? sacrificeValue
    : sacrificeMode === 'monthly' ? sacrificeValue * 12
    : totalIncome * (sacrificeValue / 100)

  const updateBand = (i: number, field: keyof TaxBand, value: string) => {
    const next = [...bands]
    if (field === 'rate') next[i] = { ...next[i], rate: parseFloat(value) || 0 }
    else if (field === 'to') next[i] = { ...next[i], to: value === '' ? null : parseFloat(value) || 0 }
    else next[i] = { ...next[i], from: parseFloat(value) || 0 }
    setBands(next)
  }

  const params: TaxParams = {
    personalAllowance,
    bands,
    allowanceTaper: { threshold: taperThreshold, rate: taperRate },
  }

  const result = calculateIncomeTax(params, totalIncome, salarySacrifice)

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Taxic</h1>

        {/* Parameters */}
        <section className="bg-white rounded-xl shadow p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">Parameters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-sm text-gray-500">Personal Allowance</span>
              <input type="number" className="mt-1 block w-full border rounded px-3 py-2" value={personalAllowance} onChange={e => setPersonalAllowance(+e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-500">Taper Threshold</span>
              <input type="number" className="mt-1 block w-full border rounded px-3 py-2" value={taperThreshold} onChange={e => setTaperThreshold(+e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-500">Taper Rate</span>
              <input type="number" step="0.1" className="mt-1 block w-full border rounded px-3 py-2" value={taperRate} onChange={e => setTaperRate(+e.target.value)} />
            </label>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Tax Bands</h3>
            <div className="space-y-2">
              {bands.map((b, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <input type="number" placeholder="From" className="border rounded px-3 py-1 text-sm" value={b.from} onChange={e => updateBand(i, 'from', e.target.value)} />
                  <input type="number" placeholder="To (empty=∞)" className="border rounded px-3 py-1 text-sm" value={b.to ?? ''} onChange={e => updateBand(i, 'to', e.target.value)} />
                  <input type="number" step="0.01" placeholder="Rate" className="border rounded px-3 py-1 text-sm" value={b.rate} onChange={e => updateBand(i, 'rate', e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Inputs */}
        <section className="bg-white rounded-xl shadow p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">Your Details</h2>
          <label className="block">
            <span className="text-sm text-gray-500">Total Gross Income (yearly)</span>
            <input type="number" className="mt-1 block w-full border rounded px-3 py-2" value={totalIncome} onChange={e => setTotalIncome(+e.target.value)} />
          </label>
          <div>
            <div className="flex items-center gap-4 mb-2">
              <span className="text-sm text-gray-500">Salary Sacrifice</span>
              <div className="flex gap-2 text-sm">
                {(['yearly', 'monthly', 'percent'] as const).map(mode => (
                  <label key={mode} className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="sacrificeMode" checked={sacrificeMode === mode} onChange={() => setSacrificeMode(mode)} />
                    {mode === 'percent' ? '%' : mode}
                  </label>
                ))}
              </div>
            </div>
            <input
              type="number"
              step={sacrificeMode === 'percent' ? '0.5' : '1'}
              className="block w-full border rounded px-3 py-2"
              value={sacrificeValue}
              onChange={e => setSacrificeValue(+e.target.value)}
            />
            {sacrificeMode !== 'yearly' && (
              <div className="text-xs text-gray-400 mt-1">= {fmt(salarySacrifice)} / year</div>
            )}
          </div>
        </section>

        {/* Output */}
        <section className="bg-white rounded-xl shadow p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">Results</h2>
          <div className="flex flex-wrap gap-4">
            <Stat label="Effective Allowance" value={fmt(result.effectiveAllowance)} />
            <Stat label="Income Tax" value={fmt(result.incomeTax)} className="text-red-600" />
            {result.taxSaved > 0 && <Stat label="Tax Saved" value={fmt(result.taxSaved)} className="text-amber-600" />}
          </div>
          <div className="flex flex-wrap gap-4">
            <Stat label="Net Salary (yr)" value={fmt(result.netIncome)} className="text-green-700" />
            <Stat label="Net Salary (mo)" value={fmt(result.netMonthly)} className="text-green-700" />
          </div>
          {result.pension > 0 && (
            <div className="flex flex-wrap gap-4">
              <Stat label="Pension (yr)" value={fmt(result.pension)} className="text-blue-600" />
              <Stat label="Pension (mo)" value={fmt(result.pensionMonthly)} className="text-blue-600" />
            </div>
          )}
          <div className="flex flex-wrap gap-4 border-t pt-3">
            <Stat label="Grand Total (yr)" value={fmt(result.grandTotal)} className="text-gray-900" />
            <Stat label="Grand Total (mo)" value={fmt(result.grandTotalMonthly)} className="text-gray-900" />
          </div>

          {result.breakdown.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Breakdown</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-1">Band</th>
                    <th className="py-1">Rate</th>
                    <th className="py-1 text-right">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {result.breakdown.map((b, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1">{fmt(b.from)} – {fmt(b.to)}</td>
                      <td className="py-1">{pct(b.rate)}</td>
                      <td className="py-1 text-right">{fmt(b.tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex-1 min-w-[120px] text-center">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-lg font-bold ${className}`}>{value}</div>
    </div>
  )
}

export default App
