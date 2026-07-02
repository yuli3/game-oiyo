export type LocalizedString = {
  en: string
  ko: string
  ja?: string
  es?: string
  fr?: string
  de?: string
  pt?: string
  ru?: string
  zh?: string
}

export type RiasecCode = 'R' | 'I' | 'A' | 'S' | 'E' | 'C'
export type MBTIType =
  | 'ENFJ' | 'ENFP' | 'ENTJ' | 'ENTP'
  | 'ESFJ' | 'ESFP' | 'ESTJ' | 'ESTP'
  | 'INFJ' | 'INFP' | 'INTJ' | 'INTP'
  | 'ISFJ' | 'ISFP' | 'ISTJ' | 'ISTP'

export interface MBTICareer {
  id: string
  title: LocalizedString
  fit: 1 | 2 | 3 | 4 | 5
  riasec: RiasecCode[]
  sector: string
  work_style: string
  autonomy: 'low' | 'medium' | 'high'
  income_tier: 'low' | 'medium' | 'high' | 'very_high'
  growth_outlook: 'low' | 'medium' | 'high'
  why_fit: LocalizedString
  skill_domains: string[]
  hsp_friendly: boolean
  remote_possible: boolean
  tags: string[]
}

export interface MBTICareerAvoid {
  id: string
  title: LocalizedString
  reason: LocalizedString
}

export interface MBTITypeCareerIndex {
  top_careers: Pick<MBTICareer, 'id' | 'title' | 'fit' | 'riasec' | 'income_tier' | 'hsp_friendly' | 'remote_possible' | 'why_fit'>[]
  blog_slug: string
}

export interface MBTICareerIndexFile {
  version: string
  updatedAt: string
  types: Record<MBTIType, MBTITypeCareerIndex>
}

export interface MBTITypeCareerFile {
  version: string
  type: MBTIType
  top_careers: MBTICareer[]
  avoid_careers: MBTICareerAvoid[]
}

export interface HobbyEntry {
  name: LocalizedString
  why?: LocalizedString
  energy_cost: 'low' | 'medium' | 'high'
  social: 'solo' | 'small_group' | 'large_group'
}

export interface MoodHobbies {
  label: LocalizedString
  hobbies: HobbyEntry[]
}

export interface MBTITypeHobbies {
  by_mood: Record<string, MoodHobbies>
  always_good: Array<{ name: LocalizedString; fit_reason: LocalizedString }>
}

export interface MBTIHobbiesFile {
  version: string
  updatedAt: string
  types: Record<MBTIType, MBTITypeHobbies>
}

export interface RiasecCellQuality {
  match_quality: 'excellent' | 'very_good' | 'good' | 'neutral' | 'challenging'
  careers: string[]
  insight: LocalizedString
}

export interface MBTIRiasecMatrixFile {
  version: string
  updatedAt: string
  matrix: Record<MBTIType, Record<RiasecCode, RiasecCellQuality>>
}

export interface MBTITypeMeta {
  code: MBTIType
  nickname: LocalizedString
  population_pct: number
  cognitive_stack: string[]
  group: string
  riasec_primary: RiasecCode[]
  hsp_prevalence_pct: number
  blog_slug: string
  famous_people: { en: string[]; ko: string[] }
}

export interface MBTITypesFile {
  version: string
  updatedAt: string
  types: Record<MBTIType, MBTITypeMeta>
}

export interface HSPCareerEntry {
  id: string
  title: LocalizedString
  fit: 1 | 2 | 3 | 4 | 5
  why: LocalizedString
}

export interface HSPProfilesFile {
  version: string
  updatedAt: string
  overview: {
    prevalence_pct: number
    four_aspects: Record<string, { label: LocalizedString }>
  }
  career_guidance: {
    ideal_environments: string[]
    top_careers: HSPCareerEntry[]
  }
}

export interface HSPMBTICombination {
  prevalence_note: LocalizedString
  amplified_traits: string[]
  career_adjustments: Array<{
    career_id: string
    original_fit: number
    adjusted_fit: number
    note: LocalizedString
  }>
  coping_strategies: { en: string[]; ko: string[] }
  hobbies: { recharging: string[]; creative: string[] }
}

export interface HSPMBTIMatrixFile {
  version: string
  updatedAt: string
  combinations: Record<string, HSPMBTICombination>
}

export interface TCIDimension {
  id: string
  name: LocalizedString
  neurotransmitter?: string
  career_fit_high: string[]
  career_fit_low: string[]
}

export interface TCIDimensionsFile {
  version: string
  updatedAt: string
  temperament_dimensions: Record<string, TCIDimension>
  character_dimensions: Record<string, TCIDimension>
}

export interface RiasecCodeMeta {
  id: RiasecCode
  name: LocalizedString
  alias: LocalizedString
  top_careers: string[]
  mbti_common: MBTIType[]
}

export interface RiasecCodesFile {
  version: string
  updatedAt: string
  codes: Record<RiasecCode, RiasecCodeMeta>
}

export interface SkillDomain {
  label: LocalizedString
}

export interface SkillCombination {
  headline: LocalizedString
  top_careers: string[]
  insight: LocalizedString
}

export interface MBTISkillsMatrixFile {
  version: string
  updatedAt: string
  skill_domains: Record<string, SkillDomain>
  combinations: Record<string, SkillCombination>
}
