import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, CalendarDays, ChevronDown, Database, LoaderCircle, Moon, Sun } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import {
  addOneYear,
  buildFrontierChartData,
  calculateFrontier,
  dateValue,
  formatDate,
  generateRegressionPoints,
  getTodayDateString,
  sortVendors,
  type Model,
  type VendorOrder,
} from './model-data'
import './App.css'

const vendorColors = ['#ef6351', '#238b8b', '#d19a35', '#6b5b95', '#4d7ea8', '#b05f78', '#5f8d4e', '#9c6644']

type DataResponse = { models: Model[]; indexVersion: number | null; retrievedAt: string }
type DataState = { status: 'loading' | 'ready' | 'error'; models: Model[]; indexVersion: number | null; retrievedAt: string | null; error: string | null }

let modelsRequest: Promise<DataResponse> | undefined

function loadModels(): Promise<DataResponse> {
  modelsRequest ??= fetch('./models.json', { cache: 'no-store' }).then(async (response) => {
    const payload = await response.json() as Partial<DataResponse> & { error?: string }
    if (!response.ok) throw new Error(payload.error ?? 'Unable to load model data')
    if (!Array.isArray(payload.models) || typeof payload.retrievedAt !== 'string') throw new Error('The data service returned an invalid response')
    return payload as DataResponse
  })
  return modelsRequest
}

