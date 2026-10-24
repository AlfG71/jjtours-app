import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase, tourPhotoUrl } from '../lib/supabase'
import type { Tables } from '../lib/database.types'
import { loc } from '../i18n'
import { money } from '../lib/format'

type Tour = Tables<'tours'>

export default function Catalog() {
  const { t, i18n } = useTranslation()
  const [tours, setTours] = useState<Tour[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    supabase.from('tours').select('*').eq('is_active', true).order('sort_order')
      .then(({ data, error }) => { if (error) setError(true); else setTours(data) })
  }, [])

  if (error) return <p className="muted">{t('catalog.error')}</p>
  if (!tours) return <p className="muted">{t('catalog.loading')}</p>

  return (
    <section>
      <h1>{t('catalog.title')}</h1>
      {tours.length === 0 && <p className="muted">{t('catalog.empty')}</p>}
      <ul className="tour-grid">
        {tours.map((tour) => (
          <li key={tour.id} className="tour-card">
            {tour.cover_photo_path && <img src={tourPhotoUrl(tour.cover_photo_path)} alt="" loading="lazy" />}
            <div className="tour-card-body">
              <h2>{loc(tour, 'name', i18n.language)}</h2>
              <p className="muted">{loc(tour, 'summary', i18n.language)}</p>
              <p><strong>{t('catalog.from')} {money(tour.price_cents, i18n.language)}</strong> {t('catalog.perPerson')}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
