'use strict';
// Register parseIri cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "parseIri",
        args: ["https://münich.example/rosé?fóo#bár"],
    });
};
