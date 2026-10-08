import { Controller } from '@hotwired/stimulus';

/**
 * Writes a calendar's selection into a form control, e.g. a read-only input showing the picked dates.
 * Wire it with `data-action="calendar:select->calendar-display#update"` on an element around the calendar.
 *
 * @target output The form control reflecting the calendar selection.
 * @action update Writes the calendar selection into the output target.
 */
export default class extends Controller {
    static targets = ['output'];

    update(event) {
        this.outputTarget.value = event.detail.selected.join(', ');
    }
}
