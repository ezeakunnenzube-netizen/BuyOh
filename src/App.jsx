import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Footer from "./components/Footer"
import './App.css'
import Home from './pages/Home'
import Messages from './pages/Messages'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import ProductDetails from './pages/ProductDetails'
import SellItem from './pages/SellItem'
import MyAdverts from './pages/MyAdverts'
import { AuthProvider } from './context/AuthContext'

// Scroll to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return(
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/messages" element={<Messages/>}/>
        <Route path="/notifications" element={<Notifications/>}/>
        <Route path="/profile" element={<Profile/>}/>
        <Route path="/adverts" element={<MyAdverts/>}/>
        <Route path="/sell" element={<SellItem/>}/>
        <Route path="/product/:productId" element={<ProductDetails/>}/>
        <Route path="*" element={<Home/>}/>
      </Routes>
      <Footer/>
    </AuthProvider>
  )
}

export default App
