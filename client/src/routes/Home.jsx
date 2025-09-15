import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Home() {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/categories`).then(r => r.json()).then(setCategories);
  }, []);
  return (
    <div>
      <div>
        <h1>Welcome to Chick'N Needs</h1>
        <p>Your one-stop shop for all poultry farming essentials</p>
        <div>
          <Link to="/catalog">Browse Products</Link>
          <Link to="/register">Get Started</Link>
        </div>
      </div>
      
      <div>
        <h2>Why Choose Chick'N Needs?</h2>
        <div>
          <div>
            <div>🏪</div>
            <h3>Wide Selection</h3>
            <p>Comprehensive range of feeds, equipment, and supplies for all your poultry needs.</p>
          </div>
          <div>
            <div>🚚</div>
            <h3>Fast Delivery</h3>
            <p>Quick and reliable delivery to your farm, ensuring your birds are always well-supplied.</p>
          </div>
          <div>
            <div>💯</div>
            <h3>Quality Guaranteed</h3>
            <p>Premium quality products from trusted brands, backed by our satisfaction guarantee.</p>
          </div>
        </div>
      </div>
      
      <div>
        <h2>Shop by Category</h2>
        <div>
          {categories.map(c => (
            <Link key={c.id} to={`/catalog?categoryId=${c.id}`}>
              <div>📦</div>
              <h3>{c.name}</h3>
              <p>Explore our {c.name.toLowerCase()} collection</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}


