'use strict';
// Register unvalidated expander-construction measurements for representative templates.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'compile',
        args: ['/users/{id}'],
    });
    benchmark({
        callback: 'compile',
        args: ['{/segments*}{?query,lang}'],
    });
};
