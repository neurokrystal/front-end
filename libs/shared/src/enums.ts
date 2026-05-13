// libs/shared/src/enums.ts
export const SCORE_BANDS = ['very_low', 'low', 'almost_balanced', 'balanced', 'high_excessive'] as const;
export type ScoreBand = typeof SCORE_BANDS[number];

export const DOMAINS = ['safety', 'challenge', 'play'] as const;
export type Domain = typeof DOMAINS[number];

export const DIMENSIONS = ['self', 'others', 'past', 'future', 'senses', 'perception'] as const;
export type Dimension = typeof DIMENSIONS[number];

// Map dimensions to their parent domains
export const DIMENSION_TO_DOMAIN: Record<Dimension, Domain> = {
  self: 'safety',
  others: 'safety',
  past: 'challenge',
  future: 'challenge',
  senses: 'play',
  perception: 'play',
} as const;

export const ALIGNMENT_DIRECTIONS = ['masking_upward', 'masking_downward', 'aligned'] as const;
export type AlignmentDirection = typeof ALIGNMENT_DIRECTIONS[number];

export const ALIGNMENT_SEVERITIES = ['aligned', 'mild_divergence', 'significant_divergence', 'severe_divergence'] as const;
export type AlignmentSeverity = typeof ALIGNMENT_SEVERITIES[number];

export const REPORT_TYPES = [
  // Subject-facing
  'base', 'professional_self', 'under_pressure', 'relationship_patterns',
  'career_alignment', 'parenting_patterns', 'wellbeing',
  // Viewer-facing (leader)
  'leader_adapted',
  // Viewer-facing (comparison)
  'relational_compass', 'collaboration_compass', 'family_compass',
  // Corporate aggregate
  'team_architecture', 'burnout_risk', 'change_readiness', 'post_restructuring',
  // Coach
  'client_formulation', 'progress',
] as const;
export type ReportType = typeof REPORT_TYPES[number];

export const REPORT_AUDIENCES = ['subject_facing', 'viewer_facing', 'aggregate'] as const;
export type ReportAudience = typeof REPORT_AUDIENCES[number];

// Which audience each report type serves — config-driven lookup
export const REPORT_TYPE_AUDIENCE: Record<ReportType, ReportAudience> = {
  base: 'subject_facing',
  professional_self: 'subject_facing',
  under_pressure: 'subject_facing',
  relationship_patterns: 'subject_facing',
  career_alignment: 'subject_facing',
  parenting_patterns: 'subject_facing',
  wellbeing: 'subject_facing',
  leader_adapted: 'viewer_facing',
  relational_compass: 'viewer_facing',
  collaboration_compass: 'viewer_facing',
  family_compass: 'viewer_facing',
  team_architecture: 'aggregate',
  burnout_risk: 'aggregate',
  change_readiness: 'aggregate',
  post_restructuring: 'aggregate',
  client_formulation: 'viewer_facing',
  progress: 'subject_facing',
} as const;

export const INSTRUMENT_STATUSES = ['draft', 'active', 'retired'] as const;
export type InstrumentStatus = typeof INSTRUMENT_STATUSES[number];

export const RUN_STATUSES = ['in_progress', 'completed', 'abandoned', 'flagged'] as const;
export type RunStatus = typeof RUN_STATUSES[number];

export const SHARE_TARGET_TYPES = ['user', 'team', 'organisation', 'coach', 'public'] as const;
export type ShareTargetType = typeof SHARE_TARGET_TYPES[number];

export const SHARE_GRANT_STATUSES = ['active', 'revoked', 'expired'] as const;
export type ShareGrantStatus = typeof SHARE_GRANT_STATUSES[number];

export const USER_PROFILE_TYPES = ['full', 'viewer'] as const;
export type UserProfileType = typeof USER_PROFILE_TYPES[number];

export const PLATFORM_ROLES = ['super_admin', 'platform_admin'] as const;
export type PlatformRole = typeof PLATFORM_ROLES[number];

export const PEER_SHARE_DIRECTIONS = ['one_way', 'mutual'] as const;
export type PeerShareDirection = typeof PEER_SHARE_DIRECTIONS[number];

export const PEER_SHARE_STATUSES = ['pending', 'active', 'revoked', 'expired'] as const;
export type PeerShareStatus = typeof PEER_SHARE_STATUSES[number];

export const PROGRAMME_STATUSES = ['draft', 'active', 'archived'] as const;
export type ProgrammeStatus = typeof PROGRAMME_STATUSES[number];

export const PROGRAMME_ENROLMENT_STATUSES = ['enrolled', 'in_progress', 'completed', 'withdrawn'] as const;
export type ProgrammeEnrolmentStatus = typeof PROGRAMME_ENROLMENT_STATUSES[number];

export const TEAM_MEMBER_ROLES = ['leader', 'member'] as const;
export type TeamMemberRole = typeof TEAM_MEMBER_ROLES[number];

export const ITEM_RESPONSE_FORMATS = ['likert_5', 'likert_7', 'binary', 'free_text'] as const;
export type ItemResponseFormat = typeof ITEM_RESPONSE_FORMATS[number];

export const ITEM_CATEGORIES = [
  'feelings',         // Internal emotional experience
  'behaviours',       // Observable actions and patterns
  'beliefs',          // Cognitive frameworks and assumptions
  'general',          // General domain-level items
  'dimension',        // Dimension-specific items
  'excess',           // Overcompensation/excess markers
] as const;
export type ItemCategory = typeof ITEM_CATEGORIES[number];

export const PURCHASE_STATUSES = ['pending', 'completed', 'refunded', 'failed'] as const;
export type PurchaseStatus = typeof PURCHASE_STATUSES[number];

export const PURCHASE_TYPES = [
  'individual_assessment', 'org_seat_bundle', 'leader_adapted_report',
  // Secondary reports
  'professional_self', 'under_pressure', 'relationship_patterns',
  'career_alignment', 'parenting_patterns', 'wellbeing',
  // Comparison reports
  'relational_compass', 'collaboration_compass', 'family_compass',
] as const;
export type PurchaseType = typeof PURCHASE_TYPES[number];
