'use strict';
// Register isMultipleOf fast-path, exact-decimal, regression, and extreme-range measurements.
module.exports = (_subject, { benchmark }) => {
    // Measure the retained safe-integer shortcut.
    benchmark({ callback: 'isMultipleOf', args: [12391239120, 2] });
    // Measure an ordinary exact decimal multiple.
    benchmark({ callback: 'isMultipleOf', args: [4.5, 1.5] });
    // Measure exact rejection of a value that is only epsilon-near a decimal multiple.
    benchmark({ callback: 'isMultipleOf', args: [0.30000000000000004, 0.1] });
    // Measure a valid scale-28 quotient requiring scaled-integer arithmetic.
    benchmark({ callback: 'isMultipleOf', args: [1.2345678901234567e-12, 1e-28] });
    // Measure an invalid scale-29 quotient requiring scaled-integer arithmetic.
    benchmark({ callback: 'isMultipleOf', args: [1.0000000000000002e-13, 1e-28] });
    // Measure an extreme exponent range against the smallest positive Number.
    benchmark({ callback: 'isMultipleOf', args: [3, Number.MIN_VALUE] });
};
