import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { once } from 'node:events';
import { scryptSync } from 'node:crypto';
import { createRecoveryFixture } from './helpers/password-recovery-fixture.mjs';

let harness, fixture, listener, base;
before(async () => {
  harness = await createRecoveryFixture();
  fixture = harness.fixture;
  listener = harness.app.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  base = `http://127.0.0.1:${listener.address().port}`;
});
beforeEach(() => fixture.reset());
after(async () => {
  if (listener) await new Promise(resolve => listener.close(resolve));
  await harness?.close();
});

async function post(route, body) {
  const response = await harness.nativeFetch(`${base}/api/auth/password/${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') };
}
const request = (channel = 'sms', identifier = '09120000001', extra = {}) => post('otp', { channel, identifier, ...extra });
const reset = (channel, code, identifier = '09120000001', extra = {}) => post('reset', { channel, identifier, code, password: 'new-password', ...extra });
const lastCode = () => fixture.sent.at(-1).code;

for (const [channel, recipient] of [['sms', '09120000001'], ['telegram', '123456789'], ['eitaa', '987654321']]) {
  test(`${channel}: sends only to the registered destination, resets password, revokes sessions and consumes code`, async () => {
    const requested = await request(channel, '۰۹۱۲۰۰۰۰۰۰۱', { recipient: '111111111', telegramId: '111111111', eitaaId: '111111111' });
    assert.equal(requested.status, 200);
    assert.deepEqual(requested.body, { success: true, channel, expiresIn: 120 });
    assert.equal(fixture.sent.length, 1);
    assert.equal(fixture.sent[0].recipient, recipient);
    assert.equal(fixture.sent[0].channel, channel);
    assert.match(lastCode(), /^\d{6}$/);
    assert.equal([...fixture.codes.values()][0].expires - fixture.now, 120000);
    const code = lastCode();
    const completed = await reset(channel, code);
    assert.equal(completed.status, 200);
    assert.equal(completed.body.user.id, 'customer');
    assert.equal(completed.body.user.password, undefined);
    const [algorithm, salt, hash] = fixture.db.users[0].password.split('$');
    assert.equal(algorithm, 'scrypt');
    assert.equal(scryptSync('new-password', salt, 64).toString('hex'), hash);
    assert.deepEqual(fixture.revoked, ['customer']);
    assert.deepEqual(fixture.sessions, ['customer']);
    assert.match(completed.cookie, /HttpOnly/);
    assert.equal((await reset(channel, code)).status, 400);
    assert.equal(fixture.db.users[1].password, 'second-password');
  });

  test(`${channel}: failed deliveries never save a usable code`, async () => {
    for (const failure of ['http', 'provider', 'network']) {
      fixture.reset();
      fixture.deliveryFailure = failure;
      assert.equal((await request(channel)).status, 400);
      assert.equal(fixture.codes.size, 0);
      assert.equal((await reset(channel, lastCode())).status, 400);
    }
  });
}

test('legacy SMS payloads without a channel still work', async () => {
  assert.equal((await post('otp', { phone: '09120000001' })).status, 200);
  assert.equal((await post('reset', { phone: '09120000001', code: lastCode(), password: 'new-password' })).status, 200);
});

for (const [channel, identifier, id] of [['eitaa', '444444444', 'eitaa-only'], ['telegram', '555555555', 'telegram-only']]) {
  test(`${channel}: a messenger-only account can recover using its numeric ID`, async () => {
    assert.equal((await request(channel, identifier)).status, 200);
    assert.equal(fixture.sent[0].recipient, identifier);
    assert.equal((await reset(channel, lastCode(), identifier)).body.user.id, id);
  });
}

test('unknown accounts and missing or non-private destinations receive the same response', async () => {
  const valid = await request('telegram');
  fixture.sent = [];
  for (const identifier of ['09129999999', '09120000003']) {
    assert.deepEqual((await request('telegram', identifier)).body, valid.body);
  }
  for (const invalid of ['-100123456789', '@group', '']) {
    fixture.db.users[0].telegramId = invalid;
    assert.deepEqual((await request('telegram')).body, valid.body);
  }
  fixture.db.users[0].eitaaId = '-100123456789';
  assert.equal((await request('eitaa')).status, 200);
  assert.equal(fixture.sent.length, 0);
});

test('invalid channels, identifiers and reset inputs are rejected', async () => {
  for (const channel of ['email', '', null, {}, []]) {
    assert.equal((await request(channel)).status, 400);
    assert.equal((await reset(channel, '123456')).status, 400);
  }
  for (const [channel, identifier] of [['sms', '123456789'], ['telegram', '@name'], ['eitaa', ''], ['sms', '09abc000000']]) {
    assert.equal((await request(channel, identifier)).status, 400);
  }
  await request();
  assert.equal((await reset('sms', '12345')).status, 400);
  assert.equal((await reset('sms', lastCode(), undefined, { password: 'short' })).status, 400);
});

test('a code cannot cross accounts, delivery channels, changed recipients or OTP purposes', async () => {
  await request('telegram');
  const code = lastCode();
  assert.equal((await reset('telegram', code, '09120000002')).status, 400);
  assert.equal((await reset('sms', code)).status, 400);
  assert.equal((await reset('eitaa', code)).status, 400);
  fixture.db.users[0].telegramId = '666666666';
  assert.equal((await reset('telegram', code)).status, 400);
  fixture.saveOtpCode('09120000001', '654321', 120000);
  assert.equal((await reset('sms', '654321')).status, 400);
  assert.equal(fixture.db.users[0].password, 'old-password');
});

test('password changes invalidate outstanding codes on other channels', async () => {
  await request('telegram');
  const telegramCode = lastCode();
  await request('eitaa');
  assert.equal((await reset('eitaa', lastCode())).status, 200);
  assert.equal((await reset('telegram', telegramCode)).status, 400);
});

test('resending replaces the old code and Persian/Arabic code digits are accepted', async () => {
  await request('eitaa');
  const key = [...fixture.codes.keys()][0];
  fixture.codes.get(key).code = '000000';
  await request('eitaa');
  assert.equal(fixture.codes.size, 1);
  assert.equal((await reset('eitaa', '000000')).status, 400);
  const arabicCode = lastCode().replace(/\d/g, digit => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
  assert.equal((await reset('eitaa', arabicCode)).status, 200);
});

test('expired codes and repeated incorrect attempts do not change passwords', async () => {
  await request();
  const expired = lastCode();
  fixture.now += 120001;
  assert.equal((await reset('sms', expired)).status, 400);
  fixture.reset();
  await request();
  for (let i = 0; i < 5; i++) assert.equal((await reset('sms', '000000')).status, 400);
  assert.equal((await reset('sms', lastCode())).status, 400);
  assert.equal(fixture.db.users[0].password, 'old-password');
});

test('send throttling follows the account across channels and phone/ID aliases', async () => {
  assert.equal((await request('sms')).status, 200);
  assert.equal((await request('telegram', '123456789')).status, 200);
  assert.equal((await request('eitaa', '987654321')).status, 200);
  assert.equal((await request('telegram')).status, 429);
  assert.equal(fixture.sent.length, 3);
});

test('IP throttling includes unknown accounts and reset attempts', async () => {
  for (let i = 0; i < 10; i++) assert.equal((await request('sms', '09129999999')).status, 200);
  assert.equal((await request('sms', '09129999999')).status, 429);
  for (let i = 0; i < 20; i++) assert.equal((await reset('sms', '123456', '09129999999')).status, 400);
  assert.equal((await reset('sms', '123456', '09129999999')).status, 429);
});

test('missing provider configuration and failed OTP persistence report errors', async () => {
  for (const [channel, key] of [['sms', 'smsApiToken'], ['telegram', 'telegramToken'], ['eitaa', 'eitaaToken']]) {
    fixture.reset();
    delete fixture.db.settings[key];
    assert.equal((await request(channel)).status, 400);
    assert.equal(fixture.sent.length, 0);
    fixture.reset();
    fixture.saveFails = true;
    assert.equal((await request(channel)).status, 400);
    assert.equal(fixture.codes.size, 0);
  }
});
