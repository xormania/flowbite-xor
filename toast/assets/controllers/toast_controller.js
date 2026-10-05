import { Controller } from '@hotwired/stimulus';

/**
 * Dismisses a `Toast` after its timeout, pausing while it is hovered or focused, or when its close
 * button is pressed; it fades out, then leaves the DOM. A toast added by a Turbo Stream connects like
 * any other, so the timer starts as soon as it appears.
 *
 * @value  timeout Milliseconds before the toast dismisses itself, `0` to keep it until closed.
 * @action pause   Stops the countdown while the toast is hovered or focused, keeping the time left.
 * @action resume  Restarts the countdown with the time left once it is neither hovered nor focused.
 * @action close   Fades the toast out and removes it.
 */
export default class extends Controller {
    static values = { timeout: { type: Number, default: 5000 } };

    connect() {
        this.hovered = false;
        this.focused = false;
        if (this.closing) {
            // moved in the DOM while fading out: finish the removal
            this.element.remove();
            return;
        }
        // a reconnect (Turbo keeping the permanent region) continues with the time left
        this.remaining ??= this.timeoutValue;
        this.start();
    }

    disconnect() {
        this.stop();
        clearTimeout(this.removeTimer);
    }

    pause({ type }) {
        if ('mouseenter' === type) {
            this.hovered = true;
        } else {
            this.focused = true;
        }
        this.stop();
    }

    resume({ type, relatedTarget }) {
        if ('mouseleave' === type) {
            this.hovered = false;
        } else if (!this.element.contains(relatedTarget)) {
            this.focused = false;
        }
        this.start();
    }

    close() {
        if (this.closing) {
            return;
        }
        this.closing = true;
        this.stop();
        this.element.classList.add('opacity-0');
        this.removeTimer = setTimeout(() => this.element.remove(), 300);
    }

    start() {
        if (this.timer || this.timeoutValue <= 0 || this.closing || this.hovered || this.focused) {
            return;
        }
        this.startedAt = Date.now();
        this.timer = setTimeout(() => this.close(), Math.max(0, this.remaining));
    }

    stop() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
            this.remaining -= Date.now() - this.startedAt;
        }
    }
}
