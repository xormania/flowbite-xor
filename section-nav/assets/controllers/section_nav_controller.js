import { Controller } from '@hotwired/stimulus';

/**
 * A section navigation: one link per page of a group of pages (settings), the current one marked
 * `aria-current="page"`. Each link is a page visit (Turbo Drive), not a tab: the links are plain links in the Tab
 * order, as in any navigation landmark, so there are no arrow keys to learn.
 *
 * The server marks the current section (`route` or `active`). An item given neither is marked from the current URL's
 * path on every connect, so the navigation also follows the page inside a `data-turbo-permanent` element and over
 * the copy Turbo cached. Below the `lg` breakpoint the list is a strip that scrolls sideways: on connect, the
 * controller scrolls the current section into the strip's view.
 *
 * @target list The list of links, a strip that scrolls sideways on small screens.
 * @target item The section links; an item without `route` or `active` is the current one when its path is the URL's.
 */
export default class extends Controller {
    static targets = ['list', 'item'];

    connect() {
        // the items' current state as rendered, given back on disconnect
        this.renderedCurrent = new Map(this.itemTargets.map((item) => [item, item.getAttribute('aria-current')]));
        this.markCurrentItem();
        this.revealCurrentItem();
    }

    disconnect() {
        this.renderedCurrent.forEach((value, item) => (null === value ? item.removeAttribute('aria-current') : item.setAttribute('aria-current', value)));
    }

    markCurrentItem() {
        const path = window.location.pathname;
        this.itemTargets.filter((item) => item.hasAttribute('data-section-nav-match-url')).forEach((item) => {
            // a link to a fragment of the page ("#", what SectionNav:Item renders for a rejected URL) is not a page
            const isFragment = (item.getAttribute('href') ?? '').trim().startsWith('#');
            const isCurrent = !isFragment && new URL(item.href, window.location.href).pathname === path;
            isCurrent ? item.setAttribute('aria-current', 'page') : item.removeAttribute('aria-current');
        });
    }

    /** Scrolls the strip, never the page, so the current section is in view when the list overflows sideways. */
    revealCurrentItem() {
        const current = this.itemTargets.find((item) => 'page' === item.getAttribute('aria-current'));
        if (!this.hasListTarget || !current || this.listTarget.scrollWidth <= this.listTarget.clientWidth) {
            return;
        }
        const list = this.listTarget.getBoundingClientRect();
        const item = current.getBoundingClientRect();
        if (item.left >= list.left && item.right <= list.right) {
            return;
        }
        this.listTarget.scrollLeft += item.left + item.width / 2 - (list.left + list.width / 2);
    }
}
