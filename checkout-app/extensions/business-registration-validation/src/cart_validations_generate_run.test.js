import {describe, it, expect} from 'vitest';

import {cartValidationsGenerateRun} from './cart_validations_generate_run';

function buildInput({
  step = 'CHECKOUT_INTERACTION',
  company = 'DigitalSuits',
  registrationNumber = 'UA12345678',
} = {}) {
  return {
    buyerJourney: {step},
    cart: {
      registrationNumber:
        registrationNumber === null ? null : {value: registrationNumber},
      deliveryGroups: [{deliveryAddress: {company}}],
      billingAddress: null,
    },
  };
}

const errorsOf = (input) =>
  cartValidationsGenerateRun(input).operations[0].validationAdd.errors;

describe('business registration number validation', () => {
  it('allows a well-formed number', () => {
    expect(errorsOf(buildInput())).toEqual([]);
  });

  it('allows the longest accepted number', () => {
    expect(errorsOf(buildInput({registrationNumber: 'UA1234567890'}))).toEqual([]);
  });

  it('ignores carts without a company address', () => {
    expect(errorsOf(buildInput({company: null, registrationNumber: null}))).toEqual(
      [],
    );
  });

  it('ignores a company address written as whitespace', () => {
    expect(errorsOf(buildInput({company: '   ', registrationNumber: null}))).toEqual(
      [],
    );
  });

  it('holds off while the buyer is still in the cart', () => {
    expect(
      errorsOf(buildInput({step: 'CART_INTERACTION', registrationNumber: null})),
    ).toEqual([]);
  });

  it('requires a number once a company is given', () => {
    expect(errorsOf(buildInput({registrationNumber: null}))).toEqual([
      {
        message: 'Enter the business registration number for this company.',
        target: '$.cart',
      },
    ]);
  });

  it.each([
    ['a different prefix', 'PL12345678'],
    ['too few digits', 'UA1234567'],
    ['too many digits', 'UA12345678901'],
    ['letters after the prefix', 'UA1234567A'],
    ['punctuation', 'UA-12345678'],
    ['lower case', 'ua12345678'],
  ])('rejects %s', (_label, registrationNumber) => {
    expect(errorsOf(buildInput({registrationNumber}))).toEqual([
      {
        message: 'Enter UA followed by 8 to 10 digits, for example UA12345678.',
        target: '$.cart',
      },
    ]);
  });

  it('checks the billing address when there is no delivery group', () => {
    const input = buildInput({registrationNumber: null});
    input.cart.deliveryGroups = [];
    input.cart.billingAddress = {company: 'DigitalSuits'};

    expect(errorsOf(input)).toHaveLength(1);
  });

  it('blocks at payment as well as at shipping', () => {
    expect(
      errorsOf(buildInput({step: 'CHECKOUT_COMPLETION', registrationNumber: 'nope'})),
    ).toHaveLength(1);
  });
});
