# PreFlightML Frontend Redesign Spec

This document defines the target UX/UI for the PreFlightML frontend. It is a product design and implementation guide for a premium, enterprise-grade dataset auditing experience built with Next.js 14 App Router, Tailwind CSS, shadcn/ui, and Recharts.

The goal is not to make the app feel like a generic dashboard. The goal is to make it feel like continuous ML dataset governance: operational, trustworthy, scientifically grounded, and AI-assisted.

---

## 1. Product Summary

PreFlightML accepts a raw CSV dataset, runs multiple auditors concurrently, computes a weighted quality score, generates AI preprocessing recommendations, simulates remediation impact, and exports a reproducible bundle.

The frontend should communicate four things immediately:

1. Trust: this is serious infrastructure for ML teams.
2. Transparency: the system shows what it found and why.
3. Scientific rigor: scores, breakdowns, comparisons, and simulation are evidence-driven.
4. Reproducibility: exported bundles are reproducible artifacts, not just downloads.

The UI should feel closer to Vercel, Linear, Stripe, Datadog, or Sentry than to a conventional BI dashboard.

---

## 2. Design Principles

### 2.1 Visual Tone

- Minimal, whitespace-heavy, desktop-first layouts.
- Strong typographic hierarchy.
- Progressive disclosure instead of dense always-visible content.
- Monochrome-first palette with severity colors used only when semantically necessary.
- Restrained motion, soft borders, subtle elevation, and calm transitions.
- Enterprise trust over decorative flourish.

### 2.2 What the UI Should Never Feel Like

- Generic admin dashboard.
- Kaggle notebook or Power BI.
- Neon gradients, oversized glows, or decorative charts.
- Dense tables everywhere.
- A product demo that hides operational details behind pretty visuals.

### 2.3 Severity Color System

Use the severity palette consistently everywhere:

- critical: `red-500` text / `red-950` background tint
- warning: `amber-500` text / `amber-950` background tint
- healthy: `emerald-500` text / `emerald-950` background tint
- info: `slate-400` text / `slate-800` background tint

Do not substitute arbitrary blues or purples for severity states.

---

## 3. Routing Architecture

The application should expose only two user-facing routes:

- `/dashboard`
- `/jobs/[id]`

Everything related to a dataset audit belongs inside the job workspace route. The dashboard is the control tower; the job workspace is the execution environment.

Current backend and API helpers remain unchanged. The frontend should reorganize around those two routes while continuing to use the existing backend contract in `frontend/lib/api.js`.

---

## 4. Information Architecture

### 4.1 Dashboard = Operations Overview

The dashboard answers:

- What is the overall state of dataset audits?
- Which datasets are failing quality checks?
- What changed recently?
- Which jobs need attention?
- How is data health trending over time?

### 4.2 Job Workspace = Investigation and Remediation

The workspace answers:

- What is the audit doing right now?
- What findings exist and how severe are they?
- What should be remediated?
- What is the expected impact of remediation?
- What export artifact can be downloaded and reproduced later?

The dashboard is a summary layer. The workspace is a progressive, task-oriented, stage-based flow.

---

## 5. Navigation Structure

### 5.1 Global Navigation

Only two route groups should exist:

- Dashboard
- Job workspace

### 5.2 Dashboard Entry Points

Dashboard navigation should be extremely lightweight:

- `Start New Audit` primary CTA opens the upload modal.
- Clicking a recent audit row opens `/jobs/[id]`.
- Clicking a critical finding can optionally deep-link to the relevant job and findings stage.

### 5.3 Workspace Navigation

The workspace uses a fixed left sidebar rather than tabs.

Stages in order:

1. Overview
2. Findings
3. Suggestions
4. Simulation
5. Export

Behavior rules:

- The active stage is highlighted.
- Completed stages show a checkmark.
- Locked stages are muted and show a lock icon.
- Backward navigation is always allowed.
- Linear progression is the default mental model, but users can review earlier stages freely.

This structure makes the platform feel like a controlled operational workflow rather than a folder of views.

---

## 6. Layout Hierarchy

### 6.1 Global Shell

The global shell should be dark, calm, and highly legible:

- App background: `bg-slate-950`
- Surface cards: `bg-slate-900`
- Code panels and terminal-like surfaces: `bg-slate-800`
- Borders: `border-slate-800`
- Rounded corners: `rounded-xl` or `rounded-2xl`
- Max page width: `max-w-7xl mx-auto`
- Standard page padding: `px-6 py-8`

### 6.2 Dashboard Layout

The dashboard should read top-to-bottom like an operations overview:

1. Top bar
2. Summary cards row
3. Recent audits table
4. Critical findings feed
5. Dataset health trend
6. Empty state when no jobs exist

### 6.3 Workspace Layout

The workspace should use a persistent shell:

- Fixed left sidebar: 220px
- Sticky top header
- Fluid main content area
- Desktop-first max width: `max-w-7xl`

The content area should change by stage, but the shell remains stable so users feel oriented during long-running audit flows.

---

## 7. File and Component Strategy

### 7.1 Target File Structure

The redesign should be implemented as a new route- and component-driven structure:

- `frontend/app/layout.jsx`
- `frontend/app/page.jsx`
- `frontend/app/dashboard/page.jsx`
- `frontend/app/jobs/[id]/layout.jsx`
- `frontend/app/jobs/[id]/overview/page.jsx`
- `frontend/app/jobs/[id]/findings/page.jsx`
- `frontend/app/jobs/[id]/suggestions/page.jsx`
- `frontend/app/jobs/[id]/simulation/page.jsx`
- `frontend/app/jobs/[id]/export/page.jsx`

Components should be grouped by responsibility:

- `components/layout/*`
- `components/dashboard/*`
- `components/workspace/*`
- `components/ui/*`

### 7.2 What Should Be Reused vs Rebuilt

Rebuild or substantially redesign:

- `frontend/app/page.jsx`
- `frontend/components/WorkflowHeader.jsx`
- `frontend/components/ScoreGauge.jsx`
- `frontend/components/SuggestionCard.jsx`
- `frontend/components/FindingsBadge.jsx`

These current components are useful as rough prototypes, but the redesigned system needs more structured, enterprise-grade presentation, richer states, and more explicit workflow shell behavior.

Reuse conceptually or partially:

