# Checkout field for the business registration number

One field added to checkout, shown only for company addresses, with the order
refused when what's in it isn't a valid registration number.

| Extension | Role |
| --- | --- |
| [`business-registration-number`](extensions/business-registration-number) | Checkout UI extension — renders the field, tells the buyer what's wrong as they type |
| [`business-registration-validation`](extensions/business-registration-validation) | Validation function — decides, server side, whether the order may proceed |

## The rule

`UA` followed by 8 to 10 digits, so 10 to 12 characters. Characters that don't
fit are refused as they're typed, and the finished value is re-checked with
`/^UA[0-9]{8,10}$/`.

The field appears only while the Company line of the shipping address holds
something. Clearing that line removes the number from the order, so a personal
order never carries one.

**One assumption.** The brief fixes the format but not whether the field is
optional. It's required once a company address is given — a company order with no
registration number is the case the field exists to prevent. To flip that, drop
the `REQUIRED_MESSAGE` branch in the function and the empty-value branch of
`errorFor` in `Checkout.jsx`.

## Why two extensions

The brief asks for validation "when clicking the Continue to Shipping or Pay
button". There was a hook for exactly that, `useBuyerJourneyIntercept`, and it
was [deprecated in 2026-07](https://shopify.dev/changelog/deprecating-the-usebuyerjourneyintercept-api-on-checkout-ui-extensions)
along with the capability it depended on.

That turns out to be the better answer anyway. A function runs on Shopify's
servers, so it also covers Shop Pay, PayPal, Google Pay and Apple Pay — surfaces
where the extension's UI never renders and a client-side check would simply be
skipped. The extension keeps its own copy of the rule purely so the buyer sees
the problem immediately instead of after a round trip.

## Decisions worth knowing

**Where the field sits.** Directly under the address form, via the static target
`purchase.checkout.delivery-address.render-after`. Nothing can render beneath
*Company* itself — the checkout has no slot between address fields. A movable
block target sounds better until you check the placements: the nearest are above
the whole address form, or below the delivery method selector. The fixed target
is the only one that reaches the end of the address form.

**Where the value lives.** The cart metafield `$app:business` /
`registration_number`. A cart attribute was the first attempt — attributes can be
read back, so the field could repopulate itself — but `applyAttributeChange` is
deprecated in 2026-07 and the write never landed; every value reached the
function as empty. The metafield works, and the cost is real: there's no signal
for reading a cart metafield back, so leaving the information step and returning
shows an empty field. The order stays correct, since the function reads the
metafield rather than the input.

**When it's written.** On `input`, the moment the number is complete — not on
`change`. Waiting for the field to lose focus raced the buyer pressing Continue,
and the checkout would validate against a cart that hadn't heard about the value
yet.

**Where the error appears.** Validation functions can target the cart or a fixed
list of checkout fields. A metafield isn't on that list, so the function's error
is page-level and the message under the field comes from the extension. The
function stays quiet during `CART_INTERACTION` — cart errors surface on the
theme's cart page too, and there's nothing to enforce before the buyer reaches an
address form.

## Running it

```bash
cd checkout-app
npm install
npm run deploy
```

The store has to be a **development store with client transfer disabled**, on the
Shopify Plus plan. Custom apps containing functions are rejected anywhere else —
the admin reports it as `CUSTOM_APP_FUNCTION_NOT_ELIGIBLE`, worded as a plan
problem even when the real cause is that the store is earmarked for transfer.

Then, in that store's admin:

1. **Settings → Checkout** → *Company name* set to `Optional`. Without it the
   checkout never collects a company and the field never appears.
2. **Settings → Checkout → Customize** → activate the field. It's a static
   target, so it takes its own position; there's nothing to drag.
3. **Settings → Checkout → Checkout rules → Add rule** → pick this app's
   validation, give it a title, activate it. Functions don't run until a merchant
   turns them on.

## Tests

```bash
npm test
npm run typecheck
```

31 cases. The function's cover the format, both buyer journey steps that enforce
it, carts with no company, and billing-only company addresses. The extension's
cover the character restriction — which characters are accepted at which
position, and where the input stops.

To exercise the compiled Wasm instead of the source:

```bash
cd extensions/business-registration-validation
npx shopify app function run \
  --input=sample-input/blocked-at-pay.json \
  --export=cart-validations-generate-run
```

`blocked-at-pay.json` and `allowed.json` sit at `CHECKOUT_COMPLETION` — the step
behind the Pay button, awkward to reach by hand in a three-page checkout.

Type checking is what keeps the Polaris props honest: `tsconfig.json` names the
extension target, so the checker knows which components and which `shopify` APIs
that target is allowed.
