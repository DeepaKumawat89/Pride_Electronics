import { useState } from 'react'
import UserApp from './user/UserApp'
import AdminApp from './admin/AdminApp'
import { products as initialProducts } from './data/products'
import { initialOrders, initialCustomers } from './data/adminData'

function App() {
  const [activePortal, setActivePortal] = useState('user') // 'user' | 'admin'
  const [productsList, setProductsList] = useState(initialProducts)
  const [ordersList, setOrdersList] = useState(initialOrders)
  const [customersList] = useState(initialCustomers)

  // Handlers for Admin actions on Products
  const handleAddProduct = (newProduct) => {
    setProductsList((prev) => [newProduct, ...prev])
  }

  const handleUpdateProduct = (updatedProduct) => {
    setProductsList((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)),
    )
  }

  const handleDeleteProduct = (productId) => {
    setProductsList((prev) => prev.filter((p) => p.id !== productId))
  }

  // Handler for Admin action on Order Status
  const handleUpdateOrderStatus = (orderId, newStatus) => {
    setOrdersList((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
    )
  }

  // Handler for User checkout order placement
  const handleNewOrder = (newOrder) => {
    setOrdersList((prev) => [newOrder, ...prev])
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5] font-sans text-slate-950 antialiased">
      {/* Render Selected View */}
      {activePortal === 'user' ? (
        <UserApp
          products={productsList}
          onNewOrder={handleNewOrder}
          onBeSellerClick={() => setActivePortal('admin')}
        />
      ) : (
        <AdminApp
          products={productsList}
          orders={ordersList}
          customers={customersList}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onSwitchToStore={() => setActivePortal('user')}
        />
      )}
    </div>
  )
}

export default App