- `frontend/lib/api.js`
- Existing backend response models
- Existing audit/suggestion/report concepts

The backend should be treated as stable. The UI should adapt to it rather than forcing backend changes.

---

## 8. Dashboard Page Spec: `/dashboard`

### 8.1 Page Purpose

The dashboard is the platform’s command center. It should present operational health, recent activity, critical issues, and an obvious path to start a new audit.

### 8.2 Top Bar

Contents:

- Wordmark: `PreFlightML`
- Primary CTA: `Start New Audit`

Design notes:

- Keep the top bar simple and spacious.
- The CTA should be the only dominant accent element on the page.
- The wordmark should feel like a product identity, not a navigation label.

### 8.3 Summary Cards Row

Cards:

- Total Audits
- Average Dataset Health Score
- Critical Findings (last 7 days)
- Datasets Exported

Recommended treatment:

- Use `Card`, `CardHeader`, and `CardContent`.
- Use a large numeric value and a concise caption.
- Add a small supporting delta or trend hint only if it improves comprehension.

These should feel like executive metrics, not dashboard widgets.

### 8.4 Recent Audits Table

Columns:

- Dataset name
- Score badge
- Status chip
- Timestamp
- Row count / column count
- Quick-link to job workspace

Design notes:

- Keep row density modest.
- Use `Table` and `Badge`, but do not turn this into a dense operational spreadsheet.
- If text truncates, use `Tooltip` for the full name.
- Sort by recency by default.

The table should communicate activity without overwhelming the user.

### 8.5 Critical Findings Feed

This is not a generic list. It should resemble incident alerts.

Each row should include:

- Severity badge
- Finding title
- Dataset name
- Affected columns
- Timestamp
- Quick-link to the relevant job

Design notes:

- Use compact alert-style rows with subtle separators.
- Critical findings should be visually distinct and immediately scannable.
- The feed should feel like a reliability/incident stream, not a report log.

### 8.6 Dataset Health Trend

Use a simple `LineChart` from Recharts.

Rules:

- Minimal axes.
- No gridlines.
- No decorative gradients.
- No unnecessary legend clutter.
- Calm line color and subtle point markers.

The chart exists to convey trend, not decoration.

### 8.7 Empty State

If there are no jobs, the dashboard should not feel broken.

Show:

- A centered dashed upload zone
- Brief product value statement
- One CTA to open the upload modal

Tone:

- Confident
- Brief
- Useful
- Calm

The empty state should explain what the product does and what the first action should be.

---

## 9. Upload Modal Spec

### 9.1 Trigger

The modal opens from the dashboard `Start New Audit` CTA.

### 9.2 Required Behavior

- Drag-and-drop upload zone.
- Dashed border.
- Slate-800 background.
- CSV-only acceptance.
- File size validation.
- File format validation.
- CSV headers preview after parsing.
- Target column selector populated from parsed headers.
- `Run Audit` button that submits to `POST /upload` and redirects to `/jobs/[id]`.

### 9.3 Modal Composition

Suggested sections:

1. Upload zone
2. Validation feedback area
3. Parsed header preview
4. Target column selector
5. Submit action area

### 9.4 Interaction Notes

- Validation feedback should be immediate and helpful.
- If the file is invalid, explain why in one sentence.
- Keep the modal focused on one task only.
- Avoid secondary actions or branching flows.

The modal should feel like a precise tool, not a wizard.

---

## 10. Job Workspace Spec: `/jobs/[id]`

### 10.1 Workspace Purpose

The workspace is a guided investigation and remediation environment. It should feel operational, deterministic, and workflow-driven.

### 10.2 Shell Layout

Persistent elements:

- Fixed left sidebar
- Sticky workspace header
- Main content area

This shell should remain stable as the user moves through stages.

### 10.3 Left Sidebar

Width: `220px`

Stages:

1. Overview
2. Findings
3. Suggestions
4. Simulation
5. Export

Sidebar behavior:

- Active stage highlighted with strong contrast.
- Completed stages show a checkmark.
- Locked stages show a lock icon.
- Locked stages are muted but readable.
- Backward navigation remains available.

The sidebar should feel like an execution pipeline and not a tab group.

### 10.4 Workspace Header

Persistent top bar should show:

- Dataset filename
- Row × column count
- Inferred task type
- Status chip
- Elapsed runtime
- Overall audit score after completion

This header is meant to answer, in one glance, “what is this dataset, what is happening to it, and how far along are we?”

Use compact metadata styling, strong hierarchy, and controlled spacing.

---

## 11. Stage 1 — Overview

### 11.1 Purpose

The overview stage is the live execution view. It should feel like infrastructure diagnostics or a deployment pipeline, not a loading spinner.

### 11.2 Information to Show

Dataset identity:

- Dataset name
- Shape
- Target column
- Task type
- Upload timestamp

Overall progress:

- Large progress bar
- Percentage complete
- `Analyzing Dataset Quality...`
- Estimated remaining time

Auditor pipeline:

- 7 auditor cards
- 3-column responsive grid
- Status, progress, execution time, status icon

Activity feed:

- Timestamped log lines
- Monospace font
- Terminal-inspired appearance
- Scrollable container with a slate background

### 11.3 Auditor Card States

- Queued
- Running
- Completed
- Failed

Status treatment:

- Running: pulse animation
- Completed: green check
- Failed: red X

### 11.4 Feel

This stage should resemble:

- GitHub Actions
- Vercel deployments
- Datadog pipeline execution

It should communicate active computation and system confidence.

### 11.5 Transition Behavior

When the audit completes, auto-advance to the Findings stage with a smooth, subtle transition.

---

## 12. Stage 2 — Findings

### 12.1 Purpose

This is the executive summary of risk. The user should understand dataset quality at a glance and then drill into specific issues.

### 12.2 Hero Block

Include:

- Large dataset health score
- Score label: Poor / Fair / Good / Excellent
- Thin circular gauge or progress arc
- One-sentence interpretation

The score should be the visual anchor.

### 12.3 Auditor Breakdown

Use a minimal horizontal bar chart.

Rules:

- No gradients.
- No decorative legend styling.
- Clean axis labels.
- Bars should be readable and understated.

### 12.4 Findings List

Findings should be grouped by severity:

1. Critical
2. Warning
3. Info

Each finding row should include:

