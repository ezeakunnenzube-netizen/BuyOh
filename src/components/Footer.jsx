import "./Footer.css"
import {Home, MessageSquareMore, Bookmark, UserRound} from "lucide-react"
import {NavLink, useLocation, useSearchParams} from "react-router-dom"
import {useAuth} from "../context/AuthContext"

export default function Footer(){
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading, setIsAuthOpen } = useAuth();

  // Hide mobile tab footer when viewing an individual conversation in messages
  const isInIndividualChat = 
    location.pathname === '/messages' && 
    (Boolean(searchParams.get('chatId')) || Boolean(searchParams.get('productId')) || searchParams.toString().includes('chat'));

  if (isInIndividualChat) {
    return null;
  }

  const handleTabClick = (e, path) => {
    if (!loading && !user && path !== '/') {
      e.preventDefault();
      setIsAuthOpen(true);
    }
  };

  return(
    <nav className="mobile-tab-bar" aria-label="Main navigation">

      <NavLink to="/" className="tab-item" end replace>
        {({isActive})=>(
          <>
            <Home size={22} className={`tab-icon ${isActive ? 'tab-icon-active' : ''}`}/>
            <span className={`tab-label ${isActive ? 'tab-label-active' : ''}`}>Home</span>
          </>
        )}
      </NavLink>

      <NavLink to="/messages" className="tab-item" onClick={(e) => handleTabClick(e, '/messages')} replace>
        {({isActive})=>(
          <>
            <MessageSquareMore size={22} className={`tab-icon ${isActive ? 'tab-icon-active' : ''}`}/>
            <span className={`tab-label ${isActive ? 'tab-label-active' : ''}`}>Messages</span>
          </>
        )}
      </NavLink>

      {/* Centre Sell CTA */}
      <NavLink to="/sell" className="tab-item tab-item-sell" onClick={(e) => handleTabClick(e, '/sell')} replace>
        {()=>(
          <>
            <span className="tab-sell-circle">+</span>
            <span className="tab-label tab-label-sell">Sell</span>
          </>
        )}
      </NavLink>

      <NavLink to="/saved" className="tab-item" onClick={(e) => handleTabClick(e, '/saved')} replace>
        {({isActive})=>(
          <>
            <Bookmark size={22} className={`tab-icon ${isActive ? 'tab-icon-active' : ''}`}/>
            <span className={`tab-label ${isActive ? 'tab-label-active' : ''}`}>Saved</span>
          </>
        )}
      </NavLink>

      <NavLink to="/profile" className="tab-item" onClick={(e) => handleTabClick(e, '/profile')} replace>
        {({isActive})=>(
          <>
            <UserRound size={22} className={`tab-icon ${isActive ? 'tab-icon-active' : ''}`}/>
            <span className={`tab-label ${isActive ? 'tab-label-active' : ''}`}>Profile</span>
          </>
        )}
      </NavLink>

    </nav>
  )
}
