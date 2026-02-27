# Refactor: Split App.jsx into Multi-File Architecture

## Objective

Refactor the existing single-file `src/App.jsx` (~1700 lines) into a clean
multi-file component structure **without changing any functionality, logic,
visual appearance, or behavior**. This is a pure structural refactor — zero
feature changes, zero bug introductions.

---

## Critical Rules

- **DO NOT change any logic, state management, or data fetching**
- **DO NOT change any Tailwind classes or visual styling**
- **DO NOT change any Supabase queries or RLS handling**
- **DO NOT rename any functions, components, or variables**
- **DO NOT add or remove any features**
- **DO NOT change how dark mode works**
- **DO NOT change how authentication works**
- **Every import must be explicitly verified before the refactor is complete**
- If unsure whether a piece of code belongs in a shared file or a view file,
  keep it where it currently is — don't guess

---

## Current Structure (single file)

The existing `App.jsx` contains all of the following in one file:
- Supabase client initialization
- Auth state management and login screen
- Dark mode toggle and localStorage persistence
- Sidebar navigation
- `OverviewView` component with Recharts charts and `analyzeField` logic
- `LeadsView` component with table, filters, pagination, and edit modal
- `ContactsView` component with table and filters
- `SettingsView` component with custom field config and company info
- Shared helper functions (e.g. `formatNumberValue`, date formatters)
- Orbital IA branding logic (logo.png / black_logo.png switching)
- Main `App` component that orchestrates everything

---

## Target File Structure

```
src/
├── App.jsx                          ← slim orchestrator only (~100-150 lines)
├── supabaseClient.js                ← supabase client init only
├── utils/
│   └── formatters.js                ← all pure helper/formatting functions
├── components/
│   ├── Sidebar.jsx                  ← sidebar nav + branding
│   ├── LoginScreen.jsx              ← login form + Orbital IA branding
│   └── DarkModeToggle.jsx           ← toggle button component
└── views/
    ├── OverviewView.jsx             ← overview charts + analyzeField
    ├── LeadsView.jsx                ← leads table + filters + edit modal
    ├── ContactsView.jsx             ← contacts table + filters
    └── SettingsView.jsx             ← custom field config + company info
```

---

## Step-by-Step Instructions

### Step 1 — supabaseClient.js

Extract only the Supabase client initialization:

```js
// src/supabaseClient.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

Every other file that needs Supabase imports from here.
Remove the initialization from App.jsx after extracting.

---

### Step 2 — utils/formatters.js

Extract ALL pure helper functions that don't depend on React state.
These typically include:
- `formatNumberValue(value, number_format)`
- Any date formatting helpers
- Any string/slug utility functions

```js
// src/utils/formatters.js
export function formatNumberValue(value, format) { ... }
// etc.
```

---

### Step 3 — views/ (one file per view)

Extract each view component into its own file.
Each view file:
- Imports `supabase` from `../supabaseClient`
- Imports any needed formatters from `../utils/formatters`
- Exports the component as a **named export** (not default)
- Keeps ALL its internal state, useEffect hooks, and sub-components
  (e.g. the LeadEditModal stays inside LeadsView.jsx, not extracted further)

```jsx
// src/views/LeadsView.jsx
import { supabase } from '../supabaseClient'
import { formatNumberValue } from '../utils/formatters'

export function LeadsView({ darkMode }) { ... }
```

Pass only the props each view actually needs. Identify these by looking at
what each view currently receives or reads from closure in the original file.
Common props will likely be: `darkMode` (boolean).

---

### Step 4 — components/

**LoginScreen.jsx**
- Extract the full login form UI
- Receives props: `darkMode`, `onLogin` (or however auth currently works)
- Keeps the Orbital IA logo logic (logo.png / black_logo.png switching)

**Sidebar.jsx**
- Extract the `<aside>` element and all its contents
- Receives props: `darkMode`, `activeView`, `setActiveView`,
  `companyName`, `userName`, `onLogout`
- Keeps the Orbital IA footer branding

**DarkModeToggle.jsx**
- Extract the sun/moon toggle button
- Receives props: `darkMode`, `setDarkMode`

---

### Step 5 — App.jsx (slim orchestrator)

After all extractions, App.jsx should contain ONLY:
- Imports of all extracted components and views
- Supabase auth state (session, user, profile, company)
- `useState` for `activeView` and `darkMode`
- `useEffect` for session listener and localStorage dark mode persistence
- The top-level render: login screen OR dashboard layout
- The dashboard layout: sidebar + main content area with view switching

App.jsx should NOT contain any view-specific logic, chart code, table
rendering, or modal code after the refactor.

---

## Props Identification Guide

Before moving any component, trace what data it currently accesses.
If it reads a variable from the outer closure, that variable must become a prop.

Likely prop requirements per component:
```
LoginScreen:    darkMode
Sidebar:        darkMode, activeView, setActiveView, companyName, userName, onLogout
DarkModeToggle: darkMode, setDarkMode
OverviewView:   darkMode
LeadsView:      darkMode
ContactsView:   darkMode
SettingsView:   darkMode
```

If any view currently accesses `company`, `profile`, or other auth data
directly, pass those as props too — check the original file carefully.

---

## Verification Checklist

After the refactor, verify each of the following before considering it done:

**Build**
- [ ] App compiles with zero errors and zero missing import warnings
- [ ] `npm run dev` starts successfully

**Auth**
- [ ] Login screen renders correctly in both light and dark mode
- [ ] Correct logo shows per mode (black_logo.png light / logo.png dark)
- [ ] Successful login navigates to Overview
- [ ] Logout returns to login screen

**Navigation**
- [ ] Sidebar shows all 4 nav items: Overview, Leads, Contacts, Settings
- [ ] Active view highlights correctly
- [ ] Dark mode toggle works and persists on page refresh

**Each view**
- [ ] Overview: KPI cards load, all charts render, custom field charts appear
- [ ] Leads: table loads, filters work, edit modal opens and saves correctly
- [ ] Contacts: table loads, filters work
- [ ] Settings: custom field list loads, add/edit/delete fields works,
      company info section shows

**Dark mode**
- [ ] Every view looks correct in dark mode
- [ ] No hardcoded colors appear broken in either mode
- [ ] Charts respect dark mode colors

**No regressions**
- [ ] Custom field charts still use analyzeField logic correctly
- [ ] Number formatting (%, R$, $) still works in table and modal preview
- [ ] Dropdown fields still render as select in lead edit modal
- [ ] RLS still works — users only see their own company's data

---

## What NOT to do

- Do not convert class components to functional (there shouldn't be any, but don't touch)
- Do not upgrade or change any library versions
- Do not add TypeScript, PropTypes, or any type annotations
- Do not add new abstractions, hooks, or context providers not already present
- Do not reorder the logic inside any component — only move it, verbatim
- Do not change the Supabase query structure in any view
- Do not split views into smaller sub-components beyond what's listed above
  (e.g. do not extract LeadEditModal into its own file — keep it in LeadsView.jsx)