- Severity badge
- Finding title
- Affected columns as monospace tags
- Plain-English explanation
- Expandable metadata section

### 12.5 Feel

Findings should resemble incident reports or system alerts rather than spreadsheet rows. They should be highly scannable and operationally meaningful.

---

## 13. Stage 3 — Suggestions

### 13.1 Purpose

This is the product differentiator. It should feel like an AI copilot for ML remediation.

### 13.2 Header and Controls

Show:

- Recommendation count
- Bulk action toolbar
- Severity filters

Toolbar actions:

- Accept All
- Reject All
- Severity filter chips or dropdown

### 13.3 Suggestion Cards

Each card should include:

- Title
- Severity badge
- Affected columns
- Accept / Reject controls
- Plain-English explanation
- Expected impact block
- Expandable syntax-highlighted Python code block
- Copy-to-clipboard button

### 13.4 Visual State Rules

- Accepted: emerald border and light emerald tint
- Rejected: muted opacity and slate border
- Neutral: standard slate styling

### 13.5 Interaction Rules

- Expand/collapse should feel smooth.
- Hover states should be subtle and intentional.
- The code block should feel like a trustworthy engineering artifact.
- Do not make code feel decorative.

### 13.6 CTA Gating

When at least one suggestion is accepted, enable `Proceed to Simulation`.

This makes the experience feel deliberate and progressive.

---

## 14. Stage 4 — Simulation

### 14.1 Purpose

The simulation stage should prove that remediation has measurable value.

### 14.2 Tone

This stage should feel scientific, evidence-based, and trustworthy.

### 14.3 Layout

Show:

- Accepted suggestion count
- Task type
- Before vs After comparison table
- Statistical significance section
- Minimal grouped bar chart
- Narrative summary

### 14.4 Comparison Table

Columns:

- Metric
- Before
- After
- Delta
- Significance

Delta semantics:

- Improvement: emerald
- Regression: red
- Neutral: slate

### 14.5 Chart Behavior

Use a simple grouped `BarChart`.

Rules:

- Minimal gridlines
- No decorative visuals
- Clear, restrained labels
- No flashy legends

### 14.6 Narrative Summary

Provide 2–3 concise sentences interpreting the impact.

The summary should sound like a data scientist or ML platform engineer wrote it.

---

## 15. Stage 5 — Export

### 15.1 Purpose

The export stage should make the output feel production-ready and reproducible.

### 15.2 What to Show

Bundle overview:

- `cleaned_dataset.csv`
- `preprocessing_pipeline.py`
- `audit_report.json`

Metadata:

- Job ID
- Export timestamp
- Platform version
- Suggestion count applied

Reproducibility notice:

- The bundle contains everything needed to reproduce the preprocessing run.

Primary CTA:

- `Download Export Bundle`

### 15.3 Tone

The export view should communicate reliability, auditability, and operational readiness.

---

## 16. Component Hierarchy

### 16.1 Layout Components

- `Sidebar`
- `WorkspaceHeader`
- `DashboardTopBar`

### 16.2 Dashboard Components

- `SummaryCard`
- `RecentAuditsTable`
- `CriticalFindingsFeed`
- `HealthTrendChart`
- `UploadModal`

### 16.3 Workspace Components

- `AuditorPipelineGrid`
- `AuditorCard`
- `ActivityFeed`
- `ScoreGauge`
- `AuditorBreakdownChart`
- `FindingsList`
- `FindingRow`
- `SuggestionCard`
- `MetricsComparisonTable`
- `SimulationChart`
- `ExportBundle`

### 16.4 UI Primitives

- `SeverityBadge`
- `StatusChip`
- `CodeBlock`
- `SkeletonCard`
- `EmptyState`
- `ErrorState`

This decomposition keeps the system composable and makes each stage easy to maintain.

---

## 17. shadcn/ui Usage Strategy

Use the following primitives consistently:

- `Card`, `CardHeader`, `CardContent` for all contained sections.
- `Badge` for severity, status, and metadata chips.
- `Button` for all CTA patterns.
- `Dialog` for the upload modal only.
- `Progress` for auditor and overall progress indicators.
- `Tooltip` for truncated labels, score explanations, and metadata hints.
- `Separator` between major sections.
- `ScrollArea` for long findings, suggestions, and activity feeds.
- `Skeleton` for loading states.

What not to do:

- Do not use Tabs for the workflow.
- Do not stack many modals on top of each other.
- Do not use shadcn as a style kit without a product opinion.

shadcn/ui should be the foundation, not the visual identity.

---

## 18. Typography Scale

Use typography as one of the main differentiators.

Recommended hierarchy:

- Page title: `text-3xl` to `text-5xl`, `font-semibold`, tight tracking.
- Section title: `text-xl` to `text-2xl`, `font-semibold`.
- Body: `text-sm` or `text-base`, calm leading.
- Metadata: `text-xs`, uppercase or muted labels where useful.
- Technical values: `font-mono` for counts, columns, code, IDs, and metric names in technical contexts.

Principle:

- Use size and weight first.
- Use color second.
- Use decoration last.

---

## 19. Spacing and Layout Scale

Recommended conventions:

- Page padding: `px-6 py-8`
- Main container: `max-w-7xl mx-auto`
- Section separation: `gap-6`
- Card interiors: `p-5`, `p-6`, or `p-7`
- Dense micro content: `gap-2`, `gap-3`, or `gap-4`

The overall rhythm should feel spacious. Avoid compressing cards just to fit more content.

---

## 20. Tailwind Utility Patterns

### 20.1 Backgrounds

- App background: `bg-slate-950`
- Card background: `bg-slate-900`
- Code panel background: `bg-slate-800`
- Muted surface: `bg-slate-900/60` or `bg-slate-950/40`

### 20.2 Borders and Shadows

- Borders: `border-slate-800` or `border-white/8`
- Rounded corners: `rounded-xl`, `rounded-2xl`, `rounded-3xl`
- Shadow: very light and restrained; avoid dramatic glows.

### 20.3 Motion

- `transition-all duration-200`
- Use hover elevation sparingly.
- Use `animate-pulse` only for running auditor cards.
- Avoid parallax, animated backgrounds, or flashy entrance effects.

### 20.4 Text and Metadata

- Body: `text-sm text-slate-300`
- Metadata: `text-xs text-slate-500`
- Technical values: `font-mono text-xs`

