# Unicode 18.0 IDNA conformance fixtures

This prepared concern contains the Unicode 18.0.0 `IdnaTestV2.txt` conformance vectors, `IdnaMappingTable.txt` comparison data, and generated `IdnaTestV2.json` inventory metadata.

The thin `index.js` entry point supplies its directory and metadata to the shared `#/public/tests/idnaTestV2.js` registrar. The registrar parses the nontransitional ToASCII columns and registers every applicable vector as an independent `node:test` case. Each valid vector must pass both `isIdnHostname` and `idnHostname`, and conversion must equal the expected nontransitional ASCII output. Each invalid vector must be rejected by both APIs.

The package applies IDNA2008 validation after nontransitional UTS #46 preprocessing. The registrar excludes otherwise-valid vectors whose Unicode result contains an `NV8` or `XV8` code point. Unicode assigns `A4_2` to an empty terminal label when ToASCII enables its DNS-length option; the registrar instead evaluates that case as RFC 1034's root label and accepts it when the non-root labels and complete domain name satisfy the DNS size limits in RFC 1034 §3.1. It omits `U1` because preprocessing uses `UseSTD3ASCIIRules=false`.

The generated inventory records:

- 6,207 applicable vectors;
- 189 otherwise-valid `NV8`/`XV8` vectors excluded.

Execution requires a runtime whose Unicode data is at least version 18.0. Until the package and supported Node.js runtime move to Unicode 18, exact-version selection keeps this prepared concern inactive.
