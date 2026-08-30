'use strict';
// Register isUUID cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: "isUUID",
        args: ["123e4567-e89b-12d3-a456-426614174000"],
    });
};
