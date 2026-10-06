import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

/*
 * The props that shape markup, given hostile values: `bin/console app:hostile-props`
 * (demo/src/Command/HostilePropsCommand.php) renders the components through the demo's Twig, and the browser
 * parses each rendering. No value may add an element or an event handler, `as` renders only the tags a component
 * accepts, and a link prop keeps a relative, http(s), mailto or tel URL, any other rendering `#` (README, Security).
 */
type TagCase = { component: string; input: string; expected: string; html: string };
type UrlCase = { component: string; prop: string; link: string; input: string; text: string; hostile: boolean; html: string };
type Cases = {
    tags: TagCase[];
    attributes: { expected: Record<string, string>; absent: string[]; html: string };
    urls: UrlCase[];
    sidebar: { path: string; html: string };
};

const root = fileURLToPath(new URL('../..', import.meta.url));
const cases: Cases = JSON.parse(
    execFileSync(process.env.PHP_BINARY ?? 'php', ['bin/console', 'app:hostile-props'], {
        cwd: join(root, 'demo'),
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
    }),
);
const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];
// relative links resolve against this address; nothing is requested (no link is followed)
const BASE = 'https://app.example/dir/page';
// elements a payload could add to run script, load content or swallow the page
const UNSAFE_ELEMENTS = ['script', 'img', 'svg', 'iframe', 'object', 'embed', 'style', 'textarea', 'template', 'form', 'base', 'meta', 'link'];

type Parsed = {
    ran: unknown;
    handlers: string[];
    urlAttributes: string[];
    elements: string[];
    root: { tag: string; type: string | null } | null;
    legends: number;
    links: { href: string | null; protocol: string }[];
    textProtocol: string;
};

/** Loads `html` as the whole page and reports what the browser built from it. */
async function parse(page: Page, html: string, link = '', text = ''): Promise<Parsed> {
    await page.setContent(html);

    return page.evaluate(
        ({ link, text }) => {
            const ran = (window as any).__xss;
            delete (window as any).__xss;
            // the whole document: a payload's <style>, <meta> or <base> would land in <head>
            const elements = [...document.querySelectorAll('*')].filter((element) => !['html', 'head', 'body'].includes(element.localName));
            const root = document.querySelector('[data-testid="root"]');
            let textProtocol = 'invalid';
            try {
                // the browser's own reading of the value, as a link would resolve it
                textProtocol = new URL(text, document.baseURI).protocol;
            } catch {}

            return {
                ran: ran ?? null,
                handlers: elements.flatMap((element) =>
                    element.getAttributeNames().filter((name) => /^on[a-z]+$/i.test(name)).map((name) => `<${element.localName} ${name}>`),
                ),
                urlAttributes: elements.flatMap((element) =>
                    ['href', 'src', 'action', 'formaction', 'data', 'xlink:href'].filter((name) => element.hasAttribute(name)).map((name) => `<${element.localName} ${name}>`),
                ),
                elements: [...new Set(elements.map((element) => element.localName))],
                root: root ? { tag: root.localName, type: root.getAttribute('type') } : null,
                legends: document.querySelectorAll('legend').length,
                links: [...document.querySelectorAll('a')]
                    .filter((a) => a.textContent?.trim() === link)
                    .map((a) => ({ href: a.getAttribute('href'), protocol: a.protocol })),
                textProtocol,
            };
        },
        { link, text },
    );
}

/** Dismisses and records every dialog (`alert(…)` payloads). */
function recordDialogs(page: Page): string[] {
    const dialogs: string[] = [];
    page.on('dialog', (dialog) => {
        dialogs.push(dialog.message());
        void dialog.dismiss();
    });

    return dialogs;
}

