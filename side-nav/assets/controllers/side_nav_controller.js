import { Controller } from '@hotwired/stimulus';

/**
 * A navigation tree, as the WAI-ARIA tree view pattern describes it: branches open and close (`aria-expanded`), one
 * treeitem at a time is in the Tab order (roving `tabindex`), and the keyboard moves through the visible treeitems:
 * Up and Down, Right (open a branch, then enter it), Left (close a branch, then go to its parent), Home, End, and
 * type-ahead on the labels. Enter or Space follows a link, or opens or closes a branch.
 *
 * Which branches are open is saved in `sessionStorage` and restored on every connect, so it holds across Turbo
 * visits, Back and Forward, and the copy of the page Turbo cached. The branches holding the current page are opened.
 * In a `data-turbo-permanent` element, Turbo keeps the same tree and the controller re-marks the current page on
 * every reconnect.
 *
 * @target item       The link treeitems; the one matching the current URL's path gets `aria-current="page"`, never a `#…` link.
 * @target branch     The branch treeitems, open when `aria-expanded="true"`.
 * @value  storageKey The `sessionStorage` key of the branches' open state; empty keeps it in the page only.
 * @action keydown    Moves the focus, opens and closes branches, follows links.
 * @action toggleFromClick Opens or closes the branch whose row was clicked.
 * @action remember   Makes the focused treeitem the one Tab returns to.
 */
export default class extends Controller {
    static targets = ['item', 'branch'];
    static values = { storageKey: String };

    connect() {
        this.typed = '';
        this.markCurrentItem();
        this.restore();
        const current = this.itemTargets.find((item) => 'page' === item.getAttribute('aria-current'));
        if (current) {
            this.openAncestors(current);
        }
        const visible = this.visibleItems();
        const stop = [current, this.treeitems().find((item) => '0' === item.getAttribute('tabindex'))].find((item) => item && visible.includes(item));
        this.setTabStop(stop ?? visible[0]);
    }

    disconnect() {
        clearTimeout(this.typeTimer);
    }

    keydown(event) {
        const item = event.target.closest('[role="treeitem"]');
        if (!item || !this.treeitems().includes(item) || event.altKey || event.ctrlKey || event.metaKey) {
            return;
        }
        const items = this.visibleItems();
        const index = items.indexOf(item);
        const isBranch = this.branchTargets.includes(item);
        const isOpen = isBranch && 'true' === item.getAttribute('aria-expanded');
        const isLetter = 1 === [...event.key].length && /\S/.test(event.key);
        if (!isLetter) {
            this.typed = ''; // another key ends the typed word
        }

        switch (event.key) {
            case 'ArrowDown':
                this.focusItem(items[index + 1]);
                break;
            case 'ArrowUp':
                this.focusItem(items[index - 1]);
                break;
            case 'Home':
                this.focusItem(items[0]);
                break;
            case 'End':
                this.focusItem(items[items.length - 1]);
                break;
            case 'ArrowRight':
                if (isOpen) {
                    this.focusItem(this.childrenOf(item).find((child) => items.includes(child)));
                } else if (isBranch) {
                    this.setOpen(item, true);
                }
                break;
            case 'ArrowLeft':
                if (isOpen) {
                    this.setOpen(item, false);
                } else {
                    this.focusItem(this.parentOf(item));
                }
                break;
            case 'Enter':
            case ' ':
                if (isBranch) {
                    this.setOpen(item, !isOpen);
                } else if ('Enter' === event.key) {
                    return; // the link's own activation
                } else {
                    item.click();
                }
                break;
            default:
                if (!isLetter) {
                    return;
                }
                this.typeAhead(item, items, event.key);
        }
        event.preventDefault();
    }

    toggleFromClick(event) {
        const row = event.target.closest('[data-side-nav-toggle]');
        const branch = row?.parentElement;
        if (branch && this.branchTargets.includes(branch)) {
            this.setOpen(branch, 'true' !== branch.getAttribute('aria-expanded'));
            branch.focus();
        }
    }

    remember(event) {
        if (this.treeitems().includes(event.target)) {
            this.setTabStop(event.target);
        }
    }

    setOpen(branch, open, { save = true } = {}) {
        branch.setAttribute('aria-expanded', String(open));
        if (!open && branch.contains(document.activeElement) && branch !== document.activeElement) {
            branch.focus();
        }
        if (!open && this.treeitems().some((item) => '0' === item.getAttribute('tabindex') && branch !== item && branch.contains(item))) {
            this.setTabStop(branch);
        }
        if (save) {
            this.save();
        }
    }

