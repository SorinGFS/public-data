'use strict';
// Verify exact decimal divisibility across ordinary, boundary, and invalid Number inputs.
const assert = require('node:assert/strict');
const { test } = require('node:test');

// Convert a finite Number's canonical decimal spelling into a signed coefficient and scale.
const toScaledDecimal = (value) => {
    const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(value.toString());
    assert.ok(match, `Unsupported finite Number spelling: ${value}`);
    const fraction = (match[3] ?? '').replace(/0+$/, '');
    const exponent = Number(match[4] ?? 0);
    const initialScale = fraction.length - exponent;
    const coefficient = BigInt(`${match[1]}${match[2]}${fraction}`);
    return initialScale > 0
        ? { coefficient, scale: initialScale }
        : { coefficient: coefficient * 10n ** BigInt(-initialScale), scale: 0 };
};

// Evaluate divisibility independently with aligned arbitrary-precision decimal coefficients.
const exactMultipleOf = (number, divisor) => {
    if (typeof number !== 'number' || typeof divisor !== 'number' || !Number.isFinite(number) || !Number.isFinite(divisor) || divisor === 0) return false;
    if (number === 0) return true;
    const left = toScaledDecimal(number);
    const right = toScaledDecimal(divisor);
    const scale = Math.max(left.scale, right.scale);
    const scaledNumber = left.coefficient * 10n ** BigInt(scale - left.scale);
    const scaledDivisor = right.coefficient * 10n ** BigInt(scale - right.scale);
    return scaledNumber % scaledDivisor === 0n;
};

// Register explicit regressions and a deterministic cross-product against the independent oracle.
module.exports = (fn, { suite }) => {
    const cases = [
        ['zero', 0, 0.1, true],
        ['negative zero', -0, 0.1, true],
        ['safe integer multiple', 10, 2, true],
        ['safe integer nonmultiple', 7, 2, false],
        ['negative integer multiple', -10, 2, true],
        ['ordinary decimal multiple', 4.5, 1.5, true],
        ['ordinary decimal nonmultiple', 35, 1.5, false],
        ['small decimal multiple', 0.0075, 0.0001, true],
        ['small decimal nonmultiple', 0.00751, 0.0001, false],
        ['exact tenth multiple', 0.3, 0.1, true],
        ['positive epsilon-near tenth nonmultiple', 0.30000000000000004, 0.1, false],
        ['negative epsilon-near tenth nonmultiple', -0.30000000000000004, 0.1, false],
        ['minimum scale unit', 1e-28, 1e-28, true],
        ['negative minimum scale unit', -1e-28, 1e-28, true],
        ['one scale below divisor', 1e-29, 1e-28, false],
        ['negative one scale below divisor', -1e-29, 1e-28, false],
        ['far below divisor', 1e-45, 1e-28, false],
        ['negative far below divisor', -1e-45, 1e-28, false],
        ['near-zero quotient against larger divisor', 1.1e-28, 1e-12, false],
        ['negative near-zero quotient against larger divisor', -1.1e-28, 1e-12, false],
        ['scale-29 epsilon-near integer quotient', 1.0000000000000002e-13, 1e-28, false],
        ['negative scale-29 epsilon-near integer quotient', -1.0000000000000002e-13, 1e-28, false],
        ['scale-29 visibly fractional quotient', 1.2345678901234564e-13, 1e-28, false],
        ['scale-28 scaled-integer multiple', 1.2345678901234567e-12, 1e-28, true],
        ['large quotient requiring scaled arithmetic', 3, 3e-28, true],
        ['smallest subnormal divisor', 3, Number.MIN_VALUE, true],
        ['smallest subnormal self-multiple', Number.MIN_VALUE, Number.MIN_VALUE, true],
        ['unsafe integer multiple', 9007199254740992, 2, true],
        ['unsafe integer nonmultiple', 9007199254740992, 3, false],
        ['maximum finite Number is an integer', Number.MAX_VALUE, 1, true],
    ];

    suite('isMultipleOf explicit precision boundaries', () => {
        // Report every boundary independently so a regression identifies its exact numeric relationship.
        for (const [description, number, divisor, expected] of cases) {
            test(description, () => {
                assert.equal(fn.isMultipleOf(number, divisor), expected);
            });
        }
    });

    suite('isMultipleOf invalid inputs', () => {
        const invalidCases = [
            ['string number', '1', 1],
            ['string divisor', 1, '1'],
            ['NaN number', Number.NaN, 1],
            ['NaN divisor', 1, Number.NaN],
            ['positive infinite number', Number.POSITIVE_INFINITY, 1],
            ['negative infinite number', Number.NEGATIVE_INFINITY, 1],
            ['infinite divisor', 1, Number.POSITIVE_INFINITY],
            ['zero divisor', 1, 0],
        ];

        // Require invalid helper-domain inputs to return false without entering decimal conversion.
        for (const [description, number, divisor] of invalidCases) {
            test(description, () => {
                assert.equal(fn.isMultipleOf(number, divisor), false);
            });
        }
    });

    suite('isMultipleOf exact-decimal oracle agreement', () => {
        const numbers = [
            Number.MIN_VALUE,
            -1e-45,
            -1.1e-28,
            -1e-28,
            -0.30000000000000004,
            -0.3,
            -0,
            0,
            1e-29,
            1e-28,
            1.1e-28,
            1.0000000000000002e-13,
            1.2345678901234567e-12,
            0.3,
            0.30000000000000004,
            3,
            9007199254740992,
            Number.MAX_VALUE,
        ];
        const divisors = [Number.MIN_VALUE, 1e-28, 3e-28, 1e-12, 0.0001, 0.1, 1.5, 1, 2, 3];

        test('matches an independent scaled-integer oracle across representative magnitudes', () => {
            // Compare the complete deterministic matrix rather than selecting only known regression pairs.
            for (const number of numbers) {
                for (const divisor of divisors) {
                    assert.equal(
                        fn.isMultipleOf(number, divisor),
                        exactMultipleOf(number, divisor),
                        `${number} multipleOf ${divisor}`,
                    );
                }
            }
        });
    });
};
