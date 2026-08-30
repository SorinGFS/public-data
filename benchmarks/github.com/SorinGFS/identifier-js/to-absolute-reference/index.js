'use strict';
// Register toAbsoluteReference cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "toAbsoluteReference",
        args: ["https://example.com/a/../b#fragment"],
    });
};
