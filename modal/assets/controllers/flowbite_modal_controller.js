import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    static targets = ['trigger', 'modal'];

    static values = {
        open: Boolean,
    };

    #wasOpen = null;

    connect() {
        // a copy of the page Turbo cached while the dialog was open keeps its `open` attribute but not its
        // modality: a new controller closes it, then opens it as a modal if it should be open
        if (null === this.#wasOpen && this.modalTarget.open && !this.modalTarget.matches(':modal')) {
            this.close();
        }
        if (this.#wasOpen ?? this.openValue) {
            this.open();
        }
    }

    disconnect() {
        // A <dialog> taken out of the DOM comes back open but no longer modal, so reopen it on reconnect.
        this.#wasOpen = this.modalTarget.open;
        if (this.#wasOpen) {
            this.modalTarget.close();
        }
    }

    open() {
        this.modalTarget.showModal();

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
}
