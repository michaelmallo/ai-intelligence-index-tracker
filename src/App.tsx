import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, Database, LoaderCircle } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { calculateFrontier, filterModels, formatDate, sortVendors, type Model, type VendorOrder } from './model-data'
import './App.css'

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
  const [vendor, setVendor] = useState('All')
  const [vendorOrder, setVendorOrder] = useState<VendorOrder>('A-Z')

  useEffect(() => {
    loadModels().then((result) => setData({ status: 'ready', models: result.models, indexVersion: result.indexVersion, retrievedAt: result.retrievedAt, error: null })).catch((error: unknown) => setData({ status: 'error', models: [], indexVersion: null, retrievedAt: null, error: error instanceof Error ? error.message : 'Unable to load model data' }))
  }, [])

  const options = useMemo(() => ({
    vendors: ['All', ...sortVendors(data.models, vendorOrder)],
    vendorOrders: ['A-Z', 'Z-A', 'Current Best Index (decreasing)', 'Current Best Index (increasing)'] as VendorOrder[],
  }), [data.models, vendorOrder])
  const filteredModels = useMemo(() => filterModels(data.models, vendor), [data.models, vendor])
  const frontier = useMemo(() => calculateFrontier(filteredModels), [filteredModels])
  const highest = frontier.at(-1)
  const timelineModels = [...filteredModels].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
  const timelineStart = timelineModels[0]?.releaseDate
  const timelineEnd = timelineModels.at(-1)?.releaseDate

  return (
    <main className="app-shell">
      <header className="topbar"><div className="brand"><span className="brand-mark">AI</span><span>Intelligence Index</span></div><span className="status"><span className={`status-dot ${data.status}`} /> {data.status === 'ready' ? `Index v${data.indexVersion ?? '—'}` : data.status === 'loading' ? 'Loading data' : 'Data unavailable'}</span></header>
      <section className="intro"><p className="eyebrow">MODEL FRONTIER {data.indexVersion ? `/ INDEX V${data.indexVersion}` : ''}</p><h1>How fast is the frontier moving?</h1><p className="lede">A living view of the highest intelligence index score reached over time.</p></section>
      {data.status === 'loading' && <section className="data-message"><LoaderCircle className="spinner" size={20} /><span>Loading the latest model data...</span></section>}
      {data.status === 'error' && <section className="data-message error"><strong>Model data could not be loaded.</strong><span>{data.error}</span><small>The scheduled GitHub data refresh may not have completed yet. Try again after the next deployment.</small></section>}
      {data.status === 'ready' && <>
        <section className="control-bar" aria-label="Chart filters"><div className="filters"><label>Vendor<select value={vendor} onChange={(event) => setVendor(event.target.value)}>{options.vendors.map((option) => <option key={option}>{option}</option>)}</select></label><label>Order vendors by<select value={vendorOrder} onChange={(event) => setVendorOrder(event.target.value as VendorOrder)}>{options.vendorOrders.map((option) => <option key={option}>{option}</option>)}</select></label></div></section>
        <section className="chart-section"><div className="chart-header"><div><p className="section-kicker">CUMULATIVE FRONTIER</p><h2>Intelligence Index</h2></div><div className="metric"><span>Current high</span><strong>{highest?.score ?? '—'}</strong><small>{highest?.name ?? 'No matching models'}</small></div></div><div className="chart-wrap">{frontier.length > 0 ? <ResponsiveContainer width="100%" height="100%"><LineChart data={frontier} margin={{ top: 20, right: 20, bottom: 10, left: 0 }}><CartesianGrid stroke="#dfe4e2" vertical={false} strokeDasharray="2 5" /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7773', fontSize: 12 }} dy={10} /><YAxis domain={[40, 100]} axisLine={false} tickLine={false} tick={{ fill: '#6b7773', fontSize: 12 }} width={34} /><Tooltip content={({ active, payload }) => active && payload?.[0] ? <div className="tooltip"><strong>{payload[0].payload.score}</strong><span>{payload[0].payload.name}</span><small>{payload[0].payload.vendor} · {payload[0].payload.date}</small></div> : null} /><Line type="stepAfter" dataKey="score" stroke="#ef6351" strokeWidth={3} dot={{ r: 5, fill: '#f8f7f2', stroke: '#ef6351', strokeWidth: 3 }} activeDot={{ r: 7 }} /></LineChart></ResponsiveContainer> : <div className="empty-state">No models match these filters.</div>}</div><div className="chart-foot"><span><CalendarDays size={14} /> {timelineStart ? `${formatDate(timelineStart)} – ${formatDate(timelineEnd ?? timelineStart)}` : 'No timeline'}</span><span><Database size={14} /> {filteredModels.length} models in view</span></div></section>
        <section className="frontier-list"><div><p className="section-kicker">MILESTONES</p><h2>Frontier breakthroughs</h2></div><div className="milestones" aria-label="All frontier breakthroughs">{[...frontier].reverse().map((model) => <article key={model.name}><span className="milestone-score">{model.score}</span><div><strong>{model.name}</strong><p>{model.vendor} · {model.date}</p></div></article>)}</div></section>
      </>}
      <footer><a className="source-citation" href="https://artificialanalysis.ai/leaderboards/models" target="_blank" rel="noreferrer"><span className="source-label">Data provided by</span><img className="source-logo" src="./artificial-analysis-logo.svg" alt="Artificial Analysis" /><ArrowUpRight size={14} /></a><span>{data.retrievedAt ? `Retrieved ${new Date(data.retrievedAt).toLocaleString()}` : 'Data is loaded once per page load; nothing is stored in the browser.'}</span></footer>
    </main>
  )
}

export default App
