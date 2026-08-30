'use strict';
// Register isIri cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "isIri",
        args: ["https://münich.example/rosé?fóo#bár"],
    });
};
