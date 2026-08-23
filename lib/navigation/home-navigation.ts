import { router, type Href } from 'expo-router';

export const APP_HOME_HREF = '/(tabs)/(main)' as Href;

/** Replace the current stack with the application home page. */
export function navigateToHome(): void {
  router.replace(APP_HOME_HREF);
}

/**
 * Reset to home, then push a screen so Back returns to the feed
 * instead of an empty stack or an intermediate inbox.
 */
export function pushWithHomeBehind(href: Href): void {
  router.replace(APP_HOME_HREF);
  router.push(href);
}
