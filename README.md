# AI Intelligence Index Tracker

A responsive React web app for exploring how the frontier of model intelligence changes over time.

The application presents a chart based on the Artificial Analysis Intelligence Index. It focuses on the model attributes that matter for comparing the frontier:

- Model vendor
- Model name
- Intelligence Index score
- Model release date

## Prototype behavior

The chart displays the cumulative intelligence frontier rather than every model score. Models are sorted by release date, and a model appears as a frontier milestone only when its score exceeds the highest score reached previously. This produces an always-increasing step chart that answers the question: what was the best intelligence score available at each point in time?

The filter controls the dataset used by the chart:

- **Vendor** opens a checkbox menu where any number of model providers can be selected. **All** selects every provider. Unchecking **All** clears every provider; changing any individual vendor clears **All**, and manually selecting every vendor selects **All** again.
- **Order vendors by** controls the vendor list order: A-Z, Z-A, Current Best Index (decreasing), or Current Best Index (increasing). Current Best Index is the highest score currently available for each vendor.

The chart displays a small color legend and a dot for every score belonging to each selected vendor. It overlays one aggregate frontier line across the full timeline of the selected data. When the vendor filter is set to **All**, the chart uses every vendor and the full timeline represented in the current dataset. The interface also reports the current high score, the models included in the filtered view, the visible date range, and the latest frontier milestones.

## Data flow and privacy

At application load, the browser makes one request to the static `models.json` artifact served by GitHub Pages. A scheduled GitHub Actions job requests all pages of the Artificial Analysis Data API language-model dataset, normalizes the required fields, validates the records, and publishes the result with the application. Filters and frontier calculations then run locally; changing a filter never contacts Artificial Analysis again.

GitHub Actions forwards the repository secret in the `x-api-key` header and never sends it to the browser. The generated data artifact is intentionally public because it is served by GitHub Pages; the API key itself is never stored in that artifact. The browser does not use cookies, localStorage, sessionStorage, or IndexedDB, and filter selections disappear when the page is closed or reloaded.

The workflow follows the API's pagination rather than requesting individual model records. This minimizes source interactions while still obtaining the complete dataset required to construct the historical frontier. It runs hourly, so the published snapshot is refreshed without every visitor contacting Artificial Analysis. A new browser load obtains the latest successfully published snapshot.

The app uses the documented [`/api/v2/language/models/free`](https://artificialanalysis.ai/data-api/docs) endpoint instead of scraping the public leaderboard page. The free endpoint provides every field used by this app: model vendor, model name, Intelligence Index score, and release date.

The source's API terms require visible attribution, which is provided in the page footer. Use of the API remains subject to the [Artificial Analysis Terms of Use](https://artificialanalysis.ai/docs/legal/Terms-of-Use.pdf).

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

- `src/App.tsx` contains data loading, vendor filtering and ordering, frontier calculation, chart, milestone list, and source citation.
- `scripts/fetch-models.mjs` retrieves and normalizes all paginated Artificial Analysis model data for the Pages artifact.
- `.github/workflows/deploy-pages.yml` refreshes the data hourly and deploys the static site.
- `src/model-data.ts` contains the pure filtering, vendor ordering, and cumulative-frontier functions.
- `src/model-data.test.ts` covers combined filters and increasing frontier behavior.
- `src/App.css` contains the application layout and responsive visual styling.
- `src/index.css` contains global typography and base styles.
- `.env.example` documents the server-only API key configuration.

## GitHub Pages deployment

The site is configured as a GitHub Pages project site at `https://michaelmallo.github.io/ai-intelligence-index-tracker/`.

1. In repository **Settings → Pages**, set the source to **GitHub Actions**.
2. In **Settings → Secrets and variables → Actions**, create the repository secret `ARTIFICIAL_ANALYSIS_API_KEY`.
3. Push the workflow to `main` or `initial-prototype`, or start it manually from the Actions tab.

The workflow uses the secret only while generating `public/models.json`, builds the app, and deploys the `dist` artifact. The generated JSON is ignored locally and is not committed to the repository.

## Configuration

For local data refreshes, copy `.env.example` to `.env` and run `npm run data:fetch`; `.env` is ignored by Git. This must remain server-side: do not rename the variable with a `VITE_` prefix or expose it in frontend code. GitHub Pages serves the generated model snapshot and never needs the API key at runtime.

Run the quality checks with:

```bash
npm run test
npm run build
```
