const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { FileStorage } = require('../shared/storage/base');
const { getMasterKey, encryptKey, decryptKey } = require('../shared/storage/crypto');
test('encrypted keys roundtrip and reject wrong key or tampering', () => {
  const key = 'a sufficiently long local test key';
  const encrypted = encryptKey('generated-test-value', key);
  assert.equal(decryptKey(encrypted, key), 'generated-test-value');
  assert.throws(() => decryptKey(encrypted, 'another sufficiently long test key'));
  const parts = encrypted.split(':');
  const bytes = Buffer.from(parts[2], 'hex'); bytes[0] ^= 1;
  parts[2] = bytes.toString('hex');
  const changed = parts.join(':');
  assert.throws(() => decryptKey(changed, key));
});
test('master key validation', () => {
 const previous = process.env.BILLIONS_NETWORK_MASTER_KMS_KEY;
 try {
  delete process.env.BILLIONS_NETWORK_MASTER_KMS_KEY;
  assert.equal(getMasterKey(), null);
  process.env.BILLIONS_NETWORK_MASTER_KMS_KEY = 'short';
  assert.equal(getMasterKey(), null);
 } finally { if (previous === undefined) delete process.env.BILLIONS_NETWORK_MASTER_KMS_KEY; else process.env.BILLIONS_NETWORK_MASTER_KMS_KEY = previous; }
});
test('storage handles absent files, atomic writes, private permissions and invalid JSON', async t => {
 const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'identity-test-'));
 t.after(() => fs.rm(dir, { recursive: true, force: true }));
 const storage = new FileStorage('records.json', path.join(dir, 'private'));
 assert.deepEqual(await storage.readFile(), []);
 await storage.writeFile([{ id: 'example' }]);
 assert.deepEqual(await storage.readFile(), [{ id: 'example' }]);
 if (process.platform !== 'win32') assert.equal((await fs.stat(storage.filePath)).mode & 0o777, 0o600);
 assert.deepEqual(await fs.readdir(path.dirname(storage.filePath)), ['records.json']);
 await fs.writeFile(storage.filePath, '{invalid');
 await assert.rejects(storage.readFile());
});
