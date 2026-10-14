# A Clean Glean

A local interactive visualization builder for Glean Canvas. Choose a US account map, trend chart, or ranked comparison; import a CSV/TSV table or paste rows; map columns; set titles, source, data date, color, font, and optional logo; preview; then download a self-contained HTML snapshot. Save an editable JSON project or a separate brand preset to reuse later. No packages, accounts, or external services are required.

The map has tier filters, state selection, account search, and a ranked state table. The trend chart has series toggles and date filters. Ranked bars have sort, search, selectable values, and a data table. All examples are explicitly labeled synthetic. Imported data stays local in the browser until you download a file or deliberately upload it elsewhere.

## Run locally

Requires Node.js 20 or later. No packages need to be installed.

```sh
npm start
```

Open `http://127.0.0.1:4173`. The server binds only to your computer's loopback interface. You can also open `dist/index.html` directly if you do not need the local server.

To build and check the builder:

```sh
npm run build
npm test
```

The build produces `dist/index.html` (builder), `dist/account-map.html`, `dist/examples/trend.html`, and `dist/examples/comparison.html`. The three standalone examples are synthetic; replace their data before using them for decisions.

## Using your own data

1. Pick a visual. Paste a table with headers, or choose a CSV/TSV file, then select **Map columns**.
2. Check each field assignment. Required fields have an asterisk. Select **Apply imported data**. For map accounts, review possible duplicates and explicitly keep all rows or remove later matches.
3. Enter a source note and data date. Set presentation and brand choices. Interact with the preview to confirm totals, filters, values, and labels.
4. Select **Save editable project** to retain the data and settings for later. Select **Download HTML** to create the snapshot you will bring into Glean.
5. Upload the `.html` file to Glean Canvas. A path to a file on your computer is not accessible to Glean's remote environment. Check the Canvas artifact after Glean processes it.

**Map columns:** account name, HQ state, tier (`1`–`4` or `Tier 1`–`Tier 4`); account ID is optional. Full US state names and postal abbreviations are accepted. Outside-US and blank locations remain visible as separate groups.

**Trend columns:** ISO date (`YYYY-MM-DD`), numeric value; optional series and annotation. One point per date/series pair. **Ranked bars:** category and numeric value; optional annotation. Category names must be unique. Duplicate trend points and categories require correction; the builder does not aggregate them silently.

The **Download sample HTML** and **Copy Glean prompt** controls support a separate workflow: ask Glean to populate an example with authorized data. Verify the returned rows, counts, source, and interactions. A Glean Canvas HTML artifact is a snapshot until a separate, supported refresh process is configured and tested.

The builder interface uses [Plus Jakarta Sans](https://github.com/google/fonts/tree/main/ofl/plusjakartasans) at regular and medium weights. The font selector also offers Plus Jakarta Sans for exported visuals, alongside system sans-serif, serif, and monospace. Plus Jakarta Sans is bundled under the [SIL Open Font License](assets/fonts/OFL.txt); US map geometry comes from US Atlas and retains its [license](assets/US-ATLAS-LICENSE.txt). All fonts and geometry are embedded in the exported HTML, with no runtime network request.

The builder does not publish into a Glean dashboard automatically. Upload an exported HTML file into Canvas and verify it in your Glean environment. [Glean's interactive-artifact documentation](https://docs.glean.com/user-guide/assistant/html-artifacts) describes the host environment; tenant behavior and refresh configuration need their own checks.