### 20.5 Severity Styling

Keep severity styling semantic and centralized. The UI should not invent extra semantic color meanings.

---

## 21. State Requirements

Every page and stage must support three states:

### 21.1 Loading State

- Use skeleton loaders.
- Never show a blank page.
- Keep layout shape visible so users know what is loading.

### 21.2 Empty State

- Show a centered illustration placeholder or upload zone.
- Explain what the stage or page means.
- Provide a contextual CTA.

### 21.3 Error State

- Red-bordered alert card.
- Concise diagnostics.
- Retry button.

Errors should be calm and actionable, not dramatic.

---

## 22. Motion and Interaction Guidelines

Allowed:

- Subtle fades
- Hover elevation
- Progress animation
- Accordion expansion

Forbidden:

- Page-level transitions
- Decorative motion
- Animated backgrounds
- Parallax
- Flashy microinteractions that distract from the workflow

The system should feel fast because it is clear, not because it is animated.

---

## 23. Premium UX Enhancements

These enhancements are not required for basic functionality, but they will make the product feel premium.

### 23.1 Better Information Compression

- Add inline tooltips for score interpretation.
- Use compact chips for affected columns.
- Surface only the most important metadata by default.

### 23.2 Better Workflow Confidence

- Persist workspace state between refreshes.
- Show elapsed runtime and estimated completion.
- Use status transitions that clearly communicate audit progress.

### 23.3 Better Remediation Confidence

- Make code blocks copyable.
- Show expected impact beside each suggestion.
- Visually distinguish accepted and rejected recommendations.

### 23.4 Better Reproducibility

- Explicitly show what artifacts will be exported.
- Display the job ID and export timestamp.
- Reinforce that exported assets are traceable and reproducible.

### 23.5 Better Trust Cues

- Keep the palette calm.
- Use consistent iconography.
- Avoid hidden actions and surprise behaviors.
- Make every state understandable without a tutorial.

---

## 24. Microinteraction Ideas

Use these sparingly. They should support comprehension, not compete with it.

- Progress bar fill animation when new audit progress arrives.
- Auditor card pulse only when the status is `running`.
- Expand/collapse code block with a smooth height transition.
- Copy button state change on successful clipboard action.
- Hover elevation on suggestion cards and critical feed rows.
- Completion checkmark fade-in when a stage is finalized.

Do not animate for the sake of animation.

---

## 25. Empty State Concepts

### 25.1 Dashboard Empty State

Should show:

- A centered upload zone
- A concise product value statement
- One clear CTA

### 25.2 Workspace Empty States

Stage-specific empty states should explain what is missing:

- No findings yet: audit still running
- No suggestions yet: recommendations still loading
- No simulation yet: accept suggestions first
- No export yet: complete prior steps first

Empty states should feel contextual and helpful, not generic.

---

## 26. Loading State Concepts

### 26.1 Dashboard Loading

- Skeleton summary cards
- Table skeleton rows
- Feed skeleton items
- Chart skeleton frame

### 26.2 Workspace Loading

- Shell visible immediately
- Sidebar visible immediately
- Header visible immediately
- Main stage shows stage-specific skeletons

This preserves orientation while content loads.

---

## 27. Error State Concepts

### 27.1 Error Shape

Use a consistent error card:

- Red border
- Brief explanation
- Retry CTA
- Optional technical detail in muted text

### 27.2 Error Tone

- Concise
- Direct
- Non-alarming
- Actionable

The user should quickly understand whether the issue is upload-related, execution-related, or export-related.

---

## 28. Suggested Page Compositions

### 28.1 Dashboard Composition

Recommended vertical order:

1. Top bar
2. Summary cards
3. Recent audits
4. Critical findings feed
5. Health trend chart

The empty state replaces sections 2–5 when there are no jobs.

### 28.2 Workspace Composition

Recommended structure:

- Persistent sidebar
- Persistent header
- Stage page content in the main area

Each stage should own its own page content but share the shell.

---

## 29. Suggested Implementation Notes

### 29.1 Current Frontend Shape

The current frontend is a small Next.js app with a single main page, a few reusable components, and a lightweight API helper. That structure is useful as a starting point, but the redesign should reorient it around route-level composition and a persistent workspace shell.

### 29.2 What to Keep Stable

- `frontend/lib/api.js` should remain the single source of truth for backend calls.
- The backend contract should stay intact.
- The frontend should continue to be client-driven for upload, polling, and export.

### 29.3 What to Rework First

1. Add the dashboard route.
2. Add the job workspace shell.
3. Rebuild the overview stage as a live execution view.
4. Rebuild findings, suggestions, simulation, and export as stage-specific pages.
5. Replace current presentational components with the new design system.

---

## 30. Final Product Goal

The redesigned frontend should make PreFlightML feel like a serious ML platform used by data teams and ML engineers to govern dataset quality continuously.

The best outcome is not simply that the app looks better. The best outcome is that the app feels more credible, more explainable, and more operationally useful the moment a user lands on it.

If the design is successful, the user should feel:

- “This is where dataset quality gets managed seriously.”
- “I can trust what it is telling me.”
- “I understand what is happening at every step.”
- “I can reproduce this later.”
# PreFlightML Frontend Redesign Spec

This document turns the redesign brief into an implementation-oriented UX/UI specification for the PreFlightML frontend. It assumes the backend is already complete and focuses only on the Next.js 14 App Router experience, shadcn/ui composition, Tailwind implementation patterns, and Recharts usage.

The goal is not to make the product merely look cleaner. The goal is to make it feel like a premium ML operations platform for dataset governance: trustworthy, scientific, procedural, and calm under load.

---

## 1. Product Positioning

PreFlightML should communicate one idea very clearly: this is continuous dataset governance for ML teams.

The experience should not feel like a file uploader with charts attached. It should feel like a controlled workflow where a dataset enters a diagnostic pipeline, evidence is collected, recommendations are reviewed, and a reproducible artifact bundle is exported.

The emotional target is closer to Vercel deploys, Linear issue flow, Datadog diagnostics, or Sentry incident review than to a BI dashboard.

### Core product messages

