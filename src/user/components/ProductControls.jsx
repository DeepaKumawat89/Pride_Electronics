import { useState } from 'react'
import { Search, X, SlidersHorizontal, Check, Filter } from 'lucide-react'

export default function ProductControls({
  searchQuery,
  onSearchChange,
  categories,
  activeCategory,
  onCategoryChange,
  sortBy,
  onSortChange
}) {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)

  return (
    <div className="product-controls-bar glass-panel">
      <div className="controls-top-row">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search electronics by component name, specs, or category..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => onSearchChange('')} title="Clear search">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Desktop Sort Dropdown */}
        <div className="desktop-sort-wrapper">
          <SlidersHorizontal size={16} color="var(--blue)" />
          <select
            className="sort-dropdown"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="popular">Sort by: Most Popular</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated (★)</option>
            <option value="name">Name: A to Z</option>
          </select>
        </div>

        {/* Mobile Filter & Sort Button */}
        <button
          className={`mobile-filter-trigger-btn ${activeCategory !== 'All' || sortBy !== 'popular' ? 'has-active' : ''}`}
          onClick={() => setIsMobileFilterOpen(true)}
          title="Open Filters & Sorting"
        >
          <Filter size={16} />
          <span>Filters</span>
          {(activeCategory !== 'All' || sortBy !== 'popular') && <span className="active-filter-dot" />}
        </button>
      </div>

      {/* Category Pills Strip */}
      <div className="categories-scroll">
        {categories.map((category) => (
          <button
            key={category}
            className={`category-tab ${activeCategory === category ? 'active' : ''}`}
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Mobile Filter & Sort Bottom Sheet Drawer */}
      {isMobileFilterOpen && (
        <div className="mobile-filter-backdrop" onClick={() => setIsMobileFilterOpen(false)}>
          <div className="mobile-filter-sheet glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-filter-header">
              <div className="mobile-filter-title">
                <SlidersHorizontal size={18} color="var(--blue)" />
                <h3>Filter & Sort Hardware</h3>
              </div>
              <button
                className="close-filter-btn"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mobile-filter-body">
              {/* Sort By Section */}
              <div className="filter-group-block">
                <label className="filter-group-label">Sort Products By</label>
                <select
                  className="sort-dropdown mobile-select"
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value)}
                >
                  <option value="popular">Sort by: Most Popular</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated (★)</option>
                  <option value="name">Name: A to Z</option>
                </select>
              </div>

              {/* Categories Section */}
              <div className="filter-group-block">
                <label className="filter-group-label">Hardware Category</label>
                <div className="mobile-categories-grid">
                  {categories.map((category) => {
                    const isSelected = activeCategory === category
                    return (
                      <button
                        key={category}
                        className={`mobile-cat-pill ${isSelected ? 'active' : ''}`}
                        onClick={() => onCategoryChange(category)}
                      >
                        <span>{category}</span>
                        {isSelected && <Check size={14} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mobile-filter-footer">
              <button
                className="icon-btn secondary btn-full"
                onClick={() => {
                  onCategoryChange('All')
                  onSortChange('popular')
                  onSearchChange('')
                }}
              >
                Reset All
              </button>
              <button
                className="icon-btn primary btn-full"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

