'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import type { InstrumentOutput } from '@dimensional/shared'

export default function PurchasePage({ params }: { params: { slug: string } }) {
  const [instrument, setInstrument] = useState<InstrumentOutput | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await api.instruments.get(params.slug)
        if (mounted) setInstrument(data)
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load instrument')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [params.slug])

  const handlePurchase = async () => {
    setPurchasing(true)
    setError(null)
    try {
      const res = await apiFetch<any>('/api/v1/billing/purchase', {
        method: 'POST',
        body: JSON.stringify({
          purchaseType: 'individual_assessment',
        })
      })
      
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl
      } else {
        router.push(`/assessment/${params.slug}`)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Purchase failed')
    } finally {
      setPurchasing(false)
    }
  }

  // Helper for apiFetch since it was used in previous code
  async function apiFetch<T>(path: string, options: any): Promise<T> {
     const res = await fetch(path, {
         ...options,
         headers: { 'Content-Type': 'application/json', ...options.headers }
     })
     return res.json()
  }

  if (loading) return <div className="p-12 text-center text-muted-foreground font-light italic">Loading...</div>

  return (
    <div className="p-6 max-w-xl mx-auto space-y-8">
      <div className="text-center space-y-2 py-12">
        <span className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground block mb-4">Investment in Yourself</span>
        <h1 className="font-heading text-4xl md:text-5xl font-normal leading-tight">Unlock <span className="italic">{instrument?.name}</span></h1>
        <p className="text-muted-foreground font-light max-w-prose mx-auto">Get deep insights into your psychological intelligence™ and professional potential.</p>
      </div>

      <div className="bg-card p-10 rounded-md border border-border shadow-card space-y-10 relative overflow-hidden">
        <div className="flex justify-between items-center relative z-10">
          <span className="text-muted-foreground font-sans text-sm font-medium uppercase tracking-widest">Assessment Fee</span>
          <span className="font-heading text-5xl font-light text-primary tracking-tight">$25.00</span>
        </div>
        
        <div className="space-y-6 relative z-10">
          <h3 className="font-sans text-xs font-medium uppercase text-muted-foreground tracking-[0.2em]">What's Included</h3>
          <ul className="space-y-4">
             {[
               'Full 66-item personality diagnostic',
               'Personalized Dimension Report',
               'Safety, Challenge, and Play analysis',
               'Lifetime access to your results'
             ].map((feature, i) => (
               <li key={i} className="flex items-center text-foreground font-sans font-light">
                 <svg className="h-4 w-4 text-primary mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                 </svg>
                 {feature}
               </li>
             ))}
          </ul>
        </div>

        <button 
          onClick={handlePurchase}
          disabled={purchasing}
          className="relative z-10 w-full py-4 bg-primary text-primary-foreground font-sans text-sm font-medium uppercase tracking-widest rounded-md hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-elevated disabled:opacity-50"
        >
          {purchasing ? 'Redirecting...' : 'Purchase & Start Assessment'}
        </button>
        
        {error && <p className="text-red-600 text-center text-sm">{error}</p>}
        
        <p className="text-xs text-gray-400 text-center">
          Secure payment processed by Stripe. No data is stored until purchase is complete.
        </p>
      </div>
    </div>
  )
}
