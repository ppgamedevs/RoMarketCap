# UI QA Checklist (UI Excellence Pack v1)

## Mobile checks
- Header sticky and readable on small screens
- Filters collapse gracefully; inputs remain tappable
- Cards, tables, and buttons have adequate spacing and tap targets (min 44x44px)
- Modals/Drawers close via swipe or close button; body scroll disabled while open
- Forms (pricing, partners, newsletter, invite) are mobile-friendly
- Admin pages remain usable on mobile (compact but functional)

## Keyboard navigation
- Tab order follows visual order
- Focus rings visible on all interactive elements (buttons, links, inputs, tabs, selects)
- ESC closes modals/drawers
- Enter submits primary forms (search, filters, newsletter, partners)
- Arrow keys navigate tabs where applicable

## Lighthouse targets
- Performance: 90+ (avoid heavy client components on list pages)
- Accessibility: 95+ (aria labels on search, tabs, modals, forms)
- Best Practices & SEO: 95+

## Key flows

### Public revenue + conversion
- `/pricing`: Table renders correctly, CTAs visible, FAQ accordion works
- `/billing`: Status card shows badges, buttons work (upgrade/manage)
- `/partners`: Form uses Input/Select/Textarea components, validation messages show
- `/api-docs`: Code blocks readable, links styled correctly

### Trust + legal
- `/methodology`, `/terms`, `/privacy`, `/disclaimer`: Content in Cards, readable typography
- `/status`: Health JSON readable, freshness metrics display correctly

### Retention + user product
- `/dashboard`: Cards layout correctly, watchlist summary and alerts display
- `/dashboard/alerts`: Form and list in Cards, empty state if no rules
- `/dashboard/comparisons`: Form and list in Cards, empty state if no comparisons
- `/dashboard/exports`: Export buttons work, premium gate enforced
- `/watchlist`: Filters use Input/Select, empty state shows, cards link correctly
- `/settings`: All sections in Cards, forms use UI kit components

### Growth
- `/newsletter`: Form uses Input component, success/error states show
- `/digest`: List uses Cards, empty state if no digests
- `/invite`: Card layout, link sharing works

### Admin
- `/admin/launch`: Checklist items show badges, shortcuts use buttons
- `/admin/ops`: Health JSON readable, flags show badges, shortcuts use buttons
- `/admin/flags`: Flag cards use Badge components, toggle buttons styled
- `/admin/import-jobs`: Upload form works, job list displays correctly
- `/admin/revenue-check`: Checklist shows, buttons work, test checkout opens
- `/admin/launch-checklist`: Wizard steps display correctly
- `/admin/snapshots`: List displays correctly
- `/admin/audit`: Table readable, export works

## Visual consistency
- Spacing uses consistent scale (cards, sections, forms) - check `src/styles/tokens.ts`
- Buttons use primary/secondary/ghost/destructive/outline variants consistently
- Badges use semantic colors (success/warning/danger/neutral)
- Tables readable with optional zebra rows; sticky header where appropriate
- Empty states show icon/title/description/CTA when data is missing
- Forms use Input/Select/Textarea with consistent label spacing and error messages
- Cards use CardHeader/CardBody structure consistently
- All pages use `py-10` for main padding (not `py-16`)

## Component usage verification
- All buttons use `<Button>` component (not raw `<button>`)
- All cards use `<Card>` component (not raw `<div className="rounded-xl border bg-card">`)
- All badges use `<Badge>` component
- All tables use `<Table>` component
- All forms use `<Input>`, `<Select>`, `<Textarea>` components
- Empty states use `<EmptyState>` component
- Alerts use `<Alert>` component
- Modals use `<Modal>` component

## Accessibility checks
- All form inputs have labels (via Input/Select/Textarea components)
- Error messages have `role="alert"` and `aria-describedby`
- Invalid inputs have `aria-invalid="true"`
- Modals have proper aria labels and focus trap
- Focus rings visible on all interactive elements
- Color contrast passes WCAG AA (badges, text, buttons)


