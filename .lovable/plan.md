

## Plan: Professional Pricing Section with Side-by-Side Free & Premium Cards

### Overview
Redesign the `PremiumPage.tsx` to feature two side-by-side subscription cards (Free vs Premium Pro) at the top, with a golden-glow highlighted Premium card, "Most Popular" badge, strikethrough original price (500 PKR), and a payment modal (Dialog) triggered by the "Upgrade to Pro" button.

### Changes

**1. Restructure PremiumPage.tsx layout**
- Replace the single pricing card with a **2-column grid** (`grid grid-cols-1 md:grid-cols-2`) containing Free and Premium cards.
- **Free Card**: Muted styling, grey "Current Plan" disabled button. Features: 2 Slides/day, PDF Only (2MB), Standard Voice, 50MB Storage, Standard Timer, Normal User Badge — each with a Lucide icon.
- **Premium Card**: Golden gradient border with glow (`shadow-amber-500/20`), a "Most Popular" badge at the top, Crown icon. Price: **300 PKR** bold, with ~~500 PKR~~ strikethrough and "Save 40%" badge. Features: Unlimited Slides, All Formats, Pro Voices, 5GB Storage, Priority Exam Alerts, Golden Verified Tick — each with a Lucide icon and emerald checkmarks.
- Add a small "Golden Tick Preview" badge mockup inside the Premium card showing what the profile badge looks like.

**2. Payment Modal (Dialog)**
- Move the existing payment flow (promo code, JazzCash/EasyPaisa selection, screenshot upload, pending/rejected status) into a `Dialog` component.
- "Upgrade to Pro" button on the Premium card opens this modal.
- Keep all existing payment logic (promo codes, upload, status checks) intact — just wrap in Dialog.

**3. Visual Details**
- Premium card: `border-amber-500/40` with `shadow-lg shadow-amber-500/20` for golden glow effect.
- "Upgrade to Pro" button: gradient `from-amber-500 to-orange-500` with `animate-pulse` that stops on hover.
- Free card features use `XCircle` or muted icons for limitations vs Premium's `CheckCircle2` in emerald.
- Responsive: cards stack vertically on mobile.

**4. File changes**
- `src/pages/PremiumPage.tsx` — full rewrite of the main content section (pricing cards + dialog for payment flow). No new files needed. Existing auth check, pro check, and payment logic remain unchanged.

### Technical Notes
- Uses existing `Dialog` from `@radix-ui/react-dialog` (already in project).
- No database changes needed — all existing payment/promo logic stays the same.
- The `usePro` hook and `ProPaywall` component remain untouched.

