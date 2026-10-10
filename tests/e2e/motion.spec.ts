import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';

/*
 * Motion: every transition in a recipe names the properties it animates (never `all`, never a layout property it does
 * not need) and stops under `prefers-reduced-motion: reduce`; an animation that is the content (a spinner, a skeleton's
 * pulse) runs slower there. A control that waits for its fade before hiding or removing an element still finishes
 * under reduced motion, at once, without a fade left to wait for.
 */

type Motion = 'reduce' | 'no-preference';

const preview = (id: string) => `/preview/${id}?theme=light`;

async function open(page: Page, id: string, motion: Motion) {
    await page.emulateMedia({ reducedMotion: motion });
    await page.goto(preview(id));
}

/** The computed transition of an element or of one of its pseudo-elements. */
const transitionOf = (locator: Locator, pseudo?: string) =>
    locator.evaluate((element, pseudo) => {
        const style = getComputedStyle(element, pseudo);
        return { property: style.transitionProperty, duration: style.transitionDuration };
    }, pseudo ?? null);

const animationDurationOf = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).animationDuration);

const LAYOUT = ['all', 'width', 'height', 'padding', 'margin', 'inset', 'top', 'left', 'right', 'bottom', 'inline-size', 'block-size', 'gap', 'flex', 'grid'];

/** The properties of a transition-property value. */
const properties = (value: string) => value.split(',').map((property) => property.trim());

/** Each transitioning element of a recipe's preview: what it animates without a preference, and how to find it. */
const transitions: { name: string; id: string; target: (page: Page) => Locator; pseudo?: string; animates: string[] }[] = [
    { name: 'tabs trigger', id: 'tabs/default', target: (page) => page.getByRole('tab', { name: 'Profile' }), animates: ['color', 'background-color', 'border-color'] },
    { name: 'tabs trigger (underline)', id: 'tabs/tabs-with-underline', target: (page) => page.getByRole('tab', { name: 'Profile' }), animates: ['color', 'background-color', 'border-color'] },
    { name: 'tabs trigger (pills)', id: 'tabs/pills-tabs', target: (page) => page.getByRole('tab', { name: 'Profile' }), animates: ['color', 'background-color', 'border-color'] },
    { name: 'toggle knob', id: 'toggle/default', target: (page) => page.locator('input.peer + div').first(), pseudo: '::after', animates: ['translate', 'border-color'] },
    { name: 'sidebar width', id: 'sidebar/default', target: (page) => page.locator('#sidebar-preview'), animates: ['width'] },
    { name: 'sidebar collapse chevron', id: 'sidebar/default', target: (page) => page.locator('#sidebar-preview [data-sidebar-target="toggle"] svg').first(), animates: ['transform', 'translate', 'scale', 'rotate'] },
    { name: 'nav menu chevron', id: 'nav-menu/default', target: (page) => page.locator('[data-nav-menu-target="button"] svg.transition-transform').first(), animates: ['transform', 'translate', 'scale', 'rotate'] },
    { name: 'side nav chevron', id: 'side-nav/default', target: (page) => page.locator('[data-side-nav-toggle] svg.transition-transform').first(), animates: ['transform', 'translate', 'scale', 'rotate'] },
    { name: 'table row hover', id: 'table/default', target: (page) => page.locator('tbody tr').first(), animates: ['color', 'background-color', 'border-color'] },
    { name: 'toast fade', id: 'toast/default', target: (page) => page.locator('[data-controller="toast"]').first(), animates: ['opacity'] },
    { name: 'modal backdrop', id: 'modal/default', target: (page) => page.locator('dialog').first(), pseudo: '::backdrop', animates: ['color', 'background-color'] },
];

