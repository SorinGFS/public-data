# Unicode 15.1 IDNA conformance fixtures

This concern contains the authoritative Unicode 15.1.0 [`IdnaTestV2.txt`](https://www.unicode.org/Public/idna/15.1.0/IdnaTestV2.txt) conformance vectors and [`IdnaMappingTable.txt`](https://www.unicode.org/Public/idna/15.1.0/IdnaMappingTable.txt) comparison data.

`index.js` parses the nontransitional ToASCII columns and registers every applicable vector as an independent `node:test` case. Each valid vector must pass both `isIdnHostname` and `idnHostname`, and conversion must equal the expected nontransitional ASCII output. Each invalid vector must be rejected by both APIs. Registration fails before vector execution when `process.versions.unicode` is older than the fixture's declared Unicode version.

The package intentionally applies stricter IDNA2008 and presentation-form policies than default UTS #46. In accordance with the `IdnaTestV2.txt` conformance guidance, the registrar excludes otherwise-valid vectors whose Unicode result contains an `NV8` or `XV8` code point. It also excludes valid trailing-root inputs because the package deliberately rejects that presentation form. `U1` is ignored because preprocessing uses `UseSTD3ASCIIRules=false`. CONTEXTO classification remains the responsibility of the package's version-specific validation fixtures and is not part of this concern's applicability logic.

For these source files, the resulting inventory is:

- 6,089 applicable vectors;
- 137 otherwise-valid `NV8`/`XV8` vectors excluded;
- 39 otherwise-valid trailing-root vectors excluded.

The inventory is asserted during registration so a Unicode fixture update cannot silently change test coverage or policy classification.
