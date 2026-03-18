'use client'

import { useRouter } from 'next/navigation'

type Props = {
  title: string
  description: string
  onClick?: () => void
  href?: string
  accent?: 'blue' | 'neutral'
  eyebrow?: string
}

export default function ActionCard({
  title,
  description,
  onClick,
  href,
  accent = 'blue',
  eyebrow = 'Aktion',
}: Props) {
  const router = useRouter()

  function handleClick() {
    if (onClick) {
      onClick()
      return
    }

    if (href) {
      router.push(href)
    }
  }

  const accentClass =
    accent === 'blue'
      ? 'from-blue-50/90 to-white/70 border-blue-100/70'
      : 'from-slate-50/90 to-white/70 border-slate-200/80'

  const accentLineClass =
    accent === 'blue' ? 'bg-blue-950/75' : 'bg-slate-500/70'

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group h-full w-full rounded-[28px] border bg-gradient-to-br ${accentClass} p-5 text-left shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]`}
    >
      <p className="text-sm font-medium text-slate-500">{eyebrow}</p>

      <h2 className="mt-3 text-[22px] font-semibold leading-7 text-slate-900 transition group-hover:text-blue-950">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>

      <div
        className={`mt-5 h-[2px] w-10 rounded-full transition-all group-hover:w-16 ${accentLineClass}`}
      />
    </button>
  )
}