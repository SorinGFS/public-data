'use strict';
// Register RFC 8141 parsed-result normalization without mixing it into generic normalization workloads.
module.exports = (_subject, { benchmark }) => {
    benchmark({
        callback: 'parseIriReference',
        method: 'normalize',
        args: ['URN:EXAMPLE:a%62%2cz456/../segment?+CCResolve:cc=uk?=op=map%2flat#some%2fpart'],
    });
};
