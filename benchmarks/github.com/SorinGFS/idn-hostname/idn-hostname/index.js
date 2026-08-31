'use strict';
// Register pass-through ASCII and internationalized-to-ACE conversion measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'idnHostname',
        args: ['www.example.com'],
    });
    benchmark({
        callback: 'idnHostname',
        args: ['mañana.example'],
    });
};
