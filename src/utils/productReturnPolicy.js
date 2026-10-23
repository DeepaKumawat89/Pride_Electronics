export const RETURN_POLICY_TYPES = Object.freeze({
  RETURN: 'return',
  REPLACEMENT: 'replacement',
  NON_RETURNABLE: 'non-returnable',
})

export const RETURN_POLICY_OPTIONS = Object.freeze([
  { value: RETURN_POLICY_TYPES.RETURN, label: 'Return Available' },
  { value: RETURN_POLICY_TYPES.REPLACEMENT, label: 'Replacement Only' },
  { value: RETURN_POLICY_TYPES.NON_RETURNABLE, label: 'Non-Returnable / Non-Replaceable' },
])

export const CUSTOMER_RIGHTS_NOTICE =
  'Defective, damaged, or incorrect products remain covered by applicable customer rights.'

const optionFor = (type) => RETURN_POLICY_OPTIONS.find((option) => option.value === type)

export function normalizeProductReturnPolicy(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const option = optionFor(String(value.type || '').trim())
  if (!option) return null
  const days = option.value === RETURN_POLICY_TYPES.NON_RETURNABLE
    ? 0
    : Math.max(1, Math.min(365, Math.floor(Number(value.days) || 0)))
  if (option.value !== RETURN_POLICY_TYPES.NON_RETURNABLE && !days) return null
  return {
    type: option.value,
    label: option.label,
    days,
    conditions: String(value.conditions || '').trim(),
    customerRights: String(value.customerRights || CUSTOMER_RIGHTS_NOTICE).trim(),
  }
}

export function getProductReturnPolicyDisplay(value) {
  if (typeof value === 'string' && value.trim()) {
    return {
      type: 'legacy',
      label: 'Return / Replacement Policy',
      days: 0,
      conditions: value.trim(),
      customerRights: CUSTOMER_RIGHTS_NOTICE,
    }
  }
  const policy = normalizeProductReturnPolicy(value)
  if (!policy) {
    return {
      type: 'unspecified',
      label: 'Return / replacement policy not specified',
      days: 0,
      conditions: 'Contact Pride Circuit support for eligibility details.',
      customerRights: CUSTOMER_RIGHTS_NOTICE,
    }
  }
  return policy
}

