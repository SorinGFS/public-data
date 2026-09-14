# Unicode 15.1 IDNA conformance fixtures

This concern contains the authoritative Unicode 15.1.0 [`IdnaTestV2.txt`](https://www.unicode.org/Public/idna/15.1.0/IdnaTestV2.txt) conformance vectors and [`IdnaMappingTable.txt`](https://www.unicode.org/Public/idna/15.1.0/IdnaMappingTable.txt) comparison data.

`index.js` loads `IdnaTestV2.json` and delegates to the shared `#/public/tests/idnaTestV2.js` registrar, which parses the nontransitional ToASCII columns and registers every applicable vector as an independent `node:test` case. Each valid vector must pass both `isIdnHostname` and `idnHostname`, and conversion must equal the expected nontransitional ASCII output. Each invalid vector must be rejected by both APIs. Registration fails before vector execution when `process.versions.unicode` is older than the fixture's declared Unicode version.

The package applies IDNA2008 validation after nontransitional UTS #46 preprocessing. In accordance with the `IdnaTestV2.txt` conformance guidance, the registrar excludes otherwise-valid vectors whose Unicode result contains an `NV8` or `XV8` code point. Unicode assigns `A4_2` to an empty terminal label when ToASCII enables its DNS-length option; the registrar instead evaluates that case as RFC 1034's root label and accepts it when the non-root labels and complete domain name satisfy the DNS size limits in RFC 1034 §3.1. `U1` is omitted because preprocessing uses `UseSTD3ASCIIRules=false`. CONTEXTO classification remains the responsibility of the package's version-specific validation fixtures and is not part of this concern's applicability logic.

For these source files, the resulting inventory is:

- 6,128 applicable vectors;
- 137 otherwise-valid `NV8`/`XV8` vectors excluded.

The generated `IdnaTestV2.json` inventory is asserted during registration so a Unicode fixture update cannot silently change test coverage or policy classification.
