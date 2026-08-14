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
  { id: 'orders', label: 'My Orders', icon: Package },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'cart', label: 'Cart', icon: ShoppingBag },
  { id: 'payment', label: 'Saved Cards & Wallet', icon: CreditCard },
  { id: 'address', label: 'Saved Address', icon: MapPin },
  { id: 'coupons', label: 'Coupons', icon: TicketPercent },
]
