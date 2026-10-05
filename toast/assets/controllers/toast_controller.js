import { Controller } from '@hotwired/stimulus';

/**
 * Dismisses a `Toast` after its timeout, pausing while it is hovered or focused, or when its close
 * button is pressed; it fades out, then leaves the DOM. A toast added by a Turbo Stream connects like
 * any other, so the timer starts as soon as it appears.
 *
 * @value  timeout Milliseconds before the toast dismisses itself, `0` to keep it until closed.
 * @action pause   Stops the countdown, keeping the time left.
 * @action resume  Restarts the countdown with the time left.
 * @action close   Fades the toast out and removes it.
 */
export default class extends Controller {
    static values = { timeout: { type: Number, default: 5000 } };

    connect() {
        this.remaining = this.timeoutValue;
        this.resume();
    }

    disconnect() {
        clearTimeout(this.timer);
        clearTimeout(this.removeTimer);
    }

    pause() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
            this.remaining -= Date.now() - this.startedAt;
        }
    }

    resume() {
        if (this.timer || this.timeoutValue <= 0 || this.closing) {
            return;
        }
        this.startedAt = Date.now();
        this.timer = setTimeout(() => this.close(), Math.max(0, this.remaining));
    }

    close() {
        if (this.closing) {
            return;
        }
        this.closing = true;
        clearTimeout(this.timer);
        this.element.classList.add('opacity-0');
        this.removeTimer = setTimeout(() => this.element.remove(), 300);
    }
}