for (const { name, id, target, pseudo, animates } of transitions) {
    test(`${name}: animates only what it names, and nothing under reduced motion`, async ({ page }) => {
        await open(page, id, 'no-preference');
        const free = await transitionOf(target(page), pseudo);
        expect(properties(free.property), `${name}: transition-property without a preference`).toEqual(expect.arrayContaining(animates));
        // a layout property only when it is the point: the sidebar's width
        for (const property of properties(free.property).filter((property) => !animates.includes(property))) {
            expect(LAYOUT, `${name}: transitions ${property}`).not.toContain(property);
        }

        await open(page, id, 'reduce');
        const reduced = await transitionOf(target(page), pseudo);
        expect(reduced.property, `${name}: transition-property under reduced motion`).toBe('none');
    });
}

test('a tabs trigger animates its colors only, no layout property, without a preference', async ({ page }) => {
    await open(page, 'tabs/default', 'no-preference');
    const { property, duration } = await transitionOf(page.getByRole('tab', { name: 'Profile' }));
    expect(property).not.toBe('all');
    for (const animated of properties(property)) {
        expect(LAYOUT, `transitions ${animated}`).not.toContain(animated);
    }
    expect(duration).not.toBe('0s');
});

test('the spinner and the skeleton pulse run three times slower under reduced motion', async ({ page }) => {
    await open(page, 'spinner/default', 'no-preference');
    await expect.poll(() => animationDurationOf(page.locator('svg.animate-spin').first())).toBe('1s');
    await open(page, 'spinner/default', 'reduce');
    await expect.poll(() => animationDurationOf(page.locator('svg.animate-spin').first())).toBe('3s');

    await open(page, 'skeleton/default', 'no-preference');
    await expect.poll(() => animationDurationOf(page.locator('.animate-pulse').first())).toBe('2s');
    await open(page, 'skeleton/default', 'reduce');
    await expect.poll(() => animationDurationOf(page.locator('.animate-pulse').first())).toBe('6s');
});

/*
 * Dismissing: the alert hides and the toast leaves the DOM after their fade. Under reduced motion there is no fade:
 * both finish at once, within the click (checked in the same task, before any timer could run).
 */
for (const motion of ['reduce', 'no-preference'] as const) {
    test(`an alert dismissed with ${motion} motion is hidden`, async ({ page }) => {
        await open(page, 'alert/dismissing', motion);
        const alert = page.getByRole('alert').filter({ hasText: 'A simple info alert' });
        await alert.getByRole('button', { name: 'Close' }).click();
        await expect(alert).toBeHidden();
    });

    test(`a toast closed with ${motion} motion leaves the DOM`, async ({ page }) => {
        await open(page, 'toast/default', motion);
        const toasts = page.locator('[data-controller="toast"]');
        await expect(toasts).toHaveCount(2);
        await toasts.first().getByRole('button', { name: 'Close' }).click();
        await expect(toasts).toHaveCount(1);
    });

    test(`a modal opened and closed with ${motion} motion updates its trigger and hides`, async ({ page }) => {
        await open(page, 'modal/default', motion);
        const trigger = page.getByRole('button', { name: 'Open Modal' });
        const dialog = page.locator('dialog').first();
        await trigger.click();
        await expect(dialog).toBeVisible();
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await expect(dialog).toHaveAttribute('aria-hidden', 'false');

        await dialog.getByRole('button', { name: 'Decline' }).click();
        await expect(dialog).toBeHidden();
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await expect(dialog).toHaveAttribute('aria-hidden', 'true');
    });
}

test('under reduced motion an alert hides at once, without waiting for a fade', async ({ page }) => {
    await open(page, 'alert/dismissing', 'reduce');
    const hidden = await page.getByRole('alert').filter({ hasText: 'A simple info alert' }).evaluate((alert) => {
        (alert.querySelector('button') as HTMLButtonElement).click();
        return !alert.checkVisibility();
    });
    expect(hidden, 'hidden within the click').toBe(true);
});

test('under reduced motion a closed toast leaves the DOM at once, without waiting for a fade', async ({ page }) => {
    await open(page, 'toast/default', 'reduce');
    const connected = await page.locator('[data-controller="toast"]').first().evaluate((toast) => {
        (toast.querySelector('button') as HTMLButtonElement).click();
        return toast.isConnected;
    });
    expect(connected, 'still in the DOM after the click').toBe(false);
});
