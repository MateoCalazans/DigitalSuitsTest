import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';

import {ATTRIBUTE_KEY, FORMAT, MAX_LENGTH, sanitize} from './registrationNumber.js';

/**
 * The checkout hands every extension a global `shopify` object, but the type it
 * ships with is the lowest common denominator across all targets. Naming the
 * target here is what tells the type checker which APIs this file may reach for.
 */
const api =
  /** @type {import('@shopify/ui-extensions/purchase.checkout.delivery-address.render-after').Api} */ (
    /** @type {unknown} */ (shopify)
  );

export default function extension() {
  render(<BusinessRegistrationNumber />, document.body);
}

function BusinessRegistrationNumber() {
  // Reading a signal inside the component body subscribes to it, so the field
  // appears and disappears as the buyer edits the Company line of the address.
  const company = (api.shippingAddress?.value?.company ?? '').trim();
  const stored = api.attributes.value.find(({key}) => key === ATTRIBUTE_KEY)?.value ?? '';

  // Null until the buyer types, so the field picks up an attribute that arrives
  // after the first render — coming back to this step, or a reloaded checkout.
  const [draft, setDraft] = useState(/** @type {string | null} */ (null));
  const [showError, setShowError] = useState(false);

  const value = draft ?? stored;

  // A cleared Company line means the order is no longer a business one, so the
  // number that was collected for it shouldn't ride along on the order.
  useEffect(() => {
    if (company !== '') return;

    setDraft(null);
    setShowError(false);

    if (stored !== '') {
      persist('');
    }
  }, [company, stored]);

  if (company === '') return null;

  const error = errorFor(value);

  return (
    <s-text-field
      name={ATTRIBUTE_KEY}
      label={api.i18n.translate('label')}
      value={value}
      maxLength={MAX_LENGTH}
      error={showError && error ? error : undefined}
      onInput={(event) => {
        const field = fieldOf(event);
        const next = sanitize(field.value ?? '');

        // The element holds its own value between renders: when sanitizing
        // produces the value we already have in state, Preact skips the update
        // and the rejected characters would stay on screen. Write it back.
        field.value = next;

        setDraft(next);
        // Stop flagging the field while the buyer is busy correcting it.
        if (showError) setShowError(false);
      }}
      onChange={(event) => {
        const next = sanitize(fieldOf(event).value ?? '');

        setDraft(next);
        setShowError(true);
        persist(next);
      }}
      onBlur={() => setShowError(true)}
    />
  );
}

/**
 * @param {string} value
 * @returns {string | undefined}
 */
function errorFor(value) {
  if (value === '') return api.i18n.translate('errorRequired');
  if (!FORMAT.test(value)) return api.i18n.translate('errorFormat');
  return undefined;
}

/**
 * Mirrors the field into a cart attribute. That attribute is what the merchant
 * sees on the order in the admin, and what the validation function reads when
 * the buyer presses "Continue to shipping" or "Pay".
 *
 * @param {string} value
 */
async function persist(value) {
  const result = await api.applyAttributeChange(
    value === ''
      ? {type: 'removeAttribute', key: ATTRIBUTE_KEY}
      : {type: 'updateAttribute', key: ATTRIBUTE_KEY, value},
  );

  if (result.type === 'error') {
    console.error(result.message);
  }
}

/**
 * Field events carry a plain `Event`; this narrows it back to the element that
 * raised it so its `value` can be read and written.
 *
 * @param {Event} event
 * @returns {HTMLElementTagNameMap['s-text-field']}
 */
function fieldOf(event) {
  return /** @type {HTMLElementTagNameMap['s-text-field']} */ (event.currentTarget);
}
