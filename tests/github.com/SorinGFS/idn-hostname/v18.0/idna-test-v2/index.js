'use strict';
// Register Unicode 18.0 IdnaTestV2 vectors through the shared version-independent registrar.
const registerIdnaTestV2 = require('../../idnaTestV2.js');
const metadata = require('./IdnaTestV2.json');

// Supply version-local files and generated expectations to the shared registrar.
module.exports = (subject) => registerIdnaTestV2(subject, __dirname, metadata);
