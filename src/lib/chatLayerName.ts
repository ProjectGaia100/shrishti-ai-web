/** Human-readable layer title for chatbot-added map layers. */

const DATASET_RULES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bndvi\b/i, label: 'NDVI' },
  { pattern: /\bndwi\b|\bwater\s*index\b/i, label: 'NDWI' },
  { pattern: /\bsentinel[\s-]?1\b|\bs1\s+(?:grd|sar)?\b|\bsar\s+radar\b/i, label: 'Sentinel-1 SAR' },
  { pattern: /\bsentinel[\s-]?2\b|\btrue\s*color\b|\boptical\b/i, label: 'Sentinel-2' },
  { pattern: /\belevation\b|\bdem\b|\bterrain\b|\bsrtm\b/i, label: 'Elevation' },
  { pattern: /\btemperature\b|\blst\b|\bthermal\b/i, label: 'Temperature' },
  { pattern: /\bnight\s*lights?\b|\bviirs\b|\bdnb\b/i, label: 'Night Lights' },
  { pattern: /\bland\s*cover\b|\bworldcover\b/i, label: 'Land Cover' },
  { pattern: /\brain(?:fall)?\b|\bchirps\b|\bprecipitation\b/i, label: 'Rainfall' },
  { pattern: /\bflood\b|\bwater\s*bod/i, label: 'Water / Flood' },
  { pattern: /\bfire\b|\bburn\b|\bwildfire\b/i, label: 'Fire' },
  { pattern: /\bndbi\b|\bnbi\b|\bbuilt[\s-]?up\b|\burban\b/i, label: 'NDBI (Built-up)' },
  { pattern: /\bvegetation\b/i, label: 'Vegetation' },
]

const REGION_RULES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bandhra\s+pradesh\b/i, label: 'Andhra Pradesh' },
  { pattern: /\btamil\s+nadu\b/i, label: 'Tamil Nadu' },
  { pattern: /\buttar\s+pradesh\b/i, label: 'Uttar Pradesh' },
  { pattern: /\bmadhya\s+pradesh\b/i, label: 'Madhya Pradesh' },
  { pattern: /\bwest\s+bengal\b/i, label: 'West Bengal' },
  { pattern: /\bkarnataka\b/i, label: 'Karnataka' },
  { pattern: /\bmaharashtra\b/i, label: 'Maharashtra' },
  { pattern: /\bkerala\b/i, label: 'Kerala' },
  { pattern: /\brandhrapradesh\b/i, label: 'Andhra Pradesh' },
  { pattern: /\btamilnadu\b/i, label: 'Tamil Nadu' },
  { pattern: /\bgoa\b/i, label: 'Goa' },
  { pattern: /\bindia\b/i, label: 'India' },
  { pattern: /\brajasthan\b/i, label: 'Rajasthan' },
  { pattern: /\bgujarat\b/i, label: 'Gujarat' },
  { pattern: /\bpunjab\b/i, label: 'Punjab' },
  { pattern: /\bbihar\b/i, label: 'Bihar' },
  { pattern: /\bassam\b/i, label: 'Assam' },
  { pattern: /\bcanada\b/i, label: 'Canada' },
]

function matchDataset(text: string): string | null {
  for (const { pattern, label } of DATASET_RULES) {
    if (pattern.test(text)) return label
  }
  return null
}

function matchRegion(text: string): string | null {
  for (const { pattern, label } of REGION_RULES) {
    if (pattern.test(text)) return label
  }
  return null
}

/** Strip filler words from a raw user query for fallback titles. */
function cleanQueryFallback(query: string): string {
  return query
    .replace(/^(please\s+)?(show|display|map|visuali[sz]e|load|add|get)\s+/i, '')
    .replace(/\s+(for|of|in|on|over|across)\s+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build a short, readable layer name for the layers panel.
 * Prefers dataset + region over truncated raw chat text.
 */
export function deriveChatLayerName(userMessage: string, responseText?: string): string {
  const sources = [userMessage, responseText ?? ''].filter(Boolean)
  const combined = sources.join(' ')

  let dataset: string | null = null
  for (const text of sources) {
    dataset = matchDataset(text)
    if (dataset) break
  }

  let region: string | null = null
  for (const text of sources) {
    region = matchRegion(text)
    if (region) break
  }

  if (dataset && region) return `${dataset} · ${region}`
  if (dataset) return dataset

  const fallback = cleanQueryFallback(userMessage)
  if (fallback.length > 0 && fallback.length <= 48) {
    return fallback.charAt(0).toUpperCase() + fallback.slice(1)
  }
  if (fallback.length > 48) {
    return fallback.slice(0, 45).trim() + '…'
  }

  if (responseText) {
    const fromResponse = responseText.split(/[.!?\n]/)[0]?.trim()
    if (fromResponse && fromResponse.length <= 56) {
      return fromResponse.length > 52 ? fromResponse.slice(0, 49) + '…' : fromResponse
    }
  }

  return 'AI Layer'
}
