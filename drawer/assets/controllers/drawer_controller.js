import { Controller } from '@hotwired/stimulus';

/**
 * Opens a `Drawer`, a native `<dialog>` docked to a side of the viewport: modal by default (the page is
 * inert, focus is trapped, Escape or a click on the backdrop closes it) or beside the page.
 * Like the `Modal`, a drawer open when its element is moved in the DOM (Turbo, Live re-renders) is
 * reopened on reconnect, and a closed one stays closed.
 *
 * @target trigger             The elements opening the drawer, kept in sync through `aria-expanded`.
 * @target dialog              The `<dialog>` element.
 * @value  open                Whether the drawer is open when the controller connects.
 * @value  modal               Whether the drawer opens as a modal dialog.
 * @action open                Opens the drawer.
 * @action close               Closes the drawer.
 * @action closeOnClickOutside Closes the drawer when its backdrop is clicked.
 * @action closed              Syncs the triggers once the dialog has closed.
 */
export default class extends Controller {
    static targets = ['trigger', 'dialog'];
    static values = { open: Boolean, modal: { type: Boolean, default: true } };

    #wasOpen = null;

    connect() {
        if (this.#wasOpen ?? this.openValue) {
            this.open();
        }
    }

    disconnect() {
        // a <dialog> taken out of the DOM loses its modality: close it now, reopen it on reconnect
        this.#wasOpen = this.dialogTarget.open;
        if (this.#wasOpen) {
            this.dialogTarget.close();
        }
    }

    open() {
        if (!this.dialogTarget.open) {
            this.modalValue ? this.dialogTarget.showModal() : this.dialogTarget.show();
        }
        this.triggerTargets.forEach((trigger) => trigger.setAttribute('aria-expanded', 'true'));
    }

    close() {
        this.dialogTarget.close();
    }

    closeOnClickOutside({ target }) {
        if (target === this.dialogTarget) {
            this.close();
        }
    }

    closed() {
        this.triggerTargets.forEach((trigger) => trigger.setAttribute('aria-expanded', 'false'));
    }
}
