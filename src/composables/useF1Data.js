import { computed, onMounted, ref } from 'vue'
import { getSeasonData } from '../services/jolpica'

const flags = {
  Australia: '🇦🇺', Austria: '🇦🇹', Azerbaijan: '🇦🇿', Bahrain: '🇧🇭', Belgium: '🇧🇪', Brazil: '🇧🇷', Canada: '🇨🇦', China: '🇨🇳',
  France: '🇫🇷', Germany: '🇩🇪', Hungary: '🇭🇺', Italy: '🇮🇹', Japan: '🇯🇵', Mexico: '🇲🇽', Monaco: '🇲🇨', Netherlands: '🇳🇱',
  Qatar: '🇶🇦', Singapore: '🇸🇬', Spain: '🇪🇸', UAE: '🇦🇪', UK: '🇬🇧', USA: '🇺🇸'
}
const teamColors = { mercedes: '#27f4d2', ferrari: '#e8002d', mclaren: '#ff8700', red_bull: '#3671c6', rb: '#6692ff', williams: '#64c4ff', aston_martin: '#229971', alpine: '#ff87bc', haas: '#b6babd', audi: '#e9e9e9', cadillac: '#d6aa61' }

export function useF1Data() {
  const season = ref(new Date().getUTCFullYear())
  const schedule = ref([])
  const drivers = ref([])
  const constructors = ref([])
  const loading = ref(true)
  const error = ref('')
  const updatedAt = ref('')
  const upcomingRaces = computed(() => {
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)
    return schedule.value.filter((race) => new Date(`${race.date}T23:59:59Z`) >= today).slice(0, 4)
  })
  const nextRace = computed(() => upcomingRaces.value[0] ?? null)

  function driver(item) {
    const constructor = item.Constructors?.[0]
    return { pos: item.position, name: `${item.Driver.givenName} ${item.Driver.familyName}`, team: constructor?.name || '—', points: item.points, code: item.Driver.driverId, color: teamColors[constructor?.constructorId] || '#9ba1aa' }
  }
  function constructor(item) {
    return { pos: item.position, name: item.Constructor.name, team: item.Constructor.nationality, points: item.points, code: item.Constructor.constructorId, color: teamColors[item.Constructor.constructorId] || '#9ba1aa' }
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
  }

  onMounted(load)
  return { season, schedule, drivers, constructors, loading, error, updatedAt, upcomingRaces, nextRace, load }
}
