<?php

namespace App\EventListener;

use App\Security\CspNonce;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Browser hardening headers on every response of the demo, and an enforced Content Security Policy that runs only
 * the scripts and styles carrying the request's nonces (layouts/README.md, *Content Security Policy*). The
 * Playwright fixtures fail a test on any violation, so the whole suite checks that the kit works under this policy.
 *
 * - `'strict-dynamic'`: the nonced importmap scripts load the modules, `data:` CSS modules and modulepreload links
 *   included. Images may come from https URLs: README examples show remote pictures.
 * - `Referrer-Policy: same-origin`, not `no-referrer`: browsers then send `Origin: null` on a same-origin POST, and
 *   the stateless CSRF check of the login, logout and forms (config/packages/csrf.yaml) needs the origin.
 * - Symfony's own pages print inline code without a nonce: error pages and the `_` routes (`/_error/{code}`) get only
 *   the directives that do not restrict scripts, styles or images. In debug, Symfony's ErrorListener also removes the
 *   header from error pages after this listener; a web debug toolbar (WebProfilerBundle, not installed) would add
 *   its own nonces to it.
 * - AssetMapper's dev server answers `/assets/` before this listener: those JavaScript and CSS files get no headers,
 *   which only documents need.
 */
final class SecurityHeadersListener
{
    private const SYMFONY_PAGE = '_app_symfony_page';

    private const POLICY = [
        'object-src' => "'none'",
        'base-uri' => "'none'",
        'form-action' => "'self'",
        'frame-ancestors' => "'self'",
    ];

    /**
     * The style attributes of README examples, allowed on their preview pages only: the dropdown, modal and drawer
     * examples (copied from the official kit) set a `min-height` so the open menu or dialog fits the screenshot.
     */
    private const PREVIEW_STYLE_ATTRIBUTES = ['min-height: 304px', 'min-height: 360px', 'min-height: 504px'];

    public function __construct(
        #[Autowire(service: 'app.csp_nonce.script')]
        private readonly CspNonce $scriptNonce,
        #[Autowire(service: 'app.csp_nonce.style')]
        private readonly CspNonce $styleNonce,
    ) {
    }

    #[AsEventListener(KernelEvents::EXCEPTION)]
    public function onKernelException(ExceptionEvent $event): void
    {
        if ($event->isMainRequest()) {
            $event->getRequest()->attributes->set(self::SYMFONY_PAGE, true);
        }
    }

    #[AsEventListener(KernelEvents::RESPONSE)]
    public function onKernelResponse(ResponseEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }
        $request = $event->getRequest();
        $headers = $event->getResponse()->headers;

        $headers->set('X-Content-Type-Options', 'nosniff');
        $headers->set('Referrer-Policy', 'same-origin');
        $headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');

        $policy = self::POLICY;
        $route = (string) $request->attributes->get('_route');
        if (!$request->attributes->get(self::SYMFONY_PAGE) && !str_starts_with($route, '_')) {
            $policy['default-src'] = "'self'";
            $policy['img-src'] = "'self' data: https:";
            $policy['script-src'] = "'nonce-{$this->scriptNonce}' 'strict-dynamic'";
            $policy['style-src'] = "'self' 'nonce-{$this->styleNonce}'";
            if ('app_preview' === $route) {
                $hashes = array_map(static fn (string $style): string => \sprintf("'sha256-%s'", base64_encode(hash('sha256', $style, true))), self::PREVIEW_STYLE_ATTRIBUTES);
                $policy['style-src-attr'] = "'unsafe-hashes' ".implode(' ', $hashes);
            }
        }

        $headers->set('Content-Security-Policy', implode('; ', array_map(static fn (string $directive, string $sources): string => "{$directive} {$sources}", array_keys($policy), $policy)));
    }
}
