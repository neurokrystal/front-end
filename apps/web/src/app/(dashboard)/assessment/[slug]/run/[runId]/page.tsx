'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import type { RunDetailOutput } from '@dimensional/shared'

export default function RunPage({ params }: { params: { slug: string, runId: string } }) {
  const [runDetail, setRunDetail] = useState<RunDetailOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await api.instruments.getRunDetail(params.runId)
        if (mounted) setRunDetail(data)
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load run details')
      }
    }
    load()
    return () => { mounted = false }
  }, [params.runId])

  const handleResponse = async (itemId: string, value: number) => {
    setSavingId(itemId)
    try {
      await api.instruments.submitResponses(params.runId, [{ itemId, responseValue: value }])
      setRunDetail(prev => {
        if (!prev) return null
        const items = prev.items.map(item => 
          item.id === itemId ? { ...item, currentResponse: value } : item
        )
        const answeredItems = items.filter(i => i.currentResponse !== null).length
        return { ...prev, items, answeredItems }
      })
    } catch (e: any) {
      setError('Failed to save response. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  const completeRun = async () => {
    if (!runDetail) return
    if (runDetail.answeredItems < runDetail.totalItems) {
      if (!confirm('You haven\'t answered all questions. Are you sure you want to complete?')) {
        return
      }
    }

    setSubmitting(true)
    setError(null)
    try {
      await api.instruments.completeRun(params.runId)
      router.push('/reports')
    } catch (e: any) {
      setError(e?.message ?? 'Failed to complete run')
    } finally {
      setSubmitting(false)
    }
  }

  if (!runDetail && !error) return <div className="p-12 text-center text-muted-foreground font-light">Loading assessment...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border pb-4 pt-2 flex justify-between items-center">
        <div>
          <h1 className="font-heading text-2xl font-normal uppercase tracking-wide">{params.slug.replace('-', ' ')}</h1>
          <p className="text-sm text-muted-foreground font-light">
            Progress: {runDetail?.answeredItems ?? 0} / {runDetail?.totalItems ?? 0}
          </p>
        </div>
        <button 
          onClick={completeRun}
          disabled={submitting}
          className="px-6 py-2 bg-primary text-primary-foreground font-sans text-sm font-medium uppercase tracking-widest rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Completing...' : 'Finish & View Results'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-12 pb-24">
        {runDetail?.items.map((item, index) => (
          <div key={item.id} className="space-y-4 p-6 bg-card rounded-md border border-border shadow-card">
            <div className="flex justify-between">
              <span className="font-sans text-xs md:text-sm font-medium uppercase tracking-[0.2em] text-primary">Question {index + 1}</span>
              {savingId === item.id && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
            </div>
            <p className="font-heading text-xl md:text-2xl text-foreground font-normal leading-snug">{item.itemText}</p>
            
            <div className="flex justify-between items-center pt-4">
              <span className="text-xs font-sans text-muted-foreground uppercase tracking-wide">Strongly Disagree</span>
              <div className="flex gap-2 md:gap-4">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleResponse(item.id, val)}
                    className={`
                      w-10 h-10 md:w-12 md:h-12 rounded-full border-2 transition-all font-sans font-medium
                      ${item.currentResponse === val 
                        ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-elevated' 
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:text-primary'}
                    `}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <span className="text-xs font-sans text-muted-foreground uppercase tracking-wide">Strongly Agree</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
