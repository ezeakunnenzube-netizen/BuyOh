import { Poppins } from 'next/font/google';
import './globals.css';
import '../components/AuthModal.css';
import '../components/AvatarModal.css';
import '../components/Footer.css';
import '../views/Home.css';
import '../views/Messages.css';
import '../views/Notifications.css';
import '../views/Profile.css';
import '../views/ProductDetails.css';
import '../views/SellItem.css';
import '../views/MyAdverts.css';
import '../views/SavedAdverts.css';
import { AuthProvider } from '../context/AuthContext';
import Footer from '../components/Footer';

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata = {
  title: 'BuyOh! - Buy & Sell Easily in Nigeria',
  description: 'Nigeria’s premier online marketplace. Buy, sell, and discover amazing deals on phones, laptops, cars, fashion, property, and everyday goods with verified Nigerian buyers and sellers.',
  keywords: ['marketplace', 'buy in nigeria', 'sell in nigeria', 'lagos classifieds', 'abuja deals', 'buyoh'],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className={poppins.className}>
        <AuthProvider>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <main style={{ flex: '1 0 auto' }}>
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
