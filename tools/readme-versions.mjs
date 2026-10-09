#!/usr/bin/env node
// Each recipe's README states the dependencies its manifest.json declares, with the same version constraints. A
// README states them in one of two ways:
//
// - `::: installation` on a line of its own: the toolkit renders the install steps from the manifest, so they match
//   by construction;
// - a version table, which must list exactly the manifest's Composer, npm and importmap packages (recipe
//   dependencies have no version and are not listed), each with the manifest's constraint, or `any` when the
//   manifest gives none:
//
//   | Package | Version | Via |
//   |---|---|---|
//   | `twig/html-extra` | `^3.24.0` | composer |
//   | `symfony/ux-icons` | any | composer |
//   | `chart.js` | any | importmap |
//
// A README with neither fails, and so does a table with a missing package, an extra one or another constraint.
// There is no waiver: fix the README (the manifest is what ux:install reads). The root manifest.json is the kit's,
// not a recipe's, and is not read here.
//
//   node tools/readme-versions.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const VIAS = ['composer', 'npm', 'importmap'];

/** One manifest entry as { name, constraint }: `vendor/pkg:^1.2` (Composer), `pkg@^1.2` or `@scope/pkg@^1.2`. */
export function splitEntry(via, entry) {
    const at = via === 'composer' ? entry.indexOf(':') : entry.lastIndexOf('@');
    if (at <= 0) {
        return { name: entry, constraint: null };
    }
    return { name: entry.slice(0, at), constraint: entry.slice(at + 1) || null };
}

/** The packages a recipe manifest declares: Map `<via> <name>` => { via, name, constraint }. */
export function manifestPackages(manifest) {
    const packages = new Map();
    for (const via of VIAS) {
        for (const entry of manifest.dependencies?.[via] ?? []) {
            const { name, constraint } = splitEntry(via, entry);
            packages.set(`${via} ${name}`, { via, name, constraint });
        }
    }
    return packages;
}

const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
const unquote = (cell) => cell.replace(/^`(.*)`$/, '$1').trim();
const isHeader = (line) => {
    const names = cells(line).map((cell) => cell.toLowerCase());
    return names.length === 3 && names[0] === 'package' && names[1] === 'version' && names[2] === 'via';
};

/**
 * The README's version tables, outside code blocks: [{ line, rows: [{ line, name, constraint, via }] }]. `any`
 * (or an empty cell) is no constraint.
 */
export function versionTables(readme) {
    const lines = readme.split('\n');
    const tables = [];
    let fence = null;
    for (let i = 0; i < lines.length; i++) {
        const marker = lines[i].match(/^\s*(`{3,}|~{3,})/);
        if (marker) {
            if (fence === null) {
                fence = marker[1];
            } else if (lines[i].trim().startsWith(fence)) {
                fence = null;
            }
            continue;
        }
        if (fence !== null || !isHeader(lines[i]) || !/^\s*\|?\s*:?-+/.test(lines[i + 1] ?? '')) {
            continue;
        }
        const table = { line: i + 1, rows: [] };
        for (i += 2; i < lines.length && lines[i].trim().startsWith('|'); i++) {
            const [name = '', version = '', via = ''] = cells(lines[i]).map(unquote);
            const constraint = version === '' || version.toLowerCase() === 'any' ? null : version;
            table.rows.push({ line: i + 1, name, constraint, via: via.toLowerCase() });
        }
        tables.push(table);
    }
    return tables;
}

const shown = (constraint) => (constraint === null ? 'any' : `\`${constraint}\``);

/** What is wrong with a recipe's README against its manifest: a list of messages, empty when they match. */
export function checkReadme(recipe, readme, manifest) {
    const tables = versionTables(readme);
    const installation = /^::: installation[ \t]*$/m.test(readme);
    const where = `${recipe}/README.md`;
    if (tables.length === 0) {
        return installation
            ? []
            : [`${where}: no version table and no "::: installation" line: add one, so the README states ${recipe}/manifest.json's dependencies.`];
    }
    if (tables.length > 1) {
        return [`${where}:${tables[1].line}: a second version table; keep one.`];
    }
    const expected = manifestPackages(manifest);
    const seen = new Set();
    const problems = [];
    for (const row of tables[0].rows) {
        const key = `${row.via} ${row.name}`;
        if (!VIAS.includes(row.via)) {
            problems.push(`${where}:${row.line}: \`${row.name}\` is listed via "${row.via}"; Via is one of ${VIAS.join(', ')}.`);
        } else if (seen.has(key)) {
            problems.push(`${where}:${row.line}: \`${row.name}\` (${row.via}) is listed twice.`);
        } else if (!expected.has(key)) {
            problems.push(`${where}:${row.line}: extra package \`${row.name}\` (${row.via}): ${recipe}/manifest.json does not require it.`);
        } else if (expected.get(key).constraint !== row.constraint) {
            problems.push(`${where}:${row.line}: \`${row.name}\` (${row.via}) is ${shown(row.constraint)} here, ${shown(expected.get(key).constraint)} in ${recipe}/manifest.json.`);
        }
        seen.add(key);
    }
    for (const [key, { via, name, constraint }] of expected) {
        if (!seen.has(key)) {
            problems.push(`${where}:${tables[0].line}: missing package \`${name}\` (${via}, ${shown(constraint)}) from ${recipe}/manifest.json.`);
        }
    }
    return problems;
}

function main() {
    const root = fileURLToPath(new URL('..', import.meta.url));
    const recipes = readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, 'manifest.json')))
        .map((entry) => entry.name)
        .sort();
    const problems = [];
    let tables = 0;
    for (const recipe of recipes) {
        const readmePath = join(root, recipe, 'README.md');
        if (!existsSync(readmePath)) {
            problems.push(`${recipe}/README.md: missing.`);
            continue;
        }
        const readme = readFileSync(readmePath, 'utf8');
        tables += versionTables(readme).length > 0 ? 1 : 0;
        problems.push(...checkReadme(recipe, readme, JSON.parse(readFileSync(join(root, recipe, 'manifest.json'), 'utf8'))));
    }
    if (problems.length > 0) {
        console.error(problems.join('\n'));
        console.error(`\n${problems.length} README version problem(s): the manifests are the truth, fix the README.`);
        process.exit(1);
    }
    console.log(`README versions match the manifests: ${recipes.length} recipes, ${tables} with a version table, the others render "::: installation".`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
