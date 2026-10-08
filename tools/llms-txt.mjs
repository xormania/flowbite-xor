#!/usr/bin/env node
// Writes llms.txt (https://llmstxt.org/): the kit's pages for agents, one line each, linked as raw markdown. The
// recipes come from README.md's tables (the row a person reads is the line an agent reads), checked against the
// directories holding a manifest.json, so a recipe cannot be left out or listed twice.
//
//   node tools/llms-txt.mjs           # writes llms.txt
//   node tools/llms-txt.mjs --check   # fails when llms.txt is not what this script writes (CI)
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const raw = 'https://raw.githubusercontent.com/xormania/flowbite-xor/main';
const read = (path) => readFileSync(join(root, path), 'utf8');
// table text as plain markdown: links keep their text, the ✦ marker goes
const plain = (text) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s*✦\s*/g, ' ').trim();

const manifest = JSON.parse(read('manifest.json'));
const recipes = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, 'manifest.json')))
    .map((entry) => entry.name)
    .sort();

// README.md's "## Recipes" section: each "### Group" heading, then rows "| [`name`](name/README.md) … | description |"
const readme = read('README.md');
const section = readme.slice(readme.indexOf('\n## Recipes'), readme.indexOf('\n## ', readme.indexOf('\n## Recipes') + 1));
const groups = [];
for (const line of section.split('\n')) {
    const heading = line.match(/^### (.+)$/);
    if (heading) {
        groups.push({ title: plain(heading[1]), rows: [] });
        continue;
    }
    const row = line.match(/^\| \[`([a-z0-9-]+)`\]\(\1\/README\.md\)[^|]*\| (.+) \|$/);
    if (row && groups.length > 0) {
        groups.at(-1).rows.push({ name: row[1], description: plain(row[2]) });
    }
}

const listed = groups.flatMap((group) => group.rows.map((row) => row.name));
const missing = recipes.filter((name) => !listed.includes(name));
const unknown = listed.filter((name) => !recipes.includes(name));
const twice = listed.filter((name, index) => listed.indexOf(name) !== index);
if (missing.length || unknown.length || twice.length) {
    console.error('README.md\'s recipe tables do not match the recipe directories:');
    for (const [label, names] of [['missing', missing], ['not a recipe', unknown], ['listed twice', twice]]) {
        if (names.length) {
            console.error(`  ${label}: ${names.join(', ')}`);
        }
    }
    process.exit(1);
}

const lines = [
    '# flowbite-xor',
    '',
    `> ${manifest.description}`,
    '',
    'A Symfony UX Toolkit kit: install a recipe with `php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor`, which copies its files into the project. Each recipe\'s README gives its props, examples and how it behaves in forms, Live Components and Turbo Frames.',
    '',
    '## Start here',
    '',
    `- [For agents](${raw}/FOR-AGENTS.md): what the kit gives you, how to set a project up, which recipe to install for what, and the rules to follow`,
    `- [Project agents snippet](${raw}/docs/PROJECT-AGENTS-SNIPPET.md): the block to paste into a project's AGENTS.md or CLAUDE.md`,
    `- [Install](${raw}/INSTALL.md): each setup step explained, AssetMapper or Webpack Encore`,
    `- [README](${raw}/README.md): every recipe, updating, Turbo and Live Components, security, versions and requirements`,
    '',
];
for (const group of groups) {
    lines.push(`## ${group.title}`, '');
    for (const row of group.rows) {
        lines.push(`- [${row.name}](${raw}/${row.name}/README.md): ${row.description}`);
    }
    lines.push('');
}
lines.push(
    '## Optional',
    '',
    `- [Changelog](${raw}/CHANGELOG.md): what each version changes`,
    `- [Security](${raw}/SECURITY.md): reporting a vulnerability`,
    `- [Testing patterns](${raw}/docs/TESTING.md): how this repository tests Turbo, Live Components, the CSP and request limits, to reuse in an app`,
    `- [Contributing](${raw}/CONTRIBUTING.md): changing the kit itself: layout, conventions, checks`,
    '',
);
const output = lines.join('\n');

if (process.argv.includes('--check')) {
    const current = existsSync(join(root, 'llms.txt')) ? read('llms.txt') : '';
    if (current !== output) {
        console.error('llms.txt is stale: run `node tools/llms-txt.mjs` and commit the result.');
        process.exit(1);
    }
    console.log(`llms.txt is up to date (${listed.length} recipes).`);
} else {
    writeFileSync(join(root, 'llms.txt'), output);
    console.log(`Wrote llms.txt (${listed.length} recipes).`);
}
