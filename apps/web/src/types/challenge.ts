export type ChallengeTrack = 'INTEL_RECON' | 'ACCESS_EXPLOIT' | 'IDENTITY_CLOUD' | 'C2_EGRESS' | 'DETECT_FORENSICS'
export type ChallengeDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'INSANE'
export type ChallengeMode = 'solo' | 'team'
export type ChallengeStatus = 
  | 'DRAFT' 
  | 'VALIDATION_PENDING'
  | 'VALIDATION_FAILED'
  | 'READY_FOR_MATERIALIZATION'
  | 'MATERIALIZATION_PENDING'
  | 'MATERIALIZATION_FAILED'
  | 'READY_FOR_PUBLISHING'
  | 'PUBLISHED'
  | 'ARCHIVED'
export type ValidatorType = 'builtin' | 'container'
export type NetworkPolicy = 'none' | 'egress_only'
export type ArtifactKind = 'pcap' | 'csv' | 'jsonl' | 'bin' | 'zip' | 'eml' | 'log' | 'image' | 'other'

export interface ValidationResult {
  id: string
  validation_type: 'initial' | 'post_materialization'
  status: 'passed' | 'failed'
  feedback: string
  score: number
  details: {
    description_clarity: number
    solution_completeness: number
    difficulty_appropriateness: number
    points_fairness: number
    artifacts_quality: number
    improvement_suggestions: string[]
  }
  created_at: string
}

export interface Challenge {
  id: string
  slug: string
  title: string
  track: ChallengeTrack
  difficulty: ChallengeDifficulty
  points_base: number
  time_cap_minutes: number
  mode: ChallengeMode
  status: ChallengeStatus
  description?: string
  solve_count?: number
  author_id: string
  created_at: string
  updated_at: string
  latest_validation?: ValidationResult
}

export interface ChallengeArtifact {
  file?: File
  kind: ArtifactKind
  original_filename: string
  size_bytes: number
}

export interface ChallengeHint {
  text: string
  cost_percent: number
  order: number
}

export interface ChallengeValidator {
  type: ValidatorType
  image?: string
  command?: string[]
  timeout_sec: number
  network_policy: NetworkPolicy
}

export interface ChallengeFormData {
  title: string
  slug: string
  track: ChallengeTrack
  difficulty: ChallengeDifficulty
  points_base: number
  time_cap_minutes: number
  mode: ChallengeMode
  description: string
  solution_guide: string
  tags: string[]
  artifacts: ChallengeArtifact[]
  hints: ChallengeHint[]
  validator: ChallengeValidator
}

export interface CreateChallengeRequest {
  challengeYaml: {
    id: string
    title: string
    track: ChallengeTrack
    difficulty: ChallengeDifficulty
    points: number
    time_cap_minutes: number
    mode: ChallengeMode
    description?: string
    artifacts?: Array<{
      s3_key: string
      sha256: string
      size_bytes: number
      kind: ArtifactKind
      path: string
    }>
    hints?: Array<{
      order: number
      text: string
      cost_percent: number
    }>
    validator: {
      type: ValidatorType
      image?: string
      cmd?: string[]
      timeout_sec: number
      network_policy: NetworkPolicy
    }
  }
  seasonId?: string
  weekIndex?: number
}