function App() {
  const [data, setData] = useState<DataState>({ status: 'loading', models: [], indexVersion: null, retrievedAt: null, error: null })
  const [allSelected, setAllSelected] = useState(true)
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [vendorOrder, setVendorOrder] = useState<VendorOrder>('A-Z')
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return sessionStorage.getItem('theme') === 'dark'
    } catch {
      return false
    }
  })
  const [vendorMenuOpen, setVendorMenuOpen] = useState(false)
  const vendorMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadModels().then((result) => setData({ status: 'ready', models: result.models, indexVersion: result.indexVersion, retrievedAt: result.retrievedAt, error: null })).catch((error: unknown) => setData({ status: 'error', models: [], indexVersion: null, retrievedAt: null, error: error instanceof Error ? error.message : 'Unable to load model data' }))
  }, [])

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (vendorMenuRef.current && !vendorMenuRef.current.contains(event.target as Node)) setVendorMenuOpen(false)
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', darkMode)
    try {
      sessionStorage.setItem('theme', darkMode ? 'dark' : 'light')
    } catch {
    }
    return () => document.documentElement.classList.remove('dark-mode')
  }, [darkMode])

  const options = useMemo(() => ({
    vendors: sortVendors(data.models, vendorOrder),
    vendorOrders: ['A-Z', 'Z-A', 'Current Best Index (decreasing)', 'Current Best Index (increasing)'] as VendorOrder[],
  }), [data.models, vendorOrder])
  const activeVendors = allSelected ? options.vendors : selectedVendors
  const filteredModels = useMemo(() => data.models.filter((model) => activeVendors.includes(model.vendor)), [activeVendors, data.models])
  const frontier = useMemo(() => calculateFrontier(filteredModels), [filteredModels])
  const timelineBounds = useMemo(() => {
    if (filteredModels.length === 0) return { start: undefined, frontierEnd: undefined, axisEnd: undefined }
    const sorted = [...filteredModels].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
    const start = sorted[0]?.releaseDate
    const latest = sorted.at(-1)?.releaseDate
    const today = getTodayDateString()
    const frontierEnd = latest ? (today > latest ? today : latest) : undefined
    const axisEnd = frontierEnd ? addOneYear(frontierEnd) : undefined
    return { start, frontierEnd, axisEnd }
  }, [filteredModels])
  const timelineStart = timelineBounds.start
  const frontierEnd = timelineBounds.frontierEnd
  const axisEnd = timelineBounds.axisEnd
  const chartData = useMemo(() => buildFrontierChartData(frontier, frontierEnd), [frontier, frontierEnd])
  const regressionData = useMemo(
    () => (timelineStart && axisEnd ? generateRegressionPoints(frontier, timelineStart, axisEnd) : []),
    [frontier, timelineStart, axisEnd],
  )
  const yAxisConfig = useMemo(() => {
    const maxVal = regressionData.reduce((max, pt) => Math.max(max, pt.regression), 0)
    if (maxVal <= 100) {
      return { domain: [0, 100] as [number, number], ticks: [0, 20, 40, 60, 80, 100] }
    }
    const top = Math.ceil(maxVal / 20) * 20
    const ticks: number[] = []
    const step = top <= 120 ? 20 : 50
    for (let t = 0; t <= top; t += step) {
      ticks.push(t)
    }
    if (ticks[ticks.length - 1] !== top) {
      ticks.push(top)
    }
    return { domain: [0, top] as [number, number], ticks }
  }, [regressionData])
  const vendorPoints = useMemo(() => activeVendors.map((vendor) => ({ vendor, color: vendorColors[options.vendors.indexOf(vendor) % vendorColors.length], data: data.models.filter((model) => model.vendor === vendor).map((model) => ({ ...model, x: dateValue(model.releaseDate), y: model.score })) })), [activeVendors, data.models, options.vendors])
  const highest = filteredModels.reduce((best, model) => !best || model.score > best.score ? model : best, filteredModels[0])
  const timelineDomain: [number, number] | undefined = timelineStart && axisEnd
    ? [dateValue(timelineStart), dateValue(axisEnd)]
    : undefined
  function toggleVendor(vendor: string) {
    if (vendor === 'All') {
      setAllSelected((current) => !current)
      setSelectedVendors([])
      return
    }
    setSelectedVendors((current) => {
      const next = allSelected
        ? options.vendors.filter((item) => item !== vendor)
        : current.includes(vendor) ? current.filter((item) => item !== vendor) : [...current, vendor]
      if (next.length === options.vendors.length) {
        setAllSelected(true)
        return []
      }
      setAllSelected(false)
      return next
    })
  }

  return (
    <main className={`app-shell${darkMode ? ' dark-mode' : ''}`}>
      <button className="theme-toggle" type="button" aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDarkMode((current) => !current)}>{darkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
      <section className="intro"><p className="eyebrow">MODEL FRONTIER {data.indexVersion ? `/ INDEX V${data.indexVersion}` : ''}</p><h1>How fast is the frontier moving?</h1><p className="lede">A living view of the highest intelligence index score reached over time.</p></section>
      {data.status === 'loading' && <section className="data-message"><LoaderCircle className="spinner" size={20} /><span>Loading the latest model data...</span></section>}
      {data.status === 'error' && <section className="data-message error"><strong>Model data could not be loaded.</strong><span>{data.error}</span><small>The scheduled GitHub data refresh may not have completed yet. Try again after the next deployment.</small></section>}
      {data.status === 'ready' && <>
        <section className="control-bar" aria-label="Chart filters"><div className="filters"><div className="vendor-field" ref={vendorMenuRef}><span className="field-label">Vendor</span><button className="vendor-trigger" type="button" aria-expanded={vendorMenuOpen} onClick={() => setVendorMenuOpen((open) => !open)}>Select vendors<ChevronDown size={15} /></button>{vendorMenuOpen && <div className="vendor-menu" role="group" aria-label="Select vendors"><label className="vendor-option"><input type="checkbox" checked={allSelected} onChange={() => toggleVendor('All')} />All</label>{options.vendors.map((option) => <label className="vendor-option" key={option}><input type="checkbox" checked={allSelected || selectedVendors.includes(option)} onChange={() => toggleVendor(option)} />{option}</label>)}</div>}</div><label>Order vendors by<select value={vendorOrder} onChange={(event) => setVendorOrder(event.target.value as VendorOrder)}>{options.vendorOrders.map((option) => <option key={option}>{option}</option>)}</select></label></div></section>
        <section className="chart-section"><div className="chart-header"><div><p className="section-kicker">CUMULATIVE FRONTIER</p><h2>Intelligence Index</h2></div><div className="metric"><span>Current high</span><strong>{highest?.score ?? '—'}</strong><small>{highest?.name ?? 'No matching models'}</small></div></div><div className="chart-body"><div className="chart-wrap">{chartData.length > 0 ? <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}><CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="2 5" /><XAxis type="number" dataKey="x" domain={timelineDomain ?? ['auto', 'auto']} axisLine={false} tickLine={false} tickFormatter={(value: number) => formatDate(new Date(value).toISOString().slice(0, 10))} tick={{ fill: 'var(--muted-text)', fontSize: 12 }} dy={6} /><YAxis domain={yAxisConfig.domain} ticks={yAxisConfig.ticks} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-text)', fontSize: 12 }} width={38} /><Tooltip labelFormatter={(value) => formatDate(new Date(Number(value)).toISOString().slice(0, 10))} />{regressionData.length > 0 && <Line data={regressionData} type="monotone" dataKey="regression" name="Exponential fit" stroke="var(--regression-line)" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} />}<Line type="stepAfter" dataKey="frontier" name="Frontier" stroke="var(--frontier-line)" strokeWidth={3} dot={false} activeDot={false} />{vendorPoints.map((series) => <Scatter key={series.vendor} name={series.vendor} data={series.data} dataKey="y" xAxisId={0} yAxisId={0} fill={series.color} line={false} shape={<circle r={2} />} />)}</LineChart></ResponsiveContainer> : <div className="empty-state">No models match these filters.</div>}</div><div className="vendor-legend"><span><i className="legend-swatch frontier-swatch" />Frontier</span>{regressionData.length > 0 && <span><i className="legend-swatch regression-swatch" />Exponential fit</span>}{vendorPoints.map((series) => <span key={series.vendor}><i className="legend-swatch" style={{ backgroundColor: series.color }} />{series.vendor}</span>)}</div></div><div className="chart-foot"><span><CalendarDays size={14} /> {timelineStart ? `${formatDate(timelineStart)} – ${formatDate(axisEnd ?? timelineStart)}` : 'No timeline'}</span><span><Database size={14} /> {filteredModels.length} models in view</span></div></section>
        <section className="frontier-list"><div><p className="section-kicker">MILESTONES</p><h2>Frontier breakthroughs</h2></div><div className="milestones" aria-label="All frontier breakthroughs">{[...frontier].reverse().map((model) => <article key={model.name}><span className="milestone-score">{model.score}</span><div><strong>{model.name}</strong><p>{model.vendor} · {model.date}</p></div></article>)}</div></section>
      </>}
      <footer><a className="source-citation" href="https://artificialanalysis.ai/leaderboards/models" target="_blank" rel="noreferrer"><span className="source-label">Data provided by</span><img className="source-logo" src={darkMode ? './artificial-analysis-logo-white.svg' : './artificial-analysis-logo-black.svg'} alt="Artificial Analysis" /><ArrowUpRight size={14} /></a><span>{data.retrievedAt ? `Retrieved ${new Date(data.retrievedAt).toLocaleString()}` : 'Data is loaded once per page load; nothing is stored in the browser.'}</span></footer>
    </main>
  )
}

export default App
