'use strict';
// Register isolated loading measurements for the common-function entry point.
module.exports = (_subject, { benchmarkLoad }) => {
    benchmarkLoad('js/fn entry point');
};
