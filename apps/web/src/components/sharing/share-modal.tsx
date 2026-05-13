'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGrantShare } from '@/lib/hooks/use-sharing'
import { api } from '@/lib/api'
import type { ShareGrantOutput, GrantShareInput, ReportOutput } from '@dimensional/shared'

type Step = 1 | 2 | 3 | 4

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialGrant?: ShareGrantOutput | null
}

export function ShareModal({ isOpen, onClose, onSuccess, initialGrant }: ShareModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [targetSearch, setTargetSearch] = useState('')
  const [target, setTarget] = useState<{ type: 'user' | 'team' | 'org', id: string, name: string } | null>(null)
  const [selectedReports, setSelectedReports] = useState<string[]>([])
  const [shareAll, setShareAll] = useState(false)
  const [expiry, setExpiry] = useState<'indefinite' | '30' | '90' | 'custom'>('indefinite')
  const [customDate, setCustomDate] = useState('')
  const [availableReports, setAvailableReports] = useState<string[]>([])
  
  const { grant, loading } = useGrantShare()

  useEffect(() => {
    const loadReports = async () => {
      try {
        const reports = await api.reports.list()
        const types = Array.from(new Set(reports.map(r => r.reportType)))
        setAvailableReports(types)
        if (types.includes('base')) {
          setSelectedReports(['base'])
        } else if (types.length > 0) {
          setSelectedReports([types[0]])
        }
      } catch (e) {
        console.error('Failed to load reports', e)
        setAvailableReports(['base', 'professional_self', 'leader_adapted'])
        setSelectedReports(['base'])
      }
    }
    loadReports()
  }, [])

  useEffect(() => {
    if (initialGrant) {
      setTarget({
        type: initialGrant.targetType as any,
        id: initialGrant.targetUserId || initialGrant.targetTeamId || initialGrant.targetOrgId || '',
        name: initialGrant.targetUserId || initialGrant.targetTeamId || initialGrant.targetOrgId || ''
      })
      setSelectedReports(initialGrant.resourceTypes)
      setShareAll(initialGrant.resourceTypes.length === 0)
      if (initialGrant.expiresAt) {
        setExpiry('custom')
        setCustomDate(new Date(initialGrant.expiresAt).toISOString().split('T')[0])
      } else {
        setExpiry('indefinite')
      }
      setStep(2) // Skip Step 1 if modifying
    }
  }, [initialGrant])

  const handleNext = () => setStep((s) => (s + 1) as Step)
  const handleBack = () => setStep((s) => (s - 1) as Step)

  const handleShare = async () => {
    if (!target) return

    const input: GrantShareInput = {
      targetType: target.type as any,
      targetUserId: target.type === 'user' ? target.id : undefined,
      targetTeamId: target.type === 'team' ? target.id : undefined,
      targetOrgId: target.type === 'org' ? target.id : undefined,
      resourceTypes: shareAll ? [] : selectedReports,
      expiresAt: getExpiryDate(),
    }

    await grant(input)
    onSuccess()
  }

  const getExpiryDate = () => {
    if (expiry === 'indefinite') return undefined
    const date = new Date()
    if (expiry === '30') date.setDate(date.getDate() + 30)
    else if (expiry === '90') date.setDate(date.getDate() + 90)
    else if (expiry === 'custom' && customDate) return new Date(customDate).toISOString()
    else return undefined
    return date.toISOString()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 space-y-6 bg-white">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {initialGrant ? 'Modify Sharing' : 'Share with someone'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {/* Step Indicator */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className={`h-1 flex-1 rounded ${i <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-medium">Step 1: Who</h3>
            <div className="space-y-2">
              <Label>Search by name or email</Label>
              <Input 
                value={targetSearch} 
                onChange={(e) => setTargetSearch(e.target.value)} 
                placeholder="Enter email or name..."
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Quick options:</p>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setTarget({ type: 'user', id: 'mock-leader-id', name: 'My team leader' })
                  handleNext()
                }}>My team leader</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setTarget({ type: 'team', id: 'mock-team-id', name: 'My team' })
                  handleNext()
                }}>My team</Button>
              </div>
            </div>
            {targetSearch && (
               <Button className="w-full" onClick={() => {
                 setTarget({ type: 'user', id: targetSearch, name: targetSearch })
                 handleNext()
               }}>Select "{targetSearch}"</Button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-medium">Step 2: What</h3>
            <div className="space-y-3">
              {availableReports.map(reportType => (
                <div key={reportType} className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id={`report-${reportType}`}
                    checked={selectedReports.includes(reportType)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedReports([...selectedReports, reportType])
                      else setSelectedReports(selectedReports.filter(r => r !== reportType))
                    }}
                    disabled={shareAll}
                  />
                  <Label htmlFor={`report-${reportType}`} className="capitalize">
                    {reportType.replace('_', ' ')} Report
                  </Label>
                </div>
              ))}
              <hr />
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="share-all"
                  checked={shareAll}
                  onChange={(e) => setShareAll(e.target.checked)}
                />
                <Label htmlFor="share-all">Share all current and future reports</Label>
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={handleBack} disabled={!!initialGrant}>Back</Button>
              <Button onClick={handleNext} disabled={!shareAll && selectedReports.length === 0}>Next</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-medium">Step 3: How Long</h3>
            <div className="space-y-3">
              {[
                { value: 'indefinite', label: 'Indefinitely' },
                { value: '30', label: '30 days' },
                { value: '90', label: '90 days' },
                { value: 'custom', label: 'Custom date' },
              ].map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    id={`expiry-${opt.value}`}
                    name="expiry"
                    value={opt.value}
                    checked={expiry === opt.value}
                    onChange={(e) => setExpiry(e.target.value as any)}
                  />
                  <Label htmlFor={`expiry-${opt.value}`}>{opt.label}</Label>
                </div>
              ))}
              {expiry === 'custom' && (
                <Input 
                  type="date" 
                  value={customDate} 
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              )}
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={handleBack}>Back</Button>
              <Button onClick={handleNext} disabled={expiry === 'custom' && !customDate}>Next</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-medium">Step 4: Confirm</h3>
            <div className="p-4 bg-blue-50 rounded-lg text-sm space-y-2">
              <p>
                You are sharing <strong>{shareAll ? 'all current and future reports' : selectedReports.join(', ')}</strong> with <strong>{target?.name}</strong>, 
                {expiry === 'indefinite' ? ' with no expiry.' : ` expiring on ${getExpiryDate()?.split('T')[0]}.`}
              </p>
              <p className="text-gray-600">
                {target?.name} will be able to view the selected reports. You can revoke access at any time.
              </p>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={handleBack}>Back</Button>
              <Button onClick={handleShare} disabled={loading}>
                {loading ? 'Sharing...' : initialGrant ? 'Update Share' : 'Share'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
