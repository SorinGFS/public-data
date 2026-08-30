'use strict';
// Register ASCII-fast-path and internationalized isIdnHostname measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'isIdnHostname',
        args: ['www.example.com'],
    });
    benchmark({
        callback: 'isIdnHostname',
        args: ['mañana.example'],
    });
};
