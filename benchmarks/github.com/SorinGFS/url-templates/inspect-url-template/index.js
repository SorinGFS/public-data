'use strict';
// Register simple-path and complex-expression AST inspection measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'inspectUrlTemplate',
        args: ['/users/{id}'],
    });
    benchmark({
        callback: 'inspectUrlTemplate',
        args: ['/search{?q*,lang:2}'],
    });
};
