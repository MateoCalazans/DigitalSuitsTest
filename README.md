# DigitalSuits — test assignment

Two pieces: a custom section for the Horizon theme, and a checkout field for a
business registration number.

Development store: `digitalsuits-test-ngbbizuq.myshopify.com`

---

## Task 1 — DS Feature banner

A full-bleed photo with a content card floating over it — product shot, heading,
body copy, and a call to action. Built from scratch rather than adapted from an
existing theme section.

| File | Role |
| --- | --- |
| [`sections/ds-feature-banner.liquid`](sections/ds-feature-banner.liquid) | Markup, scoped CSS, and the `{% schema %}` |
| [`snippets/ds-feature-banner-button.liquid`](snippets/ds-feature-banner-button.liquid) | The call to action, in either mode |
| [`snippets/ds-feature-banner-image.liquid`](snippets/ds-feature-banner-image.liquid) | The responsive image inside the card |
| [`snippets/ds-feature-banner-font.liquid`](snippets/ds-feature-banner-font.liquid) | The heading `@font-face` |

### The button has two modes

**Link** renders a plain `<a>`, optionally opening in a new tab with
`rel="noopener"`. An empty URL would normally make the button vanish, which
reads as a bug to a merchant mid-setup, so the editor shows a non-interactive
placeholder instead.

**Add to cart** wraps a `{% form 'product' %}` in the theme's own
`<product-form-component>`, already loaded globally by
[`snippets/scripts.liquid`](snippets/scripts.liquid). Reusing it means the button
inherits the theme's AJAX submit, cart drawer, and icon count for free, and
behaves like every other add-to-cart in the store. The first available variant is
submitted; a sold-out one disables the button and swaps in the theme's own
`products.product.sold_out` string.

The section can sit on any template, so the product comes from a setting rather
than page context.

### Everything is editable

Copy, card placement and width, text alignment, section height, spacing, and
colors for the card, the photo overlay, and each piece of text — all grouped in
the editor under Text, Background image, Card image, Button, Card position, Card
appearance, Typography, and Section padding.

Values reach CSS as custom properties on the section wrapper, so the editor
updates live and no `<style>` block is emitted per instance.


### Working on it

```bash
shopify theme dev --store digitalsuits-test-ngbbizuq.myshopify.com
shopify theme push --store digitalsuits-test-ngbbizuq.myshopify.com --theme <id>
```

The first push to a brand-new theme fails on JSON templates: files upload in
parallel, so `templates/index.json` is validated before the sections it
references land, and the CLI claims a section type "does not reference an
existing section file". Run it again and it resolves — an ordering race, not a
broken reference.

---

## Task 2 — Checkout field for the business registration number

Lives in [`checkout-app/`](checkout-app/), with its own
[README](checkout-app/README.md) covering the details.

A checkout UI extension renders the field under the shipping address and shows
it only while the Company line holds something. A Cart and Checkout Validation
function then decides whether the order may proceed — on `Continue to shipping`
and on `Pay` alike.

Two pieces rather than one because `useBuyerJourneyIntercept`, the hook built for
exactly this, was deprecated in API version 2026-07. A function runs server side,
so it also holds for Shop Pay, PayPal, Google Pay and Apple Pay, where an
extension's UI never renders at all. The extension keeps a copy of the rule only
to tell the buyer what's wrong while they type.

The value is `UA` followed by 8 to 10 digits. Characters that don't fit are
refused as they're typed, and the finished value is re-checked on the server.
