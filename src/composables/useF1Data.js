import { computed, onMounted, ref } from 'vue'
import { getLastRaceResults, getSeasonData } from '../services/jolpica'

const flags = {
  Australia: '🇦🇺', Austria: '🇦🇹', Azerbaijan: '🇦🇿', Bahrain: '🇧🇭', Belgium: '🇧🇪', Brazil: '🇧🇷', Canada: '🇨🇦', China: '🇨🇳',
  France: '🇫🇷', Germany: '🇩🇪', Hungary: '🇭🇺', Italy: '🇮🇹', Japan: '🇯🇵', Mexico: '🇲🇽', Monaco: '🇲🇨', Netherlands: '🇳🇱',
  Qatar: '🇶🇦', Singapore: '🇸🇬', Spain: '🇪🇸', UAE: '🇦🇪', UK: '🇬🇧', USA: '🇺🇸'
}
const teamColors = { mercedes: '#27f4d2', ferrari: '#e8002d', mclaren: '#ff8700', red_bull: '#3671c6', rb: '#6692ff', williams: '#64c4ff', aston_martin: '#229971', alpine: '#ff87bc', haas: '#b6babd', audi: '#e9e9e9', cadillac: '#d6aa61' }

export function getRaceStart(race) {
  if (!race?.date || !race?.time) return null
  const time = race.time.endsWith('Z') ? race.time : `${race.time}Z`
  const start = new Date(`${race.date}T${time}`)
  return Number.isNaN(start.getTime()) ? null : start
}

export function formatRaceStartLocal(race) {
  const start = getRaceStart(race)
  if (!start) return race?.date ? new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' }).format(new Date(`${race.date}T12:00:00Z`)) : 'Дата уточнюється'
  return new Intl.DateTimeFormat('uk-UA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(start)
}

export function useF1Data() {
  const season = ref(new Date().getUTCFullYear())
  const schedule = ref([])
  const drivers = ref([])
  const constructors = ref([])
  const loading = ref(true)
  const error = ref('')
  const updatedAt = ref('')
  const lastRace = ref(null)
  const resultsLoading = ref(true)
  const resultsError = ref('')
  const upcomingRaces = computed(() => {
    const now = Date.now()
    return schedule.value.filter((race) => {
      const start = getRaceStart(race)
      if (start) return start.getTime() > now
      return race.date ? new Date(`${race.date}T23:59:59Z`).getTime() > now : false
    }).slice(0, 4)
  })
  const nextRace = computed(() => upcomingRaces.value[0] ?? null)

  function driver(item) {
    const constructor = item.Constructors?.[0]
    return { pos: item.position, name: `${item.Driver.givenName} ${item.Driver.familyName}`, team: constructor?.name || '—', points: item.points, code: item.Driver.driverId, color: teamColors[constructor?.constructorId] || '#9ba1aa' }
  }
  function constructor(item) {
    return { pos: item.position, name: item.Constructor.name, team: item.Constructor.nationality, points: item.points, code: item.Constructor.constructorId, color: teamColors[item.Constructor.constructorId] || '#9ba1aa' }
  }
  function normalizeLastRace(race) {
    return {
      name: race.raceName,
      date: race.date,
      place: race.Circuit?.Location?.locality || '—',
      flag: flags[race.Circuit?.Location?.country] || '🏁',
      results: (race.Results || []).slice(0, 3).map((result) => ({
        position: result.position,
        name: `${result.Driver.givenName} ${result.Driver.familyName}`,
        team: result.Constructor?.name || '—',
        points: result.points,
        status: result.status
      }))
    }
  }
  async function loadLastResults() {
    resultsLoading.value = true
    resultsError.value = ''
    try {
      const data = await getLastRaceResults()
      const race = data.MRData?.RaceTable?.Races?.[0]
      if (!race?.Results?.length) throw new Error('Jolpica не повернув результати останнього етапу')
      lastRace.value = normalizeLastRace(race)
    } catch (cause) {
      console.error('Не вдалося завантажити результати останньої гонки', cause)
      resultsError.value = 'Не вдалося завантажити результати останнього етапу.'
    } finally {
      resultsLoading.value = false
    }
  }
  async function load() {
    loading.value = true
    error.value = ''
    try {
      const data = await getSeasonData()
      const raceTable = data.schedule.MRData?.RaceTable
      const driverList = data.drivers.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings
      const constructorList = data.constructors.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings
      if (!raceTable?.Races?.length || !driverList || !constructorList) throw new Error('Jolpica повернув неповні дані сезону')
      season.value = raceTable.season
      schedule.value = raceTable.Races.map((race) => ({ ...race, flag: flags[race.Circuit.Location.country] || '🏁' }))
      drivers.value = driverList.slice(0, 5).map(driver)
      constructors.value = constructorList.slice(0, 5).map(constructor)
      updatedAt.value = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' }).format(new Date())
    } catch (cause) {
      console.error('Не вдалося завантажити Jolpica-F1', cause)
      error.value = 'Не вдалося завантажити актуальні дані Jolpica-F1. Спробуйте оновити сторінку.'
    } finally {
      loading.value = false
    }
    loadLastResults()
  }

  onMounted(load)
  return { season, schedule, drivers, constructors, loading, error, updatedAt, upcomingRaces, nextRace, lastRace, resultsLoading, resultsError, load, loadLastResults }
}
