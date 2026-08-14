import { getInitials } from '../../utils/text'
import { formatCurrency, parsePrice } from '../../user/utils/currency'

export const moneyValue = parsePrice
export const formatAdminCurrency = formatCurrency
export { getInitials }

export const statusTone = {
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  Processing: 'bg-sky-50 text-sky-700 ring-sky-200',
  Shipped: 'bg-violet-50 text-violet-700 ring-violet-200',
  Delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Cancelled: 'bg-red-50 text-red-700 ring-red-200',
}
