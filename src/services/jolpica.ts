import type { JolpicaResponse } from '../types/f1'

const API_ROOT = 'https://api.jolpi.ca/ergast/f1'

async function getJson(path: string): Promise<JolpicaResponse> {
  const response = await fetch(`${API_ROOT}${path}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Jolpica відповів зі статусом ${response.status}`)
  return response.json() as Promise<JolpicaResponse>
}

export async function getSeasonData() {
  const [schedule, drivers, constructors] = await Promise.all([getJson('/current.json'), getJson('/current/driverstandings.json'), getJson('/current/constructorstandings.json')])
  return { schedule, drivers, constructors }
}

export function getLastRaceResults() { return getJson('/current/last/results.json') }
export function getSeasonRaceWinners(season: string) { return getJson(`/${encodeURIComponent(season)}/results/1.json?limit=100`) }
export function getRaceResults(season: string, round: string) { return getJson(`/${encodeURIComponent(season)}/${encodeURIComponent(round)}/results.json?limit=100`) }

export async function getSeasonChampionshipLeaders(season: string) {
  const [drivers, constructors] = await Promise.all([
    getJson(`/${encodeURIComponent(season)}/driverstandings.json`),
    getJson(`/${encodeURIComponent(season)}/constructorstandings.json`)
  ])
  return { drivers, constructors }
}

export function getSeasons() { return getJson('/seasons.json?limit=100') }
