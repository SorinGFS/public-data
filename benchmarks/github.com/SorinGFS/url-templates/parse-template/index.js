'use strict';
// Register validated expander-construction measurements for representative templates.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'parseTemplate',
        args: ['/users/{id}'],
    });
    benchmark({
        callback: 'parseTemplate',
        args: ['{/segments*}{?query,lang}'],
    });
};
