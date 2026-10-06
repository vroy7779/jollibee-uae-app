# Jollibee UAE — design guidelines

Tokens live in `src/styles/theme.css`. Shared components live in `src/app/components/ds.tsx`.
Screens compose those components; they do not style raw elements with one-off values.

## Point of view

Loud, warm and generous, like the restaurant. Red leads, yellow answers it, orange is the third voice, and the page itself is cream.
Colour and motion are part of the product. What the system controls is *which* colours and *where*, so the app is vivid without being random.

## Rules

1. **Red owns the top of every screen.** Root tabs open with a red gradient header (`bg-brand-gradient` + `HeaderGlow`); pushed screens use the red `TopBar`.
2. **Yellow is the reward colour**: points, tiers, offers, "you earned". On red surfaces the call to action is the yellow `reward` button, because a red button would vanish.
3. **Rows get their colour from an `IconChip`** in one of five tints (brand, reward, accent, success, neutral). Pick the tint by meaning, and keep it the same wherever that thing appears.
4. **Prices and totals are red**, savings and credits are green.
5. **Cards sit on cream with a soft lift** (`shadow-card`). Related rows share one card with dividers.
6. **Two gradients only**: `bg-brand-gradient` (red) and `bg-sunrise` (yellow to orange, for progress). No others.
7. **No raw colours and no emoji.** No hex values or Tailwind palette classes (`gray-500`, `red-50`…) in screens.

## Colour

| Token | Value | Use |
|---|---|---|
| `bg` | `#fff8ea` | Page background (cream) |
| `surface` | `#ffffff` | Cards, sheets, inputs |
| `sunken` | `#f8ecd4` | Segmented track, locked rows, hover |
| `line` | `#f0e2c6` | Dividers and card borders |
| `line-strong` | `#8f867d` | Borders of inputs and checkboxes (3.6:1 on white) |
| `ink` / `ink-2` / `ink-3` | `#1e1a18` / `#57504a` / `#6b625b` | Primary, secondary and muted text |
| `brand` | `#e31837` | Headers, primary button, selected state, active tab |
| `brand-deep` | `#a80f26` | Gradient end, tracks on red |
| `brand-pressed` / `brand-text` | `#c41330` | Pressed button; red text, prices and links (5.2:1 or better on every tint) |
| `brand-subtle` | `#fdecee` | Selected row, red chip background |
| `reward` | `#ffc629` | Yellow buttons, badges, tier and reward marks |
| `reward-subtle` | `#fff1c9` | Loyalty panels, "points earned" notices, unread items |
| `zest` / `zest-text` / `zest-subtle` | `#f47b20` / `#b8440a` / `#ffe8d6` | Orange accent: third chip tint, gradient end |
| `success` / `-subtle` | `#1e7b45` / `#dff3e6` | Applied, ready, credited |
| `warning` / `-subtle` | `#8a5300` / `#fdf0d5` | On hold |
| `error` / `-subtle` | `#b4121f` / `#fdecee` | Validation and destructive text |

Text on red is solid white or yellow; faded white fails contrast. Text on yellow or orange is always `ink`.

## Motion

All motion is defined once in `theme.css` and switched off under reduced-motion.

| Utility | Where |
|---|---|
| `anim-screen` | A pushed screen sliding in |
| `stagger` | Sections of a screen arriving one after another |
| `anim-rise`, `anim-fade` | Single elements entering; tab changes |
| `anim-sheet`, `anim-pop`, `anim-drop` | Bottom sheets; dialogs, badges and check marks; the order nudge |
| `anim-bump` | Cart bar when the count changes |
| `anim-grow` | Progress bars filling |
| `anim-ping` | The live step on an order, the scan prompt |
| `anim-float` | Shapes drifting in red headers |
| `CountUp`, `SuccessMark` | Points counting up; success tick with a burst of dots |

Every button also presses in slightly on tap.

## Type

Figtree, four weights (400, 500, 600, 700). Numbers that line up use `t-num`.