- Trust: every number should appear explainable and traceable.
- Transparency: the system should reveal what it is doing at each stage.
- Scientific rigor: show before/after impact, score breakdowns, and significance rather than vague AI claims.
- AI assistance: suggestions should feel like an expert copilot, not an opaque black box.
- Reproducibility: every export should contain enough metadata and code to replay the preprocessing path.
- Operational clarity: the user should always know where they are in the pipeline and what happens next.

---

## 2. Route Architecture

Use exactly two routes for the product surface.

### Public entry

- `/dashboard`
  - The operational overview, audit history, trends, and upload entry point.
  - This is the default landing surface for the product.

### Workspace

- `/jobs/[id]`
  - The persistent workspace for a single audit job.
  - Contains all stages: Overview, Findings, Suggestions, Simulation, and Export.
  - The sidebar controls stage navigation, but the user can move backward freely.

### Redirect behavior

- `app/page.jsx` should redirect to `/dashboard`.
- All dataset-specific work should happen inside `/jobs/[id]`.

This routing structure is important because it cleanly separates the orchestration dashboard from the audit workspace. That separation is what makes the product feel operational instead of cluttered.

---

## 3. UX Architecture

The UX should be organized around three layers:

1. System overview
2. Audit workspace
3. Reproducible output

### System overview layer

The dashboard is the place to answer:

- What is happening across all audits?
- Are there recent problems?
- How healthy are datasets trending?
- What should I audit next?

### Workspace layer

The job workspace is the place to answer:

- What is the audit currently doing?
- What findings matter?
- What recommendations can I safely accept?
- What is the simulated impact?
- What exactly gets exported?

### Output layer

The export stage is the place to answer:

- What artifacts were produced?
- Can this be reproduced later?
- What metadata ties this bundle to the audit job?

This layered structure gives the interface a progressive disclosure model. The user sees only the amount of detail appropriate for the current task, which keeps the product calm even when the backend is doing many things in parallel.

---

## 4. Visual System

### Design direction

The visual language should be monochrome-first with severity colors used only where they carry meaning. The base experience should remain neutral, precise, and restrained.

### Color roles

- Background: slate-950
- Surfaces: slate-900
- Secondary surfaces: slate-850 or slate-800
- Borders: slate-800
- Primary text: slate-50 / slate-100
- Secondary text: slate-300 / slate-400
- Muted text: slate-500 / slate-600

### Severity palette

Use exactly this semantic mapping:

- critical → red-500 / red-950 background
- warning → amber-500 / amber-950 background
- healthy → emerald-500 / emerald-950 background
- info → slate-400 / slate-800 background

Severity colors should not be decorative. They should only appear in badges, alert rows, score deltas, status chips, and incident-like visuals.

### Surfaces and borders

- Prefer soft borders over heavy shadows.
- Use subtle elevation only for hover and focus states.
- Avoid neon glows, glassmorphism, and gradient-heavy cards.
- Keep rounding consistent: rounded-xl for most cards, rounded-2xl for primary containers, rounded-full for badges.

### Typography direction

The product should feel like an enterprise operations tool, so typography needs a strong hierarchy.

- Large page titles should be assertive and spaced tightly.
- Supporting copy should be small, calm, and highly legible.
- Metadata should be text-xs and slightly muted.
- Technical values should use font-mono.

If a value matters operationally, make it feel deliberate. If it is supportive context, make it visually quiet.

### Motion philosophy

Motion should confirm state changes, not entertain.

- Allowed: fades, hover elevation, progress transitions, accordion expansion, subtle pulse while running.
- Not allowed: parallax, animated background noise, dramatic transitions, decorative motion.

---

## 5. Layout System

### Global layout rules

- Desktop-first.
- Main content width: max-w-7xl.
- Page padding: px-6 py-8.
- Section spacing: gap-4 or gap-6.
- Background base: bg-slate-950.

### Dashboard layout

The dashboard should be a vertically stacked operational page with clear segmentation:

1. Top bar
2. Summary cards row
3. Recent audits table
4. Critical findings feed
5. Dataset health trend
6. Empty state when no audits exist

### Workspace layout

The workspace should use a fixed left sidebar and a sticky header.

- Sidebar width: 220px
- Sidebar: fixed, left-0, top-0, h-full, border-r border-slate-800, bg-slate-950
- Main area: ml-56 flex-1
- Workspace content max width: max-w-7xl

This layout makes the workspace feel like a control plane rather than a page sequence.

---

## 6. Navigation Structure

### Dashboard navigation

The dashboard should be simple:

- Wordmark on the left
- Start New Audit button on the right

That is enough. Avoid adding secondary nav clutter. The dashboard is a launch point, not a control center.

### Workspace navigation

The sidebar stages should be linear and explicit:

1. Overview
2. Findings
3. Suggestions
4. Simulation
5. Export

#### Sidebar behavior

- Active stage is clearly highlighted.
- Completed stages show a checkmark.
- Locked stages are muted and show a lock icon.
- Users can move backward at any time.
- Forward progression is linear and should be visually implied.

The key is that the navigation should communicate progression without hard-blocking exploration.

---

## 7. Component Hierarchy

This is the recommended component architecture for the frontend.

### Layout components

- `components/layout/DashboardTopBar.jsx`
  - Wordmark, main CTA, and optional metadata.

- `components/layout/Sidebar.jsx`
  - Fixed workspace stage navigation.

- `components/layout/WorkspaceHeader.jsx`
  - Dataset filename, shape, inferred task type, elapsed runtime, status, and score.

### Dashboard components

- `components/dashboard/SummaryCard.jsx`
  - Used in the KPI row.

- `components/dashboard/RecentAuditsTable.jsx`
  - Audit history and workspace quick links.

- `components/dashboard/CriticalFindingsFeed.jsx`
  - Incident-style critical alerts.

- `components/dashboard/HealthTrendChart.jsx`
  - Minimal line chart for score over time.

- `components/dashboard/UploadModal.jsx`
  - Drag-and-drop upload flow and validation.

### Workspace components

- `components/workspace/AuditorPipelineGrid.jsx`
- `components/workspace/AuditorCard.jsx`
- `components/workspace/ActivityFeed.jsx`
- `components/workspace/ScoreGauge.jsx`
- `components/workspace/AuditorBreakdownChart.jsx`
- `components/workspace/FindingsList.jsx`
- `components/workspace/FindingRow.jsx`
- `components/workspace/SuggestionCard.jsx`
- `components/workspace/MetricsComparisonTable.jsx`
- `components/workspace/SimulationChart.jsx`
- `components/workspace/ExportBundle.jsx`

