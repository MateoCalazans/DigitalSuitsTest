# Checkout field for the business registration number

A Shopify app with two extensions. Together they add one field to checkout,
show it only for company addresses, and refuse the order when what's in it
isn't a valid registration number.

| Extension | Type | Role |
| --- | --- | --- |
| [`extensions/business-registration-number`](extensions/business-registration-number) | Checkout UI extension | Renders the field and gives the buyer immediate feedback |
| [`extensions/business-registration-validation`](extensions/business-registration-validation) | Cart and Checkout Validation function | Decides, server side, whether the order may proceed |

## The rule

`UA` followed by 8 to 10 digits — 10 to 12 characters in total. Nothing else is
accepted: the field refuses characters that don't fit as they're typed, and the
function re-checks the finished value with `/^UA[0-9]{8,10}$/`.

The field appears only when the Company line of the shipping address holds
something. Clearing that line removes the collected number from the order, so a
personal order never carries one.

### Where it sits

Directly under the address form, via the static target
`purchase.checkout.delivery-address.render-after`.

Nothing can render beneath *Company* itself. The checkout exposes no slot
between individual address fields — the finest granularity anywhere in checkout
is the section, never the field.

A block target (`purchase.checkout.block.render`) would let the merchant drag
the field around, which sounds like the better trade until you read the
[placement references](https://shopify.dev/docs/api/checkout-ui-extensions/2026-07/targets/checkout/block).
The two placements bracketing the address are `INFORMATION2`, above the whole
address form, and `INFORMATION3`, below the *delivery method* selector. Neither
sits at the end of the address form. So the movable option can't reach the
position that matters here, and the fixed one can.

The only fields Shopify renders inside the address form itself are
[localized fields](https://shopify.dev/docs/api/checkout-ui-extensions/2026-07/apis/localized-fields)
— country-specific tax credentials such as CPF/CNPJ or codice fiscale. An app
can read and validate those, but not define new ones, and there's no Ukrainian
registration number among them.

**Assumption.** The brief pins down the format but not whether the field is
optional. It's treated as required once a company address is given — a company
order without a registration number is the case the field exists to prevent. To
make it optional instead, drop the `REQUIRED_MESSAGE` branch in
[`cart_validations_generate_run.js`](extensions/business-registration-validation/src/cart_validations_generate_run.js)
and the empty-value branch of `errorFor` in
[`Checkout.jsx`](extensions/business-registration-number/src/Checkout.jsx).

## Why two extensions

The brief asks for validation "when clicking the Continue to Shipping or Pay
button". The checkout UI extension API had a hook for exactly that,
`useBuyerJourneyIntercept`, but it was
[deprecated in API version 2026-07](https://shopify.dev/changelog/deprecating-the-usebuyerjourneyintercept-api-on-checkout-ui-extensions)
along with the `block_progress` capability it depended on, and Shopify points
you at a validation function instead.

That's the better answer regardless. A validation function runs on Shopify's
servers, so it also covers Shop Pay, PayPal, Google Pay, Apple Pay and agentic
checkout — surfaces where an extension's UI never renders and a client-side
check would simply be skipped.

The UI extension still does its own checking, but only to be pleasant about it:
the buyer sees the problem under the field as they type instead of after a
round trip.

### Where the error appears

Validation functions attach an error either to the cart or to one of a fixed
list of checkout fields. The number lives in a cart attribute, which isn't on
that list, so the function's error is a page-level one (`target: '$.cart'`) and
the inline message under the field comes from the UI extension.

The function holds off entirely while `buyerJourney.step` is `CART_INTERACTION`.
Cart errors surface on the theme's cart page too, and there's nothing to enforce
before the buyer has reached an address form.

### Where the value is stored

In a cart attribute, `business_registration_number`, which carries onto the
order so the merchant can see it in the admin next to the company address.

`applyAttributeChange` carries a deprecation note in the 2026-07 typings
pointing at cart metafields. Attributes were kept anyway: the checkout API has
no signal for reading a cart metafield back, so the field would render empty
whenever the buyer stepped back to the information page, and the value wouldn't
show on the order without a metafield definition and an order-metafield copy.
When a read path lands, the swap is `applyMetafieldChange` in `persist()` and
`cart.metafield(namespace:key:)` in the input query.

## Running it

```bash
cd checkout-app
npm install
npm run dev          # links the app the first time, then serves both extensions
```

The first `npm run dev` asks which Partner organization to use and whether to
create a new app; it writes `client_id` into `shopify.app.toml` afterwards.

Two things have to be arranged on the store before the field does anything:

1. **Protected customer data.** Reading the address `company` needs level 1
   access, granted per app in the Partner Dashboard under **API access →
   Protected customer data**. Without it `shippingAddress` comes back empty and
   the field never appears.
2. **Activate the validation.** Functions don't run until a merchant turns them
   on: Shopify admin → **Settings → Checkout → Checkout rules → Add rule**, then
   pick this app's validation. A store can have 25 active at once.

Then activate the field in **Settings → Checkout → Customize**. It's a static
target, so it takes its own position under the address form — there's nothing
to drag.

## Tests

```bash
npm test        # both extensions
npm run typecheck
```

The function's tests cover the format, the two buyer journey steps that enforce
it, carts with no company, and billing-only company addresses. The UI
extension's tests cover the character restriction — which characters are
accepted at which position, and where the input stops.

Type checking the UI extension is what keeps the Polaris component props honest;
`tsconfig.json` names the extension target so the checker knows which components
and which `shopify` APIs that target is allowed.
