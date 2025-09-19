import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import App from './routes/App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Home from './routes/Home.jsx';
import Catalog from './routes/Catalog.jsx';
import Product from './routes/Product.jsx';
import Cart from './routes/Cart.jsx';
import Checkout from './routes/Checkout.jsx';
import Orders from './routes/Orders.jsx';
import Login from './routes/Login.jsx';
import Register from './routes/Register.jsx';
import Verify from './routes/Verify.jsx';
import ResetPassword from './routes/ResetPassword.jsx';
import Profile from './routes/Profile.jsx';
import Wishlist from './routes/Wishlist.jsx';
import Contact from './routes/Contact.jsx';
import FAQ from './routes/FAQ.jsx';
import Notifications from './routes/Notifications.jsx';
import VerifyEmailSent from './routes/VerifyEmailSent.jsx';

function RequireGuest({ children }) {
  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
  return token ? <Navigate to="/" replace /> : children;
}

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/catalog', element: <Catalog /> },
      { path: '/product/:id', element: <Product /> },
      { path: '/cart', element: <Cart /> },
      { path: '/checkout', element: <Checkout /> },
      { path: '/orders/pending', element: <Orders /> },
      { path: '/orders/on-delivery', element: <Orders /> },
      { path: '/orders/completed', element: <Orders /> },
      { path: '/order/:id', element: <Orders /> },
      { path: '/profile', element: <Profile /> },
      { path: '/wishlist', element: <Wishlist /> },
      { path: '/contact', element: <Contact /> },
      { path: '/faq', element: <FAQ /> },
      { path: '/notifications', element: <Notifications /> },
      { path: '/login', element: (
        <RequireGuest>
          <Login />
        </RequireGuest>
      ) },
      { path: '/register', element: (
        <RequireGuest>
          <ErrorBoundary>
            <Register />
          </ErrorBoundary>
        </RequireGuest>
      ) },
      { path: '/verify', element: <Verify /> },
      { path: '/verify-sent', element: <VerifyEmailSent /> },
      { path: '/reset-password', element: <ResetPassword /> }
    ]
  }
]);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
