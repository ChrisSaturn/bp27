import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const parserIndex = args.indexOf('--parser');
if (parserIndex < 0 || !args[parserIndex + 1]) {
  throw new Error('Pass --parser /absolute/path/to/an/already-installed/acorn.mjs. This tool never installs a parser.');
}
const parserPath = resolve(args[parserIndex + 1]);
args.splice(parserIndex, 2);
const checkOnly = args.includes('--check');
const files = args.filter(arg => arg !== '--check');
const acorn = await import(pathToFileURL(parserPath).href);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const names = files.length ? files : (await readdir(dist)).filter(name => name.endsWith('.js') && !name.endsWith('.compact.js'));
const hash = source => createHash('sha256').update(source).digest('hex');
const lineBreaks = source => source.replace(/[^\r\n\u2028\u2029]/g, '');
const canonical = tree => JSON.stringify(tree, (key, value) => {
  if (['start', 'end', 'loc', 'range'].includes(key)) return undefined;
  return typeof value === 'bigint' ? { bigint: String(value) } : value;
});

function parse(source, sourceType) {
  const tokens = [], comments = [];
  const tree = acorn.parse(source, { ecmaVersion: 'latest', sourceType, onToken: tokens, onComment: comments });
  return { tree, tokens: tokens.filter(token => token.type.label !== 'eof'), comments };
}

function sameBoundary(left, right, sourceType) {
  try {
    const raw = left.raw + right.raw;
    const tokens = [...acorn.tokenizer(raw, { ecmaVersion: 'latest', sourceType })];
    return tokens.length === 2 && tokens.every((token, index) => {
      const original = index ? right : left;
      return token.type.label === original.type.label && raw.slice(token.start, token.end) === original.raw;
    });
  } catch {
    return false;
  }
}

function compact(source) {
  let parsed, sourceType = 'script';
  try { parsed = parse(source, sourceType); }
  catch { sourceType = 'module'; parsed = parse(source, sourceType); }
  const records = [
    ...parsed.tokens.map(token => ({ ...token, raw: source.slice(token.start, token.end) })),
    ...parsed.comments.map(comment => ({ ...comment, raw: source.slice(comment.start, comment.end), comment: true }))
  ].sort((a, b) => a.start - b.start);
  let output = '', previous;
  for (const item of records) {
    const gap = source.slice(previous?.end ?? 0, item.start);
    const breaks = lineBreaks(gap);
    if (breaks) output += breaks;
    else if (gap && previous && (previous.comment || item.comment || !sameBoundary(previous, item, sourceType))) output += ' ';
    output += item.raw;
    previous = item;
  }
  output += lineBreaks(source.slice(previous?.end ?? 0));
  const result = parse(output, sourceType);
  const rawTokens = record => record.tokens.map(token => [token.type.label, (record === parsed ? source : output).slice(token.start, token.end)]);
  if (JSON.stringify(rawTokens(parsed)) !== JSON.stringify(rawTokens(result)) || canonical(parsed.tree) !== canonical(result.tree)) {
    throw new Error('Whitespace compaction changed tokens or AST; no output will be accepted.');
  }
  return { output, sourceType };
}

const artifacts = [];
for (const name of names) {
  if (!/^[\w.-]+\.js$/.test(name) || name.endsWith('.compact.js')) throw new Error(`Expected a source JS basename: ${name}`);
  const source = await readFile(resolve(dist, name), 'utf8');
  const { output, sourceType } = compact(source);
  const target = name.replace(/\.js$/, '.compact.js');
  artifacts.push({ source: name, output: target, sourceType, sourceSha256: hash(source), outputSha256: hash(output), bytesBefore: Buffer.byteLength(source), bytesAfter: Buffer.byteLength(output), gzipBefore: gzipSync(source).length, gzipAfter: gzipSync(output).length, content: output });
}
if (!checkOnly) {
  for (const artifact of artifacts) await writeFile(resolve(dist, artifact.output), artifact.content);
  await writeFile(resolve(root, 'tools/compact-manifest.json'), JSON.stringify({ parser: `Acorn ${acorn.version}`, artifacts: artifacts.map(({ content, ...details }) => details) }, null, 2) + '\n');
}
console.log(JSON.stringify(artifacts.map(({ content, ...details }) => details), null, 2));
