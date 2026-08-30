'use strict';
// Register isAbsoluteUri cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "isAbsoluteUri",
        args: ["https://example.com/path?query"],
    });
};
