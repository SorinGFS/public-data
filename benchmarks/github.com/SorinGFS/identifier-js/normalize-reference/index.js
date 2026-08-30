'use strict';
// Register normalizeReference cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "normalizeReference",
        args: ["https://example.com/a/../b#fragment"],
    });
};
