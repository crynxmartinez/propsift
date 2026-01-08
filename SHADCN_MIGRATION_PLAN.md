# shadcn/ui Migration Plan

## Overview

Full migration of PropSift UI to shadcn/ui before building DockInsight v2.

---

## Current Inventory

### Dashboard Pages (13 pages)
| Page | File | Complexity | Priority |
|------|------|------------|----------|
| Dock Insight | `dashboard/page.tsx` | Placeholder | P1 (after migration) |
| Records | `dashboard/records/page.tsx` | High (table, filters, bulk actions) | P1 |
| Record Detail | `dashboard/records/[id]/page.tsx` | Medium | P2 |
| Tasks | `dashboard/tasks/page.tsx` | High (table, filters, modals) | P1 |
| Board | `dashboard/board/page.tsx` | Medium (kanban) | P2 |
| Board Detail | `dashboard/board/[id]/page.tsx` | Medium | P2 |
| Automations | `dashboard/automations/page.tsx` | High (folders, list) | P2 |
| Automation Editor | `dashboard/automations/[id]/page.tsx` | High (flow builder) | P3 |
| Tags | `dashboard/tags/page.tsx` | Low (simple CRUD) | P1 |
| Motivations | `dashboard/motivations/page.tsx` | Low (simple CRUD) | P1 |
| Statuses | `dashboard/statuses/page.tsx` | Low (simple CRUD) | P1 |
| Settings | `dashboard/settings/page.tsx` | Medium | P2 |
| Activity | `dashboard/activity/page.tsx` | Medium | P2 |
| Feedback | `dashboard/feedback/page.tsx` | Medium | P2 |
| Feedback Detail | `dashboard/feedback/[id]/page.tsx` | Medium | P2 |
| Owners | `dashboard/owners/page.tsx` | Medium | P3 |
| Owner Detail | `dashboard/owners/[id]/page.tsx` | Medium | P3 |

### Marketing Pages (6 pages)
| Page | File | Complexity |
|------|------|------------|
| Landing | `(marketing)/page.tsx` | Medium |
| Features | `(marketing)/features/page.tsx` | Medium |
| Pricing | `(marketing)/pricing/page.tsx` | Low |
| About | `(marketing)/about/page.tsx` | Low |
| Contact | `(marketing)/contact/page.tsx` | Low |
| Privacy/Terms | `(marketing)/privacy/page.tsx`, `terms/page.tsx` | Low |

### Auth Pages (2 pages)
| Page | File | Complexity |
|------|------|------------|
| Login | `login/page.tsx` | Low |
| Register | `register/page.tsx` | Low |

### Admin (1 page)
| Page | File | Complexity |
|------|------|------------|
| Admin Dashboard | `admin/page.tsx` | High |

### Shared Components
| Component | File | Complexity |
|-----------|------|------------|
| Sidebar | `components/Sidebar.tsx` | Low |
| Toast | `components/Toast.tsx` | Low |
| AddPropertyModal | `components/AddPropertyModal.tsx` | High (41KB!) |
| BulkImportModal | `components/BulkImportModal.tsx` | Very High (60KB!) |
| RecordDetailPanel | `components/RecordDetailPanel.tsx` | High (20KB) |
| RecordFilterPanel | `components/RecordFilterPanel.tsx` | Very High (55KB!) |
| Automation Components | `components/automation/*` | High |
| Marketing Components | `components/marketing/*` | Medium |

---

## shadcn/ui Components Needed

### Core (Install First)
- [x] `button` — Buttons everywhere
- [x] `card` — Cards, panels, containers
- [x] `badge` — Tags, status indicators, temperature
- [x] `input` — Text inputs
- [x] `label` — Form labels
- [x] `textarea` — Multi-line inputs

### Forms
- [x] `select` — Dropdowns
- [x] `checkbox` — Checkboxes
- [x] `switch` — Toggle switches
- [x] `radio-group` — Radio buttons

### Layout
- [x] `separator` — Dividers
- [x] `scroll-area` — Scrollable containers
- [x] `tabs` — Tab navigation

### Overlays
- [x] `dialog` — Modals
- [x] `sheet` — Slide-out panels
- [x] `dropdown-menu` — Context menus
- [x] `popover` — Popovers
- [x] `tooltip` — Tooltips
- [x] `alert-dialog` — Confirmation dialogs

### Data Display
- [x] `table` — Data tables
- [x] `avatar` — User avatars
- [x] `progress` — Progress bars
- [x] `skeleton` — Loading states

### Feedback
- [x] `toast` — Toast notifications (sonner)
- [x] `alert` — Alert messages

---

## Migration Strategy

### Phase 1: Foundation (Day 1)
1. Install dependencies
2. Create `src/lib/utils.ts`
3. Update `tailwind.config.js`
4. Add CSS variables to `globals.css`
5. Add all shadcn/ui components to `src/components/ui/`

