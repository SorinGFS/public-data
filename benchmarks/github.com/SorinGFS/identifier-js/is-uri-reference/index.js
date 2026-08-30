'use strict';
// Register isUriReference cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "isUriReference",
        args: ["/path?query#fragment"],
    });
};
