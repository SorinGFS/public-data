'use strict';
// Compare ASCII input, a UTF-8 local part, and U-label domain conversion.
module.exports = (_subject, { benchmark }) => {
    benchmark({ callback: 'idnEmailAddress', args: ['user@example.com'] });
    benchmark({ callback: 'idnEmailAddress', args: ['δοκιμή@example.com'] });
    benchmark({ callback: 'idnEmailAddress', args: ['δοκιμή@mañana.example'] });
};
