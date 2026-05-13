'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function ReportPage({ params }: { params: { reportId: string } }) {
  const [report, setReport] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const r = await api.reports.get(params.reportId)
        if (mounted) setReport(r)
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load report')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [params.reportId])

  if (loading) return <div className="p-12 text-center text-muted-foreground font-light">Loading Report...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-12 py-12">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
           <span className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground block mb-2">Psychological Intelligence™ Report</span>
           <h1 className="font-heading text-4xl font-normal leading-tight">Your Dimensional Architecture</h1>
           <p className="text-muted-foreground font-light mt-1 italic">Generated on {report?.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : 'N/A'}</p>
        </div>
        <button className="px-6 py-2 bg-secondary text-secondary-foreground rounded-md font-sans text-sm font-medium uppercase tracking-widest hover:bg-muted transition-colors border border-border">
          Download PDF
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-8">
          {/* This is where the renderer blocks would be mapped to components */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {/* Sample domain cards */}
             {['Safety', 'Challenge', 'Play'].map(domain => {
               const colorClass = domain === 'Safety' ? 'bg-domain-safety' : domain === 'Challenge' ? 'bg-domain-challenge' : 'bg-domain-play';
               const textColorClass = domain === 'Safety' ? 'text-domain-safety' : domain === 'Challenge' ? 'text-domain-challenge' : 'text-domain-play';
               return (
                 <div key={domain} className="p-8 bg-card rounded-md shadow-card border border-border space-y-4">
                   <h3 className="font-heading text-xl font-normal">{domain}</h3>
                   <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full w-2/3", colorClass)}></div>
                   </div>
                   <p className={cn("text-xs font-sans font-medium uppercase tracking-widest", textColorClass)}>"Balanced Presence"</p>
                 </div>
               );
             })}
          </div>

          <div className="space-y-8">
            <div className="flex items-center space-x-4">
              <div className="h-px flex-1 bg-border"></div>
              <h2 className="font-heading text-2xl font-normal uppercase tracking-[0.2em] text-primary px-4">Analysis Breakdown</h2>
              <div className="h-px flex-1 bg-border"></div>
            </div>
            <div className="space-y-6">
               {report.renderedPayload ? (
                 report.renderedPayload.map((block: any, i: number) => (
                   <div key={i} className="max-w-prose mx-auto bg-card p-10 rounded-md border border-border shadow-card leading-relaxed font-sans font-light text-lg">
                      <p className="text-foreground">{block.contentText}</p>
                   </div>
                 ))
               ) : (
                 <p className="text-center text-muted-foreground italic font-light">No detailed analysis available for this report.</p>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
