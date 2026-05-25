import { router, type Href } from 'expo-router';

const AUTHENTICATED_HOME = '/(tabs)/(main)' as Href;
const SIGNED_OUT_WELCOME = '/(public)/welcome' as Href;
const LOGIN = '/(auth)/login' as Href;
const SIGNUP_PROFILE = '/(auth)/signup-profile' as Href;

/**
 * Enter the authenticated app with a clean root stack (no welcome/login underneath).
 * Use after login, OAuth, splash auto-sign-in, etc.
 */
export function enterAuthenticatedApp(href: Href = AUTHENTICATED_HOME): void {
  router.replace(href);
}

/** After explicit sign-out or session invalidation. */
export function enterSignedOutWelcome(): void {
  router.replace(SIGNED_OUT_WELCOME);
}

export function enterLogin(href: Href = LOGIN): void {
  router.replace(href);
}

export function enterSignupProfile(): void {
  router.replace(SIGNUP_PROFILE);
}

export { AUTHENTICATED_HOME, LOGIN, SIGNUP_PROFILE, SIGNED_OUT_WELCOME };
