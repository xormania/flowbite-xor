import { Controller } from '@hotwired/stimulus';

/**
 * Whether the current `turbo:before-cache` comes from a frame visit promoted to history: Turbo keeps the page on
 * screen and caches the copy it took when the frame visit started, so a reset now only changes what the user sees.
 * Turbo 8 runs that visit with `willRender: false`, a full visit or a restoration with `true`; without Turbo, false.
 * Copy it into a controller that needs it, as `position()` is.
 */
function isPromotedFrameCache() {
    return false === window.Turbo?.session?.navigator?.currentVisit?.willRender;
}

/**
 * Opens a `Dropdown` menu on click or hover, places it next to its trigger and handles the keyboard.
 *
 * It replaces Flowbite's `Dropdown` (and its Popper dependency) with the same behavior: the content
 * toggles `hidden`/`block` and `aria-hidden`, closes on a click outside, follows its trigger on scroll
 * and resize while open, flips to the opposite side when it does not fit, and is shifted back into the
 * viewport along the trigger. Every listener is removed when it closes or disconnects. The menu closes before Turbo
 * caches the page, and a new controller starts closed: a copy of the page Turbo cached while it was open (Back) shows
 * it closed, not open and inert. Inside a `data-turbo-permanent` element it stays open: Turbo moves it into the next
 * page, and the same controller reconnecting (its element moved in the DOM) opens it again as it was. A frame visit promoted to history (`data-turbo-action="advance"`) dispatches
 * `turbo:before-cache` too, but keeps the page on screen and caches a copy taken when it started: the menu then stays
 * open, and the copy is closed as it connects.
 *
 * @target trigger        The button opening the menu.
 * @target content        The menu, positioned next to the trigger.
 * @value  placement      Where the menu opens: `top`, `bottom`, `left`, `right`, optionally with `-start` or `-end`.
 * @value  triggerType    What opens the menu: `click` or `hover`.
 * @value  open           Whether the menu is open when the controller connects.
 * @value  delay          The delay before a hover opens or closes the menu, in milliseconds.
 * @value  offsetDistance The gap between the trigger and the menu, in pixels.
 */
export default class extends Controller {
    #reopen = false;

    static targets = ['trigger', 'content'];
    static values = {
        placement: { type: String, default: 'bottom' },
        triggerType: { type: String, default: 'click' },
        open: Boolean,
        delay: { type: Number, default: 300 },
        offsetDistance: { type: Number, default: 10 },
    };

    connect() {
        // open when this controller last disconnected: its element moved in the DOM (Turbo moving a permanent element)
        const reopen = this.#reopen;
        this.#reopen = false;
        this.visible = false;
        this.#closeMarkup();
        this.timeouts = new Set();
        this.listeners = [];

        const on = (target, type, handler, options) => {
            target.addEventListener(type, handler, options);
            this.listeners.push(() => target.removeEventListener(type, handler, options));
        };

        if ('hover' === this.triggerTypeValue) {
            on(this.triggerTarget, 'click', () => this.toggle());
            on(this.triggerTarget, 'mouseenter', () => this.later(() => this.show()));
            on(this.contentTarget, 'mouseenter', () => this.show());
            const hideUnlessHovered = () => this.later(() => this.contentTarget.matches(':hover') || this.hide());
            on(this.triggerTarget, 'mouseleave', hideUnlessHovered);
            on(this.contentTarget, 'mouseleave', hideUnlessHovered);
        } else if ('none' !== this.triggerTypeValue) {
            on(this.triggerTarget, 'click', () => this.toggle());
        }
        on(this.triggerTarget, 'keydown', (event) => this.handleTriggerKeydown(event));
        on(this.contentTarget, 'keydown', (event) => this.handleContentKeydown(event));
        // closed in the copy of the page Turbo shows on Back and Forward, not only once that copy connects; a frame
        // visit promoted to history took its copy already and keeps the page on screen, so the menu stays open; Turbo
        // moves a permanent element into the next page, the menu as the user left it
        on(document, 'turbo:before-cache', () => isPromotedFrameCache() || this.element.closest('[data-turbo-permanent]') || this.hide());

        if (this.openValue || reopen) {
            this.show();
        }
    }

