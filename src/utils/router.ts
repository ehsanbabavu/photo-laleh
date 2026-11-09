import { ADMIN_POST_PAGES, adminPostPage, adminPostSectionPage } from './adminPostsNavigation';

export type AppView = 'admin' | 'user';

export const ADMIN_TABS = [
  'dashboard',
  'announcements',
  ...ADMIN_POST_PAGES.map(page => page.tab),
  'print_types',
  'prompts_manager',
  'orders',
  'transactions',
  'tickets',
  'users',
  'chatgpt',
  'database',
  'telegram_bot',
  'blupal',
  'backup',
  'sms',
  'storage',
  'sessions',
  'audit'
] as const;

export const USER_TABS = ['dashboard', 'wizard', 'orders', 'tickets'] as const;

export interface RouteInfo {
  view: AppView;
  tab: string;
}

export function parseRoute(pathname: string, search = ''): RouteInfo {
  const parts = (pathname || '/').split('/').filter(Boolean);
  if (parts[0] === 'admin') {
    if (parts[1] === 'posts') {
      const section = parts[2] || new URLSearchParams(search).get('section') || 'list';
      return { view: 'admin', tab: adminPostSectionPage(section)?.tab || 'posts' };
    }
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
  if (view === 'admin') {
    const page = adminPostPage(tab);
    if (page) return page.path;
  }
  return `/${view}/${tab || 'dashboard'}`;
}
