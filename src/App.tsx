import { useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, Database, SlidersHorizontal } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './App.css'

type Model = { vendor: string; name: string; score: number; releaseDate: string; openness: 'Open weights' | 'Closed'; country: string }

const models: Model[] = [
  { vendor: 'OpenAI', name: 'GPT-4o', score: 57, releaseDate: '2024-05-13', openness: 'Closed', country: 'United States' },
  { vendor: 'Anthropic', name: 'Claude 3.5 Sonnet', score: 61, releaseDate: '2024-06-20', openness: 'Closed', country: 'United States' },
  { vendor: 'Google', name: 'Gemini 1.5 Pro', score: 60, releaseDate: '2024-06-27', openness: 'Closed', country: 'United States' },
  { vendor: 'Meta', name: 'Llama 3.1 405B', score: 64, releaseDate: '2024-07-23', openness: 'Open weights', country: 'United States' },
  { vendor: 'OpenAI', name: 'o1-preview', score: 72, releaseDate: '2024-09-12', openness: 'Closed', country: 'United States' },
  { vendor: 'DeepSeek', name: 'DeepSeek-V3', score: 68, releaseDate: '2024-12-26', openness: 'Open weights', country: 'China' },
  { vendor: 'Anthropic', name: 'Claude 3.7 Sonnet', score: 78, releaseDate: '2025-02-24', openness: 'Closed', country: 'United States' },
  { vendor: 'Google', name: 'Gemini 2.5 Pro', score: 84, releaseDate: '2025-03-25', openness: 'Closed', country: 'United States' },
  { vendor: 'Moonshot AI', name: 'Kimi K2', score: 74, releaseDate: '2025-07-11', openness: 'Open weights', country: 'China' },
  { vendor: 'OpenAI', name: 'GPT-5', score: 86, releaseDate: '2025-08-07', openness: 'Closed', country: 'United States' },
]

const allOption = 'All'
const formatDate = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))

function App() {
  const [vendor, setVendor] = useState(allOption)
  const [country, setCountry] = useState(allOption)
  const [openness, setOpenness] = useState(allOption)
  const options = useMemo(() => ({ vendors: [allOption, ...new Set(models.map((model) => model.vendor))], countries: [allOption, ...new Set(models.map((model) => model.country))], openness: [allOption, ...new Set(models.map((model) => model.openness))] }), [])
  const filteredModels = useMemo(() => models.filter((model) => (vendor === allOption || model.vendor === vendor) && (country === allOption || model.country === country) && (openness === allOption || model.openness === openness)), [country, openness, vendor])
  const frontier = useMemo(() => { let highest = 0; return [...filteredModels].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate)).filter((model) => { if (model.score <= highest) return false; highest = model.score; return true }).map((model) => ({ ...model, date: formatDate(model.releaseDate) })) }, [filteredModels])
  const highest = frontier.at(-1)
  const timelineStart = filteredModels[0]?.releaseDate
  const timelineEnd = filteredModels.at(-1)?.releaseDate

  return (
    <main className="app-shell">
      <header className="topbar"><div className="brand"><span className="brand-mark">AI</span><span>Intelligence Index</span></div><span className="status"><span className="status-dot" /> Prototype dataset</span></header>
      <section className="intro"><p className="eyebrow">MODEL FRONTIER / 2024–2025</p><h1>How fast is the frontier moving?</h1><p className="lede">A living view of the highest intelligence index score reached over time.</p></section>
      <section className="control-bar" aria-label="Chart filters"><div className="control-heading"><SlidersHorizontal size={17} /><span>Filter the frontier</span></div><div className="filters"><label>Vendor<select value={vendor} onChange={(event) => setVendor(event.target.value)}>{options.vendors.map((option) => <option key={option}>{option}</option>)}</select></label><label>Country<select value={country} onChange={(event) => setCountry(event.target.value)}>{options.countries.map((option) => <option key={option}>{option}</option>)}</select></label><label>Openness<select value={openness} onChange={(event) => setOpenness(event.target.value)}>{options.openness.map((option) => <option key={option}>{option}</option>)}</select></label></div></section>
      <section className="chart-section"><div className="chart-header"><div><p className="section-kicker">CUMULATIVE FRONTIER</p><h2>Intelligence index over time</h2></div><div className="metric"><span>Current high</span><strong>{highest?.score ?? '—'}</strong><small>{highest?.name ?? 'No matching models'}</small></div></div><div className="chart-wrap">{frontier.length > 0 ? <ResponsiveContainer width="100%" height="100%"><LineChart data={frontier} margin={{ top: 20, right: 20, bottom: 10, left: 0 }}><CartesianGrid stroke="#dfe4e2" vertical={false} strokeDasharray="2 5" /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7773', fontSize: 12 }} dy={10} /><YAxis domain={[40, 100]} axisLine={false} tickLine={false} tick={{ fill: '#6b7773', fontSize: 12 }} width={34} /><Tooltip content={({ active, payload }) => active && payload?.[0] ? <div className="tooltip"><strong>{payload[0].payload.score}</strong><span>{payload[0].payload.name}</span><small>{payload[0].payload.vendor} · {payload[0].payload.date}</small></div> : null} /><Line type="stepAfter" dataKey="score" stroke="#ef6351" strokeWidth={3} dot={{ r: 5, fill: '#f8f7f2', stroke: '#ef6351', strokeWidth: 3 }} activeDot={{ r: 7 }} /></LineChart></ResponsiveContainer> : <div className="empty-state">No models match these filters.</div>}</div><div className="chart-foot"><span><CalendarDays size={14} /> {timelineStart ? `${formatDate(timelineStart)} – ${formatDate(timelineEnd ?? timelineStart)}` : 'No timeline'}</span><span><Database size={14} /> {filteredModels.length} models in view</span></div></section>
      <section className="frontier-list"><div><p className="section-kicker">MILESTONES</p><h2>Frontier breakthroughs</h2></div><div className="milestones">{frontier.slice(-3).reverse().map((model) => <article key={model.name}><span className="milestone-score">{model.score}</span><div><strong>{model.name}</strong><p>{model.vendor} · {model.date}</p></div></article>)}</div></section>
      <footer>Data source: <a href="https://artificialanalysis.ai/leaderboards/models" target="_blank" rel="noreferrer">Artificial Analysis Intelligence Index <ArrowUpRight size={14} /></a><span>Prototype snapshot · scores and metadata will be refreshed from source</span></footer>
    </main>
  )
}

export default App
