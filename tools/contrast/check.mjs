#!/usr/bin/env node
/*
 * Token contrast gate: resolves the color roles of kit.css and of the theme recipe's on-fill roles
 * (theme/assets/styles/flowbite-xor-on-fill.css, imported after it; light: @theme, dark: .dark) through
 * Tailwind's palette (tailwindcss/theme.css, OKLCH), converts them to sRGB and checks every pair of
 * pairs.json against its WCAG 2 contrast minimum, in both themes. Exits 1 on any failure.
 *
 * Usage: node tools/contrast/check.mjs [kit.css [flowbite-xor-on-fill.css]]
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);
// in import order: a later file overrides an earlier one
const sheets = [process.argv[2] ?? `${root}kit.css`, process.argv[3] ?? `${root}theme/assets/styles/flowbite-xor-on-fill.css`]
    .map((path) => ({ path, css: readFileSync(path, 'utf8') }));
const themeCss = readFileSync(require.resolve('tailwindcss/theme.css'), 'utf8');
const pairs = JSON.parse(readFileSync(new URL('./pairs.json', import.meta.url), 'utf8'));

const declarations = (css) => Object.fromEntries([...css.matchAll(/--color-([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const block = ({ path, css }, selector) => {
    const start = css.indexOf(`${selector} {`);
    if (start < 0) throw new Error(`No "${selector} {" block in ${path}`);
    let depth = 0;
    for (let i = css.indexOf('{', start); i < css.length; i++) {
        if (css[i] === '{') depth++;
        if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
    }
    throw new Error(`Unclosed "${selector}" block`);
};

const palette = declarations(themeCss);
const merged = (selector) => Object.assign({}, ...sheets.map((sheet) => declarations(block(sheet, selector))));
const light = merged('@theme');
const scopes = { light, dark: { ...light, ...merged('.dark') } };

function resolve(name, scope, seen = new Set()) {
    if (seen.has(name)) throw new Error(`Circular color "${name}"`);
    seen.add(name);
    const value = scope[name] ?? palette[name];
    if (value === undefined) throw new Error(`Unknown color "${name}"`);
    const ref = value.match(/^var\(--color-([\w-]+)\)$/);
    return ref ? resolve(ref[1], scope, seen) : value;
}

function toRgb(value) {
    let m;
    if ((m = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i))) {
        const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
        return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    }
    if ((m = value.match(/^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/))) {
        const [L, C, H] = [m[1] / 100, +m[2], (m[3] * Math.PI) / 180];
        const [a, b] = [C * Math.cos(H), C * Math.sin(H)];
        const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
        const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
        const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
        const linear = [
            4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
        ];
        // gamma-encode and clip to the sRGB gamut, as a browser does
        return linear.map((c) => Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)));
    }
    throw new Error(`Unsupported color value "${value}"`);
}

const luminance = (rgb) => {
    const [r, g, b] = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (fg, bg) => {
    const [a, b] = [luminance(toRgb(fg)), luminance(toRgb(bg))].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
};

let failures = 0;
for (const pair of pairs) {
    for (const theme of pair.themes ?? ['light', 'dark']) {
        const value = ratio(resolve(pair.fg, scopes[theme]), resolve(pair.bg, scopes[theme]));
        const ok = value >= pair.min;
        failures += ok ? 0 : 1;
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${theme.padEnd(5)} ${value.toFixed(2).padStart(5)} ≥ ${pair.min}  ${pair.fg} on ${pair.bg}  (${pair.usage})`);
    }
}
console.log(failures ? `\n${failures} pair(s) below their minimum.` : `\nAll ${pairs.length} pairs pass in both themes.`);
process.exit(failures ? 1 : 0);
