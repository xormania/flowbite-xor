/* stimulusFetch: 'lazy' */
import { Controller } from '@hotwired/stimulus';
import { Editor } from '@tiptap/core';
import Blockquote from '@tiptap/extension-blockquote';
import Bold from '@tiptap/extension-bold';
import Code from '@tiptap/extension-code';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import Heading from '@tiptap/extension-heading';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Italic from '@tiptap/extension-italic';
import Link from '@tiptap/extension-link';
import { BulletList, ListItem, ListKeymap, OrderedList } from '@tiptap/extension-list';
import Paragraph from '@tiptap/extension-paragraph';
import Strike from '@tiptap/extension-strike';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import { Gapcursor, Placeholder, UndoRedo } from '@tiptap/extensions';

// https, http, mailto, or a relative URL (a path, `#part`, `?query`); never another scheme. Browsers drop tabs and
// line breaks inside a URL, so they are removed before the check.
const SCHEME = /^(?:(?:https?|mailto):|[/#?]|(?![a-z][a-z0-9+.-]*:)\S)/i;
const isAllowedUrl = (url) => SCHEME.test(url.replace(/[\s\u0000-\u001f]/g, ''));

/** Every toolbar command: its action, and how to tell whether it applies to the selection. */
const COMMANDS = {
    bold: { run: (chain) => chain.toggleBold(), active: (editor) => editor.isActive('bold') },
    italic: { run: (chain) => chain.toggleItalic(), active: (editor) => editor.isActive('italic') },
    strike: { run: (chain) => chain.toggleStrike(), active: (editor) => editor.isActive('strike') },
    heading2: { run: (chain) => chain.toggleHeading({ level: 2 }), active: (editor) => editor.isActive('heading', { level: 2 }) },
    heading3: { run: (chain) => chain.toggleHeading({ level: 3 }), active: (editor) => editor.isActive('heading', { level: 3 }) },
    bulletList: { run: (chain) => chain.toggleBulletList(), active: (editor) => editor.isActive('bulletList') },
    orderedList: { run: (chain) => chain.toggleOrderedList(), active: (editor) => editor.isActive('orderedList') },
    indent: { run: (chain) => chain.sinkListItem('listItem'), enabled: (editor) => editor.can().sinkListItem('listItem') },
    outdent: { run: (chain) => chain.liftListItem('listItem'), enabled: (editor) => editor.can().liftListItem('listItem') },
    blockquote: { run: (chain) => chain.toggleBlockquote(), active: (editor) => editor.isActive('blockquote') },
    code: { run: (chain) => chain.toggleCode(), active: (editor) => editor.isActive('code') },
    horizontalRule: { run: (chain) => chain.setHorizontalRule() },
    undo: { run: (chain) => chain.undo(), enabled: (editor) => editor.can().undo() },
    redo: { run: (chain) => chain.redo(), enabled: (editor) => editor.can().redo() },
    clear: { run: (chain) => chain.unsetAllMarks().clearNodes() },
};

/**
 * A rich text editor (Tiptap) over a hidden textarea that holds its HTML: the textarea submits with the form and
 * carries Live's `data-model`. The server renders the content in `preview` first; the controller replaces it with the
 * editor, and before Turbo caches the page puts the content back as plain markup, with the selection, so Back shows
 * it (the undo history is not kept). Only the preset's formatting exists: the server sanitizes the same set.
 *
 * Live: the editor sits in `data-live-ignore`, so a re-render leaves the user's typing alone; the textarea gets
 * `input` while typing and `change` on blur. Bumping `reset` (in a re-render) replaces the content with the
 * textarea's value: an explicit reset or another record.
 *
 * @target preview   The content as the server rendered it, replaced by the editor.
 * @target value     The textarea holding the HTML, named like the field.
 * @target toolbar   The formatting toolbar (one tab stop, arrow keys between its buttons).
 * @target button    A toolbar button running `data-editor-command-param`.
 * @target linkInput The URL field of the link dialog.
 * @target counter   The text counting the characters.
 * @value  placeholder The text shown while the editor is empty.
 * @value  maxChars    The most characters of text the server accepts.
 * @value  editable    Whether the content can be changed.
 * @value  selection   The selection saved before Turbo caches the page (`from,to`).
 * @value  reset       Changing it replaces the content with the textarea's value.
 * @value  class       The classes of the editable element.
 * @action run        Runs the button's command.
 * @action navigate   Moves the focus between the toolbar's buttons (arrow keys, Home, End).
 * @action prepareLink Fills the link dialog with the selection's link when it opens.
 * @action applyLink  Sets the link of the selection from the dialog's URL field.
 * @action removeLink Removes the link of the selection.
 * @action focusFromLabel Focuses the editor when its label is clicked.
 * @action cache      Puts the content back as plain markup before Turbo caches the page.
 */
export default class extends Controller {
    static targets = ['preview', 'value', 'toolbar', 'button', 'linkInput', 'counter'];
    static values = {
        placeholder: String,
        maxChars: { type: Number, default: 20000 },
        editable: { type: Boolean, default: true },
        selection: String,
        reset: String,
        class: String,
    };

    #editor = null;
    #mount = null;
    #echo = null;

    connect() {
        if (this.#editor || !this.hasPreviewTarget) {
            return;
        }
        const preview = this.previewTarget;
        const attributes = { class: this.classValue };
        for (const name of ['id', 'role', 'aria-multiline', 'aria-readonly', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-invalid', 'aria-required']) {
            if (preview.hasAttribute(name)) {
                attributes[name] = preview.getAttribute(name);
            }
        }
        this.#mount = document.createElement('div');
        preview.replaceWith(this.#mount);
        this.#editor = new Editor({
            element: this.#mount,
            content: this.valueTarget.value,
            editable: this.editableValue,
            injectCSS: false,
            editorProps: { attributes, transformPastedHTML: (html) => this.#withoutStyles(html) },
            extensions: [
                Document,
                Text,
                Paragraph,
                HardBreak,
                Bold,
                Italic,
                Underline,
                Strike,
                Code,
                Heading.configure({ levels: [2, 3] }),
                Blockquote,
                HorizontalRule,
                BulletList,
                OrderedList,
                ListItem,
                ListKeymap,
                // a link never keeps a pasted `target`
                Link.extend({ addAttributes() { return { ...this.parent?.(), target: { default: null, parseHTML: () => null, renderHTML: () => ({}) } }; } }).configure({
                    openOnClick: false,
                    autolink: true,
                    linkOnPaste: true,
                    defaultProtocol: 'https',
                    HTMLAttributes: { target: null, rel: 'noopener noreferrer nofollow' },
                    isAllowedUri: (url) => isAllowedUrl(url),
                }),
                UndoRedo,
                Gapcursor,
                Placeholder.configure({ placeholder: this.placeholderValue }),
            ],
            onUpdate: () => this.#sync(),
            onSelectionUpdate: () => this.#refreshToolbar(),
            onTransaction: () => this.#refreshToolbar(),
            onBlur: () => this.#commit(),
        });
        this.#restoreSelection();
        this.#refreshToolbar();
        this.#count();
    }

    disconnect() {
        this.#destroy();
    }

    run({ params: { command } }) {
        const definition = COMMANDS[command];
        if (!definition || !this.#editor) {
            return;
        }
        definition.run(this.#editor.chain().focus()).run();
    }

    navigate(event) {
        const buttons = this.buttonTargets.filter((button) => !button.disabled);
        const index = buttons.indexOf(event.target.closest('button'));
        if (-1 === index) {
            return;
        }
        const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: buttons.length - 1 }[event.key];
        if (undefined === next) {
            return;
        }
        event.preventDefault();
        this.#focusButton(buttons[(next + buttons.length) % buttons.length]);
    }

    prepareLink() {
        if (this.hasLinkInputTarget && this.#editor) {
            this.linkInputTarget.value = this.#editor.getAttributes('link').href ?? '';
            this.linkInputTarget.removeAttribute('aria-invalid');
        }
    }

    applyLink(event) {
        event.preventDefault();
        if (!this.#editor || !this.hasLinkInputTarget) {
            return;
        }
        const url = this.linkInputTarget.value.trim();
        if ('' === url) {
            this.removeLink();
            return;
        }
        if (!isAllowedUrl(url)) {
            this.linkInputTarget.setAttribute('aria-invalid', 'true');
            return;
        }
        const chain = this.#editor.chain().focus().extendMarkRange('link');
        if (this.#editor.state.selection.empty && !this.#editor.isActive('link')) {
            // nothing selected: the address becomes the link's text
            chain.insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] }).run();
        } else {
            chain.setLink({ href: url }).run();
        }
        this.#closeLinkDialog();
    }

    removeLink() {
        this.#editor?.chain().focus().extendMarkRange('link').unsetLink().run();
        this.#closeLinkDialog();
    }

    focusFromLabel(event) {
        const label = event.target.closest('label');
        if (label && this.#editor && label.htmlFor === this.#editor.view.dom.id) {
            event.preventDefault();
            this.#editor.commands.focus();
        }
    }

    cache() {
        if (!this.#editor) {
            return;
        }
        const { from, to } = this.#editor.state.selection;
        this.selectionValue = `${from},${to}`;
        this.#destroy();
    }

    resetValueChanged(value, previous) {
        if (undefined === previous || !this.#editor) {
            return;
        }
        this.#editor.commands.setContent(this.valueTarget.value, { emitUpdate: false });
        this.#count();
    }

    /** The editor's HTML into the textarea (an empty document is ''), and `input` for whoever listens. */
    #sync() {
        const html = this.#editor.isEmpty ? '' : this.#editor.getHTML();
        if (html === this.valueTarget.value) {
            return;
        }
        this.valueTarget.value = html;
        this.#echo = html;
        this.valueTarget.dispatchEvent(new Event('input', { bubbles: true }));
        this.#count();
    }

    #commit() {
        if (null !== this.#echo) {
            this.#echo = null;
            this.valueTarget.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    #count() {
        if (!this.hasCounterTarget || !this.#editor) {
            return;
        }
        const count = [...this.#editor.getText({ blockSeparator: '' })].length;
        this.counterTarget.textContent = this.counterTarget.dataset.template?.replace('%count%', count).replace('%max%', this.maxCharsValue) ?? String(count);
        this.counterTarget.toggleAttribute('data-over', count > this.maxCharsValue);
    }

    #refreshToolbar() {
        if (!this.#editor) {
            return;
        }
        for (const button of this.buttonTargets) {
            const definition = COMMANDS[button.dataset.editorCommandParam];
            if (!definition) {
                continue;
            }
            if (definition.active) {
                button.setAttribute('aria-pressed', String(definition.active(this.#editor)));
            }
            button.disabled = !this.#editor.isEditable || (definition.enabled ? !definition.enabled(this.#editor) : false);
        }
        // the toolbar keeps one tab stop, on an enabled button
        const buttons = this.buttonTargets.filter((button) => !button.disabled);
        if (!buttons.some((button) => '0' === button.getAttribute('tabindex'))) {
            this.buttonTargets.forEach((button) => button.setAttribute('tabindex', '-1'));
            buttons[0]?.setAttribute('tabindex', '0');
        }
    }

    #focusButton(button) {
        this.buttonTargets.forEach((other) => other.setAttribute('tabindex', other === button ? '0' : '-1'));
        button.focus();
    }

    #restoreSelection() {
        if (!this.selectionValue || !this.#editor) {
            return;
        }
        const [from, to] = this.selectionValue.split(',').map(Number);
        const size = this.#editor.state.doc.content.size;
        if (Number.isInteger(from) && Number.isInteger(to) && from <= size && to <= size) {
            this.#editor.commands.setTextSelection({ from, to });
        }
        this.selectionValue = '';
    }

    #closeLinkDialog() {
        this.linkInputTarget?.closest('[data-controller~="popover"]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        this.#editor?.commands.focus();
    }

    /**
     * Pasted HTML without its `style` attributes and `<style>` elements, before ProseMirror reads it: its parser would
     * apply them in a document under the page's Content Security Policy, which blocks and reports them. Text only, as
     * any parser would apply them too; what it misses, the schema drops anyway.
     */
    #withoutStyles(html) {
        return html.replace(/<style[\s\S]*?<\/style\s*>/gi, '').replace(/\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    }

    /** Destroys the editor and puts the content back as plain markup, as the server renders it. */
    #destroy() {
        if (!this.#editor) {
            return;
        }
        const dom = this.#editor.view.dom;
        const preview = document.createElement('div');
        preview.setAttribute('data-editor-target', 'preview');
        for (const name of ['id', 'role', 'aria-multiline', 'aria-readonly', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-invalid', 'aria-required']) {
            if (dom.hasAttribute(name)) {
                preview.setAttribute(name, dom.getAttribute(name));
            }
        }
        preview.className = this.classValue;
        preview.innerHTML = this.#editor.isEmpty ? '' : this.#editor.getHTML();
        this.#editor.destroy();
        this.#editor = null;
        this.#mount?.replaceWith(preview);
        this.#mount = null;
    }
}
