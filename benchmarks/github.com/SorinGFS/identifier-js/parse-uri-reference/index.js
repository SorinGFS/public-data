'use strict';
// Register parseUriReference cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "parseUriReference",
        args: ["/path?query#fragment"],
    });
};
