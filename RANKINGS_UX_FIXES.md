# Rankings Page UX Fixes

## Issue 1: Base Rankings & Model Parameters should be side-by-side tabs (not hidden collapsibles)

**Current:** Two separate collapsible panels. Base Rankings is hidden by default. Model Parameters is hidden by default.

**Fix:** Combine into ONE card with two tabs at the top:
- Tab 1: "📊 Base Rankings" (Runs/inn · Wickets/inn · No weighting)
- Tab 2: "⚡ Model Parameters" (Configure & compute impact rankings)

Both visible on page load. No scrolling needed to switch between them.

**State to add:**
```javascript
const [configTab, setConfigTab] = useState('base');  // 'base' or 'params'
```

**Remove old states:**
- `const [showBasic, setShowBasic]` 
- `const [showParams, setShowParams]`

## Issue 2: Tab button text should stay dark (not turn white on light gray)

**Current:** When a tab is selected, text becomes white on a light gray background (unreadable).
```javascript
className={`... ${
  basicTab === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-500'
}`}
```

**Fix:** Use dark text (slate-900) and light emerald background instead:
```javascript
className={`... ${
  configTab === id
    ? 'bg-emerald-50 text-slate-900 border-b-2 border-emerald-600'
    : 'bg-white text-slate-500 border-b-2 border-transparent'
}`}
```

This keeps the text dark and readable on the light emerald background.

## Implementation Notes

1. **Combine both sections into one `.bg-white` card**
2. **Add tab header with border-bottom underline style** (not full background color)
3. **Tab content changes based on `configTab` state:**
   - `configTab === 'base'` → show BasicTable (Batsmen/Bowlers toggle)
   - `configTab === 'params'` → show sliders, formula, iterations, compute button
4. **Remove collapsible chevron icons** — tabs don't need them
5. **Both visible immediately on page load** — no expand/collapse needed
6. **Set `setConfigTab('base')` on mount** so Base Rankings is shown first

## Why This Works

- **No scroll needed:** Tab switcher is always visible at the top of the card
- **Clear affordance:** Tabs are a standard UI pattern everyone recognizes (not a hidden header)
- **Readable text:** Dark text on light background stays readable
- **Compact:** Both sections in one card = less vertical space
- **Matches modern UX:** Tabs show both options at once, user chooses which to view
