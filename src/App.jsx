import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Footer from "./components/Footer"
import './App.css'
import Home from './pages/Home'
import Messages from './pages/Messages'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import { AuthProvider } from './context/AuthContext'

function App() {
  return(
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/messages" element={<Messages/>}/>
        <Route path="/notifications" element={<Notifications/>}/>
        <Route path="/profile" element={<Profile/>}/>
        <Route path="*" element={<Home/>}/>
      </Routes>
      <Footer/>
    </AuthProvider>
  )
}

export default App