    disconnect() {
        this.#reopen = this.visible;
        this.hide({ restoreFocus: false, silent: true });
        this.listeners.forEach((remove) => remove());
        this.timeouts.forEach((id) => clearTimeout(id));
    }

    later(callback) {
        const id = setTimeout(() => {
            this.timeouts.delete(id);
            callback();
        }, this.delayValue);
        this.timeouts.add(id);
    }

    toggle() {
        this.visible ? this.hide({ restoreFocus: false }) : this.show();
    }

    show() {
        if (this.visible) {
            return;
        }
        this.visible = true;
        this.contentTarget.classList.remove('hidden');
        this.contentTarget.classList.add('block');
        this.contentTarget.removeAttribute('aria-hidden');
        this.triggerTarget.setAttribute('aria-expanded', 'true');

        this.onClickOutside = (event) => {
            if (!this.contentTarget.contains(event.target) && !this.triggerTarget.contains(event.target)) {
                this.hide({ restoreFocus: false });
            }
        };
        this.onReposition = () => this.position();
        document.addEventListener('click', this.onClickOutside, true);
        window.addEventListener('scroll', this.onReposition, true);
        window.addEventListener('resize', this.onReposition);

        this.position();
    }

    hide({ restoreFocus = false, silent = false } = {}) {
        if (!this.visible && !silent) {
            return;
        }
        this.visible = false;
        document.removeEventListener('click', this.onClickOutside, true);
        window.removeEventListener('scroll', this.onReposition, true);
        window.removeEventListener('resize', this.onReposition);
        if (silent) {
            return;
        }
        this.#closeMarkup();
        if (restoreFocus) {
            this.triggerTarget.focus();
        }
    }

    /**
     * Places the content like Popper does for Flowbite (absolute, `translate(x, y)`, offset, flip,
     * shift along the trigger within the viewport), so menus land on the same pixels.
     */
    position() {
        const content = this.contentTarget;
        // absolute first: the size to place is the menu's own (w-fit), not the width it takes in flow
        Object.assign(content.style, { position: 'absolute', inset: '0px auto auto 0px', margin: '0px' });
        const [side, align = 'center'] = (this.placementValue || 'bottom').split('-');
        const reference = this.triggerTarget.getBoundingClientRect();
        const size = { width: content.offsetWidth, height: content.offsetHeight };
        const viewport = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
        const vertical = 'top' === side || 'bottom' === side;
        const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

        const place = (s) => {
            const point = { x: 0, y: 0 };
            if (vertical) {
                point.y = 'bottom' === s ? reference.bottom + this.offsetDistanceValue : reference.top - size.height - this.offsetDistanceValue;
                point.x = 'start' === align ? reference.left : 'end' === align ? reference.right - size.width : reference.left + reference.width / 2 - size.width / 2;
            } else {
                point.x = 'right' === s ? reference.right + this.offsetDistanceValue : reference.left - size.width - this.offsetDistanceValue;
                point.y = 'start' === align ? reference.top : 'end' === align ? reference.bottom - size.height : reference.top + reference.height / 2 - size.height / 2;
            }
            return point;
        };
        const overflows = (s, point) =>
            ({ top: -point.y, bottom: point.y + size.height - viewport.height, left: -point.x, right: point.x + size.width - viewport.width })[s] > 0;

        let finalSide = side;
        let point = place(side);
        if (overflows(side, point) && !overflows(opposite[side], place(opposite[side]))) {
            finalSide = opposite[side];
            point = place(finalSide);
        }

        // shift along the trigger to stay in the viewport, without leaving the trigger
        const axis = vertical ? 'x' : 'y';
        const length = vertical ? size.width : size.height;
        const [refStart, refEnd] = vertical ? [reference.left, reference.right] : [reference.top, reference.bottom];
        const limit = vertical ? viewport.width : viewport.height;
        point[axis] = Math.min(Math.max(point[axis], 0), limit - length);
        point[axis] = Math.min(Math.max(point[axis], refStart - length), refEnd);

        // viewport coordinates -> coordinates of the content's containing block
        const parent = content.offsetParent;
        let origin = { x: -window.scrollX, y: -window.scrollY };
        if (parent && parent !== document.body && parent !== document.documentElement) {
            const rect = parent.getBoundingClientRect();
            origin = { x: rect.left + parent.clientLeft - parent.scrollLeft, y: rect.top + parent.clientTop - parent.scrollTop };
        }
        const dpr = window.devicePixelRatio || 1;
        const round = (value) => Math.round(value * dpr) / dpr || 0;

        content.style.transform = `translate(${round(point.x - origin.x)}px, ${round(point.y - origin.y)}px)`;
        content.dataset.popperPlacement = 'center' === align ? finalSide : `${finalSide}-${align}`;
    }

