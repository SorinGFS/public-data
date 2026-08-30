'use strict';
// Register parseUri cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "parseUri",
        args: ["https://example.com/path?query#fragment"],
    });
};
