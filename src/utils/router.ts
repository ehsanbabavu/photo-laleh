export type AppView = 'admin' | 'user';

export const ADMIN_TABS = [
  'dashboard',
  'announcements',
  'print_types',
  'prompts_manager',
  'orders',
  'tickets',
  'users',
  'chatgpt',
  'database',
  'telegram_bot',
  'blupal',
  'backup',
  'sms'
] as const;

export const USER_TABS = ['dashboard', 'wizard', 'orders', 'tickets'] as const;

export interface RouteInfo {
  view: AppView;
  tab: string;
}

export function parseRoute(pathname: string): RouteInfo {
  const parts = (pathname || '/').split('/').filter(Boolean);
  if (parts[0] === 'admin') {
    const tab = parts[1] && (ADMIN_TABS as readonly string[]).includes(parts[1]) ? parts[1] : 'dashboard';
    return { view: 'admin', tab };
  }
  if (parts[0] === 'user') {
    const tab = parts[1] && (USER_TABS as readonly string[]).includes(parts[1]) ? parts[1] : 'dashboard';
    return { view: 'user', tab };
  }
  return { view: 'user', tab: 'dashboard' };
}

export function routeToPath(view: AppView, tab: string): string {
  return `/${view}/${tab || 'dashboard'}`;
}
