'use strict';
// Register ASCII and internationalized isIdnEmail validation measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'isIdnEmail',
        args: ['user@example.com'],
    });
    benchmark({
        callback: 'isIdnEmail',
        args: ['δοκιμή@mañana.example'],
    });
};
