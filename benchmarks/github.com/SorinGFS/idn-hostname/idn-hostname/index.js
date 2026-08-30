'use strict';
// Register validated internationalized-to-ACE conversion measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'idnHostname',
        args: ['mañana.example'],
    });
};
