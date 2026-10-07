import { Controller } from '@hotwired/stimulus';

/**
 * Showcase only: sizes a preview <iframe> (same origin) to its page once it has loaded, never smaller than its
 * initial height, so an example shows whole without a scrollbar of its own.
 */
export default class extends Controller {
    static values = { max: { type: Number, default: 1200 } };

    connect() {
        this.minHeight = this.element.offsetHeight;
        this.element.addEventListener('load', this.resize);
        if ('complete' === this.element.contentDocument?.readyState && this.element.contentDocument.body?.childElementCount) {
            this.resize();
        }
    }

    disconnect() {
        this.element.removeEventListener('load', this.resize);
    }

    resize = () => {
        const height = this.element.contentDocument?.documentElement?.scrollHeight;
        if (height) {
            this.element.style.height = `${Math.min(Math.max(height, this.minHeight), this.maxValue)}px`;
        }
    };
}
