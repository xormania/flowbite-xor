// The cases of tools/ci/playwright-summary.mjs, run as CI runs it: a process reading a results.json, with the
// GitHub Actions files it writes to. Run: node --test tools/tests/*.test.mjs
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../..', import.meta.url));
const script = join(root, 'tools/ci/playwright-summary.mjs');
const fixtures = join(root, 'tools/tests/fixtures/playwright-results');

const EXIT = { valid: 0, missing: 2, invalid: 3, notReached: 4 };

/** Runs the summarizer on a fixture (or none) in a scratch directory; returns what it wrote. */
function summarize(fixture, env = {}) {
    const dir = mkdtempSync(join(tmpdir(), 'pw-summary-'));
    const results = join(dir, 'playwright-results');
    const report = join(results, 'results.json');
    if (fixture) {
        spawnSync('mkdir', ['-p', results]);
        copyFileSync(join(fixtures, fixture), report);
    }
    const summaryFile = join(dir, 'step-summary.md');
    const outputFile = join(dir, 'output.txt');
    writeFileSync(summaryFile, '');
    writeFileSync(outputFile, '');
    const run = spawnSync(process.execPath, [script, report], {
        encoding: 'utf8',
        env: {
            PATH: process.env.PATH,
            GITHUB_ACTIONS: 'true',
            GITHUB_STEP_SUMMARY: summaryFile,
            GITHUB_OUTPUT: outputFile,
            GITHUB_SHA: '0123456789abcdef0123456789abcdef01234567',
            GITHUB_REF_NAME: 'claude/ci-evidence',
            SHARD: '1/3',
            RUNTIME: 'PHP=8.5.11\nSymfony=8.1.8\nTurbo=8.0.23',
            ...env,
        },
    });
    const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : null);
    const attemptsFile = join(results, 'failed-attempts.json');
    return {
        code: run.status,
        stdout: run.stdout,
        stderr: run.stderr,
        summary: read(summaryFile),
        localSummary: read(join(results, 'summary.md')),
        outputs: Object.fromEntries((read(outputFile) ?? '').trim().split('\n').filter(Boolean).map((line) => line.split('='))),
        attempts: existsSync(attemptsFile) ? JSON.parse(read(attemptsFile)) : null,
    };
}

const annotations = (stdout, kind) => stdout.split('\n').filter((line) => line.startsWith(`::${kind} `));