### UI primitives

- `components/ui/SeverityBadge.jsx`
- `components/ui/StatusChip.jsx`
- `components/ui/CodeBlock.jsx`
- `components/ui/SkeletonCard.jsx`
- `components/ui/EmptyState.jsx`
- `components/ui/ErrorState.jsx`

These UI primitives should keep consistency extremely high. Most of the product identity comes from repetition done well.

---

## 8. Tailwind Design System

The Tailwind system should be opinionated and limited.

### Spacing scale

- Page shell: px-6 py-8
- Section separation: gap-6 or gap-8
- Card interior: p-5 or p-6
- Dense metadata blocks: p-3 or p-4
- Sidebar items: px-4 py-3

### Typography scale

- Page title: text-3xl to text-5xl, font-semibold, tracking-tight
- Section title: text-xl to text-2xl, font-semibold
- Card title: text-base to text-lg, font-medium or font-semibold
- Body: text-sm or text-base
- Metadata: text-xs
- Technical labels: font-mono text-xs

### Surface patterns

- Page background: bg-slate-950
- Cards: bg-slate-900 border border-slate-800
- Code panels: bg-slate-800 border border-slate-700
- Alerts: border plus tinted background using severity mapping

### Interaction classes

- transition-all duration-200
- hover:border-slate-700
- hover:bg-slate-850 or hover:bg-slate-900/70
- focus:ring-2 focus:ring-slate-400/30

These should be used consistently. Consistency matters more than visual cleverness in this product.

---

## 9. Dashboard Page Spec

The dashboard should read like an executive operational overview.

### 9.1 Top bar

#### Purpose

This is the entry point and should feel unmistakably product-level, not app-level.

#### Layout

- Left: PreFlightML wordmark
- Right: Start New Audit primary CTA

#### Notes

- Keep the bar minimal.
- Do not add search, filters, or extra icons unless they are actually needed.

### 9.2 Summary cards row

This row should contain four cards:

- Total Audits
- Average Dataset Health Score
- Critical Findings (last 7 days)
- Datasets Exported

#### Card treatment

- Use `Card`, `CardHeader`, `CardContent`.
- Keep content compact and highly legible.
- KPI value should be the dominant element.
- Secondary label should be quiet.

#### Recommended hierarchy

- KPI number: text-3xl or text-4xl, font-semibold
- Label: text-xs uppercase tracking-wide
- Optional delta: small muted or semantic badge

### 9.3 Recent audits table

This table should prioritize scanability over density.

#### Columns

- Dataset name
- Score badge
- Status chip
- Timestamp
- Row / column count
- Quick-link to workspace

#### Table design

- Keep the header visually quiet.
- Use alternate row hover only, not zebra striping.
- Truncate long dataset names with tooltip support.
- Make the workspace link feel like a command, not a navigation afterthought.

#### Why a table here is acceptable

The table is the right pattern because this is audit history and the user needs comparison, not storytelling.

### 9.4 Critical findings feed

This should feel like an incident feed.

#### Row structure

- Severity chip
- Finding title
- Dataset name
- Short explanation
- Timestamp

#### Visual tone

- Each row should feel like an alert, not a report line.
- Use a subtle left border or tinted strip for severity.
- Keep text dense but readable.

### 9.5 Dataset health trend

This should be a minimal line chart, not a decorative analytics panel.

#### Chart rules

- No gridlines.
- Minimal axis styling.
- No heavy annotations.
- Neutral line color unless score thresholds are encoded.

#### Purpose

It shows trend direction, not statistical detail.

### 9.6 Empty state

When no jobs exist, the dashboard should become a focused onboarding surface.

#### Layout

- Centered upload prompt
- Dashed upload zone
- Brief product value statement
- One clear CTA

#### Copy direction

Keep it concise and operational:

- “Upload your first dataset to start governance.”
- “PreFlightML will audit quality, surface risks, and generate reproducible remediation steps.”

The empty state should not feel like a dead end. It should feel like the start of a workflow.

---

## 10. Upload Modal Spec

The upload modal is a critical interaction and should feel polished.

### Structure

1. Title and short instruction
2. Drag-and-drop upload zone
3. File validation feedback
4. Parsed header preview
5. Target column selector
6. Run Audit CTA

### Upload zone

- Dashed border
- Slate-800 background
- Strong drop target affordance
- Clear CSV-only messaging

### Validation states

- File type invalid: red message
- File too large: red message with size limit
- Headers unreadable: amber or info message, depending on severity

### Target column selector

- Disabled until CSV headers are parsed.
- Use a plain select, not a custom dropdown.
- Keep selection logic visible and simple.

### Submit flow

- POST `/upload`
- On success: redirect to `/jobs/[id]`

The modal should feel like a controlled ingest action, not a general-purpose file picker.

---

## 11. Workspace Shell

The workspace shell should feel like a live operations environment.

### Persistent header

Display:

- Dataset filename
- Row × column count
- Inferred task type
- Status chip
- Elapsed runtime
- Overall audit score after completion

#### Header behavior

- Sticky at top.
- Compact but informative.
- Always visible while navigating workspace stages.

### Sidebar behavior

- Fixed at 220px
- Uses clear stage state indicators
- Completion checkmarks, lock icons, and active highlight
- No tab styling

### Main content area

- Uses a stage-specific composition with consistent section padding.
- Should feel like a single workspace, not a series of disconnected pages.

---

## 12. Stage 1: Overview

This stage is the live execution view. It should feel like a deployment dashboard or CI pipeline, not a loading page.

### Purpose

Show that the audit is actively processing and explain what is happening.

### Layout hierarchy

1. Dataset identity block
2. Overall progress section
3. Auditor pipeline grid
4. Activity feed
5. Estimated completion area

### Dataset identity block

Show:

- Dataset name
- Shape
- Target column
- Inferred task type
- Upload timestamp

This block should establish context immediately. If the user opens a job later, this is what grounds them in the current dataset.

### Overall progress section

Include:

- Large progress bar
- Percentage complete
- “Analyzing Dataset Quality…” label
- Estimated remaining time

The progress section should be visually prominent because it answers the first question: how far along are we?

### Auditor pipeline grid

