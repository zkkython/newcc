#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const OUT_FILE = path.join(ROOT, 'recovery-manifest.json');

const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (CODE_EXT.has(path.extname(entry.name))) out.push(p);
  }
  return out;
}

function resolveCandidates(consumerFile, spec) {
  const base = spec.startsWith('src/')
    ? path.join(ROOT, 'src', spec.slice(4))
    : path.resolve(path.dirname(consumerFile), spec);

  const cands = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    base.replace(/\.js$/u, '.ts'),
    base.replace(/\.js$/u, '.tsx'),
    base.replace(/\.jsx$/u, '.tsx'),
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
  ];

  return [...new Set(cands)];
}

function getStubPath(consumerFile, spec) {
  const base = spec.startsWith('src/')
    ? path.join(ROOT, 'src', spec.slice(4))
    : path.resolve(path.dirname(consumerFile), spec);

  if (/\.(ts|tsx)$/u.test(base)) return path.normalize(base);
  if (/\.(js|jsx|mjs|cjs)$/u.test(base)) return path.normalize(base.replace(/\.(js|jsx|mjs|cjs)$/u, '.ts'));
  return path.normalize(`${base}.ts`);
}

function isMissing(consumerFile, spec) {
  const candidates = resolveCandidates(consumerFile, spec);
  return !candidates.some(c => fs.existsSync(c));
}

function parseNamedImports(clause) {
  const named = new Set();
  if (!clause) return named;

  const braceMatch = clause.match(/\{([^}]+)\}/u);
  if (braceMatch) {
    const raw = braceMatch[1];
    for (const chunk of raw.split(',')) {
      const t = chunk.trim().replace(/^type\s+/u, '');
      if (!t) continue;
      const left = t.split(/\s+as\s+/u)[0]?.trim();
      if (left && /^[A-Za-z_$][\w$]*$/u.test(left)) named.add(left);
    }
  }
  return named;
}

function parseDefaultImport(clause) {
  if (!clause) return false;
  const c = clause.trim();
  if (c.startsWith('{') || c.startsWith('*')) return false;
  const first = c.split(',')[0]?.trim().replace(/^type\s+/u, '');
  return Boolean(first && /^[A-Za-z_$][\w$]*$/u.test(first));
}

const files = walk(SRC_DIR);
const importRe = /(?:^|\n)\s*import\s+([^;\n]+?)\s+from\s+['"]([^'"]+)['"]/gmu;
const exportRe = /(?:^|\n)\s*export\s+[^;\n]*?from\s+['"]([^'"]+)['"]/gmu;
const dynRe = /import\(\s*['"]([^'"]+)['"]\s*\)/gmu;

const bySpec = new Map();
let totalRefs = 0;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');

  let m;
  while ((m = importRe.exec(text))) {
    const clause = (m[1] || '').trim();
    const spec = (m[2] || '').trim();
    if (!(spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('src/'))) continue;
    if (!isMissing(file, spec)) continue;

    totalRefs += 1;
    const key = `${path.relative(ROOT, file)}::${spec}`;
    const rec = bySpec.get(key) || {
      consumer: path.relative(ROOT, file),
      specifier: spec,
      stubPath: path.relative(ROOT, getStubPath(file, spec)),
      refs: 0,
      defaultImport: false,
      namespaceImport: false,
      hasDynamicImport: false,
      namedImports: new Set(),
    };

    rec.refs += 1;
    rec.defaultImport = rec.defaultImport || parseDefaultImport(clause);
    rec.namespaceImport = rec.namespaceImport || /\*\s+as\s+/u.test(clause);
    for (const n of parseNamedImports(clause)) rec.namedImports.add(n);
    bySpec.set(key, rec);
  }

  while ((m = exportRe.exec(text))) {
    const spec = (m[1] || '').trim();
    if (!(spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('src/'))) continue;
    if (!isMissing(file, spec)) continue;

    totalRefs += 1;
    const key = `${path.relative(ROOT, file)}::${spec}`;
    const rec = bySpec.get(key) || {
      consumer: path.relative(ROOT, file),
      specifier: spec,
      stubPath: path.relative(ROOT, getStubPath(file, spec)),
      refs: 0,
      defaultImport: false,
      namespaceImport: false,
      hasDynamicImport: false,
      namedImports: new Set(),
    };
    rec.refs += 1;
    bySpec.set(key, rec);
  }

  while ((m = dynRe.exec(text))) {
    const spec = (m[1] || '').trim();
    if (!(spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('src/'))) continue;
    if (!isMissing(file, spec)) continue;

    totalRefs += 1;
    const key = `${path.relative(ROOT, file)}::${spec}`;
    const rec = bySpec.get(key) || {
      consumer: path.relative(ROOT, file),
      specifier: spec,
      stubPath: path.relative(ROOT, getStubPath(file, spec)),
      refs: 0,
      defaultImport: false,
      namespaceImport: false,
      hasDynamicImport: false,
      namedImports: new Set(),
    };
    rec.refs += 1;
    rec.hasDynamicImport = true;
    bySpec.set(key, rec);
  }
}

const entries = [...bySpec.values()].map(rec => ({
  consumer: rec.consumer,
  specifier: rec.specifier,
  stubPath: rec.stubPath,
  refs: rec.refs,
  defaultImport: rec.defaultImport,
  namespaceImport: rec.namespaceImport,
  hasDynamicImport: rec.hasDynamicImport,
  namedImports: [...rec.namedImports].sort(),
}));

const byStub = new Map();
for (const e of entries) {
  const k = e.stubPath;
  const curr = byStub.get(k) || {
    stubPath: k,
    refs: 0,
    defaultImport: false,
    namespaceImport: false,
    hasDynamicImport: false,
    namedImports: new Set(),
    consumers: [],
  };
  curr.refs += e.refs;
  curr.defaultImport ||= e.defaultImport;
  curr.namespaceImport ||= e.namespaceImport;
  curr.hasDynamicImport ||= e.hasDynamicImport;
  for (const n of e.namedImports) curr.namedImports.add(n);
  curr.consumers.push({ consumer: e.consumer, specifier: e.specifier, refs: e.refs });
  byStub.set(k, curr);
}

const missingModules = [...byStub.values()]
  .map(m => ({
    stubPath: m.stubPath,
    refs: m.refs,
    defaultImport: m.defaultImport,
    namespaceImport: m.namespaceImport,
    hasDynamicImport: m.hasDynamicImport,
    namedImports: [...m.namedImports].sort(),
    consumers: m.consumers.sort((a, b) => b.refs - a.refs),
  }))
  .sort((a, b) => b.refs - a.refs || a.stubPath.localeCompare(b.stubPath));

const manifest = {
  generatedAt: new Date().toISOString(),
  totals: {
    sourceFilesScanned: files.length,
    unresolvedImportRefs: totalRefs,
    unresolvedImportEdges: entries.length,
    unresolvedModuleCount: missingModules.length,
  },
  missingModules,
};

fs.writeFileSync(OUT_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`wrote ${path.relative(ROOT, OUT_FILE)}`);
console.log(JSON.stringify(manifest.totals, null, 2));
