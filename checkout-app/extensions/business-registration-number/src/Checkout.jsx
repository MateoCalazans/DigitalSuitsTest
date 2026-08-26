import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useRef, useState} from 'preact/hooks';

import {
  FORMAT,
  MAX_LENGTH,
  METAFIELD_KEY,
  METAFIELD_NAMESPACE,
  METAFIELD_TYPE,
  sanitize,
} from './registrationNumber.js';

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

  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);

  // What the cart is believed to hold. The checkout offers no signal for
  // reading a cart metafield back, so the extension tracks its own writes.
  const written = useRef('');

  /**
   * @param {string} next
   */
  async function persist(next) {
    if (written.current === next) return;
    written.current = next;

    const result = await api.applyMetafieldChange(
      next === ''
        ? {
            type: 'removeCartMetafield',
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
          }
        : {
            type: 'updateCartMetafield',
            metafield: {
              namespace: METAFIELD_NAMESPACE,
              key: METAFIELD_KEY,
              type: METAFIELD_TYPE,
              value: next,
            },
          },
    );

    if (result.type === 'error') {
      // Let the write be retried rather than silently assumed to have landed.
      written.current = '';
      console.error(result.message);
    }
  }

  // A cleared Company line means the order is no longer a business one, so the
  // number that was collected for it shouldn't ride along on the order.
  useEffect(() => {
    if (company !== '') return;

    setValue('');
    setShowError(false);
    persist('');
  }, [company]);

  if (company === '') return null;

  const error = errorFor(value);

  return (
    <s-text-field
      name={METAFIELD_KEY}
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

        setValue(next);
        // Stop flagging the field while the buyer is busy correcting it.
        if (showError) setShowError(false);

        // Save the moment the number is complete. Waiting for the field to lose
        // focus would race the buyer pressing Continue, and the checkout would
        // be validated against a cart that hasn't heard about the value yet.
        if (FORMAT.test(next)) persist(next);
      }}
      onChange={(event) => {
        const next = sanitize(fieldOf(event).value ?? '');

        setValue(next);
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
 * Field events carry a plain `Event`; this narrows it back to the element that
 * raised it so its `value` can be read and written.
 *
 * @param {Event} event
 * @returns {HTMLElementTagNameMap['s-text-field']}
 */
function fieldOf(event) {
  return /** @type {HTMLElementTagNameMap['s-text-field']} */ (event.currentTarget);
}
