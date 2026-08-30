'use strict';
// Register toRelativeReference cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "toRelativeReference",
        args: ["https://example.com/docs/images/logo.svg","https://example.com/docs/api/page"],
    });
};
