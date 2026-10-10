import { useTranslation } from 'react-i18next'
import { Check, ChevronRight, MapPin, QrCode, Sparkles, Users } from 'lucide-react'
import hotpot from '@/assets/hotpot.jpg'
import { Button } from '@/components/ui/button'
import { featuredProductIds, getProduct } from '@/data/menu'
import { money } from '@/lib/utils'

const tableOptions = [
  { code: 'A08', areaKey: 'bind.area.hall', seats: 4 },
  { code: 'B12', areaKey: 'bind.area.booth', seats: 6 },
  { code: 'C06', areaKey: 'bind.area.room', seats: 4 },
  { code: 'D03', areaKey: 'bind.area.window', seats: 6 },
]

const featuredProducts = featuredProductIds.flatMap((id) => {
  const product = getProduct(id)
  return product ? [product] : []
})

interface HomeViewProps { onBind: (table: string) => void }

export function HomeView({ onBind }: HomeViewProps) {
  const { t } = useTranslation()
  return (
    <main className="min-h-screen overflow-hidden bg-rice-100 paper-noise">
      <section className="relative overflow-hidden lg:min-h-screen">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-chili-100 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-amber-100 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 py-6 sm:py-10 lg:min-h-screen lg:grid-cols-2 lg:gap-10 lg:px-10 lg:py-6">
          <section className="min-w-0 animate-rise">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-chili-500/20 bg-white/80 px-3 py-2 text-xs font-bold text-chili-600 shadow-sm sm:mb-7 lg:mb-4">
              <Sparkles size={14} /> {t('common.concept_badge')}
            </div>
            <p className="mb-3 text-sm font-bold tracking-widest text-chili-500">{t('common.concept_en')}</p>
            <h1 className="max-w-xl text-4xl font-extrabold leading-tight text-charcoal-900 sm:text-5xl">
              {t('bind.title_l1')}<br /><span className="text-chili-500">{t('bind.title_l2')}</span>
            </h1>
            <p className="mt-3 max-w-lg text-base leading-7 text-charcoal-500 sm:mt-5 lg:mt-3">{t('bind.desc')}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-charcoal-700 sm:mt-7 sm:gap-3 lg:mt-4">
              {[t('bind.feature1'), t('bind.feature2'), t('bind.feature3')].map((item) => (
                <span key={item} className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm"><Check size={15} className="text-chili-500" />{item}</span>
              ))}
            </div>
          </section>

          <section className="animate-rise rounded-3xl border border-white/80 bg-white/90 p-4 shadow-float backdrop-blur sm:p-6 lg:p-4">
            <div className="relative mb-6 h-48 overflow-hidden rounded-2xl sm:h-56 lg:mb-4 lg:h-40">
              <img src={hotpot} alt={t('bind.img_alt')} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/70 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
                <div><p className="text-xs opacity-80">{t('common.simulated_store')}</p><h2 className="text-xl font-bold">{t('common.store_name')}</h2></div>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur">{t('common.open')}</span>
              </div>
            </div>
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-rice-100 p-4 lg:mb-3 lg:p-3">
              <span className="rounded-xl bg-white p-3 text-chili-500 shadow-sm lg:p-2"><QrCode /></span>
              <div className="min-w-0 flex-1"><p className="font-bold text-charcoal-900">{t('bind.qr_title')}</p><p className="text-sm text-charcoal-500">{t('bind.qr_desc')}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {tableOptions.map(({ code, areaKey, seats }, index) => (
                <button key={code} onClick={() => onBind(code)} className="group rounded-2xl border border-charcoal-900/10 bg-white p-4 text-left transition hover:-translate-y-1 hover:border-chili-500 hover:shadow-card lg:p-3">
                  <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-rice-100 text-sm font-extrabold text-chili-500 lg:mb-2">{index + 1}</span>
                  <p className="font-bold text-charcoal-900">{code} · {t(areaKey)}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-charcoal-500"><Users size={13} /> {t('bind.seats', { count: seats })}</p>
                  <ChevronRight size={17} className="ml-auto mt-2 text-charcoal-500 transition group-hover:translate-x-1 group-hover:text-chili-500 lg:mt-1" />
                </button>
              ))}
            </div>
            <Button onClick={() => onBind('A08')} className="mt-4 w-full lg:mt-3"><MapPin size={17} />{t('bind.quick_enter')}</Button>
          </section>
        </div>
      </section>

      {featuredProducts.length > 0 && (
        <section className="relative mx-auto grid max-w-6xl gap-8 px-5 pb-12 pt-6 sm:pb-16 sm:pt-8 lg:grid-cols-2 lg:gap-10 lg:px-10 lg:pt-5" aria-labelledby="featured-dishes-title">
          <div className="min-w-0">
            <h2 id="featured-dishes-title" className="mb-3 flex items-center gap-2 text-lg font-extrabold text-charcoal-900">
              <Sparkles size={18} className="text-amber-500" />
              {t('home.featured_title')}
            </h2>
            <div className="scrollbar-none -mx-5 flex gap-3 overflow-x-auto px-5 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0">
              {featuredProducts.map((product) => (
                <article key={product.id} className="w-56 shrink-0 overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-card lg:w-auto lg:min-w-0">
                  <div className="relative h-24 overflow-hidden lg:h-16">
                    <img src={product.image} alt={t(product.name)} className="h-full w-full object-cover" />
                    {product.badge && (
                      <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-extrabold text-charcoal-900">
                        {t(product.badge)}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-2 min-h-10 text-sm font-extrabold leading-5 text-charcoal-900">{t(product.name)}</h3>
                    <p className="mt-1 text-base font-extrabold text-chili-500">
                      {money(product.price)} <small className="text-xs font-medium text-charcoal-500">{t('menu.from')}</small>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
