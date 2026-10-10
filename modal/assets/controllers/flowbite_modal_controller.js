import { Controller } from '@hotwired/stimulus';

/**
 * Whether the current `turbo:before-cache` comes from a frame visit promoted to history: Turbo keeps the page on
 * screen and caches the copy it took when the frame visit started, so a reset now only changes what the user sees.
 * Turbo 8 runs that visit with `willRender: false`, a full visit or a restoration with `true`; without Turbo, false.
 * The same helper as in the popover controller: the kit copies it into each controller that needs it.
 */
function isPromotedFrameCache() {
    return false === window.Turbo?.session?.navigator?.currentVisit?.willRender;
}

/**
 * The dialogs a controller showed as modals (dropped when it closes them). A morph moves an open dialog into a new container:
 * with `moveBefore` it stays modal, without it (WebKit) it leaves the top layer, open but no longer modal. A dialog
 * found here is that same element, to show as a modal again; Turbo's copy of a page holds clones, never found here.
 */
const shownAsModal = new WeakSet();

export default class extends Controller {
    static targets = ['trigger', 'modal'];

    static values = {
        open: Boolean,
    };

    #wasOpen = null;

    connect() {
        const demoted = this.modalTarget.open && !this.modalTarget.matches(':modal');
        // moved by a morph without `moveBefore` (WebKit) while open: shown as a modal again
        const moved = demoted && shownAsModal.has(this.modalTarget);
        // a copy of the page Turbo cached while the dialog was open keeps its `open` attribute but not its
        // modality: a new controller closes it, then opens it as a modal if it should be open
        if (null === this.#wasOpen && demoted) {
            this.close();
        }
        if (this.#wasOpen ?? (this.openValue || moved)) {
            this.open();
        } else if (this.modalTarget.matches(':modal')) {
            // a dialog already open and modal: a Live re-render that replaced the container moved it in, and the
            // trigger rendered with it says it is open
            this.#markOpen();
        }
        document.addEventListener('turbo:before-cache', this.#closeBeforeCache);
    }

    disconnect() {
        document.removeEventListener('turbo:before-cache', this.#closeBeforeCache);
        // A <dialog> taken out of the DOM comes back open but no longer modal, so reopen it on reconnect. A Live
        // re-render that replaces the container may have moved the dialog to a new controller already: nothing to close.
        this.#wasOpen = this.hasModalTarget && this.modalTarget.open;
        if (this.#wasOpen) {
            this.#closeNow();
        }
    }

    open() {
        this.modalTarget.showModal();
        shownAsModal.add(this.modalTarget);

        if (this.hasTriggerTarget) {
            if (this.modalTarget.getAnimations().length > 0) {
                this.modalTarget.addEventListener(
                    'transitionend',
                    () => {
                        this.triggerTarget.setAttribute('aria-expanded', 'true');
                        this.modalTarget.setAttribute('aria-hidden', 'false');
                    },
                    { once: true }
                );
            } else {
                this.triggerTarget.setAttribute('aria-expanded', 'true');
                this.modalTarget.setAttribute('aria-hidden', 'false');
            }
        }
    }

    closeOnClickOutside({ target }) {
        if (target === this.modalTarget) {
            this.close();
        }
    }

    close() {
        this.modalTarget.close();
        shownAsModal.delete(this.modalTarget);

        if (this.hasTriggerTarget) {
            if (this.modalTarget.getAnimations().length > 0) {
                this.modalTarget.addEventListener(
                    'transitionend',
                    () => {
                        this.triggerTarget.setAttribute('aria-expanded', 'false');
                        this.modalTarget.setAttribute('aria-hidden', 'true');
                    },
                    { once: true }
                );
            } else {
                this.triggerTarget.setAttribute('aria-expanded', 'false');
                this.modalTarget.setAttribute('aria-hidden', 'true');
            }
        }
    }

    // Closes the modal before Turbo caches the page, so the copy shown on Back and Forward has it closed and its
    // trigger collapsed. A data-turbo-permanent modal is not in that copy: Turbo moves the live one in. A frame visit
    // promoted to history keeps the page on screen and took its copy when it started (closed as it connects): the
    // modal stays open.
    #closeBeforeCache = () => {
        if (this.modalTarget.open && !this.element.closest('[data-turbo-permanent]') && !isPromotedFrameCache()) {
            this.#closeNow();
        }
    };

    #markOpen() {
        if (this.hasTriggerTarget) {
            this.triggerTarget.setAttribute('aria-expanded', 'true');
        }
        this.modalTarget.setAttribute('aria-hidden', 'false');
    }

    // Closes the modal and updates the attributes at once, without waiting for a transition: Turbo copies the page
    // before it ends.
    #closeNow() {
        this.modalTarget.close();
        shownAsModal.delete(this.modalTarget);
        if (this.hasTriggerTarget) {
            this.triggerTarget.setAttribute('aria-expanded', 'false');
        }
        this.modalTarget.setAttribute('aria-hidden', 'true');
    }
}
