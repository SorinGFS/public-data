'use strict';
// Register parsed normalize cold-call and warmed-throughput measurements.
module.exports = (_subject, { benchmark }) => {
    // Measure syntax and scheme normalization without changing the identifier representation.
    benchmark({ callback: 'parseIriReference', method: 'normalize', args: ['https://example.com/a/../b#fragment'] });
    // Measure RFC 3987 IRI-to-URI encoding across internationalized components.
    benchmark({ callback: 'parseIriReference', method: 'normalize', methodArgs: [{ transform: 'URI' }], args: ['https://usér@example.com/a/../café?q=資料#résultat'] });
    // Measure RFC 3987 URI-to-IRI decoding across percent-encoded UTF-8 components.
    benchmark({ callback: 'parseIriReference', method: 'normalize', methodArgs: [{ transform: 'IRI' }], args: ['https://us%C3%A9r@example.com/a/../caf%C3%A9?q=%E8%B3%87%E6%96%99#r%C3%A9sultat'] });
};
