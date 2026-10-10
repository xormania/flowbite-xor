#!/usr/bin/env node
/*
 * A PHPUnit JUnit report (bin/phpunit --log-junit) turned into the failed-attempts.json that tools/ci/jev-diagnosis.mjs
 * reads (the shape tools/ci/playwright-summary.mjs writes for the browser tests): one attempt per failed or erroring
 * test, with its test, file (relative to the repository), line and message, so Jev diagnoses Kit PHP's failures as it
 * does the browser shards'. It never decides pass or fail: PHPUnit's exit status is the verdict.
 *
 * Usage: node tools/ci/junit-attempts.mjs <junit.xml> <failed-attempts.json>
 * Environment: GITHUB_WORKSPACE (the prefix removed from paths), GITHUB_SHA, GITHUB_REF_NAME (all optional).
 * Exit status 0; 1 when there is no JUnit report to read.
 * Test: node --test tools/tests/*.test.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const decode = (text) =>
    text.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&');
const attribute = (tag, name) => {
    const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
    return match ? decode(match[1]) : null;
};

export function attemptsOf(xml, workspace = '') {
    const prefix = workspace ? `${workspace.replace(/\/$/, '')}/` : '';
    const relative = (path) => (path && prefix && path.startsWith(prefix) ? path.slice(prefix.length) : path);
    const attempts = [];
    let passed = 0;
    for (const [, open, body = ''] of xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
        const problem = body.match(/<(failure|error)\b[^>]*>([\s\S]*?)<\/\1>/);
        if (!problem) {
            if (!/<skipped\b/.test(body)) {
                passed++;
            }
            continue;
        }
        const className = attribute(open, 'class') ?? '';
        const name = attribute(open, 'name') ?? '';
        const error = decode(problem[2]).replaceAll(prefix, '').replace(/^.*::.*\n/, '').trim();
        const frame = error.match(/^([^\s:][^:\n]*\.php):(\d+)$/m);
        attempts.push({
            testId: `${className}::${name}`,
            project: 'phpunit',
            file: relative(attribute(open, 'file')),
            line: Number(attribute(open, 'line')) || null,
            title: `${className.split('\\').at(-1)}::${name}`,
            shard: 'phpunit',
            retry: 0,
            status: 'failed',
            outcome: 'failed',
            durationMs: Math.round(Number(attribute(open, 'time') ?? 0) * 1000),
            startTime: null,
            errorLocation: frame ? { file: frame[1], line: Number(frame[2]), column: null } : null,
            error,
        });
    }

    return { passed, attempts };
}

function main([input, output]) {
    if (!input || !output) {
        console.error('Usage: node tools/ci/junit-attempts.mjs <junit.xml> <failed-attempts.json>');
        return 64;
    }
    if (!existsSync(input)) {
        console.error(`junit-attempts: no JUnit report at ${input} (did PHPUnit run?)`);
        return 1;
    }
    const { passed, attempts } = attemptsOf(readFileSync(input, 'utf8'), process.env.GITHUB_WORKSPACE ?? '');
    writeFileSync(output, `${JSON.stringify({
        schema: 1,
        status: 'valid',
        reason: null,
        sha: process.env.GITHUB_SHA ?? null,
        ref: process.env.GITHUB_REF_NAME ?? null,
        shard: 'phpunit',
        projects: ['phpunit'],
        counts: { passed, failed: attempts.length, flaky: 0, skipped: 0 },
        tests: attempts.map(({ error, errorLocation, retry, startTime, ...test }) => test),
        attempts,
        globalErrors: [],
    }, null, 2)}\n`);
    console.log(`junit-attempts: ${attempts.length} failed test(s) of ${passed + attempts.length}`);

    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exitCode = main(process.argv.slice(2));
}
