import { Controller } from '@hotwired/stimulus';

/**
 * Collapses the `Sidebar` to its icons (saved in `localStorage`), opens it over the page on small
 * screens (`sidebar:toggle` window event, sent by the `Navbar` toggle) and marks the current item.
 *
 * Meant to be `data-turbo-permanent`: Turbo then keeps the same element across visits, so the
 * controller re-marks the current item on every reconnect and restores the scroll position, which the
 * browser resets when the element is re-inserted.
 *
 * @target toggle      The collapse button, kept in sync through `aria-expanded` and its label.
 * @target scroll      The scrolling navigation, whose position survives Turbo visits.
 * @target item        The item links; the one matching the current URL gets `aria-current="page"`.
 * @value  storageKey  The `localStorage` key of the collapsed state.
 * @action toggle      Collapses or expands the sidebar and saves the state.
 * @action rememberScroll Remembers the navigation's scroll position, restored on reconnect.
 * @action toggleMobile Opens or closes the sidebar over the page on small screens.
 * @action closeMobile Closes the sidebar opened over the page, giving focus back to the menu button.
 */
export default class extends Controller {
    static targets = ['toggle', 'scroll', 'item'];
    static values = { storageKey: { type: String, default: 'sidebar-collapsed' } };

    connect() {
        let collapsed = false;
        try {
            collapsed = 'true' === localStorage.getItem(this.storageKeyValue);
        } catch {
            // storage unavailable: start expanded
        }
        this.setCollapsed(collapsed);
        this.markCurrentItem();
        if (undefined !== this.savedScroll && this.hasScrollTarget) {
            this.scrollTarget.scrollTop = this.savedScroll;
        }
    }

    disconnect() {
        this.setMobileOpen(false);
    }

    rememberScroll() {
        // saved on scroll: by the time disconnect() runs, the element is re-inserted and its scroll reset
        this.savedScroll = this.scrollTarget.scrollTop;
    }

    toggle() {
        const collapsed = !this.element.hasAttribute('data-collapsed');
        this.setCollapsed(collapsed);
        try {
            localStorage.setItem(this.storageKeyValue, String(collapsed));
        } catch {
            // storage unavailable: the state lasts until the next page load
        }
    }

    setCollapsed(collapsed) {
        this.element.toggleAttribute('data-collapsed', collapsed);
        this.toggleTargets.forEach((button) => {
            button.setAttribute('aria-expanded', String(!collapsed));
            button.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
        });
    }

    toggleMobile(event) {
        if (event?.detail?.id && event.detail.id !== this.element.id) {
            return;
        }
        this.element.hasAttribute('data-mobile-open') ? this.closeMobile() : this.setMobileOpen(true);
    }

    closeMobile() {
        if (!this.element.hasAttribute('data-mobile-open')) {
            return;
        }
        const hadFocus = this.element.contains(document.activeElement);
        this.setMobileOpen(false);
        if (hadFocus) {
            this.mobileTriggers()[0]?.focus();
        }
    }

    setMobileOpen(open) {
        if (open === this.element.hasAttribute('data-mobile-open')) {
            return;
        }
        this.element.toggleAttribute('data-mobile-open', open);
        this.mobileTriggers().forEach((trigger) => trigger.setAttribute('aria-expanded', String(open)));
        if (open && this.hasScrollTarget) {
            this.scrollTarget.querySelector('a')?.focus();
        }
    }

    mobileTriggers() {
        return [...document.querySelectorAll(`[data-sidebar-trigger="${CSS.escape(this.element.id)}"]`)];
    }

    markCurrentItem() {
        if (!this.itemTargets.some((item) => item.hasAttribute('data-sidebar-active-fixed'))) {
            const path = window.location.pathname;
            this.itemTargets.forEach((item) => {
                const isCurrent = new URL(item.href, window.location.href).pathname === path;
                isCurrent ? item.setAttribute('aria-current', 'page') : item.removeAttribute('aria-current');
            });
        }
    }
}
