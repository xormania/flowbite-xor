<?php

namespace App\Security;

use Symfony\Component\DependencyInjection\Attribute\Exclude;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * The Content Security Policy nonce of one directive (`script-src` or `style-src`) for the current request. The
 * layouts print it through the `csp_script_nonce` and `csp_style_nonce` Twig globals (config/packages/twig.yaml,
 * layouts/README.md), and App\EventListener\SecurityHeadersListener puts it in the policy.
 *
 * Twig keeps its globals for the life of the worker (FrankenPHP worker mode): the nonce is stored on the main
 * request, created the first time it is read, so no two requests share one.
 */
#[Exclude]
final class CspNonce implements \Stringable
{
    public function __construct(
        private readonly RequestStack $requestStack,
        private readonly string $directive,
    ) {
    }

    public function __toString(): string
    {
        // a template rendered outside a request (a console command) gets no nonce
        if (null === $request = $this->requestStack->getMainRequest()) {
            return '';
        }

        $attribute = '_csp_nonce_'.$this->directive;
        if (!\is_string($nonce = $request->attributes->get($attribute))) {
            // 144 random bits, base64url: no character that needs escaping in a header or an attribute
            $nonce = rtrim(strtr(base64_encode(random_bytes(18)), '+/', '-_'), '=');
            $request->attributes->set($attribute, $nonce);
        }

        return $nonce;
    }
}
