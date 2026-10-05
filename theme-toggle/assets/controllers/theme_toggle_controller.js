import { Controller } from '@hotwired/stimulus';

/**
 * Switches between the light and dark themes by toggling the `dark` class of `<html>`.
 *
 * A choice is saved in `localStorage`; without one, the theme follows `prefers-color-scheme`, also
 * when it changes while the page is open. The no-flash snippet of the recipe's README applies the
 * same rule in `<head>` before the first paint, so `connect()` finds the theme already set.
 * `aria-pressed` follows the `dark` class, whoever changes it (another toggle, a Turbo visit).
 *
 * @value  storageKey The `localStorage` key of the saved choice, `light` or `dark`.
 * @action toggle     Switches to the other theme and saves the choice.
 */
export default class extends Controller {
    static values = { storageKey: { type: String, default: 'theme' } };

    connect() {
        this.media = window.matchMedia('(prefers-color-scheme: dark)');
        this.onSystemChange = () => {
            if (null === this.savedTheme()) {
                this.apply(this.media.matches);
            }
        };
        this.media.addEventListener('change', this.onSystemChange);

        this.observer = new MutationObserver(() => this.syncPressed());
        this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        const saved = this.savedTheme();
        this.apply(null === saved ? this.media.matches : 'dark' === saved);
    }

    disconnect() {
        this.media.removeEventListener('change', this.onSystemChange);
        this.observer.disconnect();
    }

    toggle() {
        const dark = !document.documentElement.classList.contains('dark');
        try {
            localStorage.setItem(this.storageKeyValue, dark ? 'dark' : 'light');
        } catch {
            // storage unavailable (private mode, blocked): the choice lasts until the next page load
        }
        this.apply(dark);
    }

    apply(dark) {
        document.documentElement.classList.toggle('dark', dark);
        this.syncPressed();
    }

    syncPressed() {
        this.element.setAttribute('aria-pressed', String(document.documentElement.classList.contains('dark')));
    }

    savedTheme() {
        try {
            const theme = localStorage.getItem(this.storageKeyValue);

            return 'dark' === theme || 'light' === theme ? theme : null;
        } catch {
            return null;
        }
    }
}