### Phase 2: Shared Components (Day 2)
1. Migrate `Sidebar.tsx`
2. Migrate `Toast.tsx` → Use shadcn toast
3. Create shared components:
   - `PageHeader.tsx` — Consistent page headers
   - `DataTable.tsx` — Reusable table component
   - `ConfirmDialog.tsx` — Confirmation modals
   - `EmptyState.tsx` — Empty state displays

### Phase 3: Simple Pages (Day 3)
1. Login page
2. Register page
3. Tags page
4. Motivations page
5. Statuses page

### Phase 4: Medium Pages (Day 4-5)
1. Settings page
2. Activity page
3. Feedback pages
4. Board pages

### Phase 5: Complex Pages (Day 6-8)
1. Records page (biggest page)
2. Tasks page
3. Automations pages
4. Admin page

### Phase 6: Large Modals (Day 9-10)
1. AddPropertyModal
2. BulkImportModal
3. RecordDetailPanel
4. RecordFilterPanel

### Phase 7: Marketing Pages (Day 11)
1. Landing page
2. Features page
3. Other marketing pages

### Phase 8: DockInsight v2 (Day 12+)
Build new DockInsight with shadcn/ui foundation

---

## Component Mapping

### Buttons
```tsx
// Before
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
  Save
</button>

// After
<Button>Save</Button>
<Button variant="outline">Cancel</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost" size="sm">Edit</Button>
```

### Cards
```tsx
// Before
<div className="bg-white rounded-lg shadow p-6 border">
  <h3 className="font-semibold">Title</h3>
  <p className="text-gray-600">Content</p>
</div>

// After
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Badges
```tsx
// Before
<span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
  Active
</span>

// After
<Badge variant="success">Active</Badge>
<Badge variant="destructive">Inactive</Badge>
<Badge variant="outline">Draft</Badge>
```

### Inputs
```tsx
// Before
<input 
  type="text"
  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
  placeholder="Search..."
/>

// After
<Input placeholder="Search..." />
```

### Selects
```tsx
// Before
<select className="px-3 py-2 border rounded-md">
  <option>Option 1</option>
</select>

// After
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

### Modals
```tsx
// Before
{showModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div className="bg-white rounded-lg p-6">
      ...
    </div>
  </div>
)}

// After
<Dialog open={showModal} onOpenChange={setShowModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    ...
  </DialogContent>
</Dialog>
```

### Tables
```tsx
// Before
<table className="w-full">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-4 py-2 text-left">Name</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b">
      <td className="px-4 py-2">John</td>
    </tr>
  </tbody>
</table>

// After
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## Design Tokens

### Colors (CSS Variables)
```css
:root {
  /* Background */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  
  /* Primary (Blue) */
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  
  /* Secondary (Gray) */
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  
  /* Destructive (Red) */
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  
  /* Muted */
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  
  /* Accent */
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 47.4% 11.2%;
  
  /* Border & Input */
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  
  /* Radius */
  --radius: 0.5rem;
}
```

### Temperature Colors (Custom)
```css
:root {
  --temp-hot: 0 84% 60%;        /* Red */
  --temp-warm: 25 95% 53%;      /* Orange */
  --temp-cold: 199 89% 48%;     /* Blue */
}
```

---

## File Changes Summary

### New Files
```
src/
├── lib/
│   └── utils.ts                    # cn() utility
├── components/
│   └── ui/
│       ├── alert-dialog.tsx
│       ├── alert.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── popover.tsx
│       ├── progress.tsx
│       ├── radio-group.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── skeleton.tsx
│       ├── switch.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       ├── toast.tsx
│       ├── toaster.tsx
│       └── tooltip.tsx
```

### Modified Files
```
tailwind.config.js          # Add CSS variable support
src/app/globals.css         # Add CSS variables
src/app/layout.tsx          # Add Toaster component
+ All page files            # Use new components
+ All component files       # Use new components
```

---

## Estimated Timeline

| Phase | Duration | Pages/Components |
|-------|----------|------------------|
| Phase 1: Foundation | 2-3 hours | Setup only |
| Phase 2: Shared Components | 3-4 hours | 4 components |
| Phase 3: Simple Pages | 3-4 hours | 5 pages |
| Phase 4: Medium Pages | 6-8 hours | 6 pages |
| Phase 5: Complex Pages | 8-12 hours | 4 pages |
| Phase 6: Large Modals | 8-10 hours | 4 modals |
| Phase 7: Marketing Pages | 4-6 hours | 6 pages |
| **Total** | **~40-50 hours** | 27 pages + components |

---

## Risk Mitigation

1. **Test after each phase** — Don't break everything at once
2. **Keep old code commented** — Easy rollback if needed
3. **Commit frequently** — Small, reversible changes
4. **Mobile testing** — Ensure responsive design works

---

## Next Steps

1. **Approve this plan**
2. **Start Phase 1: Foundation**
3. **Migrate page by page**
4. **Build DockInsight v2**

---

*Last updated: January 8, 2026*
