import { Controller } from '@hotwired/stimulus';

/**
 * Works next to Symfony UX Dropzone's controller (`symfony--ux-dropzone--dropzone`) on a `Dropzone`, which it never
 * changes: it reads its targets and listens to its `dropzone:*` events.
 *
 * - Drag-over state: `data-dragging` on the element while a file is dragged over it.
 * - Drops outside the file input (on the list of files, on the preview) are refused, so the browser never opens the
 *   file in the tab and loses the form.
 * - Focus: a pick hides the focused input, so focus moves to the Remove button, whose name ("Remove photo.png") says
 *   what was picked; Remove puts focus back on the input; removing one of several files focuses the next Remove
 *   button, else the last one, else the input. Connecting never moves focus.
 * - A drag that leaves without a drop shows the empty box again: UX Dropzone shows its empty preview instead.
 * - One file stays picked when the element is moved and its controllers reconnect (a `data-turbo-permanent` element
 *   across Turbo visits): UX Dropzone clears the input on every connect, so the file is put back and the input gets a
 *   `change` event (not bubbling), which shows it again.
 *
 * @target input       The file input.
 * @target placeholder The inside of the box shown before a pick.
 * @target preview     The picked file (one file only).
 * @target clearButton The Remove button of the preview (one file only).
 * @target list        The list of picked files (several files only).
 * @action dragOver    Marks the element `data-dragging`, and refuses a drop outside the input.
 * @action dragLeave   Removes `data-dragging` once the drag leaves the element.
 * @action drop        Removes `data-dragging`, and refuses a drop outside the input.
 * @action remember    Records whether the input has focus, before a pick hides it (on `change`, in the capture phase).
 * @action changed     Focuses the Remove button after a pick made from the focused input (`dropzone:change`).
 * @action clearing    Records that the Remove button was clicked (in the capture phase).
 * @action cleared     Focuses the input after the Remove button cleared the pick (`dropzone:clear`).
 * @action removing    Records which file's Remove button was clicked (in the capture phase).
 * @action removed     Focuses the Remove button now at that place, else the last one, else the input (`dropzone:remove`).
 */
export default class extends Controller {
    static targets = ['input', 'placeholder', 'preview', 'clearButton', 'list'];

    #inputFocused = false;
    #clearing = false;
    #removedIndex = null;
    #leaveTimeout = null;
    #kept = null;

    connect() {
        const kept = this.#kept;
        this.#kept = null;
        if (!kept?.files.length || this.hasListTarget || !this.hasPreviewTarget) {
            return;
        }
        // after UX Dropzone's connect, wherever its controller comes in the order, has cleared the input
        queueMicrotask(() => {
            if (this.element.isConnected && !this.inputTarget.files?.length) {
                this.inputTarget.files = kept.files;
                this.inputTarget.dispatchEvent(new Event('change'));
            }
        });
    }

    disconnect() {
        // the same element may connect again (moved); a new element (Back, a Turbo Stream) gets a new controller
        if (!this.hasListTarget && this.inputTarget.files?.length) {
            this.#kept = new DataTransfer();
            for (const file of this.inputTarget.files) {
                this.#kept.items.add(file);
            }
        }
        this.element.removeAttribute('data-dragging');
        clearTimeout(this.#leaveTimeout);
        this.#leaveTimeout = null;
        this.#inputFocused = false;
        this.#clearing = false;
        this.#removedIndex = null;
    }

    dragOver(event) {
        this.element.setAttribute('data-dragging', '');
        if (event.target !== this.inputTarget) {
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'none';
            }
        }
    }

    dragLeave(event) {
        if (this.element.contains(event.relatedTarget)) {
            return;
        }
        this.element.removeAttribute('data-dragging');
        if (this.hasListTarget || !this.hasPreviewTarget) {
            return;
        }
        // UX Dropzone then shows its preview, empty when nothing was picked: show the box again after its listener ran
        clearTimeout(this.#leaveTimeout);
        this.#leaveTimeout = setTimeout(() => {
            this.#leaveTimeout = null;
            if (!this.inputTarget.files?.length) {
                this.inputTarget.style.display = 'block';
                this.placeholderTarget.style.display = 'block';
                this.previewTarget.style.display = 'none';
            }
        });
    }

    drop(event) {
        this.element.removeAttribute('data-dragging');
        if (event.target !== this.inputTarget) {
            event.preventDefault();
        }
    }

    remember(event) {
        if (event.target === this.inputTarget) {
            this.#inputFocused = document.activeElement === this.inputTarget;
        }
    }

    changed() {
        const focused = this.#inputFocused;
        this.#inputFocused = false;
        if (focused && !this.hasListTarget && this.hasClearButtonTarget) {
            this.clearButtonTarget.focus();
        }
    }

    clearing() {
        this.#clearing = true;
    }

    cleared() {
        if (this.#clearing) {
            this.#clearing = false;
            this.inputTarget.focus();
        }
    }

    removing(event) {
        const button = event.target.closest('.dropzone-preview-list-remove');
        const item = button?.closest('li');
        this.#removedIndex = item && item.parentElement === this.listTarget ? [...this.listTarget.children].indexOf(item) : null;
    }

    removed() {
        const index = this.#removedIndex;
        this.#removedIndex = null;
        if (null === index || !this.hasListTarget) {
            return;
        }
        const buttons = this.listTarget.querySelectorAll('.dropzone-preview-list-remove');
        (buttons[index] ?? buttons[buttons.length - 1] ?? this.inputTarget).focus();
    }
}