test('`as` renders only the tags each component accepts', async ({ page }) => {
    test.setTimeout(180_000);
    const dialogs = recordDialogs(page);
    const failures: string[] = [];
    for (const { component, input, expected, html } of cases.tags) {
        const found = await parse(page, html);
        const problems: string[] = [];
        if (found.root?.tag !== expected) {
            problems.push(`renders <${found.root?.tag ?? 'nothing'}>, expected <${expected}>`);
        }
        const unsafe = found.elements.filter((element) => UNSAFE_ELEMENTS.includes(element));
        if (unsafe.length) {
            problems.push(`adds ${unsafe.map((element) => `<${element}>`).join(', ')}`);
        }
        if (found.handlers.length) {
            problems.push(`adds handlers ${found.handlers.join(', ')}`);
        }
        // no case passes a URL: any is injected
        if (found.urlAttributes.length) {
            problems.push(`adds ${found.urlAttributes.join(', ')}`);
        }
        if (null !== found.ran) {
            problems.push(`ran a payload (${found.ran})`);
        }
        if ('Dropdown:Item' === component && 'button' === expected && 'button' !== found.root?.type) {
            problems.push('a button item without type="button"');
        }
        if ('FormField' === component && found.legends !== ('fieldset' === expected ? 1 : 0)) {
            problems.push(`${found.legends} <legend>`);
        }
        if (problems.length) {
            failures.push(`${component} as=${input}: ${problems.join('; ')}`);
        }
    }

    expect(failures).toEqual([]);
    expect(dialogs).toEqual([]);
});

test('FormField label and help attribute names cannot add attributes', async ({ page }) => {
    const dialogs = recordDialogs(page);
    const { expected, absent, html } = cases.attributes;
    const found = await parse(page, html);
    const label = page.locator('label');
    const help = page.locator('#field_help');
    await label.hover();
    await help.hover();

    for (const element of [label, help]) {
        const attributes = await element.evaluate((node) => Object.fromEntries(node.getAttributeNames().map((name) => [name, node.getAttribute(name)])));
        expect(attributes).toMatchObject(expected);
        expect(Object.keys(attributes).filter((name) => absent.includes(name) || /^on[a-z]+$/i.test(name))).toEqual([]);
    }
    expect(found.handlers).toEqual([]);
    expect(found.elements.filter((element) => UNSAFE_ELEMENTS.includes(element))).toEqual([]);
    expect(await page.evaluate(() => (window as any).__xss ?? null)).toBeNull();
    expect(dialogs).toEqual([]);
});

test('link props keep only relative, http(s), mailto and tel URLs', async ({ page }) => {
    test.setTimeout(180_000);
    const dialogs = recordDialogs(page);
    const failures: string[] = [];
    for (const { component, prop, link, input, text, hostile, html } of cases.urls) {
        const found = await parse(page, `<base href="${BASE}">${html}`, link, text);
        // what the browser reads the value as decides: kept as given when safe, "#" otherwise
        const expectedHref = SAFE_PROTOCOLS.includes(found.textProtocol) ? text : '#';
        const problems: string[] = [];
        if (!hostile && expectedHref !== text) {
            problems.push(`the browser reads this ordinary URL as ${found.textProtocol} (test data)`);
        }
        if (1 !== found.links.length) {
            problems.push(`${found.links.length} "${link}" links`);
        } else {
            const [{ href, protocol }] = found.links;
            if (!SAFE_PROTOCOLS.includes(protocol)) {
                problems.push(`links to ${protocol}`);
            }
            if (href !== expectedHref) {
                problems.push(`href ${JSON.stringify(href)}, expected ${JSON.stringify(expectedHref)}`);
            }
        }
        if (found.handlers.length) {
            problems.push(`adds handlers ${found.handlers.join(', ')}`);
        }
        if (null !== found.ran) {
            problems.push(`ran a payload (${found.ran})`);
        }
        if (problems.length) {
            failures.push(`${component} ${prop}=${input}: ${problems.join('; ')}`);
        }
    }

    expect(failures).toEqual([]);
    expect(dialogs).toEqual([]);
});

test('a sidebar item whose link renders "#" is never the current page', async ({ page }) => {
    const { path, html } = cases.sidebar;
    await page.goto(path);
    await page.evaluate((sidebar) => document.body.insertAdjacentHTML('beforeend', sidebar), html);
    const nav = page.getByRole('navigation', { name: 'Hostile links' });

    // the controller has marked the current item…
    await expect(nav.getByRole('link', { name: 'Current' })).toHaveAttribute('aria-current', 'page');
    // …and not the rejected link, nor a "#…" placeholder, although they resolve to this page
    await expect(nav.getByRole('link', { name: 'Rejected' })).toHaveAttribute('href', '#');
    await expect(nav.getByRole('link', { name: 'Rejected' })).not.toHaveAttribute('aria-current');
    await expect(nav.getByRole('link', { name: 'Placeholder' })).not.toHaveAttribute('aria-current');
});
