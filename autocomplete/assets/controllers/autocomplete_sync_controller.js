import { Controller } from '@hotwired/stimulus';

/**
 * Keeps what Tom Select shows (UX Autocomplete's controller, on the same `<select>`) in step with the choice of the
 * `<select>` when that choice changes without Tom Select:
 *
 * - A Live Component's re-render copies the server's options, the chosen one marked `selected`, into the select (UX
 *   Autocomplete marks it `data-skip-morph`), and UX Autocomplete sets Tom Select up again only when the options
 *   themselves change. The select then holds the value the server set, and Tom Select would still show the one before.
 *   When the two differ after such a change, Tom Select reads the select again (`sync()`).
 * - A reset of the select's form (a reset button, `form.reset()`, or the `form-reset` controller of the `layouts`
 *   recipe after Back to a GET form) puts back the options the server selected, which Tom Select does not see. The
 *   form is the select's own (`select.form`), which honours the `form` attribute. The `reset` event comes before the
 *   fields are reset, and any listener can cancel it: Tom Select is synced once the event is over (a task later, a
 *   click on a reset button running microtasks between listeners), only when nothing cancelled it, and silently (no
 *   `input` or `change` event, so no Live Component request), as a native field takes back its default. The Tom Select
 *   synced is the one on the select then (`select.tomselect`): UX Autocomplete builds a new one when the options
 *   change. Either way Tom Select is synced only when it shows other values than the select holds, so the reset the
 *   `form-reset` controller has already synced is not synced again.
 */
export default class extends Controller {
    #observer = null;
    #form = null;
    // the syncs waiting for their reset event to be over
    #resetTimeouts = new Set();

    connect() {
        this.#observer = new MutationObserver(() => this.#sync());
        this.#observer.observe(this.element, { childList: true });
        this.#form = this.element.form ?? null;
        this.#form?.addEventListener('reset', this.#formReset);
    }

    disconnect() {
        this.#observer?.disconnect();
        this.#observer = null;
        this.#form?.removeEventListener('reset', this.#formReset);
        this.#form = null;
        for (const timeout of this.#resetTimeouts) {
            clearTimeout(timeout);
        }
        this.#resetTimeouts.clear();
    }

    #sync() {
        const tomSelect = this.element.tomselect;
        if (!tomSelect) {
            return;
        }
        const chosen = [...this.element.selectedOptions].map((option) => option.value).filter((value) => '' !== value).sort();
        const shown = [tomSelect.getValue()].flat().filter((value) => '' !== value).sort();
        if (chosen.length !== shown.length || chosen.some((value, index) => value !== shown[index])) {
            // silent: Tom Select sets its items from the selected options and dispatches nothing
            tomSelect.sync();
        }
    }

    #formReset = (event) => {
        const timeout = setTimeout(() => {
            this.#resetTimeouts.delete(timeout);
            if (!event.defaultPrevented) {
                this.#sync();
            }
        });
        this.#resetTimeouts.add(timeout);
    };
}
