'use strict';
// Register isUri cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "isUri",
        args: ["https://example.com/path?query#fragment"],
    });
};
