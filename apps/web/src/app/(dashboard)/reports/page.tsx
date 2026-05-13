'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Link from 'next/link'
import type { ReportOutput } from '@dimensional/shared'

export default function ReportsListPage() {
  const [reports, setReports] = useState<ReportOutput[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await api.reports.list()
        if (mounted) setReports(data)
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load reports')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="p-6 text-center text-gray-500">Loading your reports...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <h1 className="font-heading text-2xl font-normal">My Reports</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-md border border-dashed border-border">
          <p className="text-muted-foreground mb-4 font-light">You haven't completed any assessments yet.</p>
          <Link href="/assessment/base-diagnostic" className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-sans text-sm font-medium uppercase tracking-widest hover:bg-primary/90 transition-colors">
            Start Base Diagnostic
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Link 
              key={report.id} 
              href={`/reports/${report.id}`}
              className="flex items-center justify-between p-4 bg-card rounded-md border border-border shadow-card hover:shadow-elevated hover:border-primary/50 transition-all"
            >
              <div>
                <h3 className="font-heading text-lg font-normal capitalize">{report.reportType.replace('_', ' ')} Report</h3>
                <p className="text-sm text-muted-foreground font-light">Generated on {new Date(report.generatedAt).toLocaleDateString()}</p>
              </div>
              <div className="text-primary font-sans text-xs font-medium uppercase tracking-widest flex items-center">
                View Report
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
