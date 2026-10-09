#!/usr/bin/env node
// Fails when docs/TEST-INVENTORY.md or the accessibility scan's list of lab pages has fallen behind the repository:
//
// - a recipe shipping a Stimulus controller (`<recipe>/assets/controllers/*_controller.js`) has no row in the
//   inventory's matrix (its first column, `sidebar, navbar` naming two);
// - a test the inventory names does not exist: a spec named in a matrix cell or anywhere as `lab.<name>`
//   (`tests/e2e/<name>.spec.ts`), `recipe:<name>` (a spec in `<name>/tests/`), `shot:<recipe>` (a recipe), a PHPUnit
//   class (`FooTest`, `FooTest::testBar`, in `demo/tests/`), a spec or test file path in inline code. Struck text
//   (`~~…~~`) is history and is not read;
// - a page of the demo's LabController is not in `labPages` of tests/e2e/a11y.spec.ts, or `labPages` names a page
//   it has not. A route without GET is not a page: it is listed below with its reason, so none is left out silently.
//
// It checks names, not what the tests establish: a row's claims stay the reviewer's.
//
//   node tools/test-inventory.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const errors = [];

// Lab routes that are not pages, so not scanned: route path => why
const notPages = {
    'turbo-nav/save': 'POST only: the form of the turbo-nav page posts to it',
};

const recipes = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, 'manifest.json')))
    .map((entry) => entry.name);
const inventory = read('docs/TEST-INVENTORY.md').replace(/~~[^~]*~~/g, '');

// The matrix: the table of the "The matrix" section
const matrixSection = inventory.split(/^## /m).find((section) => section.startsWith('The matrix'));
if (undefined === matrixSection) {
    errors.push('docs/TEST-INVENTORY.md: no "## The matrix" section');
}
const matrix = (matrixSection ?? '')
    .split('\n')
    .filter((line) => line.startsWith('|') && !/^\|[-| ]+\|$/.test(line))
    .slice(1) // the header
    .map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()));

// 1. Every recipe with a controller has a row
const rows = new Set(matrix.flatMap(([first]) => first.split(',').map((name) => name.trim())));
for (const recipe of recipes) {
    const controllers = join(root, recipe, 'assets', 'controllers');
    if (existsSync(controllers) && readdirSync(controllers).some((file) => file.endsWith('_controller.js')) && !rows.has(recipe)) {
        errors.push(`docs/TEST-INVENTORY.md: ${recipe} ships a Stimulus controller and has no row in the matrix`);
    }
}

// 2. Every test it names exists
const spec = (name, where) => {
    if (!existsSync(join(root, 'tests/e2e', `${name}.spec.ts`))) {
        errors.push(`docs/TEST-INVENTORY.md: ${where} names ${name}, and tests/e2e/${name}.spec.ts does not exist`);
    }
};
for (const [first, ...cells] of matrix) {
    for (const cell of cells) {
        for (const name of cell.replace(/\([^)]*\)/g, '').split(',').map((part) => part.trim())) {
            if (!['', '·', 'css'].includes(name) && !/^(G\d+|T\d)$/.test(name)) {
                spec(name, `the matrix row ${first}`);
            }
        }
    }
}
for (const [, name] of inventory.matchAll(/(?<![\w.-])(lab\.[a-z0-9]+(?:-[a-z0-9]+)*)/g)) {
    spec(name, 'the text');
}
for (const [, name] of inventory.matchAll(/\brecipe:([a-z0-9-]+)/g)) {
    const tests = join(root, name, 'tests');
    if (!existsSync(tests) || !readdirSync(tests).some((file) => file.endsWith('.spec.ts'))) {
        errors.push(`docs/TEST-INVENTORY.md: recipe:${name} names no spec (${name}/tests/*.spec.ts)`);
    }
}
for (const [, name] of inventory.matchAll(/\bshot:([a-z0-9-]+)/g)) {
    if (!recipes.includes(name)) {
        errors.push(`docs/TEST-INVENTORY.md: shot:${name} names no recipe`);
    }
}
const phpTests = new Map();
const walk = (dir) => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
            walk(path);
        } else if (entry.name.endsWith('Test.php')) {
            phpTests.set(entry.name.slice(0, -4), read(path));
        }
    }
};
walk('demo/tests');
for (const [, test, method] of inventory.matchAll(/`([A-Z]\w*Test)(?:::(test\w+))?`/g)) {
    const source = phpTests.get(test);
    if (undefined === source) {
        errors.push(`docs/TEST-INVENTORY.md: ${test} is not a test class in demo/tests/`);
    } else if (undefined !== method && !new RegExp(`function ${method}\\(`).test(source)) {
        errors.push(`docs/TEST-INVENTORY.md: ${test} has no ${method}()`);
    }
}
for (const [, path] of inventory.matchAll(/`([\w./-]+(?:\.spec\.ts|Test\.php))`/g)) {
    if (!existsSync(join(root, path))) {
        errors.push(`docs/TEST-INVENTORY.md: ${path} does not exist`);
    }
}

// 3. Every lab page is scanned, and every scanned lab page exists
const lab = read('demo/src/Controller/LabController.php');
const routes = [...lab.matchAll(/^\s*#\[Route\('([^']*)'(.*)\)\]\s*$/gm)]
    .filter(([, path]) => path !== '/lab') // the class's prefix
    .map(([, path, options]) => ({
        path: path.replace(/^\//, '').replace(/\/\{[^}]+\}$/, ''),
        get: !/methods:/.test(options) || /methods:\s*\[[^\]]*'GET'/.test(options),
    }));
const a11y = read('tests/e2e/a11y.spec.ts').match(/const labPages = \[([^\]]*)\]/);
if (null === a11y) {
    errors.push('tests/e2e/a11y.spec.ts: no `const labPages = [...]`');
}
const scanned = [...(a11y?.[1] ?? '').matchAll(/'([^']*)'/g)].map(([, page]) => page);
const pages = read('tests/e2e/a11y.spec.ts').match(/const pages = \[([^\]]*)\]/)?.[1] ?? '';
for (const { path, get } of routes) {
    if ('' === path) {
        if (get && !/^\s*'\/lab',$/m.test(pages)) {
            errors.push('tests/e2e/a11y.spec.ts: the lab index /lab is not in pages');
        }
        continue;
    }
    if (path in notPages) {
        if (get) {
            errors.push(`tools/test-inventory.mjs: notPages lists /lab/${path}, which now accepts GET: remove it there and add the page to labPages`);
        }
        continue;
    }
    if (!get) {
        errors.push(`demo/src/Controller/LabController.php: /lab/${path} has no GET: add it to notPages in tools/test-inventory.mjs with its reason`);
    } else if (!scanned.some((page) => page === path || page.startsWith(`${path}/`))) {
        errors.push(`tests/e2e/a11y.spec.ts: the lab page /lab/${path} is not in labPages`);
    }
}
for (const path of Object.keys(notPages)) {
    if (!routes.some((route) => route.path === path)) {
        errors.push(`tools/test-inventory.mjs: notPages lists /lab/${path}, which LabController no longer has`);
    }
}
for (const page of scanned) {
    if (!routes.some(({ path, get }) => get && (page === path || page.startsWith(`${path}/`)))) {
        errors.push(`tests/e2e/a11y.spec.ts: labPages names /lab/${page}, which LabController has no page for`);
    }
}

if (errors.length > 0) {
    console.error([...new Set(errors)].join('\n'));
    process.exit(1);
}
console.log(`test-inventory: ${rows.size} matrix rows, ${phpTests.size} PHPUnit classes, ${routes.length} lab routes checked`);
