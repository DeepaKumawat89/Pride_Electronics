import { ArrowLeft } from 'lucide-react'
import ProductCatalog from './ProductCatalog'

export default function ProductsPage({
  products,
  filteredProducts,
  suggestedProducts,
  categories,
  subcategories = [],
  query,
  activeCategory,
  activeCategoryId,
  activeSubcategory,
  sortBy,
  likedIds,
  loading,
  error,
  onRetry,
  onBack,
  onCategoryChange,
  onSubcategoryChange,
  onSortChange,
  onProductSelect,
  onLike,
  onAdd,
  onBuyNow,
}) {
  const availableCategories = categories.filter(
    (category) => category.enabled !== false,
  )
  const categoryNames = availableCategories.map((category) => category.name)
  return (
    <div className="min-h-[70vh] bg-[#fafbf8]">
      <section className="bg-white">
        <div className="mx-auto flex max-w-[1680px] items-center px-3 py-2 sm:px-4 lg:px-5 xl:px-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[10px] font-extrabold text-slate-700 transition duration-200 hover:border-[#ff5c35] hover:text-[#ff5c35] hover:shadow-sm"
          >
            <ArrowLeft size={13} />
            <span>Back</span>
          </button>
        </div>
      </section>

      <ProductCatalog
        products={filteredProducts}
        allProducts={products}
        categories={availableCategories}
        subcategories={subcategories}
        suggestedProducts={suggestedProducts}
        onSuggestedCategoryChange={onCategoryChange}
        activeCategory={activeCategory}
        activeCategoryId={activeCategoryId}
        selectedSubcategory={activeSubcategory}
        onCategoryChange={onCategoryChange}
        onSubcategoryChange={onSubcategoryChange}
        sortBy={sortBy}
        onSortChange={onSortChange}
        likedIds={likedIds}
        onLike={onLike}
        onAdd={onAdd}
        onBuyNow={onBuyNow}
        onView={onProductSelect}
        categoryNames={categoryNames}
        showPromotions={false}
        loading={loading}
        error={error}
        onRetry={onRetry}
        initialVisibleCount={24}
        productBatchSize={24}
        paginationResetKey={`catalog:${activeCategory}:${query}:${sortBy}`}
      />
    </div>
  )
}
