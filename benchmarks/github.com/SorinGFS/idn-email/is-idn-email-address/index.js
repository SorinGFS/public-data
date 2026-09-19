'use strict';
// Compare ASCII input, a UTF-8 local part, and U-label domain validation.
module.exports = (_subject, { benchmark }) => {
    benchmark({ callback: 'isIdnEmailAddress', args: ['user@example.com'] });
    benchmark({ callback: 'isIdnEmailAddress', args: ['δοκιμή@example.com'] });
    benchmark({ callback: 'isIdnEmailAddress', args: ['δοκιμή@mañana.example'] });
};
