// Core domain enums
export enum UserRole {
  ADMIN = 'ADMIN',
  AUTHOR = 'AUTHOR',
  REVIEWER = 'REVIEWER',
  PARTICIPANT = 'PARTICIPANT',
  OBSERVER = 'OBSERVER'
}

export enum ChallengeTrack {
  INTEL_RECON = 'INTEL_RECON',
  ACCESS_EXPLOIT = 'ACCESS_EXPLOIT',
  IDENTITY_CLOUD = 'IDENTITY_CLOUD',
  C2_EGRESS = 'C2_EGRESS',
  DETECT_FORENSICS = 'DETECT_FORENSICS'
}

export enum ChallengeDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  INSANE = 'INSANE'
}

export enum ChallengeMode {
  SOLO = 'solo',
  TEAM = 'team'
}

export enum ChallengeStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export enum ArtifactKind {
  PCAP = 'pcap',
  CSV = 'csv',
  JSONL = 'jsonl',
  BIN = 'bin',
  ZIP = 'zip',
  EML = 'eml',
  LOG = 'log',
  IMAGE = 'image',
  OTHER = 'other'
}

export enum FlagType {
  STATIC = 'static',
  DYNAMIC_HMAC = 'dynamic_hmac',
  VALIDATOR = 'validator'
}

export enum ValidatorType {
  BUILTIN = 'builtin',
  CONTAINER = 'container'
}

export enum NetworkPolicy {
  NONE = 'none',
  EGRESS_ONLY = 'egress_only'
}

export enum LabInstanceStatus {
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  STOPPING = 'STOPPING',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR'
}

export enum DeliverableType {
  RULE = 'rule',
  NOTES = 'notes',
  REPORT = 'report'
}

export enum RuleSubtype {
  SIGMA = 'sigma',
  YARA = 'yara',
  SURICATA = 'suricata'
}

// Database entity interfaces
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  password_hash: string;
  totp_secret?: string;
  created_at: Date;
  last_login?: Date;
}

export interface Team {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: Date;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: string;
  joined_at: Date;
}

export interface Season {
  id: string;
  name: string;
  start_at: Date;
  end_at: Date;
  description?: string;
  theme?: string;
  created_at: Date;
}

export interface Week {
  id: string;
  season_id: string;
  index: number;
  opens_at: Date;
  closes_at: Date;
  is_mini_mission: boolean;
  created_at: Date;
}

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  track: ChallengeTrack;
  difficulty: ChallengeDifficulty;
  points_base: number;
  time_cap_minutes: number;
  mode: ChallengeMode;
  status: ChallengeStatus;
  author_id: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChallengeInstance {
  id: string;
  challenge_id: string;
  user_id?: string;
  team_id?: string;
  dynamic_seed: string;
  created_at: Date;
  expires_at?: Date;
}

export interface Artifact {
  id: string;
  challenge_id: string;
  s3_key: string;
  sha256: string;
  size_bytes: number;
  kind: ArtifactKind;
  original_filename: string;
  created_at: Date;
}

export interface Hint {
  id: string;
  challenge_id: string;
  order: number;
  text: string;
  cost_percent: number;
  created_at: Date;
}

export interface Submission {
  id: string;
  challenge_id: string;
  user_id?: string;
  team_id?: string;
  submitted_flag: string;
  is_correct: boolean;
  points_awarded: number;
  is_first_blood: boolean;
  created_at: Date;
}

export interface ValidatorConfig {
  id: string;
  challenge_id: string;
  type: ValidatorType;
  image?: string;
  command?: string[];
  timeout_sec: number;
  network_policy: NetworkPolicy;
  created_at: Date;
}

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon_key: string;
  created_at: Date;
}

export interface Award {
  id: string;
  badge_id: string;
  user_id?: string;
  team_id?: string;
  awarded_at: Date;
  reason: string;
}

export interface WriteUp {
  id: string;
  challenge_id: string;
  author_user_id: string;
  markdown: string;
  is_public: boolean;
  approved_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface LeaderboardSnapshot {
  id: string;
  season_id: string;
  generated_at: Date;
  json_blob: Record<string, any>;
}

export interface AuditLog {
  id: string;
  actor_user_id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details_json: Record<string, any>;
  created_at: Date;
}

export interface LabTemplate {
  id: string;
  challenge_id: string;
  compose_yaml_s3_key?: string;
  docker_image?: string;
  ports_json: Record<string, any>;
  env_json: Record<string, any>;
  ttl_minutes: number;
  created_at: Date;
}

export interface LabInstance {
  id: string;
  lab_template_id: string;
  challenge_instance_id: string;
  container_id?: string;
  status: LabInstanceStatus;
  started_at?: Date;
  expires_at?: Date;
  torn_down_at?: Date;
}

export interface ConfigKV {
  key: string;
  value_json: Record<string, any>;
  updated_at: Date;
}

// API request/response types
export interface LoginRequest {
  username: string;
  password: string;
  totp_code?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: Pick<User, 'id' | 'username' | 'email' | 'role'>;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface SubmitFlagRequest {
  flag: string;
}

export interface SubmitFlagResponse {
  correct: boolean;
  points_awarded: number;
  is_first_blood: boolean;
  message?: string;
}

export interface ConsumeHintRequest {
  challenge_id: string;
  hint_order: number;
}

export interface ConsumeHintResponse {
  hint: Hint;
  points_deducted: number;
  remaining_points: number;
}

export interface StartLabRequest {
  challenge_instance_id: string;
}

export interface StartLabResponse {
  lab_instance: LabInstance;
  kasm_url?: string;
  vpn_config?: string;
}

// Challenge.yml schema types
export interface ChallengeYaml {
  id: string;
  title: string;
  track: ChallengeTrack;
  difficulty: ChallengeDifficulty;
  points: {
    base: number;
    insane_cap?: boolean;
  };
  time_cap_minutes: number;
  mode: ChallengeMode;
  window: {
    open_relative_to_week: string;
    close_relative_to_week: string;
  };
  artifacts: ChallengeArtifact[];
  hints: ChallengeHint[];
  flag: ChallengeFlag;
  validator?: ChallengeValidator;
  live_lab?: ChallengeLiveLab;
  deliverables?: ChallengeDeliverable[];
  scoring?: ChallengeScoring;
}

export interface ChallengeArtifact {
  path: string;
  kind: ArtifactKind;
  sha256: string;
}

export interface ChallengeHint {
  cost_percent: number;
  text: string;
}

export interface ChallengeFlag {
  type: FlagType;
  format: string;
  hmac_inputs?: string[];
  static_value?: string;
}

export interface ChallengeValidator {
  type: ValidatorType;
  image?: string;
  cmd?: string[];
  timeout_sec: number;
  network_policy: NetworkPolicy;
}

export interface ChallengeLiveLab {
  enabled: boolean;
  template_ref?: string;
}

export interface ChallengeDeliverable {
  type: DeliverableType;
  subtype?: RuleSubtype;
}

export interface ChallengeScoring {
  hint_deduction_percent: number;
  tie_breakers: string[];
}

// Validator response
export interface ValidatorResponse {
  ok: boolean;
  points_delta?: number;
  details?: string;
}

// Adapter interfaces
export interface KasmAdapter {
  startSession(userId: string, challengeInstanceId: string): Promise<string>;
  stopSession(sessionId: string): Promise<void>;
}

export interface VpnAdapter {
  provisionWireguardPeer(userId: string): Promise<string>;
  revokePeer(userId: string): Promise<void>;
}