There are seven auditor cards in a 3-column layout.

Each card should show:

- Auditor name
- Status
- Progress bar
- Execution time
- Status icon

#### Status behaviors

- queued: muted slate styling
- running: pulse animation plus active progress
- completed: emerald check state
- failed: red X state

The motion rule matters here: only running should animate. That makes activity meaningful rather than noisy.

### Activity feed

This should read like a terminal log or system console.

#### Characteristics

- Monospace text
- Slate background
- Timestamped entries
- Scrollable area

The feed is where the user gets confidence that work is actually being done.

### Estimated completion area

Use this as a calm summary of remaining time and current stage.

#### Narrative tone

- factual
- compact
- non-dramatic

### Completion behavior

When the audit completes, auto-advance the sidebar to Findings with a smooth but restrained transition.

---

## 13. Stage 2: Findings

This stage should feel like an executive-quality risk summary.

### Hero section

Show:

- Large dataset health score
- Quality label
- Thin circular gauge or arc
- One-sentence interpretation

### Score treatment

The score should dominate the section, but it should not be decorative.

- 0–100 scale
- Label should translate score into language: Poor, Fair, Good, Excellent
- Interpretation should explain what the score means in plain English

### Auditor breakdown chart

Use a minimal horizontal bar chart.

#### Rules

- No decorative legend
- Minimal axes
- Score coloring only by range
- No gradients

### Findings list

This should resemble incident alerts.

#### Grouping order

1. Critical
2. Warning
3. Info

#### Each finding row includes

- Severity badge
- Finding title
- Affected columns as monospace tags
- Plain-English explanation
- Expandable metadata area

### Finding row behavior

- Use chevron expansion.
- Keep metadata collapsed by default.
- Show only the essential warning surface initially.

### Why this structure works

It matches how engineers review reliability issues: first severity, then a concise diagnosis, then technical detail only when asked.

---

## 14. Stage 3: Suggestions

This is the product differentiator and should feel like an AI copilot for remediation.

### Objectives

- Make recommendations feel trustworthy.
- Make code feel safe to inspect.
- Make acceptance feel deliberate.
- Make batch handling efficient without hiding detail.

### Layout hierarchy

1. Header with recommendation count
2. Bulk action toolbar
3. Filters
4. Vertical stack of suggestion cards

### Bulk toolbar

Include:

- Accept All
- Reject All
- Severity filter

These controls should be compact and secondary to the cards themselves.

### Suggestion cards

Each card should contain:

- Title
- Severity badge
- Affected columns
- Accept / Reject controls
- Plain-English explanation
- Expected impact
- Expandable code block
- Copy button

### Card states

- Accepted: emerald border with light emerald tint
- Rejected: muted opacity, slate border
- Neutral: default slate border

### Code block treatment

This is a critical trust surface.

- Dark panel
- Monospace font
- Syntax highlighting
- Copy-to-clipboard button
- Expand/collapse so it never overwhelms the card surface

### Why collapsed by default

The card should show the idea first, the code second. That is the right hierarchy for an AI-assisted remediation workflow.

### CTA gating

Proceed to Simulation should only appear when at least one suggestion is accepted.

This preserves a meaningful workflow milestone and prevents the simulation stage from feeling like a dead button.

---

## 15. Stage 4: Simulation

This stage must feel evidence-driven and scientific.

### Layout hierarchy

1. Accepted suggestion count
2. Task type
3. Before vs After table
4. Statistical significance section
5. Minimal grouped bar chart
6. Narrative summary

### Before vs After table

Columns:

- Metric
- Before
- After
- Delta
- Significance

#### Table design

- Clean two-column or compact table structure
- No dense grid clutter
- Keep metrics understandable at a glance

### Delta semantics

- Improvement: emerald
- Regression: red
- Neutral: slate

### Significance section

Show p-values and a significance label.

Do not make this feel academic for its own sake. Keep the explanation concise and clinically useful.

### Simulation chart

Use a minimal grouped BarChart.

#### Rules

- No decorative visual treatments
- Minimal axes
- No excessive legend emphasis
- The chart should complement the table, not replace it

### Narrative summary

This should be 2–3 plain-English sentences that interpret the result.

The narrative is important because ML engineers and data teams want to know whether the remediations are worth keeping.

---

## 16. Stage 5: Export

The export stage should feel polished, reproducible, and production-ready.

### Layout hierarchy

1. Export bundle overview
2. Artifact list
3. Metadata section
4. Reproducibility notice
5. Download CTA

### Artifact list

Show three artifact rows:

1. cleaned_dataset.csv
2. preprocessing_pipeline.py
3. audit_report.json

Each row should show useful metadata:

- cleaned_dataset.csv: row / column count
- preprocessing_pipeline.py: number of steps
- audit_report.json: finding count

### Metadata block

Include:

- Job ID
- Export timestamp
- Platform version
- Suggestion count applied

### Reproducibility notice

This should be phrased as an assurance:

- “This bundle contains everything needed to reproduce this preprocessing run.”

### Primary CTA

Use a single prominent button:

- Download Export Bundle

### Why this stage matters

This is where the product earns trust. The user is not just downloading data. They are receiving a reproducible artifact of a governed ML preprocessing decision.

---

## 17. Loading State Design

Every page and stage needs a loading state.

### Rules

- Never show blank pages.
- Use skeleton loaders, not spinners as the default.
- Keep the skeleton layout structurally similar to the final layout.

### Recommended skeleton patterns

- Dashboard summary cards: row of card skeletons
- Table: header bar + 4–6 row placeholders
- Findings: stacked alert skeletons
- Suggestions: full-width card skeletons with code block placeholders
- Workspace overview: auditor pipeline skeleton grid

### Loading tone

The loading state should communicate that work is being done, not that the app is waiting helplessly.

---

## 18. Empty State Design

Empty states should be calm and directional.

### Dashboard empty state

When no jobs exist:

- Centered upload prompt
- Dashed upload zone
- Product value statement
- Clear CTA

### Workspace empty state

If a stage has no available content yet:

- explain why
- show what the user should do next
- provide a contextual CTA

### General empty state tone

- concise
- helpful
- operational
- never apologetic

The app should feel like a tool with a workflow, not a website waiting for content.

---

## 19. Error State Design

Error states should be explicit and useful.

### Required behavior

