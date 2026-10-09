import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { back, visit, visitAndBack } from './transitions';

/*
 * Overlays left open when a link inside them visits another page, and a tooltip shown on such a link: Back shows them
 * closed, and they open again as they should (a menu's markup and state agree, a dialog is modal). Page two links a stylesheet page one lacks; delayed, it
 * makes Turbo copy page one before its controllers disconnect, the order a slow stylesheet gives in production.
 */

type Overlay = {
    name: string;
    open: (page: Page) => Promise<void>;
    link: (page: Page) => ReturnType<Page['getByRole']>;
    expectOpen: (page: Page) => Promise<void>;
    expectClosed: (page: Page) => Promise<void>;
};

const dialogState = (page: Page, id: string) =>
    page.locator(`dialog#${id}`).evaluate((dialog: HTMLDialogElement) => ({ open: dialog.open, modal: dialog.matches(':modal') }));

const overlays: Overlay[] = [
    {
        name: 'a dropdown menu',
        open: (page) => page.getByRole('button', { name: 'Menu' }).click(),
        link: (page) => page.getByRole('menuitem', { name: 'Page two from the menu' }),
        expectOpen: async (page) => {
            await expect(page.getByRole('menuitem', { name: 'Page two from the menu' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'true');
        },
        expectClosed: async (page) => {
            await expect(page.getByRole('menuitem', { name: 'Page two from the menu', includeHidden: true })).toBeHidden();
            await expect(page.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
        },
    },
    {
        name: 'a modal',
        open: (page) => page.getByRole('button', { name: 'Open the modal' }).click(),
        link: (page) => page.getByRole('link', { name: 'Page two from the modal' }),
        expectOpen: async (page) => expect.poll(() => dialogState(page, 'modal-restore-modal')).toEqual({ open: true, modal: true }),
        expectClosed: async (page) => {
            await expect.poll(() => dialogState(page, 'modal-restore-modal')).toEqual({ open: false, modal: false });
            await expect(page.getByRole('button', { name: 'Open the modal' })).toHaveAttribute('aria-expanded', 'false');
        },
    },
    {
        name: 'a drawer',
        open: (page) => page.getByRole('button', { name: 'Open the drawer' }).click(),
        link: (page) => page.getByRole('link', { name: 'Page two from the drawer' }),
        expectOpen: async (page) => expect.poll(() => dialogState(page, 'drawer-restore-drawer')).toEqual({ open: true, modal: true }),
        expectClosed: async (page) => {
            await expect.poll(() => dialogState(page, 'drawer-restore-drawer')).toEqual({ open: false, modal: false });
            await expect(page.getByRole('button', { name: 'Open the drawer' })).toHaveAttribute('aria-expanded', 'false');
        },
    },
    {
        // shown while the pointer is on the link it describes, when that link visits
        name: 'a tooltip',
        open: async (page) => {
            await page.mouse.move(0, 0);
            await page.getByRole('link', { name: 'Page two from the tooltip link' }).hover();
        },
        link: (page) => page.getByRole('link', { name: 'Page two from the tooltip link' }),
        expectOpen: async (page) => {
            await expect(page.getByRole('tooltip', { name: 'Opens page two' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'Page two from the tooltip link' })).toHaveAccessibleDescription('Opens page two');
        },
        expectClosed: async (page) => {
            await expect(page.getByRole('tooltip', { name: 'Opens page two', includeHidden: true })).toBeHidden();
            await expect(page.getByRole('link', { name: 'Page two from the tooltip link' })).toHaveAccessibleDescription('Opens page two');
        },
    },
];

for (const slow of [false, true]) {
    for (const overlay of overlays) {
        test(`${overlay.name} left open by a visit is closed after Back, and opens again${slow ? ', the next page waiting for a stylesheet' : ''}`, async ({ page }) => {
            if (slow) {
                await page.route('**/lab/slow.css', async (route) => {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    await route.fallback();
                });
            }
            await page.goto('/lab/turbo-restore');
            await page.evaluate(() => ((window as any).__sameDocument = true));
            await overlay.open(page);
            await overlay.expectOpen(page);

            await visit(page, overlay.link(page), 'Page two');
            await back(page, 'Page one');

            await overlay.expectClosed(page);
            await overlay.open(page);
            await overlay.expectOpen(page);
            expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
        });
    }
}

test('a toast outside the permanent region is not shown again on Back', async ({ page }) => {
    await page.goto('/lab/turbo-restore');
    await expect(page.getByTestId('page-toast')).toHaveText('Saved on page one.');
    await visitAndBack(page);
    await expect(page.getByTestId('page-toast')).toHaveCount(0);

    // a full load renders the page's toast again
    await page.reload();
    await expect(page.getByTestId('page-toast')).toHaveText('Saved on page one.');
});

test('a toast moved into the permanent region stays across visits', async ({ page }) => {
    await page.goto('/lab/turbo-restore');
    await page.evaluate(() => ((window as any).__sameDocument = true));
    const toast = page.getByTestId('page-toast');
    await expect(toast).toHaveAttribute('data-turbo-temporary', '');
    await toast.evaluate((element) => document.getElementById('toasts')!.append(element));
    await expect(toast).not.toHaveAttribute('data-turbo-temporary');
    await visit(page, 'Go to page two', 'Page two');
    await expect(toast).toHaveText('Saved on page one.');
    await back(page, 'Page one');
    await expect(toast).toHaveCount(1);
    expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
});
