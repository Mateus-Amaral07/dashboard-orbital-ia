# Dashboard — Overview View (Home)

## Context

This is an **additive section** to an existing single-file React dashboard that already has:
- Authentication (Supabase Auth + RLS)
- **Leads view** — table with filters, edit modal, dynamic metadata fields
- **Contacts view** — table with filters, read-only
- **Settings view** — custom field config + company info
- Dark/light mode toggle
- Orbital IA branding (logo.png for dark, black_logo.png for light)

---

## What to build

Add a new **"Overview"** view as the **default landing page** after login, positioned as the first item in the sidebar navigation (above Leads and Contacts).

This view pulls data **primarily from the `leads` table** and presents it in a rich, visual, and immediately useful way. It should feel like a smart summary of what's happening — the kind of page a sales manager opens first thing in the morning.

---

## Data available

```
leads: id, company_id, name, telefone, resposta, foi_resposta_manual,
       ai_briefing, demonstrou_interesse, metadata (jsonb), created_at, updated_at

lead_field_config: id, company_id, field_key, field_label, field_type,
                   column_order, is_required, dropdown_options (text[])
(use this to know what's inside each lead's metadata)
```

RLS is active — all queries return only the current user's company data automatically.

---

## Your job

**You decide** which charts, KPIs, and visual components make the most sense given this data.

Think about what would be genuinely useful to someone managing leads from a WhatsApp automation system. Consider: time patterns, conversion signals, response behavior, volume trends, and anything interesting you can derive from the data.

Use **Recharts** (already available in the project) for all charts.

Be creative. Don't just build a generic dashboard — build something that tells a story about the leads data.

**Explicitly excluded fields — never build charts for these:**
- `foi_resposta_manual` (and any chart about manual vs automatic response type)
- `ai_briefing`
- `resposta`

These fields exist in the database but must be completely ignored in the Overview charts.

---

## Custom Fields Charts (critical feature — read carefully)

The company may have configured custom fields for their leads via `lead_field_config`.
These fields are stored inside `leads.metadata` as JSONB.

**Include a dedicated section in the Overview for custom field visualizations.**
No new tables, no schema changes — everything needed is already available.

### Core principle

**Never decide the chart type from `field_type` alone.**
Always combine `field_type` with an analysis of the actual values present in the data.
The goal is to produce charts that are genuinely informative — not just technically correct.

### analyzeField function

Implement a pure function `analyzeField(config, leads)` that runs before rendering:

```
1. Parse metadata: lead.metadata may be a raw JSON string — always do:
     const meta = typeof lead.metadata === 'string' ? JSON.parse(lead.metadata) : lead.metadata
2. Extract values: leads.map(l => { const m = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : l.metadata; return m?.[config.field_key] }).filter(v => v != null && v !== '')
3. If values.length < 3 → return { chartable: false }  // not enough data to be meaningful
4. IMPORTANT: metadata number values may be stored as strings (e.g. "30", "4444").
   Always run parseFloat(value) before any numeric operation — never trust the JS type of the raw value.

field_type === 'boolean':
  - Count trueCount and falseCount
  - Always → DONUT CHART (PieChart with innerRadius set to ~60% of outerRadius)
  - Show percentage in center label
  - Data: [{ name: 'Sim', value: trueCount }, { name: 'Não', value: falseCount }]
  - Always chartable if values.length >= 3

field_type === 'dropdown':
  - Use config.dropdown_options as the master list of possible values
  - Count frequency of each option across all leads (include options with count 0)
  - Decision based on number of defined options:
      • If dropdown_options.length <= 5 → DONUT CHART (PieChart with innerRadius)
        Show each option as a slice, include options with 0 count as thin slices
      • If dropdown_options.length > 5  → HORIZONTAL BAR CHART sorted by frequency descending
  - This is ALWAYS chartable — options are predefined and finite
  - Never skip this type

field_type === 'text':
  - Count distinct values (cardinality)
  - If cardinality > 8 → return { chartable: false }  // free-form text, useless as chart
  - If cardinality <= 8 → HORIZONTAL BAR CHART ranked by frequency descending

field_type === 'number':
  - Parse all values as parseFloat, discard NaN
  - Compute: min, max, mean, stdDev, and array of distinct values
  - Decision tree based on the ACTUAL data distribution:

    a) If min >= 0 AND max <= 100 AND values are spread (stdDev > 5):
         → RADIAL BAR CHART showing the mean value as a single arc on 0–100 scale
         → Display the mean number prominently in the center
         → Add subtitle: "Média: X | Mín: Y | Máx: Z"
         → This handles probability/percentage fields correctly

    b) Else if distinct values count <= 10:
         → VERTICAL BAR CHART with each distinct value on X axis, count on Y axis

    c) Else (many spread-out values):
         → HISTOGRAM: bucket into 5 equal-width ranges
         → Count per bucket, render as vertical bar chart
         → Label each bucket as "X–Y"

  - Always add mean and total filled count as subtitle under chart title

field_type === 'date':
  - Parse values as Date objects, discard invalid
  - Group by month (format: "MMM YYYY") if spread across > 1 month
  - Group by week if all within same month
  - → LINE CHART (LineChart) with count on Y axis and time on X axis
  - Useful for fields like "data_reuniao", "data_followup", "previsao_fechamento"
```

### Rendering rules

- Each chartable field renders as its own card (same style as the rest of the Overview)
- Card header: `field_label` as title
- Card subheader: "X de Y leads preenchidos" (filled count / total leads)
- All charts use `<ResponsiveContainer width="100%" height={220}>`
- Tooltip always enabled with readable formatting (no raw decimals for integer counts)
- Dark mode colors must adapt:
  - Light: blue-600, emerald-500, amber-500, rose-500 as series colors
  - Dark: blue-400, emerald-400, amber-400, rose-400
  - Never hardcode hex values that only work on one background
- If `analyzeField` returns `{ chartable: false }`, silently skip — no empty card, no error message

### Empty state

If NO custom fields exist OR none pass the chartable threshold, render one subtle muted card:
"Configure campos personalizados em Configurações para desbloquear gráficos personalizados"

### Placement

Render this section below the main KPI cards and standard charts, under a clear
section heading: **"Campos Personalizados"**.
It should feel like a natural extension of the dashboard, not an afterthought.

---

## Constraints

- Single file, same component architecture as the rest of the app
- Tailwind only — respect the existing light/dark palettes:
  - **Light:** bg-white cards, gray-50 background, gray borders, blue-700 accents
  - **Dark:** bg-zinc-800 cards, zinc-950 background, zinc-700 borders, blue-500 accents
- All data loaded once on view mount via a single Supabase query (or at most two)
- No new dependencies beyond Recharts (already imported)
- Loading skeleton while data fetches
- If the company has no leads yet, show a friendly empty state
- Charts must be **responsive** (use ResponsiveContainer from Recharts)
- Respect dark mode in chart colors — no hardcoded light colors that break on dark backgrounds

---

## Sidebar update

Add "Overview" as the first nav item with an appropriate icon (unicode or inline SVG).
Make it the **default active view** when the user logs in.
