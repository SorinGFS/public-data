'use strict';
// Register unvalidated expander-construction measurements for representative templates.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'compileUrlTemplate',
        args: ['/users/{id}'],
    });
    benchmark({
        callback: 'compileUrlTemplate',
        args: ['{/segments*}{?query,lang}'],
    });
};
