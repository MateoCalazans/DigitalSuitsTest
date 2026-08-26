/**
 * The shape of a business registration number: the literal prefix `UA` followed
 * by 8 to 10 digits, so 10 to 12 characters in total.
 *
 * The same rule is enforced server side by the validation function in
 * extensions/business-registration-validation. Keep the two in sync.
 */
export const METAFIELD_NAMESPACE = '$app:business';

export const METAFIELD_KEY = 'registration_number';

export const METAFIELD_TYPE = 'single_line_text_field';

export const FORMAT = /^UA\d{8,10}$/;

export const MAX_LENGTH = 12;

const PREFIX_LENGTH = 2;

/**
 * Drops every character the format doesn't allow at the position it was typed
 * in: letters for the two-character prefix, digits after it. Typing is
 * case-insensitive; the stored value is always upper case.
 *
 * @param {string} raw
 * @returns {string}
 */
export function sanitize(raw) {
  let out = '';

  for (const character of raw.toUpperCase()) {
    if (out.length === MAX_LENGTH) break;

    const allowed =
      out.length < PREFIX_LENGTH ? /[A-Z]/.test(character) : /[0-9]/.test(character);

    if (allowed) out += character;
  }

  return out;
}
