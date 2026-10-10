// The cases of tools/ci/junit-attempts.mjs: a PHPUnit JUnit report turned into the failed-attempts.json Jev reads.
// Run: node --test tools/tests/*.test.mjs
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../..', import.meta.url));
const script = join(root, 'tools/ci/junit-attempts.mjs');
const fixture = join(root, 'tools/tests/fixtures/junit/phpunit.xml');

function convert(report, env = {}) {
    const out = join(mkdtempSync(join(tmpdir(), 'junit-')), 'failed-attempts.json');
    const run = spawnSync(process.execPath, [script, report, out], {
        encoding: 'utf8',
        env: { PATH: process.env.PATH, GITHUB_SHA: 'abc', GITHUB_WORKSPACE: '/runner/work/flowbite-xor/flowbite-xor', ...env },
    });
    return { code: run.status, stderr: run.stderr, data: run.status === 0 ? JSON.parse(readFileSync(out, 'utf8')) : null };
}

test('each failure and error becomes one attempt, with its test, file relative to the repository, line and message', () => {
    const { code, stderr, data } = convert(fixture);
    assert.equal(code, 0, stderr);
    assert.equal(data.schema, 1);
    assert.equal(data.status, 'valid');
    assert.equal(data.shard, 'phpunit');
    assert.deepEqual(data.counts, { passed: 2, failed: 2, flaky: 0, skipped: 0 });
    assert.deepEqual(data.attempts.map((a) => [a.project, a.file, a.line, a.title, a.status, a.outcome, a.retry]), [
        ['phpunit', 'demo/tests/DataTable/TableQueryTest.php', 34, 'TableQueryTest::testRejectsAnUnknownSort', 'failed', 'failed', 0],
        ['phpunit', 'demo/tests/Editor/HtmlPolicyTest.php', 12, 'HtmlPolicyTest::testStripsScript', 'failed', 'failed', 0],
    ]);
    assert.match(data.attempts[0].error, /Failed asserting that 'price' is identical to 'name'\./);
    // the frames name the repository's own paths, the runner's prefix removed
    assert.match(data.attempts[1].error, /^TypeError: .*clean\(\): Argument #1/m);
    assert.match(data.attempts[1].error, /\neditor\/src\/HtmlPolicy\.php:30\n/);
    assert.deepEqual(data.attempts[1].errorLocation, { file: 'editor/src/HtmlPolicy.php', line: 30, column: null });
    assert.equal(data.attempts[0].testId, 'App\\Tests\\DataTable\\TableQueryTest::testRejectsAnUnknownSort');
});

test('a report with no failure has no attempt; a missing or unreadable report is said so, not a pass', () => {
    const dir = mkdtempSync(join(tmpdir(), 'junit-'));
    const clean = join(dir, 'clean.xml');
    writeFileSync(clean, '<testsuites><testsuite name="s" tests="1"><testcase name="testA" file="/x/demo/tests/ATest.php" line="3" class="ATest"/></testsuite></testsuites>');
    const ok = convert(clean, { GITHUB_WORKSPACE: '/x' });
    assert.equal(ok.code, 0, ok.stderr);
    assert.deepEqual(ok.data.attempts, []);
    assert.deepEqual(ok.data.counts, { passed: 1, failed: 0, flaky: 0, skipped: 0 });
    const missing = convert(join(dir, 'nope.xml'));
    assert.notEqual(missing.code, 0);
    assert.match(missing.stderr, /no JUnit report/);
});
