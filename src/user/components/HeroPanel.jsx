import { Zap, ArrowRight, Sparkles } from 'lucide-react'

export default function HeroPanel({ onExploreClick }) {
  return (
    <section className="hero-container glass-panel">
      <div className="hero-glow-bg" />
      <div className="hero-content">
        <div className="hero-tag">
          <Sparkles size={14} />
          <span>Next-Gen Hardware Store</span>
        </div>

        <h1>
          Power Your Build with <span className="gradient-text">Pride Electronics</span>
        </h1>

        <p className="hero-subtitle">
          Explore cutting-edge neural compute boards, high-fidelity pro audio, titanium smart wearables, and premium custom peripherals. Engineered for performance enthusiasts and DIY innovators.
        </p>

        <div className="hero-cta-group">
          <button className="icon-btn primary btn-large" onClick={onExploreClick}>
            <span>Explore Catalog</span>
            <ArrowRight size={18} />
          </button>

          <a href="#featured-section" className="icon-btn btn-large" style={{ textDecoration: 'none' }}>
            <Zap size={18} color="var(--amber)" />
            <span>Top Rated Deals</span>
          </a>
        </div>

        <div className="hero-metrics">
          <div className="metric-item">
            <span className="metric-value">50K+</span>
            <span className="metric-label">Components Shipped</span>
          </div>
          <div className="metric-item">
            <span className="metric-value">4.9 ★</span>
            <span className="metric-label">User Satisfaction</span>
          </div>
          <div className="metric-item">
            <span className="metric-value">2-Year</span>
            <span className="metric-label">Hardware Warranty</span>
          </div>
        </div>
      </div>

      <div className="hero-showcase">
        <div className="hero-main-card">
          <img
            src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80"
            alt="Quantum NPU Board"
          />
          <div className="hero-floating-chip">
            <div>
              <div className="chip-title">Quantum NPU AI Board</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Edge Processing Core</div>
            </div>
            <div className="chip-spec">32 TOPS | PCIe 4.0</div>
          </div>
        </div>
      </div>
    </section>
  )
}
