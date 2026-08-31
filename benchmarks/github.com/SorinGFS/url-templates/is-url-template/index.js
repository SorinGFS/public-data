'use strict';
// Register simple-path and complex-expression validation measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'isUrlTemplate',
        args: ['/users/{id}'],
    });
    benchmark({
        callback: 'isUrlTemplate',
        args: ['/search{?q*,lang:2}'],
    });
};
