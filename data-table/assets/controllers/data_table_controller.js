import { Controller } from '@hotwired/stimulus';

/**
 * Whether `turbo:before-cache` comes from a frame visit promoted to history, which keeps the page on screen and caches
 * a copy taken earlier (Turbo 8: its visit renders nothing). Copied from `popover_controller.js`.
 */
function isPromotedFrameCache() {
    return false === window.Turbo?.session?.navigator?.currentVisit?.willRender;
}

/**
 * Keeps a `DataTable`'s Turbo Frame and the URL on screen in agreement after Back and Forward, even when they are
 * pressed while a change of the table is still loading: the change is then dropped, never shown at the wrong URL.
 *
 * - The search form is a GET form: after Back and Forward, the `form-reset` controller on `<body>` (the `layouts`
 *   recipe) resets its fields to the values the server rendered. A copy Turbo restores keeps the fields as the user
 *   left them, and a frame visit promoted to history takes its copy once the form is submitted, edits made.
 * - Before Turbo caches the page it leaves, a change still loading is cancelled: the form's submission (Turbo 8 lets
 *   its response push its URL over the page Back restored) and a frame load started by a link (Turbo 8 caches the
 *   frame with its pending `src`, which Forward then loads at the wrong URL). A frame visit promoted to history
 *   dispatches `turbo:before-cache` too, with the page still on screen: nothing is cancelled then.
 * - When the frame connects with no load of its own pending, it drops `busy` and `aria-busy`: a frame visit promoted
 *   to history copies the page while the form's submission marks the frame busy, and nothing clears it in the copy.
 * - When the frame leaves the document, it cancels the form's submission still waiting for its response and drops
 *   its `src`, so a render Turbo resumes on the detached frame proposes no visit (Turbo 8 would read the response
 *   that leaving the page aborted, and throw).
 *
 * The submission is tracked from `turbo:submit-start` until its response arrives or it ends.
 *
 * @action cancelLoading    On `turbo:before-cache`: cancels the change still loading, unless the page stays on screen.
 * @action submitStarted    On `turbo:submit-start`: tracks the form's submission.
 * @action responseReceived On `turbo:before-fetch-response`: stops tracking the submission once its response is in.
 * @action submitEnded      On `turbo:submit-end`: stops tracking the submission.
 */
export default class extends Controller {
    #submission = null;

    connect() {
        if (!this.#loadPending()) {
            this.element.removeAttribute('busy');
            this.element.removeAttribute('aria-busy');
        }
    }

    disconnect() {
        this.#stopSubmission();
        if (!this.element.isConnected) {
            this.element.removeAttribute('src');
        }
    }

    cancelLoading() {
        if (isPromotedFrameCache()) {
            return;
        }
        this.#stopSubmission();
        if (this.#loadPending()) {
            // Turbo cancels the frame's request when its `src` goes; the frame keeps the content it shows
            this.element.removeAttribute('src');
        }
    }

    submitStarted({ detail: { formSubmission } }) {
        this.#submission = formSubmission;
    }

    responseReceived({ target }) {
        if (target === this.#submission?.formElement) {
            this.#submission = null;
        }
    }

    submitEnded({ detail: { formSubmission } }) {
        if (formSubmission === this.#submission) {
            this.#submission = null;
        }
    }

    /** A frame load started by a link or Turbo, not finished: a `src` without `complete`. */
    #loadPending() {
        return this.element.hasAttribute('src') && !this.element.hasAttribute('complete');
    }

    #stopSubmission() {
        const submission = this.#submission;
        this.#submission = null;
        submission?.stop();
    }
}
