'use strict';
// Register simple-path and complex-expression AST inspection measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'inspect',
        args: ['/users/{id}'],
    });
    benchmark({
        callback: 'inspect',
        args: ['/search{?q*,lang:2}'],
    });
};
