'use strict';
// Register isIriReference cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "isIriReference",
        args: ["/rosé?fóo#bár"],
    });
};
