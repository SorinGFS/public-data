'use strict';
// Register parseAbsoluteIri cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "parseAbsoluteIri",
        args: ["https://münich.example/rosé?fóo"],
    });
};
