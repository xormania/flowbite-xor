import { Controller } from '@hotwired/stimulus';

/**
 * Lab only: a controller of the page passed to a `Dropzone`; it prints each UX Dropzone event it receives, with its
 * prefix value and the name of its input target, in the `<output>` for that input.
 */
export default class extends Controller {
    static targets = ['input'];
    static values = { prefix: String };

    show(event) {
        const output = document.querySelector(`output[for="${this.inputTarget.id}"]`);
        output.textContent = `${this.prefixValue} ${event.type} ${this.inputTarget.name} ${this.inputTarget.files.length}`;
    }
}
