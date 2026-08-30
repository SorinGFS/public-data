'use strict';
// Register isUUIDv4 cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "isUUIDv4",
        args: ["123e4567-e89b-42d3-a456-426614174000"],
    });
};
