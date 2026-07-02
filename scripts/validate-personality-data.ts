import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const DATA_DIR = resolve(process.cwd(), 'public/data/personality')
const VALID_RIASEC = new Set(['R', 'I', 'A', 'S', 'E', 'C'])
const ALL_TYPES = [
  'ENFJ','ENFP','ENTJ','ENTP',
  'ESFJ','ESFP','ESTJ','ESTP',
  'INFJ','INFP','INTJ','INTP',
  'ISFJ','ISFP','ISTJ','ISTP',
]

let errors = 0

function fail(msg: string) {
  console.error(`  ✗ ${msg}`)
  errors++
}

function ok(msg: string) {
  console.log(`  ✓ ${msg}`)
}

function loadJson(relPath: string): unknown {
  const full = resolve(DATA_DIR, relPath)
  if (!existsSync(full)) {
    fail(`Missing file: ${relPath}`)
    return null
  }
  try {
    return JSON.parse(readFileSync(full, 'utf-8'))
  } catch {
    fail(`Invalid JSON: ${relPath}`)
    return null
  }
}

function hasLocalizedString(obj: Record<string, unknown>, field: string, path: string) {
  const v = obj[field] as Record<string, unknown> | undefined
  if (!v || typeof v !== 'object') { fail(`${path}.${field} missing`); return }
  if (!v['en']) fail(`${path}.${field}.en missing`)
  if (!v['ko']) fail(`${path}.${field}.ko missing`)
}

// ── 1. mbti/careers/_index.json ──────────────────────────────────────────────
console.log('\n[1] mbti/careers/_index.json')
const idx = loadJson('mbti/careers/_index.json') as Record<string, unknown> | null
if (idx) {
  const types = idx['types'] as Record<string, unknown> | undefined
  if (!types) { fail('types field missing') }
  else {
    for (const t of ALL_TYPES) {
      if (!types[t]) { fail(`Missing type: ${t}`); continue }
      const entry = types[t] as Record<string, unknown>
      const careers = entry['top_careers'] as unknown[]
      if (!Array.isArray(careers) || careers.length < 5) {
        fail(`${t}: needs at least 5 top_careers (got ${Array.isArray(careers) ? careers.length : 0})`)
      } else {
        ok(`${t}: ${careers.length} top careers`)
      }
    }
  }
}

// ── 2. mbti/careers/{TYPE}.json ───────────────────────────────────────────────
console.log('\n[2] mbti/careers/{TYPE}.json — detail files')
for (const t of ALL_TYPES) {
  const f = loadJson(`mbti/careers/${t}.json`) as Record<string, unknown> | null
  if (!f) continue
  const careers = f['top_careers'] as Array<Record<string, unknown>> | undefined
  if (!Array.isArray(careers) || careers.length < 20) {
    fail(`${t}: needs at least 20 careers (got ${Array.isArray(careers) ? careers.length : 0})`)
    continue
  }
  // Check for duplicate ids
  const ids = careers.map(c => c['id'])
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dupes.length > 0) fail(`${t}: duplicate career ids: ${dupes.join(', ')}`)
  // Check RIASEC codes
  for (const c of careers) {
    const riasec = c['riasec'] as string[] | undefined
    if (riasec) {
      for (const code of riasec) {
        if (!VALID_RIASEC.has(code)) fail(`${t} career ${c['id']}: invalid RIASEC code '${code}'`)
      }
    }
    hasLocalizedString(c, 'title', `${t}.${c['id']}`)
    hasLocalizedString(c, 'why_fit', `${t}.${c['id']}`)
  }
  ok(`${t}: ${careers.length} careers, no dupes`)
}

// ── 3. mbti/types.json ────────────────────────────────────────────────────────
console.log('\n[3] mbti/types.json')
const typesFile = loadJson('mbti/types.json') as Record<string, unknown> | null
if (typesFile) {
  const types = typesFile['types'] as Record<string, unknown> | undefined
  if (types) {
    for (const t of ALL_TYPES) {
      if (!types[t]) fail(`Missing type meta: ${t}`)
      else ok(`${t} meta present`)
    }
  }
}

// ── 4. Summary ────────────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────')
if (errors > 0) {
  console.error(`\n✗ Validation failed with ${errors} error(s)\n`)
  process.exit(1)
} else {
  console.log('\n✓ All personality data valid\n')
}
