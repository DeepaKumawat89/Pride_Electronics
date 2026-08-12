import { ArrowRight, Eye, LockKeyhole, Mail, X } from 'lucide-react'
import { useState } from 'react'
import Brand from '../common/Brand'

export default function AuthModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = useState('login')
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="relative w-full max-w-md rounded-[30px] bg-[#f7f8f5] p-6 shadow-2xl sm:p-8">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-white"><X size={17}/></button>
        <Brand />
        <h2 className="mt-8 text-3xl font-extrabold tracking-[-0.04em]">{mode === 'login' ? 'Welcome back.' : 'Join Pride+.'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{mode === 'login' ? 'Sign in to see your orders, saved items and member prices.' : 'Create an account and get ₹500 off your first order.'}</p>
        <form onSubmit={(event) => { event.preventDefault(); onSuccess(); onClose() }} className="mt-7 space-y-3">
          {mode === 'signup' && <input required placeholder="Full name" className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#ff5c35]"/>}
          <label className="relative block"><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input required type="email" placeholder="Email address" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-[#ff5c35]"/></label>
          <label className="relative block"><LockKeyhole size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input required type="password" placeholder="Password" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-11 text-sm outline-none focus:border-[#ff5c35]"/><Eye size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"/></label>
          <button className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 text-sm font-extrabold text-white transition hover:bg-[#ff5c35]">{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16}/></button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">{mode === 'login' ? 'New to Pride?' : 'Already a member?'} <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="font-extrabold text-[#ff5c35]">{mode === 'login' ? 'Create account' : 'Sign in'}</button></p>
      </div>
    </div>
  )
}
