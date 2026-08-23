const API_ROOT = 'https://api.jolpi.ca/ergast/f1/current'

export async function getSeasonData() {
  const getJson = async (path) => {
    const response = await fetch(`${API_ROOT}${path}`, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Jolpica відповів зі статусом ${response.status}`)
    return response.json()
  }

  const [schedule, drivers, constructors] = await Promise.all([
    getJson('.json'), getJson('/driverstandings.json'), getJson('/constructorstandings.json')
  ])

  return { schedule, drivers, constructors }
}
