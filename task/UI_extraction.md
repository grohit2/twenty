You can absolutely piggy-back on Twenty’s UI – the good news is that they’ve already split it into a reusable design system (`twenty-ui`) plus the actual app (`twenty-front`). I’ll break down:

1. **What pieces exist (components + views)**
2. **How they relate to each other**
3. **Concrete ways you can reuse them in your own project** (tables, workflows, animations, overall “feel”)

---

## 1. High-level architecture: where the UI lives

Twenty is a big Nx monorepo with several packages. The ones that matter for you:([GitHub][1])

* **`packages/twenty-front`** – the main React frontend app

  * All the CRM pages: table views, kanban, workflows, sidebars, record pages, etc.
* **`packages/twenty-ui`** – the **design system / component library** (this is what you really want)([Fossies][2])
* **`packages/twenty-shared`** – shared types, constants, helpers (colors, spacing, etc.)
* **Tech stack:** React + TypeScript + Recoil (state) + Emotion (styling) + Lingui (i18n).([GitHub][1])

They’ve also documented **Twenty UI** separately:([Twenty Documentation][3])

> Components are grouped into: **Display**, **Feedback**, **Input**, **Navigation**.

So:

* **Low-level building blocks** = `twenty-ui`
* **High-level screens (tables, workflows)** = `twenty-front` composing those blocks.

---

## 2. The design system (`twenty-ui`): component families & relationships

### 2.1 Theme & tokens (the “foundation layer”)

Before individual components, Twenty has a full **theme system**:([CSDN Blog][4])

* Light & dark themes:

  * `ThemeLight.ts`, `ThemeDark.ts`, `ThemeCommon.ts`
* Theme provider & context:

  * `ThemeContextProvider.tsx`
* Tokens for **colors, spacing, typography, breakpoints**.

Everything else sits on top of this:

* Components use `@emotion/styled` and **never raw CSS classes**.
* Layout responsiveness uses theme breakpoints + helpers.([(Not)soBrightIdeas][5])

🔧 **What this means for you:**

If you want your app to “look like Twenty”, the most important thing is:

* Reuse or imitate **their theme** (colors, radiuses, spacing, typography)
* Use a similar **layout density / spacing** (tight but airy, like Linear / Notion).

---

### 2.2 Display components

Examples from docs & blogs:([Twenty Documentation][6])

* **Checkmark / AnimatedCheckmark**

  * Usage (from docs):

    ```tsx
    import { Checkmark, AnimatedCheckmark } from 'twenty-ui/display';

    export const MyComponent = () => (
      <>
        <Checkmark />
        <AnimatedCheckmark
          isAnimating={true}
          color="green"
          duration={0.5}
          size={30}
        />
      </>
    );
    ```

* **Tag / Pill / Chip / AvatarChip**

  * Status & category labels (e.g. “Active”, “High priority”) with multiple variants & sizes.
  * Used inside table cells, kanban cards, sidebars.

These components are:

* **Pure visual atoms**, no domain logic.
* Widely reused: table cells, filters, record headers, workflow chips.

In your project, you’d use them to:

* Show job / task status in tables and workflows.
* Decorate cards with compact labels instead of plain text.

---

### 2.3 Input components

From the docs category list: `Input` (text fields, selects, search, etc.).([Twenty Documentation][3])

They are used for:

* **Filter bars** (multi-select chips, dropdowns)
* **Inline editing in tables**
* **Modal / drawer forms**

Relationship-wise:

* Inputs are wrapped inside **Form** components in `twenty-front` that tie them to the data model and validation.
* The same input components appear everywhere (consistent look).

For your app:

* Reuse their **inputs + labels + helper text** to get that polished “enterprise form” feel.
* Use the same input components in **table cell editors**, **workflow configuration sidebars**, etc.

---

### 2.4 Navigation components

From docs under `Navigation`: Navigation, Breadcrumb, Links, Menu Item, Navigation Bar, Step Bar.([Twenty Documentation][7])

These are combined to build:

* **Left sidebar** (sections, icons, collapsed state)
* **Top navigation bar** (search, view switch, actions)
* **Breadcrumbs** inside detail pages
* **Step bars** in multi-step flows (wizards, onboarding, workflow creation, etc.)

In `twenty-front`, they plug these into a shell layout:

* `<Sidebar>` + `<TopBar>` + `<ContentArea>` layout.
* The table / kanban / workflows pages are just “children” inside this shell.

For you:

* Copy this structure:

  * **Left nav** with icons + text.
  * **Top bar** with search & view controls.
  * Page content follows the same padding / spacing.

---

### 2.5 Feedback components

Category `Feedback` (toasts, banners, tooltips, etc.).([Twenty Documentation][3])

Used for:

* Inline **success/error** in forms
* **Toasts** for “Record updated”, “Workflow saved”
* **Banners** for warnings (“Mailbox sync lost” etc.).([GitHub][8])

These give the “alive” feeling when you click around.

For you:

