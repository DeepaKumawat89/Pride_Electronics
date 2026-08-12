import { Cpu, MapPin, Phone, Mail, Globe, Share2, MessageSquare } from 'lucide-react'

export default function Footer({ onBeSellerClick }) {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Main 3-Column Footer Grid */}
        <div className="footer-main-grid">
          {/* Column 1: Brand & Contact Info */}
          <div className="footer-brand-col">
            <div className="brand-logo" style={{ marginBottom: '14px' }}>
              <div className="brand-icon-wrapper">
                <Cpu size={22} />
              </div>
              <div>
                <span className="brand-title">
                  PRIDE <span>ELECTRONICS</span>
                </span>
                <span className="brand-subtitle">Next-Gen Silicon & Hardware</span>
              </div>
            </div>

            <p className="footer-brand-desc">
              Pride Electronics is India’s premier destination for high-performance silicon, audiophile DACs, smart wearables, and custom DIY electronic components.
            </p>

            <div className="footer-contact-info">
              <div className="contact-row">
                <MapPin size={16} color="var(--blue)" />
                <span>XION Mall, Hinjawadi, Pune, MH - 411057</span>
              </div>
              <div className="contact-row">
                <Phone size={16} color="var(--emerald)" />
                <span>Toll-Free: 1800-419-8899 (Mon-Sat, 9AM-8PM)</span>
              </div>
              <div className="contact-row">
                <Mail size={16} color="var(--amber)" />
                <span>support@pride-electronics.com</span>
              </div>
            </div>

            <div className="footer-social-row">
              <a href="#" className="social-pill-btn" aria-label="Global Community"><Globe size={16} /></a>
              <a href="#" className="social-pill-btn" aria-label="Social Feed"><Share2 size={16} /></a>
              <a href="#" className="social-pill-btn" aria-label="Tech Forum"><MessageSquare size={16} /></a>
            </div>
          </div>

          {/* Column 2: Hardware Categories */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Hardware Catalog</h4>
            <ul className="footer-link-list">
              <li><a href="#">Silicon & Edge AI Boards</a></li>
              <li><a href="#">Audiophile DACs & Studio Amps</a></li>
              <li><a href="#">Smart Wearables & AR Optics</a></li>
              <li><a href="#">OLED Displays & Keyboards</a></li>
              <li><a href="#">Liquid Cooling & PC DIY</a></li>
              <li><a href="#">GaN III Ultra Fast Chargers</a></li>
            </ul>

            <button className="be-seller-btn" onClick={onBeSellerClick}>Be the Seller</button>
          </div>


          {/* Column 3: Customer Care & Portal */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Customer Care</h4>
            <ul className="footer-link-list">
              <li><a href="#">Track Your Order Status</a></li>
              <li><a href="#">2-Year Warranty Registration</a></li>
              <li><a href="#">Shipping & Express Delivery</a></li>
              <li><a href="#">Returns & Refund Policy</a></li>
              <li><a href="#">Technical Documentation & APIs</a></li>
              <li><a href="#">Experience Store Locator</a></li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom-bar">
          <p>© 2026 Pride Electronics India Pvt. Ltd. All rights reserved.</p>
          <div className="footer-legal-links">
            <a href="#">Privacy Policy</a>
            <span className="dot-divider">•</span>
            <a href="#">Terms of Service</a>
            <span className="dot-divider">•</span>
            <a href="#">Security Audit</a>
            <span className="dot-divider">•</span>
            <a href="#">Sitemap</a>
          </div>

          <div className="footer-made-in">
            <span>Engineered with ⚡ in India</span>
          </div>
        </div>


      </div>
    </footer>
  )
}
