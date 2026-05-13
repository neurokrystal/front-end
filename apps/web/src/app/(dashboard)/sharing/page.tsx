'use client'

import { useState, useEffect } from 'react'
import { useMyShares, useSharedWithMe, useRevokeShare } from '@/lib/hooks/use-sharing'
import { ShareModal } from '@/components/sharing/share-modal'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api'
import type { ShareGrantOutput, AccessibleResource } from '@dimensional/shared'
import { Users, UserPlus, Heart, Briefcase, Home } from 'lucide-react'

export default function SharingPage() {
  const [activeTab, setActiveTab] = useState<'sharing' | 'shared-with-me' | 'peers'>('sharing')
  const { shares, loading: loadingShares, refetch: refetchShares } = useMyShares()
  const { resources, loading: loadingResources, refetch: refetchResources } = useSharedWithMe()
  const { revoke } = useRevokeShare()
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [selectedGrant, setSelectedGrant] = useState<ShareGrantOutput | null>(null)

  const handleRevoke = async (grantId: string) => {
    await revoke(grantId)
    refetchShares()
  }

  const handleModify = (grant: ShareGrantOutput) => {
    setSelectedGrant(grant)
    setIsShareModalOpen(true)
  }

  const handleShareNew = () => {
    setSelectedGrant(null)
    setIsShareModalOpen(true)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="font-heading text-2xl font-normal">Sharing & Connections</h1>
        <Button onClick={handleShareNew} className="btn-brand">+ Share with someone</Button>
      </div>

      <div className="flex border-b border-border space-x-1">
        <button
          className={`px-4 py-2 font-sans text-sm font-medium uppercase tracking-widest transition-colors ${activeTab === 'sharing' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('sharing')}
        >
          I'm Sharing
        </button>
        <button
          className={`px-4 py-2 font-sans text-sm font-medium uppercase tracking-widest transition-colors ${activeTab === 'shared-with-me' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('shared-with-me')}
        >
          Shared With Me
        </button>
        <button
          className={`px-4 py-2 font-sans text-sm font-medium uppercase tracking-widest transition-colors ${activeTab === 'peers' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('peers')}
        >
          Peers & Comparison
        </button>
      </div>

      <div className="space-y-4 mt-6">
        {activeTab === 'sharing' ? (
          <ImSharingTab 
            shares={shares} 
            loading={loadingShares} 
            onRevoke={handleRevoke}
            onModify={handleModify}
          />
        ) : activeTab === 'shared-with-me' ? (
          <SharedWithMeTab 
            resources={resources} 
            loading={loadingResources} 
          />
        ) : (
          <PeersTab />
        )}
      </div>

      {isShareModalOpen && (
        <ShareModal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)} 
          onSuccess={() => {
            refetchShares()
            setIsShareModalOpen(false)
          }}
          initialGrant={selectedGrant}
        />
      )}
    </div>
  )
}

function PeersTab() {
  const [peers, setPeers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)

  const fetchPeers = () => {
    setLoading(true)
    apiFetch<any[]>('/sharing/peers/me')
      .then(setPeers)
      .catch(() => setPeers([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPeers()
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return
    setInviteLoading(true)
    try {
      await apiFetch('/sharing/peers/invite', {
        method: 'POST',
        body: JSON.stringify({ recipientEmail: inviteEmail, direction: 'mutual' })
      })
      alert("Invitation sent!")
      setInviteEmail("")
      fetchPeers()
    } catch (err) {
      alert("Failed to send invitation")
    } finally {
      setInviteLoading(false)
    }
  }

  if (loading) return <div>Loading active peer shares...</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg font-normal flex items-center">
            <UserPlus className="mr-2 h-5 w-5 text-primary" />
            Invite a Peer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-2">
            <Input 
              placeholder="friend@example.com" 
              type="email" 
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={inviteLoading}>
              {inviteLoading ? "Sending..." : "Send Invite"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Inviting someone allows you both to compare results using Relational or Collaboration Compasses.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {peers.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-md border border-dashed border-border text-muted-foreground">
            No active peer shares yet.
          </div>
        ) : (
          peers.map((peer) => (
            <Card key={peer.id} className="p-4 shadow-card hover:shadow-elevated transition-shadow duration-normal">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-normal">{peer.recipientEmail || peer.recipientUserId}</h3>
                    <div className="flex space-x-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{peer.direction}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{peer.status}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" className="text-sunrise-mid border-sunrise-start/30 hover:bg-sunrise-start/10">
                    <Heart className="mr-1 h-4 w-4" /> Relational
                  </Button>
                  <Button size="sm" variant="outline" className="text-primary border-primary/30 hover:bg-primary/10">
                    <Briefcase className="mr-1 h-4 w-4" /> Collab
                  </Button>
                  <Button size="sm" variant="outline" className="text-domain-safety border-domain-safety/30 hover:bg-domain-safety/10">
                    <Home className="mr-1 h-4 w-4" /> Family
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

function ImSharingTab({ 
  shares, 
  loading, 
  onRevoke, 
  onModify 
}: { 
  shares: ShareGrantOutput[], 
  loading: boolean,
  onRevoke: (id: string) => void,
  onModify: (grant: ShareGrantOutput) => void
}) {
  if (loading) return <div>Loading active shares...</div>

  const activeShares = shares.filter(s => s.status === 'active')

  if (activeShares.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-md border border-dashed border-border">
        <p className="text-muted-foreground">You are not sharing any reports yet.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {activeShares.map((grant) => (
        <Card key={grant.id} className="p-4 shadow-card hover:shadow-elevated transition-shadow duration-normal">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-heading text-lg font-normal">
                Sharing with {getTargetLabel(grant)}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Reports: {grant.resourceTypes.length === 0 ? 'All current and future reports' : grant.resourceTypes.join(', ')}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Since: {new Date(grant.grantedAt).toLocaleDateString()}
                {grant.expiresAt && ` · Expires: ${new Date(grant.expiresAt).toLocaleDateString()}`}
                {!grant.expiresAt && ` · No expiry`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onModify(grant)}>Modify</Button>
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => onRevoke(grant.id)}>Revoke</Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function SharedWithMeTab({ 
  resources, 
  loading 
}: { 
  resources: AccessibleResource[], 
  loading: boolean 
}) {
  if (loading) return <div>Loading resources shared with you...</div>

  if (resources.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-md border border-dashed border-border">
        <p className="text-muted-foreground">No resources have been shared with you yet.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {resources.map((resource, idx) => (
        <Card key={idx} className="p-4 shadow-card hover:shadow-elevated transition-shadow duration-normal">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-heading text-lg font-normal">
                {resource.subjectDisplayName || 'Someone'} shared with you
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Reports: {resource.resourceTypes.length === 0 ? 'All reports' : resource.resourceTypes.join(', ')}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Via: {resource.grantType}
              </p>
            </div>
            <Button size="sm" className="btn-brand">View</Button>
          </div>
        </Card>
      ))}
    </div>
  )
}

function getTargetLabel(grant: ShareGrantOutput) {
  if (grant.targetType === 'user') return `User (${grant.targetUserId})`
  if (grant.targetType === 'team') return `Team (${grant.targetTeamId})`
  if (grant.targetType === 'org') return `Organization (${grant.targetOrgId})`
  return grant.targetType
}
