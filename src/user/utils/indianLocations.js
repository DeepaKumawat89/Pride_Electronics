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

const indianStateCodes = new Map([
  ['Jammu and Kashmir', '01'], ['Himachal Pradesh', '02'], ['Punjab', '03'],
  ['Chandigarh', '04'], ['Uttarakhand', '05'], ['Haryana', '06'], ['Delhi', '07'],
  ['Rajasthan', '08'], ['Uttar Pradesh', '09'], ['Bihar', '10'], ['Sikkim', '11'],
  ['Arunachal Pradesh', '12'], ['Nagaland', '13'], ['Manipur', '14'], ['Mizoram', '15'],
  ['Tripura', '16'], ['Meghalaya', '17'], ['Assam', '18'], ['West Bengal', '19'],
  ['Jharkhand', '20'], ['Odisha', '21'], ['Chhattisgarh', '22'], ['Madhya Pradesh', '23'],
  ['Gujarat', '24'], ['Dadra and Nagar Haveli and Daman and Diu', '26'],
  ['Maharashtra', '27'], ['Andhra Pradesh', '37'], ['Karnataka', '29'], ['Goa', '30'],
  ['Lakshadweep', '31'], ['Kerala', '32'], ['Tamil Nadu', '33'], ['Puducherry', '34'],
  ['Andaman and Nicobar Islands', '35'], ['Telangana', '36'], ['Ladakh', '38'],
])

export function getCanonicalIndianState(value) {
  const normalizedValue = normalizeLocationName(value)
  return (
    stateByNormalizedName.get(normalizedValue) ||
    stateAliases.get(normalizedValue) ||
    String(value || '').trim()
  )
}

export function getIndianStateCode(value) {
  return indianStateCodes.get(getCanonicalIndianState(value)) || ''
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
