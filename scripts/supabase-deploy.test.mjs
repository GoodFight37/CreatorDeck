import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { rootCertificates } from 'node:tls';
import { X509Certificate } from 'node:crypto';
import { checkTarget, validateMigrationFiles, migrationPlan, PROJECT, connectionFailure, postgresTls, loadPostgresTls, withCertificateUrl, withDeploymentDirectory, verifyRecordedMigrations } from './supabase-deploy.mjs';
const old = { name: '0046_reset.sql', version: '0046', hash: 'known', sql: 'select 1;' };
const next = { name: '0047_fix.sql', version: '0047', hash: 'new', sql: '-- creatordeck-deploy: automatic\nselect 1;' };
const baseline = { [old.name]: old.hash };
test('après 0061 : seule l’absence réelle du reset confirme le retrait', async () => {
  for (const removed of [false, true]) {
    const client = { query: async sql => sql.includes('schema_migrations')
      ? { rows: [{ version: '0061' }] } : { rows: [{ removed }] } };
    const result = verifyRecordedMigrations(client, [{ version: '0061' }]);
    if (removed) await result;
    else await assert.rejects(result, /reset de progression existe encore/);
  }
});
const manual = { ...next, sql: '-- creatordeck-deploy: manual\nselect 1;' };
test('validation locale accepte manual sans inventer un historique ou une approbation', () => {
  validateMigrationFiles([old, manual], baseline);
});
test('manual déjà enregistrée ne bloque ni une base à jour ni une nouvelle automatic', () => {
  assert.deepEqual(migrationPlan([old, manual], baseline, ['0046', '0047']), []);
  const automatic = { ...next, name: '0048_fix.sql', version: '0048' };
  assert.deepEqual(migrationPlan([old, manual, automatic], baseline, ['0046', '0047']), [automatic]);
  assert.throws(() => migrationPlan([old, manual, automatic], baseline, ['0046']), /Validation manuelle/);
});
test('politique des fichiers vérifiée même pour une migration déjà enregistrée', () => {
  assert.throws(() => migrationPlan([old, { ...manual, sql: 'select 1;' }], baseline, ['0046', '0047']), /Mode/);
});
test('chemin automatique réel : atteint le contrôle du secret au lieu de refuser manual avant connexion', () => {
  const result = spawnSync(process.execPath, ['scripts/supabase-deploy.mjs'], {
    encoding: 'utf8', env: { ...process.env, SUPABASE_DB_URL: '' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Configurer le secret GitHub SUPABASE_DB_URL/);
  assert.doesNotMatch(result.stderr, /Validation manuelle/);
});
test('sans secret CA : certificat Supabase fourni intégré ; override explicite conservé', async () => {
  const tls = await loadPostgresTls('');
  assert.equal(tls.rejectUnauthorized, true);
  const cert = new X509Certificate(tls.ca);
  assert.equal(cert.ca, true);
  assert.equal(cert.fingerprint256, '80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA');
  assert.equal(cert.validTo, 'Apr 26 10:56:53 2031 GMT');
  assert.deepEqual(await loadPostgresTls(rootCertificates[0]), postgresTls(rootCertificates[0]));
  await assert.rejects(loadPostgresTls('invalid-pem'), /certificat CA PEM/);
});
test('CA explicite, défaut système et certificat invalide : TLS reste vérifié', () => {
  assert.deepEqual(postgresTls(undefined), { rejectUnauthorized: true });
  assert.deepEqual(postgresTls(''), { rejectUnauthorized: true });
  assert.deepEqual(postgresTls(rootCertificates[0]), { rejectUnauthorized: true, ca: rootCertificates[0] });
  assert.throws(() => postgresTls('fake-password-not-a-certificate'), /certificat CA PEM/);
});
test('CLI utilise la même CA, verify-full et un fichier privé temporaire', async () => {
  const url = checkTarget(`postgresql://postgres:fake@db.${PROJECT}.supabase.co:5432/postgres`);
  let path;
  await withCertificateUrl(url, rootCertificates[0], async secured => {
    assert.equal(secured.searchParams.get('sslmode'), 'verify-full');
    path = secured.searchParams.get('sslrootcert');
    assert.equal(await readFile(path, 'utf8'), rootCertificates[0]);
    // Windows représente les permissions avec des ACL, pas avec ces bits POSIX.
    if (process.platform !== 'win32') assert.equal((await stat(path)).mode & 0o777, 0o600);
  });
  assert.equal(url.searchParams.has('sslrootcert'), false);
  await assert.rejects(stat(path), { code: 'ENOENT' });
});
test('CA temporaire supprimée aussi après échec du CLI ; défaut sans fichier', async () => {
  const url = new URL('postgresql://example/postgres?sslmode=verify-full');
  await withCertificateUrl(url, undefined, async secured => assert.equal(secured, url));
  let path;
  await assert.rejects(withCertificateUrl(url, rootCertificates[0], async secured => {
    path = secured.searchParams.get('sslrootcert');
    throw new Error('fake-cli-failure');
  }), /fake-cli-failure/);
  await assert.rejects(stat(path), { code: 'ENOENT' });
});
test('diagnostic distingue mot de passe, DNS, réseau, TLS et pooler sans secret', () => {
  const secret = 'fake-password+?';
  for (const [error, expected] of [
    [{ code: '28P01' }, /Mot de passe.*28P01/],
    [{ code: 'ENOTFOUND' }, /DNS|introuvable/],
    [{ code: 'ENETUNREACH' }, /Session pooler IPv4/],
    [{ code: 'ETIMEDOUT' }, /expirée/],
    [{ code: 'SELF_SIGNED_CERT_IN_CHAIN' }, /Certificat TLS/],
    [{ message: 'Tenant or user not found' }, /projet ou utilisateur introuvable/],
    [{ message: 'Connection terminated due to connection timeout' }, /Délai/],
    [{ code: 'UNRECOGNIZED' }, /cause non reconnue/],
  ]) {
    const result = connectionFailure({ ...error, detail: secret, password: secret });
    assert.match(result, expected);
    assert.ok(!result.includes(secret));
  }
});
test('erreurs inconnues et agrégées ne dévoilent jamais de paramètres', () => {
  const sensitive = 'postgresql://user:fake-password@private-host/postgres';
  assert.ok(!connectionFailure({ message: sensitive, code: sensitive }).includes(sensitive));
  const result = connectionFailure(new AggregateError([
    Object.assign(new Error(sensitive), { code: 'ENETUNREACH' }),
    Object.assign(new Error(sensitive), { code: 'ECONNREFUSED' }),
  ]));
  assert.match(result, /ENETUNREACH/);
  assert.match(result, /ECONNREFUSED/);
  assert.ok(!result.includes(sensitive));
});
test('aucune migration en attente : aucun plan', () => assert.deepEqual(migrationPlan([old], baseline, ['0046']), []));
test('nouvelle migration automatique uniquement', () => assert.deepEqual(migrationPlan([old, next], baseline, ['0046']), [next]));
test('migration déjà enregistrée jamais rejouée', () => assert.deepEqual(migrationPlan([old, next], baseline, ['0046', '0047']), []));
test('historique manuel absent : arrêt avant tout reset', () => assert.throws(() => migrationPlan([old, next], baseline, []), /Historique Supabase incomplet/));
test('ancien fichier modifié : nouvelle migration obligatoire', () => assert.throws(() => migrationPlan([{ ...old, hash: 'changed' }], baseline, ['0046']), /historique modifiée/));
test('migration locale supprimée : arrêt', () => assert.throws(() => migrationPlan([], baseline, ['0046']), /manquante/));
test('numéro dupliqué : arrêt', () => assert.throws(() => migrationPlan([old, next, next], baseline, ['0046']), /dupliqué/));
test('version distante inconnue : arrêt', () => assert.throws(() => migrationPlan([old], baseline, ['0046', '0099']), /absente/));
test('ancienne migration hors baseline ne peut pas être appliquée', () => assert.throws(() => migrationPlan([old, { ...next, version: '0045' }], baseline, ['0046']), /historique ne peut/));
test('mode absent refuse le déploiement', () => assert.throws(() => migrationPlan([old, { ...next, sql: 'select 1;' }], baseline, ['0046']), /Mode/));
test('mode manual bloque le chemin automatique mais accepte une validation explicite', () => {
  const manual = { ...next, sql: '-- creatordeck-deploy: manual\nselect 1;' };
  assert.throws(() => migrationPlan([old, manual], baseline, ['0046']), /Validation manuelle/);
  assert.deepEqual(migrationPlan([old, manual], baseline, ['0046'], true), [manual]);
});
test('connexion directe et pooler ciblent CreatorDeck avec TLS vérifié', () => {
  for (const u of [`postgresql://postgres:fake@db.${PROJECT}.supabase.co:5432/postgres`, `postgresql://postgres.${PROJECT}:fake@aws-0-eu-west-3.pooler.supabase.com:6543/postgres`]) {
    assert.equal(checkTarget(u).searchParams.get('sslmode'), 'verify-full');
  }
});
test('mauvais projet, hôte, utilisateur, base ou mot de passe absent : arrêt', () => {
  for (const u of ['invalid', `postgresql://postgres:fake@db.other.supabase.co/postgres`, `postgresql://postgres.other:fake@aws-0-eu.pooler.supabase.com/postgres`, `postgresql://postgres.${PROJECT}:fake@evil.example/postgres`, `postgresql://postgres:fake@db.${PROJECT}.supabase.co/other`, `postgresql://postgres@db.${PROJECT}.supabase.co/postgres`]) assert.throws(() => checkTarget(u));
});
test('le workflow attend une CI complète, main et utilise la révision vérifiée', async () => {
  const yaml = await readFile('.github/workflows/supabase-deploy.yml', 'utf8');
  assert.match(yaml, /workflow_run:/);
  assert.match(yaml, /dry_run:[\s\S]*?default: true/);
  assert.match(yaml, /if \[ "\$DRY_RUN" = "true" \]; then\s+node scripts\/supabase-deploy\.mjs --dry-run\s+elif/);
  assert.match(yaml, /conclusion == 'success'/);
  assert.match(yaml, /head_repository.full_name == github.repository/);
  assert.match(yaml, /workflow_run.event == 'push'/);
  assert.match(yaml, /sha !== current.data.commit.sha/);
  assert.match(yaml, /ref: \$\{\{ steps.revision.outputs.sha \}\}/);
  assert.match(yaml, /cancel-in-progress: false/);
  assert.match(yaml, /SUPABASE_DB_CA_CERT: \$\{\{ secrets\.SUPABASE_DB_CA_CERT \}\}/);
  assert.match(yaml, /readOnly = context.eventName === 'workflow_dispatch' && context.payload.inputs\?\.dry_run === 'true'/);
  assert.match(yaml, /if \(!trusted && !readOnly\) throw/);
  assert.match(yaml, /uses: supabase\/setup-cli@v1\s+if:.*!\(github.event_name == 'workflow_dispatch' && inputs.dry_run\)/);
  assert.doesNotMatch(yaml, /migration repair|--include-all/);
});

test('dry-run force la vérification de connexion même sans migration nouvelle', () => {
  const result = spawnSync(process.execPath, ['scripts/supabase-deploy.mjs', '--dry-run'], {
    encoding: 'utf8', env: { ...process.env, SUPABASE_DB_URL: '' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Configurer le secret GitHub SUPABASE_DB_URL/);
  assert.doesNotMatch(result.stdout, /Aucune nouvelle migration/);
});

test('db push isolé : mêmes migrations, configuration minimale, nettoyage après succès et échec', async () => {
  for (const fail of [false, true]) {
    let directory;
    const action = withDeploymentDirectory([old, next], async path => {
      directory = path;
      assert.deepEqual((await readdir(`${path}/supabase/migrations`)).sort(), [old.name, next.name]);
      for (const file of [old, next]) assert.equal(await readFile(`${path}/supabase/migrations/${file.name}`, 'utf8'), file.sql);
      const config = await readFile(`${path}/supabase/config.toml`, 'utf8');
      assert.match(config, /project_id = "CreatorDeck"/);
      assert.doesNotMatch(config, /health_timeout|orioledb|local_smtp|oauth_server|pgdelta/);
      if (fail) throw new Error('fake-cli-error');
    });
    if (fail) await assert.rejects(action, /fake-cli-error/);
    else await action;
    await assert.rejects(stat(directory), { code: 'ENOENT' });
  }
});
test('après CLI : historique incomplet ou objet 0047 absent empêchent toute réussite revendiquée', async () => {
  for (const missing of ['version', 'registry', 'rpc', 'guard']) {
    const client = { query: async sql => {
      assert.match(sql, /^select\s/);
      return sql.includes('schema_migrations')
        ? { rows: (missing === 'version' ? ['0046'] : ['0046', '0047']).map(version => ({ version })) }
        : { rows: [{ registry: missing !== 'registry', rpc: missing !== 'rpc', guard: missing !== 'guard' }] };
    } };
    await assert.rejects(verifyRecordedMigrations(client, [old, next]), /Vérification après application/);
  }
});
test('après CLI : versions enregistrées et objets 0047 présents vérifiés en lecture seule', async () => {
  const queries = [];
  await verifyRecordedMigrations({ query: async sql => {
    queries.push(sql);
    return sql.includes('schema_migrations')
      ? { rows: [{ version: '0046' }, { version: '0047' }] }
      : { rows: [{ registry: true, rpc: true, guard: true }] };
  } }, [old, next]);
  assert.equal(queries.length, 2);
  assert.ok(queries.every(sql => /^select\s/.test(sql)));
});
