// @ts-check

/**
 * The shape of what `src/cart_validations_generate_run.graphql` selects.
 *
 * Declared here rather than imported from `../generated/api` so the function
 * type checks straight out of the repository. Run `npm run schema` followed by
 * `npm run typegen` to regenerate the full API types from the live schema.
 *
 * @typedef {{company?: string | null} | null} Address
 * @typedef {{
 *   buyerJourney: {step: string};
 *   cart: {
 *     registrationNumber?: {value?: string | null} | null;
 *     deliveryGroups?: {deliveryAddress?: Address}[] | null;
 *     billingAddress?: Address;
 *   };
 * }} CartValidationsGenerateRunInput
 *
 * @typedef {{message: string; target: string}} ValidationError
 * @typedef {{operations: {validationAdd: {errors: ValidationError[]}}[]}} CartValidationsGenerateRunResult
 */

/**
 * `UA` followed by 8 to 10 digits, so 10 to 12 characters in total. Mirrors the
 * rule the checkout UI extension applies in
 * extensions/business-registration-number/src/registrationNumber.js — that one
 * is for feedback, this one is what actually holds.
 */
const FORMAT = /^UA[0-9]{8,10}$/;

const REQUIRED_MESSAGE =
  'Enter the business registration number for this company.';
const FORMAT_MESSAGE =
  'Enter UA followed by 8 to 10 digits, for example UA12345678.';

// The buyer hasn't reached the address form during cart interaction, so there
// is nothing to enforce yet and blocking would strand them on the cart page.
const ENFORCED_STEPS = ['CHECKOUT_INTERACTION', 'CHECKOUT_COMPLETION'];

/**
 * @param {CartValidationsGenerateRunInput} input
 * @returns {CartValidationsGenerateRunResult}
 */
export function cartValidationsGenerateRun(input) {
  /** @type {ValidationError[]} */
  const errors = [];

  if (ENFORCED_STEPS.includes(input.buyerJourney.step) && hasCompany(input.cart)) {
    const registrationNumber = (input.cart.registrationNumber?.value ?? '').trim();

    if (registrationNumber === '') {
      errors.push({message: REQUIRED_MESSAGE, target: '$.cart'});
    } else if (!FORMAT.test(registrationNumber)) {
      errors.push({message: FORMAT_MESSAGE, target: '$.cart'});
    }
  }

  return {operations: [{validationAdd: {errors}}]};
}

/**
 * A company can be attached to either address. Checking both keeps the rule
 * consistent for digital orders, which have no delivery group at all.
 *
 * @param {CartValidationsGenerateRunInput['cart']} cart
 * @returns {boolean}
 */
function hasCompany(cart) {
  const companies = [
    ...(cart.deliveryGroups ?? []).map((group) => group.deliveryAddress?.company),
    cart.billingAddress?.company,
  ];

  return companies.some((company) => (company ?? '').trim() !== '');
}
