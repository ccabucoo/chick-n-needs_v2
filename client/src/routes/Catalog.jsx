import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { getImageUrl } from '../utils/imageUtils.js';
import { healthyFetch, debouncedFetch, RequestCanceller } from '../utils/apiHealth.js';

export default function Catalog() {
  const [params, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const requestCanceller = useRef(new RequestCanceller());
  
  // Filter states
  const [filters, setFilters] = useState({
    q: params.get('q') || '',
    categoryId: params.get('categoryId') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    sort: params.get('sort') || 'name',
    order: params.get('order') || 'asc',
    inStock: params.get('inStock') === 'true',
    tags: params.get('tags') || ''
  });
  
  // Applied filters (what's actually being used)
  const [appliedFilters, setAppliedFilters] = useState({});

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await healthyFetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/categories`);
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Failed to load categories:', error);
        setError('Failed to load categories');
      }
    };
    
    loadCategories();
  }, []);

  // Apply filters and fetch products with health management
  const applyFilters = async () => {
    setLoading(true);
    setError(null);
    setAppliedFilters({ ...filters });
    
    const url = new URL(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/products`);
    
    // Only add parameters that have meaningful values
    const nextParams = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '' && value !== false) {
        url.searchParams.set(key, value);
        nextParams[key] = String(value);
      }
    });
    // Also reflect filters in the browser URL for back/forward navigation
    setSearchParams(nextParams);
    
    try {
      // Cancel any existing request
      requestCanceller.current.cancel('products');
      const controller = requestCanceller.current.createController('products');
      
      const response = await healthyFetch(url.toString(), {
        signal: controller.signal
      });
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch products:', error);
        setError('Failed to load products. Please try again.');
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounced search function
  const debouncedApplyFilters = debouncedFetch(applyFilters, 500);

  // Load initial products on mount
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      requestCanceller.current.cleanup();
    };
  }, []);

  // Clear all filters
  const clearFilters = async () => {
    const clearedFilters = {
      q: '',
      categoryId: '',
      minPrice: '',
      maxPrice: '',
      sort: 'name',
      order: 'asc',
      inStock: false,
      tags: ''
    };
    setFilters(clearedFilters);
    setAppliedFilters({});
    setSearchParams({});
    
    // Fetch all products when clearing filters
    setLoading(true);
    setError(null);
    
    try {
      const response = await healthyFetch(`${import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop'}/api/products`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Failed to clear filters:', error);
      setError('Failed to load products. Please try again.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => 
      value && value !== '' && value !== 'name' && value !== 'asc' && value !== false
    ).length;
  };

  return (
    <div>
      <div>
        <h1>Product Catalog</h1>
        <div>
          <button
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="List View"
          >
            List
          </button>
        </div>
      </div>

      <div>
        <div>
          <div>
            <label>Search Products</label>
            <input
              placeholder="Search by name, description..."
              value={filters.q}
              onChange={e => {
                handleFilterChange('q', e.target.value);
                // Debounced search for better performance
                debouncedApplyFilters();
              }}
            />
          </div>

          <div>
            <label>Category</label>
            <select
              value={filters.categoryId}
              onChange={e => handleFilterChange('categoryId', e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Min Price</label>
            <select
              value={filters.minPrice}
              onChange={e => handleFilterChange('minPrice', e.target.value)}
            >
              <option value="">Any</option>
              <option value="100">₱100</option>
              <option value="300">₱300</option>
              <option value="500">₱500</option>
              <option value="1000">₱1,000</option>
              <option value="1500">₱1,500</option>
              <option value="2000">₱2,000</option>
              <option value="3000">₱3,000</option>
            </select>
          </div>

          <div>
            <label>Max Price</label>
            <select
              value={filters.maxPrice}
              onChange={e => handleFilterChange('maxPrice', e.target.value)}
            >
              <option value="">Any</option>
              <option value="300">₱300</option>
              <option value="500">₱500</option>
              <option value="1000">₱1,000</option>
              <option value="1500">₱1,500</option>
              <option value="2000">₱2,000</option>
              <option value="3000">₱3,000</option>
              <option value="5000">₱5,000</option>
            </select>
          </div>
        </div>

        <div>
          <div>
            <label>Sort By</label>
            <select
              value={filters.sort}
              onChange={e => handleFilterChange('sort', e.target.value)}
            >
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="createdAt">Newest</option>
            </select>
          </div>

          <div>
            <label>Order</label>
            <select
              value={filters.order}
              onChange={e => handleFilterChange('order', e.target.value)}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          <div>
            <input
              type="checkbox"
              id="inStock"
              checked={filters.inStock}
              onChange={e => handleFilterChange('inStock', e.target.checked)}
            />
            <label htmlFor="inStock">
              In Stock Only
            </label>
          </div>
        </div>

        <div>
          <div>
            {getActiveFilterCount() > 0 && (
              <span>{getActiveFilterCount()} filter(s) applied</span>
            )}
          </div>
          <div>
            <button
              onClick={clearFilters}
            >
              Clear Filters
            </button>
            <button
              onClick={applyFilters}
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '12px', 
          borderRadius: '8px', 
          margin: '16px 0',
          border: '1px solid #f5c6cb'
        }}>
          {error}
          <button 
            onClick={applyFilters}
            style={{ 
              marginLeft: '12px', 
              padding: '4px 8px', 
              background: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '12px' }}>
          <img
            src="https://loading.io/icon/xg33tl"
            alt="Loading"
            style={{ width: '48px', height: '48px' }}
          />
          <p>Loading products...</p>
        </div>
      ) : items.length === 0 ? (
        <div>
          <p>No products found. Try adjusting your filters.</p>
        </div>
      ) : (
        <div>
          {items.map(p => {
            const firstImage = (p.product_images && p.product_images[0]?.url) || null;
            const category = p.category?.name || 'Uncategorized';
            
            if (viewMode === 'list') {
              return (
                <Link key={p.id} to={`/product/${p.id}`}>
                  {firstImage && (
                    <img src={getImageUrl(firstImage)} alt={p.name} />
                  )}
                  <div>
                    <div>
                      <h3>{p.name}</h3>
                      <p>{category}</p>
                      <p>{p.description?.substring(0, 100)}...</p>
                    </div>
                    <div>
                      <div>₱{p.price}</div>
                      <div>
                        {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            }
            
            return (
              <Link key={p.id} to={`/product/${p.id}`}>
                {firstImage && (
                  <img src={getImageUrl(firstImage)} alt={p.name} />
                )}
                <div>
                  <h3>{p.name}</h3>
                  <p>{category}</p>
                  <div>₱{p.price}</div>
                  <div>
                    {Number(p.soldCount || 0)} sold
                  </div>
                  <div>
                    {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
