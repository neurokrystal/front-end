export const EMAIL_TEMPLATE_LABELS: Record<string, string> = {
  user_registered: 'User Registration',
  assessment_completed: 'Assessment Completed',
  report_ready: 'Report Ready',
  share_granted: 'Report Shared',
  share_revoked: 'Share Access Revoked',
  seat_invitation: 'Organisation Seat Invitation',
  purchase_completed: 'Purchase Confirmation',
  cert_expiry_warning: 'Certification Expiry Warning',
  deletion_requested: 'Deletion Request Received',
  deletion_completed: 'Deletion Completed',
  programme_enrolled: 'Programme Enrolment',
  // Additional IDs that may exist in seeds
  cert_lapsed: 'Certification Lapsed',
  programme_completed: 'Programme Completed',
};

export function getTemplateLabel(id: string): string {
  const mapped = EMAIL_TEMPLATE_LABELS[id];
  if (mapped) return mapped;
  // Fallback: humanise the id (snake_case -> Title Case)
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
