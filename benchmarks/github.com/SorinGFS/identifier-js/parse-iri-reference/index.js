'use strict';
// Register parseIriReference cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "parseIriReference",
        args: ["/rosé?fóo#bár"],
    });
};
