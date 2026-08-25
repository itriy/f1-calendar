/**
 * Small, verified fallback for videos that are older than YouTube's public RSS
 * feed. The primary source is the Worker endpoint, which validates results from
 * the official FORMULA 1 channel before returning them to the browser.
 */
export type Formula1Video = {
  id: string
  title: string
  kind: 'race-highlights' | 'qualifying-highlights' | 'sprint-highlights' | 'race-moment'
}

const fallbackVideosByRace: Record<string, Formula1Video[]> = {
  // Race Highlights | 2025 Australian Grand Prix — FORMULA 1
  '2025-1': [
    { id: 'md9-jG4RzXs', title: 'Race Highlights | 2025 Australian Grand Prix', kind: 'race-highlights' },
    // Qualifying Highlights | 2025 Australian Grand Prix — FORMULA 1
    { id: 'Mr7T8TC-cZg', title: 'Qualifying Highlights | 2025 Australian Grand Prix', kind: 'qualifying-highlights' }
  ],
  // Race Highlights | 2025 Monaco Grand Prix — FORMULA 1
  '2025-8': [{ id: 'ajzQj7bjSWE', title: 'Race Highlights | 2025 Monaco Grand Prix', kind: 'race-highlights' }]
}

const youtubeId = /^[A-Za-z0-9_-]{11}$/

export function getFallbackFormula1Videos(season: string | number, round: string | number): Formula1Video[] {
  return fallbackVideosByRace[`${season}-${round}`] || []
}

/** Keeps iframe sources constrained to YouTube's privacy-enhanced embed host. */
export function officialYoutubeEmbedUrl(videoId: string): string | null {
  return youtubeId.test(videoId) ? `https://www.youtube-nocookie.com/embed/${videoId}` : null
}

type VideoApiResponse = { videos?: Formula1Video[] }

export async function loadFormula1Videos(season: string | number, round: string | number, raceName: string, signal?: AbortSignal): Promise<Formula1Video[]> {
  try {
    const params = new URLSearchParams({ season: String(season), round: String(round), race: raceName })
    const response = await fetch(`/api/f1-videos?${params}`, { signal })
    const data = await response.json().catch(() => null) as VideoApiResponse | null
    if (!response.ok || !Array.isArray(data?.videos)) throw new Error('Video search unavailable')
    const videos = data.videos.filter((video): video is Formula1Video => Boolean(video && youtubeId.test(video.id) && typeof video.title === 'string' && ['race-highlights', 'qualifying-highlights', 'sprint-highlights', 'race-moment'].includes(video.kind)))
    return videos.length ? videos : getFallbackFormula1Videos(season, round)
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    return getFallbackFormula1Videos(season, round)
  }
}
