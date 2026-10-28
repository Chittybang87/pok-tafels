import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'https://pokeapi.co/api/v2'
const MAX_ID = 1025
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, '../src/data/evolutions.json')

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

function speciesId(url) {
  return Number(url.split('/').filter(Boolean).pop())
}

function walk(node, stage, out, maxRef) {
  const id = speciesId(node.species.url)
  if (id >= 1 && id <= MAX_ID) {
    const evolvesTo = (node.evolves_to || [])
      .map((c) => speciesId(c.species.url))
      .filter((n) => n >= 1 && n <= MAX_ID)
    out[id] = { stage: Math.min(3, stage), evolvesTo }
    maxRef.v = Math.max(maxRef.v, Math.min(3, stage))
  }
  for (const child of node.evolves_to || []) {
    walk(child, stage + 1, out, maxRef)
  }
}

const list = await fetchJson(`${BASE}/evolution-chain?limit=600`)
const map = {}
console.log('chains:', list.results.length)

for (let i = 0; i < list.results.length; i++) {
  const chain = await fetchJson(list.results[i].url)
  const maxRef = { v: 1 }
  const local = {}
  walk(chain.chain, 1, local, maxRef)
  for (const [id, info] of Object.entries(local)) {
    map[id] = { ...info, chainSize: maxRef.v }
  }
  if ((i + 1) % 25 === 0) console.log('done', i + 1)
  await new Promise((r) => setTimeout(r, 35))
}

for (let id = 1; id <= MAX_ID; id++) {
  if (!map[id]) map[id] = { stage: 1, evolvesTo: [], chainSize: 1 }
}

fs.writeFileSync(outPath, JSON.stringify(map))
console.log('wrote', Object.keys(map).length, '→', outPath)
console.log('bulba', map[1], 'eevee', map[133], 'mewtwo', map[150])
