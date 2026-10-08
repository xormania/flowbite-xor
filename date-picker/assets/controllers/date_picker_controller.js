import { Controller } from '@hotwired/stimulus';

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Joins the `Popover` and the `Calendar` of a `DatePicker`: the popover controller lives on the same
 * element, the calendar inside the content. A pick writes the formatted dates into the trigger's value and
 * the text field, and closes the popover once the selection is complete. Opening the popover focuses the
 * calendar's selected day (or today's).
 *
 * The text field (single mode) takes typed dates: `Y-m-d`, the locale's numeric order (`3/15/2026`,
 * `15.03.2026`) or the formatted text (`Mar 15, 2026`). While typing, a valid date that the calendar accepts
 * selects it and an emptied field clears the selection; when the field changes (blur, Enter), text that is not
 * a date the calendar accepts (disabled, out of bounds) clears the selection and marks the field `aria-invalid`. The
 * calendar's hidden input, which forms and Live Components read, gets `input` and `change` each time. The
 * field has no `name`: the hidden input holds the value.
 *
 * Labels are formatted in the browser with `Intl`, on connect too, so they never depend on the server's ICU.
 *
 * Adapted from the `date-picker` recipe of the Symfony UX Toolkit shadcn kit (3.5.1, MIT).
 *
 * @value  locale        The locale of the formatted dates, falling back to the document language.
 * @value  dateStyle     The length of the formatted dates: `full`, `long`, `medium` or `short`.
 * @value  separator     The text between two formatted dates.
 * @value  closeOnSelect Whether completing the selection closes the popover.
 * @target trigger       The element opening the popover, flagged `data-empty` while nothing is selected.
 * @target value         The element showing the formatted selection, or its placeholder.
 * @target input         The text field where a date can be typed.
 * @action select        Reflects the calendar's selection, and closes the popover when it is complete.
 * @action parseInput    Selects the typed date while typing, or clears the selection when the field is emptied.
 * @action commitInput   Checks the typed text when the field changes: not a date the calendar accepts clears the selection.
 * @action open          Opens the popover.
 * @action focusDay      Focuses the calendar's selected day when the popover opens.
 */
export default class extends Controller {
    static targets = ['trigger', 'value', 'input'];

    static values = {
        locale: String,
        dateStyle: { type: String, default: 'medium' },
        separator: { type: String, default: ' – ' },
        closeOnSelect: { type: Boolean, default: true },
    };

    #formatter = null;
    #connected = false;

    connect() {
        this.#connected = true;
        // the calendar connects after this element: read its selection once it has. With nothing selected, the
        // field keeps its text: a date the server refused comes back as typed
        queueMicrotask(() => {
            if (this.#connected) {
                const selection = this.#selection();
                this.#reflect(selection, 0 === selection.length);
            }
        });
    }

    disconnect() {
        this.#connected = false;
    }

    select(event) {
        const { selected = [], mode = 'single', source = 'api' } = event.detail ?? {};
        this.#reflect(selected, 'input' === source);
        if ('input' !== source) {
            this.#setInvalid(false);
        }
        if (this.closeOnSelectValue && ['click', 'key'].includes(source) && this.#isComplete(selected, mode)) {
            this.element.setAttribute('data-popover-open-value', 'false');
            this.triggerTargets[0]?.focus();
        }
    }

    parseInput(event) {
        const calendar = this.#calendar;
        if (!calendar || 'single' !== calendar.modeValue) {
            return;
        }
        const text = event.currentTarget.value.trim();
        if ('' === text) {
            this.#setInvalid(false);
            calendar.select([], 'input');

            return;
        }
        const date = this.#parse(text);
        if (null !== date && calendar.canSelect(date)) {
            this.#setInvalid(false);
            if (calendar.selected.join(',') !== date) {
                calendar.select([date], 'input');
            }
        }
        // partial or invalid text changes nothing while the user types
    }

    commitInput(event) {
        const calendar = this.#calendar;
        if (!calendar || 'single' !== calendar.modeValue) {
            return;
        }
        const text = event.currentTarget.value.trim();
        if ('' === text) {
            return;
        }
        const date = this.#parse(text);
        if (null === date || !calendar.canSelect(date)) {
            this.#setInvalid(true);
            if (calendar.selected.length > 0) {
                calendar.select([], 'input');
            }

            return;
        }
        this.#setInvalid(false);
        if (calendar.selected.join(',') !== date) {
            calendar.select([date], 'input');
        }
        // the text in the picker's own words
        event.currentTarget.value = this.#format(date);
    }

    open(event) {
        event?.preventDefault();
        this.element.setAttribute('data-popover-open-value', 'true');
    }

    focusDay(event) {
        const day = this.element.querySelector('[data-slot="calendar-day"] button[tabindex="0"]');
        if (day) {
            event.preventDefault();
            day.focus();
        }
    }

