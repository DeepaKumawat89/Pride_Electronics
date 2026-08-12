import { Flame, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function OfferBanner() {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText('PRIDE20')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="offer-banner-container">
      <div className="offer-info">
        <div className="offer-icon">
          <Flame size={24} />
        </div>
        <div className="offer-text">
          <h3>Exclusive Electronics Flash Sale!</h3>
          <p>Get instant 20% OFF on all pro audio & microcontrollers with coupon code.</p>
        </div>
      </div>

      <div className="promo-badge">
        <span className="promo-code">PRIDE20</span>
        <button
          onClick={handleCopy}
          style={{
            background: 'transparent',
            border: 'none',
            color: copied ? 'var(--emerald)' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}
          title="Copy Promo Code"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
    </div>
  )
}
