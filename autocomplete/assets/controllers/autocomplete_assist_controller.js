import { Controller } from '@hotwired/stimulus';

/**
 * Works next to Symfony UX Autocomplete's controller (`symfony--ux-autocomplete--autocomplete`) on the same `<select>`,
 * which it never changes.
 *
 * A reset of the select's form (a reset button, `form.reset()`, or the `form-reset` controller of the `layouts` recipe
 * after Back to a GET form) puts back the options the server selected, but Tom Select keeps showing its own copy of the
 * choice: once the reset is done, Tom Select is synced from the `<select>`, silently (no `input` or `change` event, so
 * no Live Component request), as a native field takes back its default with no event. The form is the select's own
 * (`select.form`), which honours the `form` attribute. The `reset` event comes before the fields are reset, and any
 * listener can cancel it: the sync waits until the event is over (a task later), and is skipped when it was cancelled.
 * The Tom Select synced is the one on the select then (`select.tomselect`): UX Autocomplete builds a new one when the
 * options change. A second sync of an unchanged select (the `form-reset` controller syncs too) changes nothing.
 */
export default class extends Controller {
    #form = null;
    // the syncs waiting for their reset event to be over
    #timeouts = new Set();

    connect() {
        this.#form = this.element.form ?? null;
        this.#form?.addEventListener('reset', this.#formReset);
    }

    disconnect() {
        this.#form?.removeEventListener('reset', this.#formReset);
        this.#form = null;
        for (const timeout of this.#timeouts) {
            clearTimeout(timeout);
        }
        this.#timeouts.clear();
    }

    // a click on a reset button checks for microtasks between listeners, so a task is the first point after all of them
    #formReset = (event) => {
        const timeout = setTimeout(() => {
            this.#timeouts.delete(timeout);
            if (!event.defaultPrevented) {
                // silent: Tom Select sets its items from the selected options and dispatches nothing
                this.element.tomselect?.sync();
            }
        });
        this.#timeouts.add(timeout);
    };
}