test('a clean pass: counts, tested commit, runtime versions, no annotation', () => {
    const run = summarize('clean.json');
    assert.equal(run.code, EXIT.valid, run.stderr);
    assert.match(run.summary, /Playwright, shard 2\/3: all 3 passed/);
    assert.match(run.summary, /\| 3 \| 0 \| 0 \| 0 \|/);
    assert.match(run.summary, /0123456789abcdef0123456789abcdef01234567/);
    assert.match(run.summary, /smoke, examples/);
    for (const version of [`Node ${process.version}`, 'Playwright 1.58.2', 'PHP 8.5.11', 'Symfony 8.1.8', 'Turbo 8.0.23']) {
        assert.ok(run.summary.includes(version), `the summary names ${version}`);
    }
    assert.doesNotMatch(run.summary, /## Failed|## Flaky/);
    assert.equal(run.localSummary, run.summary, 'the same summary is kept next to the report, for the log and the artifact');
    assert.deepEqual(annotations(run.stdout, 'error'), []);
    assert.deepEqual(annotations(run.stdout, 'warning'), []);
    assert.deepEqual(run.outputs, { status: 'valid', passed: '3', failed: '0', flaky: '0', skipped: '0' });
    assert.equal(run.attempts.status, 'valid');
    assert.equal(run.attempts.shard, '2/3');
    assert.equal(run.attempts.sha, '0123456789abcdef0123456789abcdef01234567');
    assert.deepEqual(run.attempts.projects, ['smoke', 'examples']);
    assert.deepEqual(run.attempts.counts, { passed: 3, failed: 0, flaky: 0, skipped: 0 });
    assert.deepEqual(run.attempts.attempts, []);
});

test('a failure: each failed test by name with its first error lines, an error annotation at its line', () => {
    const run = summarize('failed.json');
    // Playwright's exit status is the verdict: a valid report is read, whatever it holds
    assert.equal(run.code, EXIT.valid, run.stderr);
    assert.match(run.summary, /Playwright, shard 1\/3: 2 failed/);
    assert.match(run.summary, /\| 1 \| 2 \| 0 \| 0 \|/);
    assert.match(run.summary, /## Failed \(2\)/);
    assert.ok(run.summary.includes('[smoke] tests/e2e/lab.popover.spec.ts:20 › closes on Back'));
    assert.ok(run.summary.includes('Error: expect(locator).toBeHidden() failed'), 'the error without its colors');
    assert.ok(run.summary.includes('Test timeout of 30000ms exceeded.'), 'the last attempt’s error');
    assert.doesNotMatch(run.summary, /\u001b/);
    // A recipe spec runs as a generated copy (one header line added): the annotation points at the committed file
    assert.ok(run.summary.includes('[examples] alert/tests/alert.spec.ts:8 › dismisses each alert independently'));

    const errors = annotations(run.stdout, 'error');
    assert.equal(errors.length, 2);
    assert.match(errors[0], /^::error file=tests\/e2e\/transitions\.ts,line=88,col=9,title=\[smoke\] closes on Back \(failed in 2 attempts\)::Error: expect\(locator\)\.toBeHidden\(\) failed%0A/);
    assert.match(errors[1], /^::error file=alert\/tests\/alert\.spec\.ts,line=13,col=5,title=/);
    assert.equal(run.outputs.failed, '2');

    assert.deepEqual(
        run.attempts.attempts.map((a) => [a.title, a.project, a.retry, a.status, a.outcome]),
        [
            ['closes on Back', 'smoke', 0, 'failed', 'failed'],
            ['closes on Back', 'smoke', 1, 'timedOut', 'failed'],
            ['dismisses each alert independently', 'examples', 0, 'failed', 'failed'],
            ['dismisses each alert independently', 'examples', 1, 'failed', 'failed'],
        ],
    );
    const first = run.attempts.attempts[0];
    assert.equal(first.testId, 'ccc-111@smoke');
    assert.equal(first.file, 'tests/e2e/lab.popover.spec.ts');
    assert.equal(first.line, 20);
    assert.equal(first.shard, '1/3');
    assert.equal(first.durationMs, 5000);
    assert.deepEqual(first.errorLocation, { file: 'tests/e2e/transitions.ts', line: 88, column: 9 });
    assert.match(first.error, /^Error: expect\(locator\)\.toBeHidden\(\) failed\n/);
    assert.doesNotMatch(first.error, /\u001b/);
});

test('a pass on retry is flaky: reported apart from a clean pass, with a warning annotation and its failed attempt', () => {
    const run = summarize('flaky.json');
    assert.equal(run.code, EXIT.valid, run.stderr);
    assert.match(run.summary, /Playwright, shard 3\/3: 1 flaky \(passed on retry\)/);
    assert.doesNotMatch(run.summary, /all \d+ passed/);
    assert.match(run.summary, /\| 1 \| 0 \| 1 \| 0 \|/);
    assert.match(run.summary, /## Flaky: failed, then passed on retry \(1\)/);
    assert.ok(run.summary.includes('[smoke] tests/e2e/lab.data-table-frame.spec.ts:31 › search, filter, sort'));
    assert.ok(run.summary.includes('Expected pattern: /size=10/'));
    assert.deepEqual(annotations(run.stdout, 'error'), []);
    const warnings = annotations(run.stdout, 'warning');
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /^::warning file=tests\/e2e\/lab\.data-table-frame\.spec\.ts,line=52,col=9,title=\[smoke\] search%2C filter%2C sort.* \(flaky - passed on retry 1\)::Error: expect\(page\)\.toHaveURL/);
    assert.equal(run.outputs.flaky, '1');
    assert.deepEqual(
        run.attempts.attempts.map((a) => [a.retry, a.status, a.outcome]),
        [[0, 'failed', 'flaky']],
        'only the failed attempt: the later step reads one assessment per failed attempt',
    );
});

test('a skipped test is counted, not reported as a failure', () => {
    const run = summarize('skipped.json');
    assert.equal(run.code, EXIT.valid, run.stderr);
    assert.match(run.summary, /\| 1 \| 0 \| 0 \| 1 \|/);
    assert.match(run.summary, /Playwright, shard 1\/3: 1 passed, 1 skipped/);
    assert.deepEqual(annotations(run.stdout, 'error'), []);
    assert.deepEqual(annotations(run.stdout, 'warning'), []);
    assert.deepEqual(run.outputs, { status: 'valid', passed: '1', failed: '0', flaky: '0', skipped: '1' });
});

test('a missing report is no test evidence, never a pass with zero tests', () => {
    const run = summarize(null);
    assert.equal(run.code, EXIT.missing);
    assert.match(run.summary, /no test evidence: tests not reached or report not written/);
    assert.match(run.summary, /shard 1\/3/);
    assert.doesNotMatch(run.summary, /passed/);
    assert.match(annotations(run.stdout, 'error')[0] ?? '', /no test evidence/);
    assert.deepEqual(run.outputs, { status: 'missing' });
    assert.equal(run.attempts.status, 'missing');
    assert.equal(run.attempts.counts, null);
});

test('an unparseable report is invalid, told apart from a missing one', () => {
    const run = summarize('invalid.json');
    assert.equal(run.code, EXIT.invalid);
    assert.match(run.summary, /report invalid: .*results\.json does not parse/);
    assert.doesNotMatch(run.summary, /no test evidence/);
    assert.deepEqual(run.outputs, { status: 'invalid' });
    assert.equal(run.attempts.status, 'invalid');
});

test('JSON that is not a Playwright report is invalid too', () => {
    const run = summarize('not-a-report.json');
    assert.equal(run.code, EXIT.invalid);
    assert.match(run.summary, /report invalid: .*not a Playwright JSON report/);
});

test('a failed setup step is named: tests not reached, not a report error', () => {
    const run = summarize(null, {
        SETUP_STEPS: 'Build the demo image=success\nStart the demo=failure\nInstall Playwright=skipped',
        TESTS_OUTCOME: 'skipped',
    });
    assert.equal(run.code, EXIT.notReached);
    assert.match(run.summary, /tests not reached: setup failed at Start the demo/);
    assert.doesNotMatch(run.summary, /report/);
    assert.match(annotations(run.stdout, 'error')[0] ?? '', /tests not reached: setup failed at Start the demo/);
    assert.deepEqual(run.outputs, { status: 'not-reached' });
    assert.equal(run.attempts.status, 'not-reached');
    assert.equal(run.attempts.reason, 'tests not reached: setup failed at Start the demo');
});

test('a skipped Playwright step with no failed setup step is not reached either', () => {
    const run = summarize(null, { SETUP_STEPS: 'Build the demo image=success', TESTS_OUTCOME: 'skipped' });
    assert.equal(run.code, EXIT.notReached);
    assert.match(run.summary, /tests not reached: the Playwright step did not run/);
});

test('setup that passed leaves the report to decide', () => {
    const run = summarize('clean.json', { SETUP_STEPS: 'Build the demo image=success\nStart the demo=success', TESTS_OUTCOME: 'success' });
    assert.equal(run.code, EXIT.valid, run.stderr);
    assert.equal(run.outputs.status, 'valid');
});
