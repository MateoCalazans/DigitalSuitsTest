# DigitalSuits — test assignment

Shopify Horizon theme with a custom section built from scratch, plus a checkout
extension for a business registration number.

Development store: `digitalsuits-test-ngbbizuq.myshopify.com`

---

## Task 1 — DS Feature banner section

A standalone banner section: a full-bleed photo with a content card floating
over it. The card holds a product shot, a heading, body copy, and a call to
action. It is not derived from any existing theme section.

### Files

| File | Role |
| --- | --- |
| [`sections/ds-feature-banner.liquid`](sections/ds-feature-banner.liquid) | Markup, scoped CSS, and the full `{% schema %}` |
| [`snippets/ds-feature-banner-button.liquid`](snippets/ds-feature-banner-button.liquid) | The call to action, in either of its two modes |
| [`snippets/ds-feature-banner-image.liquid`](snippets/ds-feature-banner-image.liquid) | The responsive image inside the card |

### The button

The section's action is configurable in the theme editor, which is the part of
the brief that drives the design of the snippet.

**Link mode** renders a plain `<a>`, with an optional `target="_blank"` that
carries `rel="noopener"`. When the URL is empty the button would normally
vanish, which reads as a bug to a merchant mid-setup, so the editor gets a
non-interactive placeholder instead of nothing.

**Add to cart mode** wraps a `{% form 'product' %}` in the theme's own
`<product-form-component>`, which is already loaded globally by
[`snippets/scripts.liquid`](snippets/scripts.liquid). Reusing it means the
button inherits the theme's AJAX submit, cart drawer, and cart icon count for
free, and behaves identically to every other add-to-cart in the store. The
first available variant is submitted; a sold-out variant disables the button
and swaps the label for the theme's own `products.product.sold_out` string.

The section can sit on any template, so the product comes from a `product`
setting rather than page context.

### Settings

Everything the brief asks to be customizable is exposed, grouped in the editor
under Text, Background image, Card image, Button, Card position, Card
appearance, Typography, and Section padding.

- **All copy** — eyebrow, heading, body, button label
- **Positioning** — card horizontal and vertical placement, text alignment,
  card width (separately for mobile), distance from the section edge, gap
  between elements, card image above or below the text, section height
- **Background color** — the card background, plus an overlay over the photo,
  and separate colors for heading, body, eyebrow, and button

Values reach CSS as custom properties on the section wrapper, so the editor
updates without a reload and no `<style>` block is generated per instance.

---

## Design decisions

### Kessler Display is not in the repository

The Figma specifies **Kessler Display** for the heading. It is a commercial
family from [Production Type](https://productiontype.com/font/kessler), priced
from €80 per style, and it is absent from Shopify's font library, so
`font_picker` cannot reach it. The copies circulating on free font sites are
trial builds redistributed without the foundry's permission and carry a
"personal use only" license, which does not cover a storefront.

The section therefore ships with **Playfair Display** from Shopify's library
and is built so the licensed face can be dropped in without touching code:

1. Add the licensed `.woff2` to `assets/`.
2. Load it with an `@font-face` rule.
3. Set **Typography → Custom heading font** to `"Kessler Display", serif`.

That field takes precedence over the font picker and suppresses the generated
`@font-face`, so no second font is downloaded.

### The section loads its own font

The heading originally resolved through `--font-heading--family`, the theme's
global heading token. That token is set to Inter here, so the heading rendered
in a sans-serif with nothing like the design's character. The section now
carries a `font_picker` of its own and emits the matching `@font-face`, which
means its typography is independent of the merchant's global settings and the
face can be swapped visually in the editor.

### Typography values

Taken from the Figma: heading at 44px / weight 400 / line-height 1, body at
20px / line-height 1. The body's tight leading looked like a measurement error,
so it was checked against the comp — four lines occupy roughly 85px at a
19.92px size, which corroborates it. Both sizes are editor settings.

The design specifies Arial for the body and the call to action, so both are
pinned rather than following the theme's paragraph token. The heading scales
down on narrow viewports via `clamp()` but never exceeds the configured size.

---

## Working with the theme

```bash
# Live preview with hot reload
shopify theme dev --store digitalsuits-test-ngbbizuq.myshopify.com

# Push to a specific theme
shopify theme push --store digitalsuits-test-ngbbizuq.myshopify.com --theme <id>
```

**First push to a brand-new theme fails on JSON templates.** Files upload in
parallel, so `templates/index.json` gets validated before the sections it
references have landed, and the CLI reports that a section type "does not
reference an existing section file". Running the same command a second time
resolves it — the error is an ordering race, not a broken reference.

---

## Task 2 — Checkout field for the business registration number

Not yet implemented. Planned as a checkout UI extension for the field paired
with a Cart and Checkout Validation Function for enforcement, since
`useBuyerJourneyIntercept` is deprecated as of API version 2026-07 and
client-side blocking alone can be bypassed.

The field appears only when the company address is filled in, and the value
must start with `UA` followed by 8 to 10 digits.
