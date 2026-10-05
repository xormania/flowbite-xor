# Login

A sign-in card rendering a Symfony login form through the form theme, with the last authentication error.

```twig {"preview":true}
<div class="w-full max-w-sm">
    <twig:LoginForm :form="form" forgotPasswordHref="#" signupHref="#" />
</div>
```

## Installation

::: installation

## Usage

The form posts to `form_login`, so its fields keep the names the authenticator reads: `_username`, `_password`, `_remember_me` and the `_csrf_token` checked with the `authenticate` id.

```php
// src/Form/LoginType.php
final class LoginType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('_username', EmailType::class, ['label' => 'Email', 'attr' => ['autocomplete' => 'email']])
            ->add('_password', PasswordType::class, ['label' => 'Password', 'attr' => ['autocomplete' => 'current-password']])
            ->add('_remember_me', CheckboxType::class, ['label' => 'Remember me', 'required' => false]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['csrf_field_name' => '_csrf_token', 'csrf_token_id' => 'authenticate']);
    }

    public function getBlockPrefix(): string
    {
        return ''; // _username, not login[_username]
    }
}
```

```php
// src/Controller/SecurityController.php
#[Route('/login', name: 'app_login')]
public function login(AuthenticationUtils $authenticationUtils): Response
{
    $form = $this->createForm(LoginType::class, ['_username' => $authenticationUtils->getLastUsername()]);

    return $this->render('security/login.html.twig', [
        'form' => $form,
        'error' => $authenticationUtils->getLastAuthenticationError(),
    ]);
}
```

```yaml
# config/packages/security.yaml
security:
    firewalls:
        main:
            form_login:
                login_path: app_login
                check_path: app_login
                enable_csrf: true
```

```twig
{# templates/security/login.html.twig #}
{% extends 'layouts/auth.html.twig' %}

{% block content %}
    <twig:LoginForm :form="form" :error="error" forgotPasswordHref="{{ path('app_forgot_password') }}" signupHref="{{ path('app_register') }}" />
{% endblock %}
```

Drop `_remember_me` if the firewall has no `remember_me` section.
