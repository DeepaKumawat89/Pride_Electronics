import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, IndianRupee, Package, ReceiptText, ShoppingBag } from 'lucide-react'
import { EmptyState, PageHeader, StatCard } from '../components/ui/AdminUI'
import downloadInvoicePdf from '../../user/components/profile/InvoicePdf'
import { createPaymentRecords } from '../utils/payments'
import { formatAdminCurrency, moneyValue } from '../utils/adminFormatters'
import { getAvailableStock } from '../utils/inventory'

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

function downloadCsv(filename, headers, rows) {
  const contents = [headers, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(
    new Blob([`\ufeff${contents}`], { type: 'text/csv;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function ReportsPage({
  products = [],
  orders = [],
  customers = [],
  refunds = [],
  invoiceSettings,
  searchQuery = '',
}) {
  const [invoiceState, setInvoiceState] = useState({ id: '', error: '' })
  const payments = useMemo(() => createPaymentRecords(orders, refunds), [orders, refunds])
  const revenue = orders
    .filter((order) => !['Cancelled', 'Refunded'].includes(order.status))
    .reduce((sum, order) => sum + moneyValue(order.total), 0)
  const filteredOrders = orders.filter((order) =>
    !searchQuery || `${order.id} ${order.customer} ${order.email || ''}`.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const reports = [
    {
      title: 'Orders report',
      detail: `${orders.length} orders`,
      disabled: !orders.length,
      export: () => downloadCsv('pride-orders.csv', ['Order ID', 'Customer', 'Email', 'Date', 'Amount', 'Status', 'Payment Method', 'Payment Status'], orders.map((order) => [order.id, order.customer, order.email, order.date, order.total, order.status, order.paymentMethod, order.paymentStatus || ''])),
    },
    {
      title: 'Inventory report',
      detail: `${products.length} products`,
      disabled: !products.length,
      export: () => downloadCsv('pride-inventory.csv', ['Product', 'SKU', 'Category', 'Current Stock', 'Reserved Stock', 'Available Stock', 'Status'], products.map((product) => [product.name, product.sku, product.category, product.stock, product.reservedStock || 0, getAvailableStock(product), product.enabled === false ? 'Disabled' : 'Enabled'])),
    },
    {
      title: 'Customers report',
      detail: `${customers.length} customers`,
      disabled: !customers.length,
      export: () => downloadCsv('pride-customers.csv', ['Customer ID', 'Name', 'Email', 'Phone', 'Registration Date', 'Orders', 'Total Spending', 'Status'], customers.map((customer) => [customer.id, customer.name, customer.email, customer.phone, customer.joinedDate, customer.ordersCount, customer.totalSpent, customer.status])),
    },
    {
      title: 'Payments report',
      detail: `${payments.length} payments`,
      disabled: !payments.length,
      export: () => downloadCsv('pride-payments.csv', ['Transaction ID', 'Order ID', 'Customer', 'Amount', 'Method', 'Status', 'Date'], payments.map((payment) => [payment.id, payment.orderId, payment.customer, payment.amount, payment.method, payment.status, payment.date])),
    },
  ]

  const downloadInvoice = async (order) => {
    setInvoiceState({ id: order.id, error: '' })
    try {
      await downloadInvoicePdf(
        order,
        { name: order.customer, email: order.email, mobile: order.shippingAddress?.phone },
        order.shippingAddress,
        invoiceSettings,
      )
      setInvoiceState({ id: '', error: '' })
    } catch (error) {
      setInvoiceState({ id: '', error: error.message || 'Invoice could not be generated.' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Business intelligence" title="Reports & invoices" description="Export live operational data and generate the professional PDF invoice for any selected order." />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={IndianRupee} label="Net order value" value={formatAdminCurrency(revenue)} detail="Excludes cancelled and refunded" />
        <StatCard icon={ShoppingBag} label="Orders" value={orders.length} detail="All order records" tone="orange" />
        <StatCard icon={Package} label="Products" value={products.length} detail="Catalog records" tone="violet" />
        <StatCard icon={ReceiptText} label="Invoices" value={orders.length} detail="Available dynamically" tone="amber" />
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {reports.map((report) => (
          <article key={report.title} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#e4f1e7] text-[#397a4a]"><FileSpreadsheet size={17} /></span>
            <h3 className="mt-4 text-sm font-extrabold text-slate-900">{report.title}</h3><p className="mt-1 text-[9px] font-semibold text-slate-400">{report.detail}</p>
            <button type="button" disabled={report.disabled} onClick={report.export} className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-[#17251c] px-3 text-[8px] font-extrabold text-white transition hover:bg-[#397a4a] disabled:cursor-not-allowed disabled:opacity-35"><Download size={12} /> Export CSV</button>
          </article>
        ))}
      </section>
      {invoiceState.error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-bold text-red-700">{invoiceState.error}</p>}
      {!filteredOrders.length ? (
        <EmptyState title={orders.length ? 'No matching invoices' : 'No invoices available'} text={orders.length ? 'Try another order ID or customer name.' : 'Invoices become available after an order is placed.'} />
      ) : (
        <section className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-5 py-4 sm:px-6"><h3 className="text-sm font-extrabold text-slate-900">Order invoices</h3><p className="mt-1 text-[9px] text-slate-400">A4 tax invoices are created from the selected order and current invoice settings.</p></header>
          <div className="divide-y divide-slate-100">{filteredOrders.map((order) => <div key={order.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6"><div className="min-w-0 flex-1"><strong className="block text-[10px] text-[#397a4a]">{order.id}</strong><span className="mt-1 block truncate text-[9px] text-slate-500">{order.customer} · {order.date} · {order.total}</span></div><button type="button" disabled={invoiceState.id === order.id} onClick={() => downloadInvoice(order)} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-[#17251c] px-4 text-[8px] font-extrabold text-white transition hover:bg-[#397a4a] disabled:opacity-50"><Download size={12} /> {invoiceState.id === order.id ? 'Generating PDF…' : 'Download PDF invoice'}</button></div>)}</div>
        </section>
      )}
    </div>
  )
}
