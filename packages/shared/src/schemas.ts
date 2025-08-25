import { z } from 'zod';
import {
  UserRole,
  ChallengeTrack,
  ChallengeDifficulty,
  ChallengeMode,
  ArtifactKind,
  FlagType,
  ValidatorType,
  NetworkPolicy,
  DeliverableType,
  RuleSubtype
} from './types';

// Challenge.yml validation schema
export const ChallengeYamlSchema = z.object({
  id: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  track: z.nativeEnum(ChallengeTrack),
  difficulty: z.nativeEnum(ChallengeDifficulty),
  points: z.object({
    base: z.number().min(50).max(1000),
    insane_cap: z.boolean().optional()
  }),
  time_cap_minutes: z.number().min(10).max(180),
  mode: z.nativeEnum(ChallengeMode),
  window: z.object({
    open_relative_to_week: z.string().regex(/^[+-]\d+d$/),
    close_relative_to_week: z.string().regex(/^[+-]\d+d$/)
  }),
  artifacts: z.array(z.object({
    path: z.string().min(1),
    kind: z.nativeEnum(ArtifactKind),
    sha256: z.string().regex(/^[a-f0-9]{64}$/)
  })),
  hints: z.array(z.object({
    cost_percent: z.number().min(5).max(50),
    text: z.string().min(1).max(500)
  })),
  flag: z.object({
    type: z.nativeEnum(FlagType),
    format: z.string().min(1),
    hmac_inputs: z.array(z.string()).optional(),
    static_value: z.string().optional()
  }),
  validator: z.object({
    type: z.nativeEnum(ValidatorType),
    image: z.string().optional(),
    cmd: z.array(z.string()).optional(),
    timeout_sec: z.number().min(1).max(60),
    network_policy: z.nativeEnum(NetworkPolicy)
  }).optional(),
  live_lab: z.object({
    enabled: z.boolean(),
    template_ref: z.string().optional()
  }).optional(),
  deliverables: z.array(z.object({
    type: z.nativeEnum(DeliverableType),
    subtype: z.nativeEnum(RuleSubtype).optional()
  })).optional(),
  scoring: z.object({
    hint_deduction_percent: z.number().min(5).max(50),
    tie_breakers: z.array(z.string())
  }).optional()
});

// API request schemas
export const LoginRequestSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1),
  totp_code: z.string().length(6).optional()
});

export const SignupRequestSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export const SubmitFlagRequestSchema = z.object({
  flag: z.string().min(1).max(200)
});

export const ConsumeHintRequestSchema = z.object({
  challenge_id: z.string().uuid(),
  hint_order: z.number().min(0)
});

export const StartLabRequestSchema = z.object({
  challenge_instance_id: z.string().uuid()
});

// Admin schemas
export const CreateSeasonSchema = z.object({
  name: z.string().min(1).max(100),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  description: z.string().max(1000).optional(),
  theme: z.string().max(100).optional()
});

export const CreateWeekSchema = z.object({
  season_id: z.string().uuid(),
  index: z.number().min(1).max(52),
  opens_at: z.string().datetime(),
  closes_at: z.string().datetime(),
  is_mini_mission: z.boolean().default(false)
});

export const CreateChallengeSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  track: z.nativeEnum(ChallengeTrack),
  difficulty: z.nativeEnum(ChallengeDifficulty),
  points_base: z.number().min(50).max(1000),
  time_cap_minutes: z.number().min(10).max(180),
  mode: z.nativeEnum(ChallengeMode),
  author_id: z.string().uuid(),
  description: z.string().max(2000).optional()
});

export const UpdateUserRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.nativeEnum(UserRole)
});

// Environment config schema
export const ConfigSchema = z.object({
  DOMAIN: z.string().min(1),
  POSTGRES_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  HMAC_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  SMTP_HOST: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  KASM_API_URL: z.string().url().optional(),
  KASM_API_TOKEN: z.string().optional(),
  WIREGUARD_ADAPTER_URL: z.string().url().optional()
});

// Validator response schema
export const ValidatorResponseSchema = z.object({
  ok: z.boolean(),
  points_delta: z.number().optional(),
  details: z.string().optional()
});

export type ChallengeYamlType = z.infer<typeof ChallengeYamlSchema>;
export type LoginRequestType = z.infer<typeof LoginRequestSchema>;
export type SignupRequestType = z.infer<typeof SignupRequestSchema>;
export type SubmitFlagRequestType = z.infer<typeof SubmitFlagRequestSchema>;
export type ConsumeHintRequestType = z.infer<typeof ConsumeHintRequestSchema>;
export type StartLabRequestType = z.infer<typeof StartLabRequestSchema>;
export type CreateSeasonType = z.infer<typeof CreateSeasonSchema>;
export type CreateWeekType = z.infer<typeof CreateWeekSchema>;
export type CreateChallengeType = z.infer<typeof CreateChallengeSchema>;
export type UpdateUserRoleType = z.infer<typeof UpdateUserRoleSchema>;
export type ConfigType = z.infer<typeof ConfigSchema>;
export type ValidatorResponseType = z.infer<typeof ValidatorResponseSchema>;
