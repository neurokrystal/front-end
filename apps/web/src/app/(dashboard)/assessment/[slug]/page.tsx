'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/api'

export default function AssessmentLanding({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startRun = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.instruments.startRun(params.slug)
      router.push(`/assessment/${params.slug}/run/${res.id}`)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to start run')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container relative min-h-[80vh] flex flex-col items-center justify-center py-20">
      <div className="relative z-10 text-center max-w-2xl mx-auto space-y-8">
        <div>
          <span className="font-sans text-xs md:text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground block mb-4">Diagnostic Assessment</span>
          <h1 className="font-heading text-5xl md:text-7xl font-light leading-tight">
            Assessment: <span className="italic capitalize">{params.slug.replace('-', ' ')}</span>
          </h1>
        </div>
        
        <p className="font-sans text-lg md:text-xl font-light text-muted-foreground leading-relaxed">
          Embark on a journey of psychological intelligence. This assessment will help you understand your dimensional architecture with scientific precision.
        </p>

        <button 
          disabled={loading} 
          onClick={startRun} 
          className="px-8 py-4 bg-primary text-primary-foreground rounded-md font-sans text-sm font-medium uppercase tracking-widest hover:bg-primary/90 transition-all hover:scale-105 shadow-card"
        >
          {loading ? 'Initializing…' : 'Begin Assessment'}
        </button>

        {error && <p className="text-destructive mt-4 font-sans text-sm">{error}</p>}
      </div>

      {/* Background decorations */}
      <img 
        src="https://dimensionalsystem.com/wp-content/uploads/2025/02/Vector-6.png" 
        className="absolute left-0 top-1/2 -translate-y-1/2 opacity-25 pointer-events-none z-0 h-[80%] w-auto"
        alt=""
      />
      <img 
        src="https://dimensionalsystem.com/wp-content/uploads/2025/02/Vector-8.png" 
        className="absolute right-0 top-1/4 opacity-20 pointer-events-none z-0 h-[70%] w-auto"
        alt=""
      />
    </div>
  )
}