    getMenuItems() {
        // menu items of this level only, not those of nested submenus
        return [...this.contentTarget.querySelectorAll('[role="menuitem"]')].filter(
            (item) => item.closest('[data-dropdown-target="content"]') === this.contentTarget
        );
    }

    focusItem(index) {
        const items = this.getMenuItems();
        if (0 === items.length) {
            return;
        }
        items[((index % items.length) + items.length) % items.length].focus();
    }

    open(focusIndex) {
        this.show();
        requestAnimationFrame(() => this.focusItem(focusIndex));
    }

    handleTriggerKeydown(event) {
        // a SubTrigger is a menu item of its parent menu, which handles its arrow keys
        const isSubTrigger = 'menuitem' === this.triggerTarget.getAttribute('role');

        switch (event.key) {
            case 'ArrowDown':
            case 'ArrowUp':
                if (!isSubTrigger && !this.visible) {
                    event.preventDefault();
                    this.open('ArrowDown' === event.key ? 0 : -1);
                }
                break;
            case 'Enter':
            case ' ':
                if (!this.visible) {
                    event.preventDefault();
                    this.open(0);
                }
                break;
            case 'Escape':
                if (this.visible) {
                    event.preventDefault();
                    this.hide({ restoreFocus: true });
                }
                break;
        }
    }

    handleContentKeydown(event) {
        const items = this.getMenuItems();
        const current = items.indexOf(document.activeElement);
        if (-1 === current) {
            return;
        }
        // keep parent menus from handling the same key
        event.stopPropagation();

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.focusItem(current + 1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.focusItem(current - 1);
                break;
            case 'Home':
                event.preventDefault();
                this.focusItem(0);
                break;
            case 'End':
                event.preventDefault();
                this.focusItem(-1);
                break;
            case 'Escape':
                event.preventDefault();
                this.hide({ restoreFocus: true });
                break;
            case 'Tab':
                this.hide({ restoreFocus: true });
                break;
            case 'ArrowRight':
                if ('menu' === document.activeElement.getAttribute('aria-haspopup')) {
                    event.preventDefault();
                    document.activeElement.click();
                    requestAnimationFrame(() => {
                        document.activeElement
                            ?.closest('[data-controller="dropdown"]')
                            ?.querySelector('[data-dropdown-target="content"] [role="menuitem"]')
                            ?.focus();
                    });
                }
                break;
            case 'ArrowLeft': {
                const parentMenu = this.element.closest('li[role="none"]')?.closest('[data-controller="dropdown"]');
                if (parentMenu && parentMenu !== this.element) {
                    event.preventDefault();
                    this.hide({ restoreFocus: true });
                }
                break;
            }
        }
    }

    #closeMarkup() {
        this.contentTarget.classList.remove('block');
        this.contentTarget.classList.add('hidden');
        this.contentTarget.setAttribute('aria-hidden', 'true');
        this.triggerTarget.setAttribute('aria-expanded', 'false');
    }
}
