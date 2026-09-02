'use strict';
// Register parsed normalize cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'parseIriReference',
        method: 'normalize',
        args: ['https://example.com/a/../b#fragment'],
    });
};