| Role | Class | Size / line | Weight |
|---|---|---|---|
| Display | `t-display` | 32 / 36 | 700 |
| Heading 1 | `t-h1` | 24 / 30 | 700 |
| Heading 2 | `t-h2` | 20 / 26 | 600 |
| Heading 3 | `t-h3` | 17 / 24 | 600 |
| Body | `text-base` | 15 / 22 | 400 |
| Body small | `text-sm` | 13 / 18 | 400 |
| Caption | `text-xs` | 12 / 16 | 400 |
| Label | `t-label` | 11 / 16, uppercase, +0.06em | 600 |
| Button | (in `Button`) | 15 / 22 | 600 |

Emphasis inside body text is `font-semibold`. `font-bold` is reserved for display and H1.

## Space, radius, elevation

- **Spacing:** the 4-px scale — 4, 8, 12, 16, 20, 24, 32. Screen gutter is 16. Sections are 24 apart. Card padding is 16.
- **Radius:** `rounded-sm` 6 (badges, segments), `rounded-md` 10 (buttons, inputs, chips), `rounded-lg` 14 (cards), `rounded-xl` 24 (the bottom of red headers, the top of sheets). `rounded-full` for avatars, marks, progress bars, category pills and the active tab.
- **Elevation:** `shadow-card` for cards and tiles, `shadow-float` for sheets, dialogs, toasts, the cart bar and the order nudge.
- **Touch targets:** 48 for primary actions and rows, 40 for icon buttons, 36 minimum for compact controls.
- **Focus:** every interactive element gets the same 2-px ink outline (set globally).

## Components (`ds.tsx`)

| Component | Use |
|---|---|
| `Button` | `primary` (red), `secondary` (red outline), `reward` (yellow, for red surfaces), `ghost`, `danger`; `size="sm"` for inline row actions |
| `Link` | Inline text action ("Change", "Edit cart") |
| `IconButton` | Icon-only control; always takes a `label` |
| `TopBar`, `ScreenShell` | Title bar; pushed screen with back, body and pinned footer |
| `Section`, `Card` | Labelled group; the one container surface |
| `Row`, `Line`, `Divider` | Navigation/settings row; label–value pair; separator inside a card |
| `Field`, `INPUT_CLASS` | Text input with label, hint and error |
| `Segmented` | Two to four mutually exclusive options |
| `Choice`, `Mark` | Selectable row with radio or checkbox |
| `Stepper` | Quantity |
| `Badge`, `Progress`, `TierMark` | Status tag; progress bar; tier rank as a numeral on that tier's colour |
| `IconChip` | Icon on a tinted square, for rows and shortcuts |
| `HeaderGlow`, `CountUp`, `SuccessMark` | Drifting shapes in red headers; animated number; success tick with burst |
| `Thumb`, `ProductRow` | Food thumbnail; menu item row |
| `Empty`, `Spinner` | Empty and loading states |
| `Sheet`, `Confirm`, `Toast` | Bottom sheet, confirmation dialog, transient message |

## Copy

Say what happens, in the customer's words. Sentence case for labels the app owns; strings taken from the shipped app keep their original casing. No exclamation-mark filler, no "smart" or "seamless".

## Interaction reference: Costa Club UAE

The workflow follows the Costa Club UAE app; the colours do not. Patterns taken from its App Store screenshots and listing:

| Area | Pattern |
|---|---|
| Home | Greeting and one line of encouragement, three square tiles (Order, Scan, Stores), then a reward-progress card with "View History", then campaign banners |
| Menu | Store name in the title bar with a change chevron, order history icon on the left, search, text tabs starting with My Favorites, two-column photo grid with a heart on each item; tapping a tile opens the item |
| Stores | "Select Store": map with pins, filter button, search and locate-me over the map, store list as a sheet below; a row opens the store's details |
| Wallet | Member card, three figures (points, value, free rewards), QR code, one main button, settings gear |
| Gift cards | "Send a gift card": designs grouped by occasion in horizontal rows, history icon for cards you already have |
| Offers | Filters at the top of the list |

Not visible in public material, so still our own design: item customisation, basket (including the empty state), checkout, and order status.

## Reviewing a screen

In development, any screen can be opened directly:

- `/?tab=home` · `order` · `rewards` · `scan` · `profile`
- `/?screen=cart&store=1&cart=1` (also `item`, `checkout`, `wallet`, `giftCards`, `giftCardDetail`, `orderDetail`, `stores`, `coupons`, …)

`store=1` preselects a store and `cart=1` seeds two items. These links are stripped from production builds.
