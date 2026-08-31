'use strict';
// Register direct and multi-pass recursive expansion measurements.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'recursiveCompile',
        args: [{ start: '/users/{id}', id: 42 }, 'start'],
    });
    benchmark({
        callback: 'recursiveCompile',
        args: [{
            start: '{scheme}://{host}{path}',
            scheme: 'https',
            host: 'example.com',
            path: '{/segments*}',
            segments: ['docs', 'api'],
        }, 'start'],
    });
};
