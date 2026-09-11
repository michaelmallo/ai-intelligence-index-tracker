# AI Intelligence Index Tracker

A responsive React web app for exploring how the frontier of model intelligence changes over time.

The application presents a chart based on the Artificial Analysis Intelligence Index. It focuses on the model attributes that matter for comparing the frontier:

- Model vendor
- Model name
- Intelligence Index score
- Model release date
- Openness, represented as open weights or closed
- Country of origin

## Prototype behavior

The chart displays the cumulative intelligence frontier rather than every model score. Models are sorted by release date, and a model appears as a frontier milestone only when its score exceeds the highest score reached previously. This produces an always-increasing step chart that answers the question: what was the best intelligence score available at each point in time?

The three filters work together as one combined dataset filter:

- **Vendor** selects a specific model provider or all providers.
- **Country** selects a country of origin or all countries.
- **Openness** selects open weights, closed models, or all model types.

The chart recalculates the frontier from the filtered models. When all filters are set to **All**, the chart uses the full timeline represented in the current dataset. The interface also reports the current high score, the models included in the filtered view, the visible date range, and the latest frontier milestones.

## Current data status

This branch contains an initial prototype snapshot with representative model records shaped around the Artificial Analysis leaderboard fields. It is intentionally structured so the static `models` collection in `src/App.tsx` can later be replaced by a data ingestion layer or API response.

The intended source is the [Artificial Analysis Intelligence Index leaderboard](https://artificialanalysis.ai/leaderboards/models). The source should be checked before production use so the displayed scores, release dates, openness classifications, vendor metadata, and countries remain current and correctly attributed.

## Technology

- React
- TypeScript
- Vite
- Recharts
- Lucide React
- Responsive CSS with desktop and mobile layouts

## Local development

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

The app is then available at the local URL printed by Vite, normally `http://localhost:5173/`.

Create a production build with:

```bash
npm run build
```

## Project structure

- `src/App.tsx` contains the prototype data shape, filtering logic, frontier calculation, chart, milestone list, and source citation.
- `src/App.css` contains the application layout and responsive visual styling.
- `src/index.css` contains global typography and base styles.

## Next steps

1. Replace the prototype snapshot with a reliable, refreshed Artificial Analysis data source.
2. Add data validation for missing or ambiguous metadata.
3. Decide how historical score revisions should be versioned.
4. Add automated tests for combined filtering and frontier calculation.
5. Add loading, error, and stale-data states for the live data flow.
