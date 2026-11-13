// Compare real races from the current phase1 browser run with the committed Phase 2
// evidence. This supplements cadence checks with exact legacy outcomes, no GPU claim.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const before=JSON.parse(await readFile('docs/v3/phase2/final-interpolation-checks.json','utf8'));
const after=JSON.parse(await readFile('artifacts/phase1/report.json','utf8'));
assert.deepEqual(after.errors,[]);assert.deepEqual(after.races,before.races);
const report={check:'Current Classic full race states exactly match committed Phase 2 at all four cadences',baseline:'docs/v3/phase2/final-interpolation-checks.json',cadences:after.races.map(r=>r.hz),finish:after.races[0].finish,passed:true};
await writeFile('docs/v3/phase3/classic-baseline.json',JSON.stringify(report,null,2));console.log(report);
