import { useTranslation } from 'react-i18next'

export default function MyBookings() {
  const { t } = useTranslation()
  return (
    <section>
      <h1>{t('myBookings.title')}</h1>
      <p className="muted">{t('myBookings.comingSoon')}</p>
    </section>
  )
}