* Reuse their toasts & banners for **save/apply** actions on your tables/workflows.
* Use `AppTooltip` (documented in Twenty UI) for subtle help icons.([Twenty Documentation][6])

---

## 3. Application-level pieces: tables, kanban & workflows

These live mostly in `packages/twenty-front`, **built using Twenty-UI** + domain logic.([(Not)soBrightIdeas][5])

### 3.1 Record views: table & kanban

Key idea: **“View”** is a data model; UI allows switching the representation:([GitHub][1])

* **Table view**

  * Implemented around modules like:

    * `object-record/record-table` (e.g. `useAggregateRecordsForHeader.ts` etc.).([Fossies][9])
  * Uses:

    * The theme system for spacing & colors.
    * Display components (tags, chips) inside cells.
    * Input components for inline edit.
    * Filter / sort / group controls above the table.

* **Kanban view**

  * Uses stage field metadata, columns per stage, draggable cards.
  * Issues talk about “kanban view, custom stage fields, No Value column” which tells you there’s a reusable Kanban view system.([GitHub][10])

**Relationship between them:**

* Both table and kanban views:

  * Consume **the same underlying “view” + filter + sort metadata**.
  * Use shared hooks and shared UI primitives (chips, tags, avatars).
  * Only the layout differs (rows vs columns).

For your project:

* You can copy this pattern:

  * Model a **View** with:

    * filters, sort, groupBy, columns config.
  * Then implement:

    * `<TableView>` – a generic table that uses those configs.
    * `<KanbanView>` – columns = groupBy field values.

You don’t have to copy all their code; just follow the **conceptual structure**.

---

### 3.2 Workflows UI

Marketing & docs confirm a **workflow builder** / automation system:([twenty.com][11])

* UI to:

  * Define triggers (“Record updated”, etc.).
  * Configure actions (HTTP request, internal automation, etc.).
* There are discussions about improving **Workflow builder UI** and reuse of CRUD tools between workflows and AI.([GitHub][12])

From a UI perspective, it’s usually:

* **Canvas / list of steps** – each step is a card (using Display components).
* **Side panel** – uses Input components to configure each step.
* **Navigation / StepBar** – shows progress through the workflow setup.

Relationship-wise:

* Workflows heavily reuse:

  * Navigation components (tabs, step bar).
  * Display components (labels, chips).
  * Input components (dropdowns, code editors, toggles).

For your project (personal workflow app, job pipeline, etc.):

* Reuse the same pattern:

  * **Left:** list or graph of steps (cards).
  * **Right drawer:** configuration using consistent inputs.
  * **Top bar:** name, status, Run / Save buttons.

---

### 3.3 Animations / micro-interactions

Examples:

* `AnimatedCheckmark` in Twenty UI – animated SVG checkmark component.([Twenty Documentation][6])
* UI dev rules mention:

  * Emotion styling, theme transitions, responsive layout.
  * RECOMMEND using minimal, focused components.([(Not)soBrightIdeas][5])

Most of the “smooth feel” comes from:

* Consistent spacing & typography.
* Subtle **hover / active** states (e.g. cards lift slightly, buttons darken).
* Fast, responsive updates (Recoil + GraphQL, not blocking).

To mimic that:

* Use **CSS transitions** (150–200ms ease) on:

  * box-shadow, transform (scale/translateY), background-color, opacity.
* Where you want bigger motion (modals, sliding drawers), add:

  * `transform: translateY(...)` / `translateX(...)` with easing.

You don’t necessarily need Framer Motion unless you want advanced stuff.

---

## 4. How to actually reuse this in *your* project

### Step 0 – Be aware of the license

Twenty is AGPL-3.0 (strong copyleft).([marmelab.com][13])

* For a **purely personal / internal tool**, you’re fine.
* If you later ship it as a hosted SaaS or closed-source product using their code, you’ll need to follow AGPL (share source, etc.).
  → Safest path: reuse **design ideas + theme**, not copy entire front code if you plan to keep it proprietary.

---

### Option A – Use the official `@twenty/ui` package

There is a standalone component library you can install:([CSDN Blog][4])

```bash
# Install
yarn add @twenty/ui
# or
npm install @twenty/ui
```

Then:

1. **Wrap your app with the ThemeProvider** (names may differ slightly, but conceptually):

   ```tsx
   import { ThemeProvider } from '@twenty/ui'; // or '@ui/theme/provider'

   export function App() {
     return (
       <ThemeProvider>
         {/* your routes / pages */}
       </ThemeProvider>
     );
   }
   ```

2. **Use components** (paths differ depending on their published API, but docs show this style):

   ```tsx
   import { Checkmark } from 'twenty-ui/display';
   import { Pill, Chip } from '@twenty/ui'; // per blog examples
   ```

3. Build your **tables/workflows** using:

   * Native HTML table / `display: grid` / `flex`
   * * Twenty UI components for:

     - cell content (Pill / Chip / Tag)
     - toolbars (Button, Icon, Input)
     - filters (Chips + Selects)
     - side panels (Drawer / Panel components if available).

