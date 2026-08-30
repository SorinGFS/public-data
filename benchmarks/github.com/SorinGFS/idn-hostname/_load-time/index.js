'use strict';
// Register isolated package-entry-point loading measurements.
module.exports = (_subject, { benchmarkLoad }) => {
    benchmarkLoad('package entry point');
};
