'use strict';
// Register isAbsoluteIri cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "isAbsoluteIri",
        args: ["https://münich.example/rosé?fóo"],
    });
};
