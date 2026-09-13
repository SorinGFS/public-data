'use strict';
// Register RFC 8141 URN component parsing through parseUri without mixing scheme workloads.
module.exports = (_subject, { benchmark }) => {
    benchmark({ callback: 'parseUri', args: ['URN:EXAMPLE:a123%2cz456/segment?+CCResolve:cc=uk?=op=map&lat=39.56#somepart'] });
};
