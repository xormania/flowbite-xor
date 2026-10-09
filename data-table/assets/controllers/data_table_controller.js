import { Controller } from '@hotwired/stimulus';

/**
 * Keeps a `DataTable`'s search form showing the state of the URL on screen. When the form connects, it resets its
 * fields to the values the server rendered (`form.reset()` restores each field's `value` and `selected` attributes).
 *
 * A fresh form already shows them; a copy Turbo restores on Back or Forward may not. Turbo copies the page as it is
 * when it caches it, edited fields included, and a frame visit promoted to history takes its copy once the form is
 * submitted, edits made: without the reset, Back would show the next state's search at the earlier URL. The form is
 * left alone while the focus is inside it, so text typed before the page's scripts ran is kept.
 *
 * `connect()` sets nothing up, so `disconnect()` has nothing to undo.
 */
export default class extends Controller {
    connect() {
        if (!this.element.contains(document.activeElement)) {
            // through the prototype: a field named `reset` (a kept URL parameter) shadows the form's method
            HTMLFormElement.prototype.reset.call(this.element);
        }
    }
}
