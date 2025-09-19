// Cart utility functions for handling local and server cart merging

export const getLocalCart = () => {
  try {
    return JSON.parse(localStorage.getItem('localCart') || '[]');
  } catch {
    return [];
  }
};

export const setLocalCart = (cart) => {
  localStorage.setItem('localCart', JSON.stringify(cart));
};

export const clearLocalCart = () => {
  localStorage.removeItem('localCart');
};

export const mergeCarts = async (localCart, token) => {
  if (!localCart || localCart.length === 0) return;

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.chicknneeds.shop';
  
  try {
    // Get current server cart
    const serverResponse = await fetch(`${API_URL}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const serverCart = await serverResponse.json();
    
    if (!Array.isArray(serverCart)) {
      console.error('Failed to fetch server cart:', serverCart);
      return;
    }

    // Create a map of server cart items by productId for quick lookup
    const serverCartMap = new Map();
    serverCart.forEach(item => {
      serverCartMap.set(item.productId, item);
    });

    // Merge local cart items with server cart
    for (const localItem of localCart) {
      if (localItem.productId && localItem.quantity > 0) {
        const existingServerItem = serverCartMap.get(localItem.productId);
        
        if (existingServerItem) {
          // Update quantity if item exists on server
          await fetch(`${API_URL}/api/cart/${existingServerItem.id}`, {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json', 
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({ 
              quantity: existingServerItem.quantity + localItem.quantity 
            })
          });
        } else {
          // Add new item to server cart
          await fetch(`${API_URL}/api/cart`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({
              productId: localItem.productId,
              quantity: localItem.quantity
            })
          });
        }
      }
    }

    // Clear local cart after successful merge
    clearLocalCart();
    console.log('Cart merged successfully');
  } catch (error) {
    console.error('Failed to merge cart:', error);
  }
};
