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
 * Opens a `Popover`, a non-modal dialog anchored to its trigger: a click on the trigger toggles it,
 * Escape closes it and returns the focus to the trigger, and a click outside or the focus leaving it
 * closes it. Opening moves the focus into the content, places the content next to the trigger (flipping
 * and shifting like `Dropdown`) and keeps it there on scroll and resize. Popovers sharing a `name` close
 * each other. The open state is the `open` value, an attribute, so Live Components keep it across
 * re-renders. Before Turbo caches the page, an open popover closes, so Back never restores it open. A
 * frame visit promoted to history (`data-turbo-action="advance"`, a data table's pages) dispatches
 * `turbo:before-cache` too, but keeps the page on screen and caches a copy taken when it started: the
 * popover then stays open, with the focus, and the copy is closed as it connects (while the browser has
 * it open, the element carries `data-popover-opened`).
 * The document listeners exist only while it is open, and are removed when it closes or disconnects.
 * Before moving the focus, it dispatches a cancelable `popover:focus` on its element (detail: `content`):
 * cancel it to place the focus yourself; the popover stays open.
 *
 * @target trigger        The button opening the popover.
 * @target content        The dialog, positioned next to the trigger.
 * @value  open           Whether the popover is open.
 * @value  name           A group name: opening a popover closes the open ones of the same group.
 * @value  placement      Where the content opens: `top`, `bottom`, `left`, `right`, optionally with `-start` or `-end`.
 * @value  offsetDistance The gap between the trigger and the content, in pixels.
 * @action toggle         Opens the popover, or closes it.
 * @action show           Opens the popover.
 * @action close          Closes the popover without moving the focus.
 * @action closeIfGrouped Closes the popover when another popover of its group opens.
 * @action escape         Closes the popover and focuses the trigger.
 * @action closeOnFocusOut Closes the popover when the focus moves to an element outside it.
 * @action closeSilently  Closes the popover without moving the focus or dispatching events; on `turbo:before-cache`, only when the page is about to be replaced.
 */
export default class extends Controller {
    static targets = ['trigger', 'content'];
    static values = {
        open: Boolean,
        name: String,
        placement: { type: String, default: 'bottom' },
        offsetDistance: { type: Number, default: 8 },
    };

    #connected = false;
    #listening = false;

    connect() {
        this.#connected = true;
        // opened by the browser before this connect: a cached copy of the page (or the element moved), shown closed
        if (this.element.hasAttribute('data-popover-opened')) {
            this.element.removeAttribute('data-popover-opened');
            this.openValue = false;
        }
        this.#render();
    }

    disconnect() {
        this.#connected = false;
        this.#unlisten();
    }

    openValueChanged(open, previous) {
        if (!this.#connected) {
            return;
        }
        this.#render();
        // the first call (on connect) only renders: a popover open on render takes no focus and closes no other
        if (!open || undefined === previous) {
            return;
        }
        this.element.setAttribute('data-popover-opened', '');
        if (this.nameValue) {
            window.dispatchEvent(new CustomEvent('popover:open', { detail: { name: this.nameValue, source: this.element } }));
        }
        const content = this.contentTarget;
        // `popover:focus`, cancelable: a controller placing the focus itself (a date picker on its day) cancels it
        if (this.dispatch('focus', { detail: { content }, cancelable: true }).defaultPrevented) {
            return;
        }
        // the first control actually rendered: a hidden one (or one in a hidden part) cannot take the focus
        const first = (selector) => [...content.querySelectorAll(selector)].find((element) => element.getClientRects().length > 0);
        const focusable =
            first('[autofocus]:not([disabled])') ??
            first('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
        (focusable ?? content).focus();
    }

    toggle(event) {
        event?.preventDefault();
        this.openValue = !this.openValue;
    }

    show() {
        this.openValue = true;
    }

    close() {
        this.openValue = false;
    }

    closeIfGrouped(event) {
        if (this.openValue && this.nameValue && event.detail?.name === this.nameValue && event.detail.source !== this.element) {
            this.openValue = false;
        }
    }

    escape(event) {
        if (!this.openValue) {
            return;
        }
        event.preventDefault();
        // an Escape inside a nested popover closes that one only
        event.stopPropagation();
        this.openValue = false;
        this.hasTriggerTarget && this.triggerTarget.focus();
    }

    closeOnFocusOut(event) {
        // no related target: the window lost the focus, or a click on nothing focusable (the outside click handles it)
        if (this.openValue && event.relatedTarget && !this.element.contains(event.relatedTarget)) {
            this.openValue = false;
        }
    }

    closeSilently(event) {
        if ('turbo:before-cache' === event?.type && isPromotedFrameCache()) {
            return;
        }
        this.openValue = false;
    }

    #render() {
        const open = this.openValue;
        const state = open ? 'open' : 'closed';
        this.element.dataset.state = state;
        for (const trigger of this.triggerTargets) {
            trigger.setAttribute('aria-expanded', String(open));
        }
        if (!this.hasContentTarget) {
            return;
        }
        const content = this.contentTarget;
        content.dataset.state = state;
        content.hidden = !open;
        if (open) {
            this.#listen();
            this.position();
        } else {
            this.element.removeAttribute('data-popover-opened');
            this.#unlisten();
        }
    }

    #listen() {
        if (this.#listening) {
            return;
        }
        this.#listening = true;
        this.onClickOutside = (event) => {
            if (!this.element.contains(event.target)) {
                this.openValue = false;
            }
        };
        this.onReposition = () => this.position();
        document.addEventListener('click', this.onClickOutside, true);
        window.addEventListener('scroll', this.onReposition, true);
        window.addEventListener('resize', this.onReposition);
    }

    #unlisten() {
        if (!this.#listening) {
            return;
        }
        this.#listening = false;
        document.removeEventListener('click', this.onClickOutside, true);
        window.removeEventListener('scroll', this.onReposition, true);
        window.removeEventListener('resize', this.onReposition);
    }

    /**
     * Copied from `dropdown_controller.js` (`position()`), with `data-placement` for the final side:
     * absolute, `translate(x, y)`, offset, flip, shift along the trigger within the viewport.
     */
    position() {
        if (!this.hasTriggerTarget || !this.hasContentTarget) {
            return;
        }
        const content = this.contentTarget;
        // absolute first: the size to place is the content's own, not the width it takes in flow
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
        content.dataset.placement = 'center' === align ? finalSide : `${finalSide}-${align}`;
    }
}
