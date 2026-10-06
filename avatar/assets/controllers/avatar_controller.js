import { Controller } from '@hotwired/stimulus';

/**
 * Shows an `Avatar:Image` once it has loaded and hides the avatar's `Avatar:Fallback`; an image that fails to load
 * shows the fallback again. Replaces the official kit's inline `onload` handler, which a Content Security Policy
 * blocks unless it allows inline event handlers.
 *
 * @action show Shows the image and hides the fallback (on `load`).
 * @action hide Hides the image and shows the fallback (on `error`).
 */
export default class extends Controller {
    connect() {
        // the image may have loaded before the controller connected (browser cache, Turbo snapshot)
        if (this.element.complete && this.element.naturalWidth > 0) {
            this.show();
        }
    }

    show() {
        this.element.classList.remove('hidden');
        this.fallback()?.classList.add('hidden');
    }

    hide() {
        this.element.classList.add('hidden');
        this.fallback()?.classList.remove('hidden');
    }

    fallback() {
        return this.element.closest('.group\\/avatar')?.querySelector('[data-avatar-fallback]');
    }
}
