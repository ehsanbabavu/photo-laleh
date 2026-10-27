/** Users are signed out after this much inactivity. */
export const SESSION_IDLE_MS = 10 * 60 * 1000;

/** How often the idle check runs. */
export const IDLE_CHECK_INTERVAL_MS = 20 * 1000;

/** How often an active tab refreshes the server-side session. */
export const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000;

export const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;
