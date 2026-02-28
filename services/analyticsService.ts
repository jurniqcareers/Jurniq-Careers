
import posthog from 'posthog-js';

// Initialize PostHog
// You can get this from https://us.posthog.com/project/settings
export const initAnalytics = () => {
  // run only in browser
  if (typeof window === "undefined") return;

  const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;

  // initialize only if key exists
  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: "https://us.i.posthog.com",
      capture_pageview: false,
      disable_session_recording: false,
      persistence: "localStorage",
    });
  }
};

// Wrapper for tracking events to ensure consistency
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (posthog) {
    posthog.capture(eventName, properties);
  }
};

// Wrapper for identifying users
export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  if (posthog) {
    posthog.identify(userId, traits);
  }
};

// Wrapper for resetting user (logout)
export const resetAnalytics = () => {
  if (posthog) {
    posthog.reset();
  }
};

export const analytics = posthog;
