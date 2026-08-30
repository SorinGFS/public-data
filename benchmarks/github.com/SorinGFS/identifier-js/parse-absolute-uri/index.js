'use strict';
// Register parseAbsoluteUri cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "parseAbsoluteUri",
        args: ["https://example.com/path?query"],
    });
};
