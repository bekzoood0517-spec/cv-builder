export type YearMonth = { year: number; month: number }

export type Contact =
  | { id: string; kind: "phone"; value: string }
  | { id: string; kind: "email"; value: string }
  | { id: string; kind: "link"; label: LinkLabel; value: string }

export type LinkLabel = "telegram" | "linkedin" | "website" | "other"

export type Profile = {
  photo: string | null
  lastName: string
  firstName: string
  middleName: string
  birthYear: number | null
  address: string
  title: string
  contacts: Contact[]
}

export type Job = {
  id: string
  company: string
  role: string
  city: string
  start: YearMonth
  end: YearMonth | null
  current: boolean
  details: string
}

export type EduLevel = "" | "secondary" | "college" | "bachelor" | "master" | "course" | "other"

export type Education = {
  id: string
  institution: string
  program: string
  level: EduLevel
  start: YearMonth | null
  end: YearMonth | null
  current: boolean
  note: string
}

export type SkillLevel = "" | "basic" | "confident" | "advanced"

export type Skill = {
  id: string
  label: string
  level: SkillLevel
}

export type Strength = {
  id: string
  title: string
  detail: string
  factIds: string[]
}

export type GrowthItem = {
  id: string
  limitation: string
  advice: string
}

export type Generated = {
  summary: string
  summarySource: "empty" | "ai" | "user"
  summaryDirty: boolean
  strengths: Strength[]
  strengthsDirty: boolean
  growth: GrowthItem[]
  growthStatus: "empty" | "ready" | "insufficient"
  growthDirty: boolean
  showGrowthInResume: boolean
  mentionGrowthInMotivation: boolean
  jobBullets: Record<string, string[] | null>
}

export type LetterSource = "empty" | "ai" | "user"

export type MotivationLetter = {
  company: string
  vacancy: string
  reason: string
  text: string
  source: LetterSource
  dirty: boolean
  stale: boolean
  factsHash: string
}

export type Relation = "" | "manager" | "colleague" | "teacher" | "client"

export type RecommendationLetter = {
  authorName: string
  authorRole: string
  relation: Relation
  period: string
  authorPhone: string
  authorEmail: string
  text: string
  source: LetterSource
  dirty: boolean
  stale: boolean
  factsHash: string
}

export type TemplateId = "classic" | "modern" | "minimal" | "accent"
export type PaletteId = "ink" | "sea" | "terracotta" | "forest" | "graphite"
export type PreviewDocument = "resume" | "motivation" | "recommendation"
export type PreviewFormat = "a4" | "mobile"

export type Sections = {
  photo: boolean
  age: boolean
  address: boolean
  summary: boolean
  strengths: boolean
  jobs: boolean
  education: boolean
  skills: boolean
}

export type Project = {
  schemaVersion: 1
  profile: Profile
  experienceSummary: string
  jobs: Job[]
  education: Education[]
  skills: Skill[]
  generated: Generated
  letters: {
    motivation: MotivationLetter
    recommendation: RecommendationLetter
  }
  design: {
    template: TemplateId
    palette: PaletteId
    sections: Sections
  }
  preview: {
    document: PreviewDocument
    format: PreviewFormat
  }
  jobsManual: boolean
  educationManual: boolean
  updatedAt: string
}

export type Palette = {
  id: PaletteId
  name: string
  primary: string
  accent: string
  background: string
  text: string
}