    openAncestors(item) {
        let changed = false;
        for (let branch = this.parentOf(item); branch; branch = this.parentOf(branch)) {
            if ('true' !== branch.getAttribute('aria-expanded')) {
                this.setOpen(branch, true, { save: false });
                changed = true;
            }
        }
        if (changed) {
            this.save();
        }
    }

    focusItem(item) {
        if (item) {
            this.setTabStop(item);
            item.focus();
        }
    }

    setTabStop(stop) {
        this.treeitems().forEach((item) => item.setAttribute('tabindex', item === stop ? '0' : '-1'));
    }

    typeAhead(item, items, key) {
        clearTimeout(this.typeTimer);
        this.typed += key.toLowerCase();
        this.typeTimer = setTimeout(() => (this.typed = ''), 500);
        // the same letter typed again moves on to the next match; several letters refine the current one
        const repeated = [...this.typed].every((letter) => letter === this.typed[0]);
        const search = repeated ? this.typed[0] : this.typed;
        const start = items.indexOf(item) + (repeated ? 1 : 0);
        const ordered = [...items.slice(start), ...items.slice(0, start)];
        this.focusItem(ordered.find((candidate) => this.labelOf(candidate).startsWith(search)));
    }

    /** Every treeitem of this tree, in document order (a nested tree's own are left out). */
    treeitems() {
        return [...this.element.querySelectorAll('[role="treeitem"]')].filter((item) => item.closest('[role="tree"]') === this.element);
    }

    /** The treeitems shown: inside open branches only, and on screen when the tree itself is (a collapsed `Sidebar` hides nested ones). */
    visibleItems() {
        const inOpenBranches = this.treeitems().filter((item) => {
            for (let branch = this.parentOf(item); branch; branch = this.parentOf(branch)) {
                if ('true' !== branch.getAttribute('aria-expanded')) {
                    return false;
                }
            }
            return true;
        });
        if (0 === this.element.getClientRects().length) {
            return inOpenBranches;
        }
        return inOpenBranches.filter((item) => item.getClientRects().length > 0);
    }

    parentOf(item) {
        const branch = item.parentElement.closest('[role="treeitem"]');
        return branch && this.element.contains(branch) ? branch : null;
    }

    childrenOf(branch) {
        return this.treeitems().filter((item) => this.parentOf(item) === branch);
    }

    labelOf(item) {
        return (item.getAttribute('aria-label') ?? item.textContent).trim().toLowerCase();
    }

    /** A branch's place in the tree, from the names of the branches around it: a path stays the same on every page. */
    pathOf(branch) {
        const names = [];
        for (let current = branch; current; current = this.parentOf(current)) {
            names.unshift(current.dataset.sideNavName ?? '');
        }
        return JSON.stringify(names);
    }

    restore() {
        const saved = this.readState();
        this.branchTargets.forEach((branch) => {
            const open = saved[this.pathOf(branch)];
            if ('boolean' === typeof open) {
                branch.setAttribute('aria-expanded', String(open));
            }
        });
    }

    save() {
        if (!this.storageKeyValue) {
            return;
        }
        const state = this.readState();
        this.branchTargets.forEach((branch) => (state[this.pathOf(branch)] = 'true' === branch.getAttribute('aria-expanded')));
        try {
            sessionStorage.setItem(this.storageKeyValue, JSON.stringify(state));
        } catch {
            // storage unavailable: the state lasts as long as the page
        }
    }

    readState() {
        if (!this.storageKeyValue) {
            return {};
        }
        try {
            const state = JSON.parse(sessionStorage.getItem(this.storageKeyValue) ?? '{}');
            return state && 'object' === typeof state && !Array.isArray(state) ? state : {};
        } catch {
            return {};
        }
    }

    markCurrentItem() {
        if (this.itemTargets.some((item) => item.hasAttribute('data-side-nav-active-fixed'))) {
            return;
        }
        const path = window.location.pathname;
        this.itemTargets.forEach((item) => {
            // a link to a fragment of the page ("#", what SideNav:Item renders for a rejected URL) is not a page
            const isFragment = (item.getAttribute('href') ?? '').trim().startsWith('#');
            const isCurrent = !isFragment && new URL(item.href, window.location.href).pathname === path;
            isCurrent ? item.setAttribute('aria-current', 'page') : item.removeAttribute('aria-current');
        });
    }
}
