import { Controller } from '@hotwired/stimulus';

/**
 * Keeps what Tom Select shows (UX Autocomplete's controller, on the same `<select>`) in step with the choice of the
 * `<select>` when its options are replaced without Tom Select: a Live Component's re-render copies the server's
 * options, the chosen one marked `selected`, into the select (UX Autocomplete marks it `data-skip-morph`), and UX
 * Autocomplete sets Tom Select up again only when the options themselves change. The select then holds the value the
 * server set, and Tom Select would still show the one before. When the two differ after such a change, Tom Select
 * reads the select again (`sync()`).
 */
export default class extends Controller {
    #observer = null;

    connect() {
        this.#observer = new MutationObserver(() => this.#sync());
        this.#observer.observe(this.element, { childList: true });
    }

    disconnect() {
        this.#observer?.disconnect();
        this.#observer = null;
    }

    #sync() {
        const tomSelect = this.element.tomselect;
        if (!tomSelect) {
            return;
        }
        const chosen = [...this.element.selectedOptions].map((option) => option.value).filter((value) => '' !== value).sort();
        const shown = [tomSelect.getValue()].flat().filter((value) => '' !== value).sort();
        if (chosen.length !== shown.length || chosen.some((value, index) => value !== shown[index])) {
            tomSelect.sync();
        }
    }
}
