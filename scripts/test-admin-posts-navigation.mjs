import assert from 'node:assert/strict';
import test from 'node:test';
import { ADMIN_POST_PAGES } from '../src/utils/adminPostsNavigation.ts';
import { parseRoute, routeToPath } from '../src/utils/router.ts';

test('each posts submenu has an independent URL that survives a refresh', () => {
  assert.equal(new Set(ADMIN_POST_PAGES.map(page => page.path)).size, 8);
  for (const page of ADMIN_POST_PAGES) {
    assert.equal(routeToPath('admin', page.tab), page.path);
    assert.deepEqual(parseRoute(page.path), { view: 'admin', tab: page.tab });
    assert.deepEqual(parseRoute(`${page.path}/`), { view: 'admin', tab: page.tab });
  }
});

test('existing section links resolve to their independent page', () => {
  for (const page of ADMIN_POST_PAGES) {
    const route = parseRoute('/admin/posts', `?section=${page.section}&id=post-1`);
    assert.equal(route.tab, page.tab);
    assert.equal(routeToPath(route.view, route.tab), page.path);
  }
  assert.equal(parseRoute('/admin/posts/write', '?section=trash&id=post-1').tab, 'posts_write');
});

test('unknown posts sections fall back to all posts without affecting other routes', () => {
  assert.deepEqual(parseRoute('/admin/posts/unknown'), { view: 'admin', tab: 'posts' });
  assert.deepEqual(parseRoute('/admin/posts', '?section=unknown'), { view: 'admin', tab: 'posts' });
  assert.deepEqual(parseRoute('/admin/orders'), { view: 'admin', tab: 'orders' });
  assert.deepEqual(parseRoute('/user/orders'), { view: 'user', tab: 'orders' });
  assert.equal(routeToPath('admin', 'orders'), '/admin/orders');
  assert.equal(routeToPath('user', 'orders'), '/user/orders');
});
