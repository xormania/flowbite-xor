import { test, expect } from './fixtures';

test('a Live form validates changed fields and keeps focus and values across re-renders', async ({ page, allowHttpError }) => {
    // a re-render of an invalid form answers 422 (ComponentWithFormTrait)
    allowHttpError(/\/_components\/Lab:LiveForm/, 422);
    await page.goto('/lab/live-form');
    const name = page.getByRole('textbox', { name: 'Name' });
    const email = page.getByRole('textbox', { name: 'Email' });

    await name.fill('A');
    await email.focus();
    await email.pressSequentially('ada@');
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAccessibleDescription(/too short/);
    await expect(email).toBeFocused();
    await expect(email).toHaveValue('ada@');
    await expect(name).toHaveValue('A');
    // only changed fields are validated: email has not changed yet
    await expect(email).not.toHaveAttribute('aria-invalid');

    await email.pressSequentially('example.com');
    await name.focus();
    await name.fill('Ada');
    await page.getByRole('textbox', { name: 'Bio' }).focus();
    await expect(name).not.toHaveAttribute('aria-invalid');
    await expect(email).toHaveValue('ada@example.com');

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Profile saved.')).toBeVisible();
    await expect(name).toHaveValue('Ada');
});
