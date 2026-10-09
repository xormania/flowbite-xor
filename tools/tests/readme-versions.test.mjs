// The cases of tools/readme-versions.mjs: a recipe README's version table against its manifest.json, with no waiver.
// Run: node --test tools/tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkReadme, manifestPackages, splitEntry, versionTables } from '../readme-versions.mjs';

const manifest = {
    dependencies: {
        recipe: ['theme'],
        composer: ['symfony/ux-icons', 'twig/html-extra:^3.24.0'],
        npm: ['@scope/pkg@^1.2', 'flowbite@^4.0.2'],
        importmap: ['chart.js', 'flowbite/dist/flowbite.min.css@^4.0.2'],
    },
};

const table = (...rows) => ['# Chart', '', '| Package | Version | Via |', '|---|---|---|', ...rows, ''].join('\n');
const matching = [
    '| `symfony/ux-icons` | any | composer |',
    '| `twig/html-extra` | `^3.24.0` | composer |',
    '| `@scope/pkg` | `^1.2` | npm |',
    '| `flowbite` | `^4.0.2` | npm |',
    '| `chart.js` | any | importmap |',
    '| `flowbite/dist/flowbite.min.css` | `^4.0.2` | importmap |',
];

test('a manifest entry splits into its name and constraint, by package manager', () => {
    assert.deepEqual(splitEntry('composer', 'twig/html-extra:^3.24.0'), { name: 'twig/html-extra', constraint: '^3.24.0' });
    assert.deepEqual(splitEntry('composer', 'symfony/ux-icons'), { name: 'symfony/ux-icons', constraint: null });
    assert.deepEqual(splitEntry('npm', '@scope/pkg@^1.2'), { name: '@scope/pkg', constraint: '^1.2' });
    assert.deepEqual(splitEntry('npm', '@scope/pkg'), { name: '@scope/pkg', constraint: null });
    assert.deepEqual(splitEntry('importmap', 'chart.js'), { name: 'chart.js', constraint: null });
});

test('recipe dependencies are not packages', () => {
    assert.deepEqual([...manifestPackages(manifest).keys()], [
        'composer symfony/ux-icons', 'composer twig/html-extra', 'npm @scope/pkg', 'npm flowbite',
        'importmap chart.js', 'importmap flowbite/dist/flowbite.min.css',
    ]);
});

test('::: installation alone matches: the toolkit renders the manifest', () => {
    assert.deepEqual(checkReadme('chart', '# Chart\n\n## Installation\n\n::: installation\n', manifest), []);
});

test('a ::: installation line inside a fenced example is an example, not the directive', () => {
    const [problem] = checkReadme('chart', '# Chart\n\n```markdown\n::: installation\n```\n', manifest);
    assert.match(problem, /^chart\/README\.md: no version table and no "::: installation" line/);
});

test('a README with neither a table nor ::: installation fails', () => {
    const [problem] = checkReadme('chart', '# Chart\n\n## Installation\n\nRun composer require.\n', manifest);
    assert.match(problem, /^chart\/README\.md: no version table and no "::: installation" line/);
});

test('a table listing exactly the manifest packages, with its constraints, matches', () => {
    assert.deepEqual(checkReadme('chart', table(...matching), manifest), []);
    assert.deepEqual(checkReadme('chart', table(...matching) + '\n::: installation\n', manifest), []);
});

test('another constraint fails', () => {
    const rows = matching.with(1, '| `twig/html-extra` | `^3.20` | composer |');
    assert.deepEqual(checkReadme('chart', table(...rows), manifest), [
        'chart/README.md:6: `twig/html-extra` (composer) is `^3.20` here, `^3.24.0` in chart/manifest.json.',
    ]);
    const any = matching.with(3, '| `flowbite` | any | npm |');
    assert.match(checkReadme('chart', table(...any), manifest)[0], /`flowbite` \(npm\) is any here, `\^4\.0\.2` in/);
    const pinned = matching.with(0, '| `symfony/ux-icons` | `^2.0` | composer |');
    assert.match(checkReadme('chart', table(...pinned), manifest)[0], /is `\^2\.0` here, any in chart\/manifest\.json/);
});

test('a missing package fails', () => {
    assert.deepEqual(checkReadme('chart', table(...matching.slice(1)), manifest), [
        'chart/README.md:3: missing package `symfony/ux-icons` (composer, any) from chart/manifest.json.',
    ]);
});

test('an extra package fails, and so does a package listed via another manager', () => {
    assert.deepEqual(checkReadme('chart', table(...matching, '| `symfony/ux-turbo` | `^3.5` | composer |'), manifest), [
        'chart/README.md:11: extra package `symfony/ux-turbo` (composer): chart/manifest.json does not require it.',
    ]);
    const moved = matching.with(4, '| `chart.js` | any | npm |');
    assert.deepEqual(checkReadme('chart', table(...moved), manifest), [
        'chart/README.md:9: extra package `chart.js` (npm): chart/manifest.json does not require it.',
        'chart/README.md:3: missing package `chart.js` (importmap, any) from chart/manifest.json.',
    ]);
    assert.match(checkReadme('chart', table(...matching, '| `theme` | any | recipe |'), manifest)[0], /via "recipe"; Via is one of/);
});

test('a duplicate row and a second table fail', () => {
    assert.match(checkReadme('chart', table(...matching, matching[0]), manifest)[0], /`symfony\/ux-icons` \(composer\) is listed twice/);
    assert.match(checkReadme('chart', table(...matching) + table(...matching), manifest)[0], /a second version table; keep one/);
});

test('a table inside a code block is an example, not the README\'s table', () => {
    const fenced = '# Chart\n\n::: installation\n\n```markdown\n| Package | Version | Via |\n|---|---|---|\n| `x/y` | any | composer |\n```\n';
    assert.deepEqual(versionTables(fenced), []);
    assert.deepEqual(checkReadme('chart', fenced, manifest), []);
});
