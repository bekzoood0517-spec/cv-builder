import { z } from "zod"
import type { PaletteId, Project, TemplateId } from "./types"

const yearMonth = z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) })

const contact = z.discriminatedUnion("kind", [
  z.object({ id: z.string().min(1), kind: z.literal("phone"), value: z.string() }),
  z.object({ id: z.string().min(1), kind: z.literal("email"), value: z.string() }),
  z.object({ id: z.string().min(1), kind: z.literal("link"), label: z.enum(["telegram", "linkedin", "website", "other"]), value: z.string() }),
])

const templates = ["classic", "modern", "minimal", "accent"] as const
const palettes = ["ink", "sea", "terracotta", "forest", "graphite"] as const

const projectSchema = z.object({
  schemaVersion: z.literal(1),
  profile: z.object({
    photo: z.string().nullable(),
    lastName: z.string(),
    firstName: z.string(),
    middleName: z.string(),
    birthYear: z.number().int().nullable(),
    address: z.string(),
    title: z.string(),
    contacts: z.array(contact),
  }),
  experienceSummary: z.string(),
  jobs: z.array(
    z.object({
      id: z.string(),
      company: z.string(),
      role: z.string(),
      city: z.string(),
      start: yearMonth,
      end: yearMonth.nullable(),
      current: z.boolean(),
      details: z.string(),
    }),
  ),
  education: z.array(
    z.object({
      id: z.string(),
      institution: z.string(),
      program: z.string(),
      level: z.enum(["", "secondary", "college", "bachelor", "master", "course", "other"]),
      start: yearMonth.nullable(),
      end: yearMonth.nullable(),
      current: z.boolean(),
      note: z.string(),
    }),
  ),
  skills: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      level: z.enum(["", "basic", "confident", "advanced"]),
    }),
  ),
  generated: z.object({
    summary: z.string(),
    summarySource: z.enum(["empty", "ai", "user"]),
    summaryDirty: z.boolean(),
    strengths: z.array(z.object({ id: z.string(), title: z.string(), detail: z.string(), factIds: z.array(z.string()) })),
    strengthsDirty: z.boolean(),
    growth: z.array(z.object({ id: z.string(), limitation: z.string(), advice: z.string() })),
    growthStatus: z.enum(["empty", "ready", "insufficient"]),
    growthDirty: z.boolean(),
    showGrowthInResume: z.boolean(),
    mentionGrowthInMotivation: z.boolean(),
    jobBullets: z.record(z.array(z.string()).nullable()),
  }),
  letters: z.object({
    motivation: z.object({
      company: z.string(),
      vacancy: z.string(),
      reason: z.string(),
      text: z.string(),
      source: z.enum(["empty", "ai", "user"]),
      dirty: z.boolean(),
      stale: z.boolean(),
      factsHash: z.string(),
    }),
    recommendation: z.object({
      authorName: z.string(),
      authorRole: z.string(),
      relation: z.enum(["", "manager", "colleague", "teacher", "client"]),
      period: z.string(),
      authorPhone: z.string(),
      authorEmail: z.string(),
      text: z.string(),
      source: z.enum(["empty", "ai", "user"]),
      dirty: z.boolean(),
      stale: z.boolean(),
      factsHash: z.string(),
    }),
  }),
  design: z.object({
    template: z.enum(templates),
    palette: z.enum(palettes),
    sections: z.object({
      photo: z.boolean(),
      age: z.boolean(),
      address: z.boolean(),
      summary: z.boolean(),
      strengths: z.boolean(),
      jobs: z.boolean(),
      education: z.boolean(),
      skills: z.boolean(),
    }),
  }),
  preview: z.object({
    document: z.enum(["resume", "motivation", "recommendation"]),
    format: z.enum(["a4", "mobile"]),
  }),
  jobsManual: z.boolean(),
  educationManual: z.boolean(),
  updatedAt: z.string(),
})

export function parseProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== "object") return null
  const copy = structuredClone(raw) as Record<string, unknown>
  const design = copy.design
  if (design && typeof design === "object") {
    const record = design as { template?: string; palette?: string }
    if (!templates.includes(record.template as TemplateId)) record.template = "classic"
    if (!palettes.includes(record.palette as PaletteId)) record.palette = "ink"
  }
  const parsed = projectSchema.safeParse(copy)
  return parsed.success ? parsed.data : null
}
