'use client';

import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'stat' | 'action' | 'panel';
}

export function GlassCard({ children, className = '', variant = 'default' }: GlassCardProps) {
  const variants = {
    default: 'glass-card',
    stat: 'glass-card glass-card-stat',
    action: 'glass-card glass-card-action',
    panel: 'glass-card glass-card-panel',
  } as const;

  return (
    <div className={`${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}