    localeValueChanged() {
        this.#refresh();
    }

    dateStyleValueChanged() {
        this.#refresh();
    }

    separatorValueChanged() {
        this.#refresh();
    }

    get #calendar() {
        const element = this.element.querySelector('[data-controller~="calendar"]');

        return element ? this.application.getControllerForElementAndIdentifier(element, 'calendar') : null;
    }

    #selection() {
        const calendar = this.#calendar;
        if (calendar) {
            return calendar.selected;
        }
        try {
            return JSON.parse(this.element.querySelector('[data-controller~="calendar"]')?.dataset.calendarSelectedValue ?? '[]');
        } catch {
            return [];
        }
    }

    #refresh() {
        this.#formatter = null;
        if (this.#connected) {
            this.#reflect(this.#selection());
        }
    }

    #reflect(selected, skipInput = false) {
        const empty = 0 === selected.length;
        const formatted = selected.map((date) => this.#format(date)).join(this.separatorValue);
        this.element.dataset.empty = String(empty);
        for (const trigger of this.triggerTargets) {
            trigger.dataset.empty = String(empty);
        }
        for (const value of this.valueTargets) {
            value.dataset.empty = String(empty);
            value.textContent = empty ? (value.dataset.placeholder ?? '') : formatted;
        }
        if (skipInput) {
            return;
        }
        for (const input of this.inputTargets) {
            input.value = formatted;
        }
    }

    #setInvalid(invalid) {
        for (const input of this.inputTargets) {
            if (invalid) {
                input.setAttribute('aria-invalid', 'true');
            } else if (input.dataset.datePickerInvalid) {
                // only the state this controller set: a server error keeps its aria-invalid
                input.removeAttribute('aria-invalid');
            }
            if (invalid) {
                input.dataset.datePickerInvalid = 'true';
            } else {
                delete input.dataset.datePickerInvalid;
            }
        }
    }

    #isComplete(selected, mode) {
        if (0 === selected.length || 'multiple' === mode) {
            return false;
        }

        return 'range' !== mode || selected.length > 1;
    }

    get #locale() {
        return this.localeValue || document.documentElement.lang || undefined;
    }

    #format(date) {
        const dateStyle = ['full', 'long', 'medium', 'short'].includes(this.dateStyleValue) ? this.dateStyleValue : 'medium';
        this.#formatter ??= new Intl.DateTimeFormat(this.#locale, { dateStyle, timeZone: 'UTC' });

        return this.#formatter.format(new Date(`${date}T00:00:00Z`));
    }

    /**
     * Reads `Y-m-d`, the locale's numeric day, month and four-digit year order with `/`, `.` or `-`, or the
     * formatted text of a date; `null` for anything else. No `Date.parse`, which depends on the engine.
     */
    #parse(text) {
        const value = text.trim();
        if (ISO_DATE.test(value)) {
            return this.#valid(value);
        }
        const numbers = value.match(/^(\d{1,4})[/.\-](\d{1,2})[/.\-](\d{1,4})$/);
        if (numbers) {
            const order = new Intl.DateTimeFormat(this.#locale, { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' })
                .formatToParts(new Date(Date.UTC(2026, 0, 2)))
                .map((part) => part.type)
                .filter((type) => ['day', 'month', 'year'].includes(type));
            const parts = Object.fromEntries(order.map((type, index) => [type, numbers[index + 1]]));
            if (4 !== parts.year?.length) {
                return null;
            }

            return this.#valid(`${parts.year}-${parts.month.padStart(2, '0')}-${parts.day.padStart(2, '0')}`);
        }
        return this.#parseFormatted(value);
    }

    /**
     * Reads the text as the picker formats it (`Mar 15, 2026`, `15. März 2026`), for any date: its four-digit year
     * and day come from its numbers, its month from trying each one, and the date counts only when it formats back
     * to the same text (ignoring case and the kind of spaces).
     */
    #parseFormatted(text) {
        const normalize = (string) => string.replace(/[\s\u00a0\u202f]+/g, ' ').trim().toLocaleLowerCase();
        const target = normalize(text);
        const numbers = text.match(/\d+/g) ?? [];
        const year = numbers.find((number) => 4 === number.length);
        if (!year) {
            return null;
        }
        const days = numbers.filter((number) => number !== year && number.length <= 2 && Number(number) >= 1 && Number(number) <= 31);
        for (const day of days) {
            for (let month = 1; month <= 12; month++) {
                const date = this.#valid(`${year}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}`);
                if (null !== date && normalize(this.#format(date)) === target) {
                    return date;
                }
            }
        }

        return null;
    }

    #valid(date) {
        if (!ISO_DATE.test(date)) {
            return null;
        }
        const parsed = new Date(`${date}T00:00:00Z`);

        return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
    }
}
