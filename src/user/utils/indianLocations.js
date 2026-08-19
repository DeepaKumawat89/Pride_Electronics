import citiesByState from '../../../node_modules/india-edu-cities-data/src/cities.json'

const normalizeLocationName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const states = Object.keys(citiesByState).sort((first, second) =>
  first.localeCompare(second),
)
const stateByNormalizedName = new Map(
  states.map((state) => [normalizeLocationName(state), state]),
)

const stateAliases = new Map([
  ['andaman and nicobar', 'Andaman and Nicobar Islands'],
  ['dadra and nagar haveli', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['daman and diu', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['jammu kashmir', 'Jammu and Kashmir'],
  ['national capital territory of delhi', 'Delhi'],
  ['nct of delhi', 'Delhi'],
  ['new delhi', 'Delhi'],
  ['orissa', 'Odisha'],
  ['pondicherry', 'Puducherry'],
  ['uttaranchal', 'Uttarakhand'],
])

export const INDIAN_STATES = states

export function getCanonicalIndianState(value) {
  const normalizedValue = normalizeLocationName(value)
  return (
    stateByNormalizedName.get(normalizedValue) ||
    stateAliases.get(normalizedValue) ||
    String(value || '').trim()
  )
}

export function getIndianCities(state) {
  const canonicalState = getCanonicalIndianState(state)
  if (!stateByNormalizedName.has(normalizeLocationName(canonicalState))) {
    return []
  }
  return citiesByState[canonicalState] || []
}

export function isCityInIndianState(city, state) {
  const normalizedCity = normalizeLocationName(city)
  return getIndianCities(state).some(
    (candidate) => normalizeLocationName(candidate) === normalizedCity,
  )
}
