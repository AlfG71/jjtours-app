import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Catalog from './pages/Catalog'
import MyBookings from './pages/MyBookings'

export default function App() {
  const { t, i18n } = useTranslation()
  const toggleLang = () => i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en')

  return (
    <BrowserRouter>
      <header className="topbar">
        <span className="brand">JJ Tours</span>
        <nav>
          <NavLink to="/">{t('nav.tours')}</NavLink>
          <NavLink to="/mis-reservas">{t('nav.myBookings')}</NavLink>
          <button type="button" onClick={toggleLang}>{t('nav.language')}</button>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/mis-reservas" element={<MyBookings />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
