#!/usr/bin/env node
// Writes the agent-facing lists of recipes from README.md's tables (the row a person reads is the line an agent
// reads), checked against the directories holding a manifest.json, so a recipe cannot be left out or listed twice:
//
// - llms.txt (https://llmstxt.org/): the kit's pages for agents, one line each, linked as raw markdown. The links
//   point at the tree this file describes: the version of CHANGELOG.md's latest `## [X.Y.Z]` heading, which is the
//   tag release.yml puts on the commit that adds the heading, or `dev` while `## [Unreleased]` has entries. Never
//   `main`, which moves away from an installed tag.
// - FOR-AGENTS.md, *Which recipe*: the table between the `recipes:start` and `recipes:end` comments.
//
// It also checks that FOR-AGENTS.md and docs/PROJECT-AGENTS-SNIPPET.md name only recipes that exist
// (`ux:install <name>`, `<name>/README.md` links).
//
//   node tools/llms-txt.mjs           # writes llms.txt and the FOR-AGENTS.md table
//   node tools/llms-txt.mjs --check   # fails when either is not what this script writes, or a check fails (CI)
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
// table text as plain markdown: links keep their text, the ✦ marker goes
const plain = (text) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s*✦\s*/g, ' ').trim();
const errors = [];

// The ref the links name: CHANGELOG.md's first section is `## [Unreleased]` (with or without entries), then the
// versions, newest first
const changelog = read('CHANGELOG.md');
const unreleased = changelog.match(/^## \[Unreleased\][^\n]*\n([\s\S]*?)(?=^## \[)/m);
const version = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m)?.[1];
const ref = unreleased && /^\s*- /m.test(unreleased[1]) ? 'dev' : version;
if (!ref) {
    console.error('CHANGELOG.md has no unreleased entry and no `## [X.Y.Z]` heading: no ref for the links.');
    process.exit(1);
}
const raw = `https://raw.githubusercontent.com/xormania/flowbite-xor/${ref}`;

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
        groups.at(-1).rows.push({ name: row[1], description: row[2].trim() });
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
// a recipe ships when its directory has a manifest.json and README.md lists it
const ships = (name) => recipes.includes(name) && listed.includes(name);

// --- llms.txt
const lines = [
    '# flowbite-xor',
    '',
    `> ${manifest.description}`,
    '',
    'A Symfony UX Toolkit kit: install a recipe with `php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor`, which copies its files into the project. Each recipe\'s README gives its props, examples and how it behaves in forms, Live Components and Turbo Frames.',
    '',
    ref === 'dev'
        ? 'The links below point at `dev`, the work merged since the last release: install with `--kit=https://github.com/xormania/flowbite-xor:dev` to get what they describe.'
        : `The links below point at release \`${ref}\`, the version this file was written for: install it with \`--kit=https://github.com/xormania/flowbite-xor:${ref}\`.`,
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
        lines.push(`- [${row.name}](${raw}/${row.name}/README.md): ${plain(row.description)}`);
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
const llms = lines.join('\n');

// --- FOR-AGENTS.md, *Which recipe*: one table per README group, as README.md has them (without the ✦)
const start = '<!-- recipes:start: written by tools/llms-txt.mjs from README.md\'s recipe tables; edit those, then run it -->';
const end = '<!-- recipes:end -->';
const table = [start];
for (const group of groups) {
    table.push('', `**${group.title}**`, '', '| Install | What it is |', '|---|---|');
    for (const row of group.rows) {
        table.push(`| [\`${row.name}\`](${row.name}/README.md) | ${row.description} |`);
    }
}
table.push('', end);
const forAgents = read('FOR-AGENTS.md');
const from = forAgents.indexOf('<!-- recipes:start');
const to = forAgents.indexOf(end);
if (from < 0 || to < from) {
    console.error(`FOR-AGENTS.md has no "<!-- recipes:start" … "${end}" pair: put them where the recipe table goes.`);
    process.exit(1);
}
const forAgentsOutput = forAgents.slice(0, from) + table.join('\n') + forAgents.slice(to + end.length);

// --- the agent pages name only recipes that exist
for (const path of ['FOR-AGENTS.md', 'docs/PROJECT-AGENTS-SNIPPET.md']) {
    const text = read(path);
    const named = [
        ...[...text.matchAll(/ux:install ([a-z0-9][a-z0-9-]*)/g)].map((match) => match[1]),
        ...[...text.matchAll(/\]\(([a-z0-9][a-z0-9-]*)\/README\.md/g)].map((match) => match[1]),
    ];
    for (const name of new Set(named)) {
        if (!ships(name)) {
            errors.push(`${path} names \`${name}\`, which is not a recipe (no ${name}/manifest.json, or not in README.md's tables).`);
        }
    }
}

// --- write or check
const outputs = [['llms.txt', llms], ['FOR-AGENTS.md', forAgentsOutput]];
if (process.argv.includes('--check')) {
    for (const [path, output] of outputs) {
        const current = existsSync(join(root, path)) ? read(path) : '';
        if (current !== output) {
            errors.push(`${path} is stale: run \`node tools/llms-txt.mjs\` and commit the result.`);
        }
    }
    if (errors.length) {
        errors.forEach((error) => console.error(error));
        process.exit(1);
    }
    console.log(`llms.txt and FOR-AGENTS.md are up to date (${listed.length} recipes, links at ${ref}).`);
} else {
    for (const [path, output] of outputs) {
        writeFileSync(join(root, path), output);
    }
    errors.forEach((error) => console.error(error));
    console.log(`Wrote llms.txt and FOR-AGENTS.md (${listed.length} recipes, links at ${ref}).`);
    process.exit(errors.length ? 1 : 0);
}
