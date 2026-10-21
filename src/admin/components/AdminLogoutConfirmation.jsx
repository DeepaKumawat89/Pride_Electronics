import { LogOut } from 'lucide-react'

export default function AdminLogoutConfirmation({ onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-logout-title"
        className="w-full max-w-sm rounded-[26px] bg-white p-6 text-center shadow-2xl"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-500">
          <LogOut size={23} />
        </span>
        <h2 id="admin-logout-title" className="mt-4 text-lg font-extrabold text-slate-950">
          Log out of the admin panel?
        </h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          You’ll need to sign in again to access store management.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="rounded-full border border-slate-200 px-4 py-3 text-xs font-extrabold text-slate-600">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="rounded-full bg-red-500 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-red-600">
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}
