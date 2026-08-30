'use strict';
// Register compatibility mapping measurements on representative Unicode input.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'uts46map',
        args: ['ＡＢＣß'],
    });
};