This gives you **the same look & animations**, but with **your own data model**.

---

### Option B – Copy patterns from `twenty-front` without copying all code

If you want your tables and workflow pages to be very close to the real app:

1. Browse `packages/twenty-front`:

   * `modules/object-record/record-table/*` – table view.([Fossies][9])
   * `modules/object-record/kanban/*` – kanban view.
   * `modules/workflow/*` – workflow builder UI (name may vary, but look for “workflow” folders).

2. For each part, recreate a slimmer version in your project:

   * **Record table**

     * A header row with:

       * Column names
       * Sort icons
       * Filter chips
     * Rows:

       * Use Chips/Tags instead of plain text for status/labels.
       * Attach inline editing.

   * **Workflow**

     * Left column: steps list with icons + labels.
     * Right drawer: use the same form style for configuring each step.

3. Replace their data and GraphQL hooks with your own API / local state, but keep:

   * The **layout hierarchy** (wrapper → header → toolbar → content → footer).
   * The **component composition** (Tag inside cell, Avatar inside card, etc.).
   * The **spacing and paddings** from the theme.

---

### Option C – Fork Twenty and strip it down (heavier, but 100% identical UI)

If you really want **exact** UI and animations:

1. Fork `twentyhq/twenty`.
2. Keep:

   * `packages/twenty-front`
   * `packages/twenty-ui`
   * `packages/twenty-shared`
3. Replace back-end with a fake / minimal API or your own backend.
4. Gradually delete CRM-specific modules (email, calendar, etc.), keeping only:

   * Record views (table, kanban).
   * Workflows module (if you need it).

This is heavier and still under AGPL, but guarantees **pixel-perfect** behaviour.

---

## 5. Suggested plan for your personal project

Given what you described (“workflow, table for my personal project, I like the view & animations”), I’d do this:

1. **Adopt the theme + basic components from Twenty-UI**

   * Install `@twenty/ui`, wrap with ThemeProvider.
   * Use Pill/Chip/Tag/Avatar + NavigationBar/Sidebar from the library.

2. **Copy their layout pattern**

   * Left sidebar (Navigation).
   * Top bar (filter, search, “+ New”).
   * Main area:

     * Tabbed views: `Table | Board | Workflow`.
     * Each view is a dedicated component but shares the same filter bar.

3. **Recreate simplified RecordTable & Workflow**

   * Table:

     * Implement your **job / task** table with:

       * status chips
       * inline edit
       * row hover effects + subtle card shadow.
   * Workflow:

     * Step cards on the left; config drawer on the right using the same input styles.

4. **Add micro-animations**

   * For buttons, cards, chips:

     * `transition: all 150ms ease-out;`
   * Use `AnimatedCheckmark` for “save successful” or “workflow run complete”.

If you want, next step I can take a specific screen from Twenty (e.g. the companies table or workflows page), and write a React skeleton for you that uses similar structure + placeholder Twenty-style components so you can plug in your real data.

[1]: https://github.com/twentyhq/twenty "GitHub - twentyhq/twenty: Building a modern alternative to Salesforce, powered by the community."
[2]: https://fossies.org/linux/www/twenty-1.10.6.tar.gz/twenty-1.10.6/package.json?utm_source=chatgpt.com "twenty-1.10.6.tar.gz: twenty-1.10.6/package.json"
[3]: https://docs.twenty.com/twenty-ui/introduction "Overview - Twenty Documentation"
[4]: https://blog.csdn.net/gitblog_00474/article/details/152357555?utm_source=chatgpt.com "零代码上手！Twenty-UI设计系统组件库全攻略"
[5]: https://www.notsobrightideas.com/cursorrules?technology=react&utm_source=chatgpt.com "Awesome Cursor Rules - (Not)soBrightIdeas"
[6]: https://docs.twenty.com/twenty-ui/display "Checkmark - Twenty Documentation"
[7]: https://docs.twenty.com/twenty-ui/navigation "Navigation - Twenty Documentation"
[8]: https://github.com/twentyhq/twenty/releases?utm_source=chatgpt.com "Releases · twentyhq/twenty"
[9]: https://fossies.org/linux/twenty/packages/twenty-front/src/modules/object-record/record-table/hooks/useAggregateRecordsForHeader.ts?utm_source=chatgpt.com "Twenty: .../useAggregateRecordsForHeader.ts ..."
[10]: https://github.com/twentyhq/twenty/issues/6116?utm_source=chatgpt.com "Remove \"Compact View\" Toggle from L2 Kanban Option ..."
[11]: https://twenty.com/user-guide/section/getting-started/migrating-from-other-crms?utm_source=chatgpt.com "Migrating From Other Crms"
[12]: https://github.com/twentyhq/twenty/discussions/10803?utm_source=chatgpt.com "Add easier integration to n8n, zapier, make and ..."
[13]: https://marmelab.com/blog/2025/02/03/open-source-crm-benchmark-for-2025.html?utm_source=chatgpt.com "Best Open Source CRM for 2025"
