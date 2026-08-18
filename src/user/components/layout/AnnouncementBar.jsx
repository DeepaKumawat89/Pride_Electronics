import { ShieldCheck, Truck } from 'lucide-react'
import { initialShippingSettings } from '../../../data/shipping'
import { formatCurrency } from '../../utils/currency'

export default function AnnouncementBar({ shippingSettings = initialShippingSettings }) {
  return (
    <div className="bg-[#17211d] text-white">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-2 text-[11px] font-semibold sm:px-6 lg:px-10">
        <p className="flex items-center gap-2"><Truck size={13} className="text-[#ffb000]" /> Free shipping above {formatCurrency(shippingSettings.freeShippingThreshold)}</p>
        <p className="hidden items-center gap-2 sm:flex"><ShieldCheck size={13} className="text-[#8fd0a4]" /> 100% secure payments · 7-day easy returns</p>
        <p className="text-white/65">Help & Support</p>
      </div>
    </div>
  )
}
