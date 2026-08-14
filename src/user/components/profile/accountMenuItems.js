import {
  CreditCard,
  Heart,
  MapPin,
  Package,
  ShoppingBag,
  TicketPercent,
  UserRound,
} from 'lucide-react'

export const accountMenuItems = [
  { id: 'profile', label: 'My Profile', icon: UserRound },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'cart', label: 'Cart', icon: ShoppingBag },
  { id: 'address', label: 'Saved Address', icon: MapPin },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'coupons', label: 'Coupons', icon: TicketPercent },
]
