'use strict';
// Register validated expander-construction measurements for representative templates.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'parseUrlTemplate',
        args: ['/users/{id}'],
    });
    benchmark({
        callback: 'parseUrlTemplate',
        args: ['{/segments*}{?query,lang}'],
    });
};
