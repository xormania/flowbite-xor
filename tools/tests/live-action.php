<?php

/*
 * Prints the body of a Live Component action request for the first Live Component of a page, as the live controller
 * would send it: `data` holding the component's props (from its data-live-props-value attribute) and the action's
 * arguments.
 *
 * Usage: php tools/tests/live-action.php <page.html> '<arguments as JSON>'
 */

$html = file_get_contents($argv[1]);
if (false === $html || 1 !== preg_match('/data-live-props-value="([^"]*)"/', $html, $match)) {
    fwrite(\STDERR, "No Live Component props in the page.\n");
    exit(1);
}
$props = json_decode(html_entity_decode($match[1], \ENT_QUOTES | \ENT_HTML5), true, flags: \JSON_THROW_ON_ERROR);
echo json_encode(['props' => $props, 'updated' => new stdClass(), 'args' => json_decode($argv[2] ?? '{}', true, flags: \JSON_THROW_ON_ERROR)], \JSON_THROW_ON_ERROR);