- red-bordered alert card
- concise diagnostics
- retry button

### Error tone

- factual
- not dramatic
- actionable if possible

### Good error messaging examples

- “Upload failed: CSV file exceeds the 25 MB limit.”
- “Report is not ready yet. The audit is still running.”
- “Simulation could not run because no suggestions were accepted.”

The error state should help the user recover quickly without feeling like the app is unstable.

---

## 20. Suggested shadcn/ui Usage

Use shadcn/ui deliberately. Do not overcompose the UI into generic component soup.

### Recommended components

- `Card`, `CardHeader`, `CardContent`
  - Primary content containers.

- `Badge`
  - Severity, status, and short technical labels.

- `Button`
  - Primary, secondary, and destructive actions.

- `Dialog`
  - Only for the upload modal.

- `Progress`
  - Overall progress and per-auditor progress.

- `Tooltip`
  - Truncated dataset names, score explanations, code copy affordances.

- `Separator`
  - Between major sections.

- `ScrollArea`
  - Findings list, suggestions list, and activity feed.

- `Skeleton`
  - All loading states.

### Avoid

- Tabs for workflow navigation
- Unnecessary drawers
- Excessive nested dialogs
- Generic admin layout patterns

---

## 21. Microinteraction Guidelines

Microinteractions should reinforce confidence.

### Allowed interactions

- Hover elevation on cards
- Smooth progress changes
- Subtle fade-ins for new log lines
- Accordion expansion for findings and suggestion code blocks
- Accept / reject state transitions on suggestions

### Avoid

- page-level transitions
- animated backgrounds
- spring-heavy motion
- decorative parallax

### Important interaction details

- Running auditor cards may pulse.
- Accepted suggestion cards should visually stabilize with a clear border state.
- Copy actions should give an immediate micro-confirmation.
- Sidebar active state should have a clear left accent or inverse fill.

These microinteractions are not decoration. They are feedback loops that make the workflow feel reliable.

---

## 22. Premium UX Enhancements

These are the enhancements that push the product beyond a standard dashboard.

### 1. Score explainability

Let the score always connect back to findings and auditor breakdown.

### 2. Stage continuity

When a user returns to a job, restore the last known stage and state.

### 3. Evidence-first recommendations

Do not just show code. Show why the suggestion matters and what metric it is likely to affect.

### 4. Reproducibility metadata everywhere

Keep job ID, timestamps, and artifact references visible in the workspace.

### 5. Intelligent empty states

Use empty states to explain the workflow instead of leaving gaps.

### 6. Incident-style findings

Make risk feel operational and actionable, not academic.

### 7. Clear gating

Only enable the next stage when the previous stage has produced enough evidence or user action.

### 8. Quiet but rich density

The interface should contain a lot of information but never feel crowded. That is achieved through hierarchy, not by removing information.

---

## 23. Implementation-Level Guidance

This section translates the design into build decisions.

### App Router structure

- `app/layout.jsx`
  - Global fonts, background color, and shell classes.

- `app/page.jsx`
  - Redirect to `/dashboard`.

- `app/dashboard/page.jsx`
  - Dashboard composition and upload modal entry point.

- `app/jobs/[id]/layout.jsx`
  - Workspace shell with sidebar and sticky header.

- `app/jobs/[id]/overview/page.jsx`
- `app/jobs/[id]/findings/page.jsx`
- `app/jobs/[id]/suggestions/page.jsx`
- `app/jobs/[id]/simulation/page.jsx`
- `app/jobs/[id]/export/page.jsx`
  - Stage-specific content views.

### State management direction

- Keep server data fetching localized to the route/page layer.
- Keep reusable visual components presentational.
- Keep upload modal state and parsed CSV state inside the dashboard surface.
- Keep workspace stage state tied to job progress and URL routing.

### Suggested data flow

- Dashboard loads global audit summaries.
- Upload modal posts to `/upload` and receives job ID.
- Workspace fetches job state repeatedly until completion.
- Findings and suggestions are derived from the completed report.
- Simulation uses accepted suggestion IDs.
- Export posts accepted suggestion IDs and returns a bundle.

### Avoid

- Over-engineering client state containers.
- Introducing a complex global store unless the real product demands it.
- Moving backend logic into the frontend.

The cleanest implementation here is one where routing and component composition do most of the work.

---

## 24. Opinionated Content Strategy

The copy should sound like an engineering product, not a marketing site.

### Tone

- concise
- confident
- operational
- technically literate

### Good copy qualities

- describes what is happening
- states why it matters
- avoids buzzwords unless the product feature truly is AI-driven

### Bad copy qualities

- generic optimism
- vague claims about intelligence
- overuse of adjectives like smart, powerful, magical

Use the product language of infrastructure tools, not consumer apps.

---

## 25. Recommended Page Composition Summary

### `/dashboard`

- DashboardTopBar
- SummaryCard row
- RecentAuditsTable
- CriticalFindingsFeed
- HealthTrendChart
- UploadModal

### `/jobs/[id]/overview`

- WorkspaceHeader
- Dataset identity section
- Overall progress section
- AuditorPipelineGrid
- ActivityFeed

### `/jobs/[id]/findings`

- WorkspaceHeader
- ScoreGauge hero
- Score explanation
- AuditorBreakdownChart
- FindingsList

### `/jobs/[id]/suggestions`

- WorkspaceHeader
- bulk action toolbar
- filter controls
- SuggestionCard stack
- proceed CTA

### `/jobs/[id]/simulation`

- WorkspaceHeader
- comparison metrics table
- significance block
- SimulationChart
- narrative summary

### `/jobs/[id]/export`

- WorkspaceHeader
- ExportBundle
- artifact list
- reproducibility notice
- download button

---

## 26. Final Opinionated Direction

If this redesign is executed well, the product should feel like this:

- You upload a dataset into a controlled system.
- The system inspects it like an operational pipeline.
- Findings are treated like reliability incidents.
- Suggestions feel like an AI engineer helping you fix the data.
- Simulation proves whether the remediation was worthwhile.
- Export produces a reproducible artifact bundle.

That is the product story.

The design should never drift into generic admin dashboard territory. Every section should reinforce the idea of governed ML workflow. The interface should feel confident, sparse, and precise, with enough information density to satisfy experienced ML and data engineers but enough visual restraint to keep the system readable under pressure.
