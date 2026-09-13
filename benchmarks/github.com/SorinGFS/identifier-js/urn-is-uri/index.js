'use strict';
// Register RFC 8141 URN validation through isUri without mixing scheme workloads.
module.exports = (_subject, { benchmark }) => {
    benchmark({ callback: 'isUri', args: ['URN:EXAMPLE:a123%2cz456/segment?+CCResolve:cc=uk?=op=map&lat=39.56#somepart'] });
};
