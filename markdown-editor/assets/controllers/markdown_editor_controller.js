import { Controller } from '@hotwired/stimulus';

/** What each toolbar button writes: around the selection, or at the start of each selected line. */
const SYNTAX = {
    bold: { wrap: '**', sample: 'bold text' },
    italic: { wrap: '_', sample: 'italic text' },
    heading: { prefix: () => '## ', pattern: /^#{1,6} /, replaces: /^#{1,6} / },
    // a list replaces the other kind of list
    bulletList: { prefix: () => '- ', pattern: /^[-*+] /, replaces: /^(?:[-*+]|\d+[.)]) / },
    orderedList: { prefix: (index) => `${index + 1}. `, pattern: /^\d+[.)] /, replaces: /^(?:[-*+]|\d+[.)]) / },
};

/**
 * The client side of the MarkdownEditor Live Component: a toolbar writing Markdown into the native textarea, the
 * Write and Preview tabs' keyboard, the counter. Typing sends nothing to the server: the textarea's `data-model` is
 * `norender`, and a tab click first hands its current value to Live, so the preview renders what is typed.
 *
 * Turbo: before the page is cached, the typed Markdown is saved in `draft`; after Back, once Live has set the
 * textarea from its props, the draft comes back and Live gets it, so the preview renders what was typed.
 *
 * @target source  The textarea holding the Markdown, named like the field.
 * @target button  A toolbar button writing `data-markdown-editor-syntax-param`.
 * @target tab     The Write and Preview tabs.
 * @target counter The text counting the characters.
 * @value  maxChars The most characters the server accepts.
 * @value  draft    The Markdown saved before Turbo caches the page.
 * @action format   Writes the button's syntax around the selection or before its lines.
 * @action navigate Moves the focus between the toolbar's buttons (arrow keys, Home, End).
 * @action switchTab Moves to the other tab with the arrow keys, Home and End, and opens it.
 * @action sync     Hands the textarea's value to Live before a tab's action.
 * @action count    Updates the counter.
 * @action cache    Saves the typed Markdown before Turbo caches the page.
 */
export default class extends Controller {
    static targets = ['source', 'button', 'tab', 'counter'];
    static values = { maxChars: { type: Number, default: 20000 }, draft: String };

    connect() {
        if (!this.hasDraftValue || !this.hasSourceTarget) {
            return;
        }
        // Back from Turbo's cache: Live sets the textarea from its props when it connects, then the draft comes back
        requestAnimationFrame(() => {
            if (!this.hasDraftValue || !this.element.isConnected) {
                return;
            }
            this.sourceTarget.value = this.draftValue;
            this.element.removeAttribute(`data-${this.identifier}-draft-value`);
            this.sync();
            this.count();
        });
    }

    format({ params: { syntax } }) {
        const definition = SYNTAX[syntax] ?? (syntax === 'link' ? 'link' : null);
        if (!definition || !this.hasSourceTarget) {
            return;
        }
        const source = this.sourceTarget;
        const { selectionStart: start, selectionEnd: end, value } = source;
        const selected = value.slice(start, end);
        source.focus();
        if ('link' === definition) {
            const text = selected || 'link text';
            this.#replace(start, end, `[${text}](https://)`);
            // the address is selected, to be typed over
            const address = start + text.length + 3;
            source.setSelectionRange(address, address + 'https://'.length);
        } else if (definition.wrap) {
            const text = selected || definition.sample;
            this.#replace(start, end, `${definition.wrap}${text}${definition.wrap}`);
            source.setSelectionRange(start + definition.wrap.length, start + definition.wrap.length + text.length);
        } else {
            // whole lines: from the start of the first selected line to the end of the last
            const from = value.lastIndexOf('\n', start - 1) + 1;
            const next = value.indexOf('\n', end > start && '\n' === value[end - 1] ? end - 1 : end);
            const to = -1 === next ? value.length : next;
            const lines = value.slice(from, to).split('\n');
            const marked = lines.every((line) => definition.pattern.test(line));
            const text = lines.map((line, index) => (marked ? line.replace(definition.pattern, '') : definition.prefix(index) + line.replace(definition.replaces, ''))).join('\n');
            this.#replace(from, to, text);
            source.setSelectionRange(from, from + text.length);
        }
    }

    navigate(event) {
        const buttons = this.buttonTargets;
        const index = buttons.indexOf(event.target.closest('button'));
        const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: buttons.length - 1 }[event.key];
        if (-1 === index || undefined === next) {
            return;
        }
        event.preventDefault();
        const button = buttons[(next + buttons.length) % buttons.length];
        buttons.forEach((other) => other.setAttribute('tabindex', other === button ? '0' : '-1'));
        button.focus();
    }

    switchTab(event) {
        const tabs = this.tabTargets;
        const index = tabs.indexOf(event.target.closest('[role="tab"]'));
        const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 }[event.key];
        if (-1 === index || undefined === next) {
            return;
        }
        event.preventDefault();
        const tab = tabs[(next + tabs.length) % tabs.length];
        tab.focus();
        if ('true' !== tab.getAttribute('aria-selected')) {
            tab.click();
        }
    }

    sync() {
        if (this.hasSourceTarget) {
            this.sourceTarget.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    count() {
        if (!this.hasCounterTarget || !this.hasSourceTarget) {
            return;
        }
        const count = [...this.sourceTarget.value].length;
        this.counterTarget.textContent = this.counterTarget.dataset.template?.replace('%count%', count).replace('%max%', this.maxCharsValue) ?? String(count);
        this.counterTarget.toggleAttribute('data-over', count > this.maxCharsValue);
    }

    cache() {
        if (this.hasSourceTarget && this.sourceTarget.value !== this.sourceTarget.defaultValue) {
            this.draftValue = this.sourceTarget.value;
        }
    }

    /** Replaces a range of the textarea, as typing would: the browser's undo keeps it, and `input` follows. */
    #replace(start, end, text) {
        const source = this.sourceTarget;
        source.setSelectionRange(start, end);
        if (!document.execCommand?.('insertText', false, text)) {
            source.setRangeText(text, start, end, 'end');
            source.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
}
