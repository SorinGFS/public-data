'use strict';
// Register resolveReference cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "resolveReference",
        args: ["../images/logo.svg","https://example.com/docs/api/page"],
    });
};
