'use strict';
// Register ASCII pass-through and internationalized hostname-conversion measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'idnEmail',
        args: ['user@example.com'],
    });
    benchmark({
        callback: 'idnEmail',
        args: ['δοκιμή@mañana.example'],
    });
};
