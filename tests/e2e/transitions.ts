import type { Locator, Page } from '@playwright/test';
import { expect, turboVisitDone } from './fixtures';

/*
 * The Turbo transitions of the lab scaffold (`demo/templates/lab/`), each waiting until Turbo has rendered the page it
 * leads to: a visit, Back, Forward, a reload, and a step of a frame whose visits are promoted to history.
 *
 * A lab page names itself in its `data-testid="page"` heading (`Page one`, `Page two`), links the next page with
 * `Go to page two`, and may hold the `history-steps` frame (`lab/_history_steps.html.twig`): its `Next step` link
 * advances the frame, adds `?step=<n>` to the URL and shows the step in `data-testid="history-step"`.
 *
 * Every step waits for what the page shows, then for the visit itself (`turboVisitDone`): on a page Turbo has cached,
 * the expected content shows first as a preview, while the request still runs.
 */

/** A page of the scaffold by its heading (`'Page two'`), or a step of its `history-steps` frame (`{ step: 1 }`). */
export type Shown = string | { step: number };

/** Waits until the page shows `shown` and Turbo's visit is over. */
export async function shown(page: Page, shown: Shown): Promise<void> {
    if ('string' === typeof shown) {
        await expect(page.getByTestId('page')).toHaveText(shown);
    } else {
        await expect(page.getByTestId('history-step')).toHaveText(String(shown.step));
        await expect.poll(() => Number(new URL(page.url()).searchParams.get('step') ?? 0)).toBe(shown.step);
    }
    await turboVisitDone(page);
}

/** Clicks a link, by its exact accessible name, a pattern or a locator, and waits for `then`. */
export async function visit(page: Page, link: string | RegExp | Locator, then: Shown): Promise<void> {
    const target = 'string' === typeof link || link instanceof RegExp ? page.getByRole('link', { name: link, exact: 'string' === typeof link }) : link;
    await target.click();
    await shown(page, then);
}

/** Goes Back, a restoration visit from Turbo's cached copy, and waits for `then`. */
export async function back(page: Page, then: Shown): Promise<void> {
    await page.goBack();
    await shown(page, then);
}

/** Goes Forward and waits for `then`. */
export async function forward(page: Page, then: Shown): Promise<void> {
    await page.goForward();
    await shown(page, then);
}

/** Reloads the page, a full load Turbo is not part of, and waits for `then`. */
export async function reload(page: Page, then: Shown): Promise<void> {
    await page.reload();
    await shown(page, then);
}

/** Visits page two from page one with `Go to page two`, then goes Back: the scaffold's most common round trip. */
export async function visitAndBack(page: Page, { link = 'Go to page two', there = 'Page two', here = 'Page one' } = {}): Promise<void> {
    await visit(page, link, there);
    await back(page, here);
}

/**
 * Starts a visit of the `history-steps` frame to `?step=<step>` from the page's code, as a debounced search or a poll
 * would, and waits for it: no click or focus change reaches what is open beside the frame. The visit is promoted to
 * history like the frame's own links.
 */
export async function stepFromCode(page: Page, step: number): Promise<void> {
    await page.evaluate((step) => {
        const url = new URL(location.href);
        url.searchParams.set('step', String(step));
        (window as any).Turbo.visit(url.href, { frame: 'history-steps', action: 'advance' });
    }, step);
    await shown(page, { step });
}

/**
 * From now on, records for each page Turbo renders (a cached copy included) which of `selectors` match a visible
 * element at the first animation frame after the new body is in place: what the user first sees, once the page's
 * controllers have connected. Returns a function reading the records, one `{ [name]: visible }` per render.
 */
export async function recordFirstFrames(page: Page, selectors: Record<string, string>): Promise<() => Promise<Record<string, boolean>[]>> {
    await page.evaluate((selectors) => {
        const records: Record<string, boolean>[] = ((window as any).__firstFrames = []);
        document.addEventListener('turbo:before-render', (event: any) => {
            const body = event.detail.newBody;
            let frames = 0;
            const record = () => {
                // a frame visit promoted to history renders no body: give up after a second
                if (document.body !== body) {
                    return ++frames < 60 && requestAnimationFrame(record);
                }
                records.push(
                    Object.fromEntries(
                        Object.entries(selectors).map(([name, selector]) => [name, [...document.querySelectorAll(selector)].some((element) => element.checkVisibility())]),
                    ),
                );
            };
            requestAnimationFrame(record);
        });
    }, selectors);

    return () => page.evaluate(() => (window as any).__firstFrames as Record<string, boolean>[]);
}
