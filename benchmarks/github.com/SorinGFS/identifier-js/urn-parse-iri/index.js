'use strict';
// Register ASCII RFC 8141 URN component parsing through parseIri without mixing scheme workloads.
module.exports = (_subject, { benchmark }) => {
    benchmark({ callback: 'parseIri', args: ['URN:EXAMPLE:a123%2cz456/segment?+CCResolve:cc=uk?=op=map&lat=39.56#somepart'] });
};
