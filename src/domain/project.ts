import { nowIso, uid } from "./constants"
import type { Education, Job, Project, Skill, SkillLevel } from "./types"
import { monthIndex } from "./text"

export function emptyLetterMot() {
  return {
    company: "",
    vacancy: "",
    reason: "",
    text: "",
    source: "empty" as const,
    dirty: false,
    stale: false,
    factsHash: "",
  }
}

export function emptyLetterRec() {
  return {
    authorName: "",
    authorRole: "",
    relation: "" as const,
    period: "",
    authorPhone: "",
    authorEmail: "",
    text: "",
    source: "empty" as const,
    dirty: false,
    stale: false,
    factsHash: "",
  }
}

export function emptyProject(): Project {
  return {
    schemaVersion: 1,
    profile: {
      photo: null,
      lastName: "",
      firstName: "",
      middleName: "",
      birthYear: null,
      address: "",
      title: "",
      contacts: [],
    },
    experienceSummary: "",
    jobs: [],
    education: [],
    skills: [],
    generated: {
      summary: "",
      summarySource: "empty",
      summaryDirty: false,
      strengths: [],
      strengthsDirty: false,
      growth: [],
      growthStatus: "empty",
      growthDirty: false,
      showGrowthInResume: false,
      mentionGrowthInMotivation: false,
      jobBullets: {},
    },
    letters: {
      motivation: emptyLetterMot(),
      recommendation: emptyLetterRec(),
    },
    design: {
      template: "classic",
      palette: "ink",
      sections: {
        photo: true,
        age: true,
        address: true,
        summary: true,
        strengths: true,
        jobs: true,
        education: true,
        skills: true,
      },
    },
    preview: { document: "resume", format: "a4" },
    jobsManual: false,
    educationManual: false,
    updatedAt: nowIso(),
  }
}

export function newJob(): Job {
  const now = new Date()
  return {
    id: uid(),
    company: "",
    role: "",
    city: "",
    start: { year: now.getFullYear(), month: now.getMonth() + 1 },
    end: null,
    current: true,
    details: "",
  }
}

export function newEducation(): Education {
  return {
    id: uid(),
    institution: "",
    program: "",
    level: "",
    start: null,
    end: null,
    current: false,
    note: "",
  }
}

const skillRank: Record<SkillLevel, number> = { "": 0, basic: 1, confident: 2, advanced: 3 }

export function addSkill(skills: Skill[], label: string, level: SkillLevel): Skill[] {
  const clean = label.trim().replace(/\s+/g, " ").slice(0, 40)
  if (!clean) return skills
  const key = clean.toLocaleLowerCase("ru")
  const index = skills.findIndex((item) => item.label.trim().toLocaleLowerCase("ru") === key)
  if (index === -1) {
    if (skills.length >= 20) return skills
    return [...skills, { id: uid(), label: clean, level }]
  }
  const current = skills[index]
  const nextLevel = skillRank[level] > skillRank[current.level] ? level : current.level || level
  return skills.map((item, itemIndex) => (itemIndex === index ? { ...item, level: nextLevel } : item))
}

function byDate<T extends { current: boolean; end: { year: number; month: number } | null; start: { year: number; month: number } | null }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1
    const aEnd = a.end ? monthIndex(a.end) : 0
    const bEnd = b.end ? monthIndex(b.end) : 0
    if (aEnd !== bEnd) return bEnd - aEnd
    const aStart = a.start ? monthIndex(a.start) : 0
    const bStart = b.start ? monthIndex(b.start) : 0
    return bStart - aStart
  })
}

export function orderedJobs(project: Project): Job[] {
  return project.jobsManual ? project.jobs : byDate(project.jobs)
}

export function orderedEducation(project: Project): Education[] {
  return project.educationManual ? project.education : byDate(project.education)
}

export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const next = index + direction
  if (next < 0 || next >= items.length) return items
  const copy = items.slice()
  const [item] = copy.splice(index, 1)
  copy.splice(next, 0, item)
  return copy
}

export function factsPayload(project: Project) {
  return {
    name: [project.profile.lastName, project.profile.firstName, project.profile.middleName].map((p) => p.trim()).filter(Boolean).join(" "),
    title: project.profile.title.trim(),
    contacts: project.profile.contacts.map((contact) =>
      contact.kind === "link"
        ? { kind: contact.kind, label: contact.label, value: contact.value.trim() }
        : { kind: contact.kind, value: contact.value.trim() },
    ),
    address: project.profile.address.trim(),
    birthYear: project.profile.birthYear,
    experienceSummary: project.experienceSummary.trim(),
    jobs: orderedJobs(project).map((job) => ({
      company: job.company.trim(),
      role: job.role.trim(),
      city: job.city.trim(),
      start: job.start,
      end: job.current ? null : job.end,
      current: job.current,
      details: job.details.trim(),
    })),
    education: orderedEducation(project).map((item) => ({
      institution: item.institution.trim(),
      program: item.program.trim(),
      level: item.level,
      start: item.start,
      end: item.current ? null : item.end,
      current: item.current,
      note: item.note.trim(),
    })),
    skills: project.skills.map((skill) => ({ label: skill.label.trim(), level: skill.level })),
    summary: project.generated.summary.trim(),
    strengths: project.generated.strengths.map((item) => ({
      title: item.title.trim(),
      detail: item.detail.trim(),
      factIds: item.factIds,
    })),
    mentionGrowthInMotivation: project.generated.mentionGrowthInMotivation,
  }
}

export function stableString(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableString(item)).join(",")}]`
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableString(record[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

export async function factsHash(project: Project): Promise<string> {
  const encoded = new TextEncoder().encode(stableString(factsPayload(project)))
  const digest = await crypto.subtle.digest("SHA-256", encoded)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function withStale(project: Project, hash: string): Project {
  const motivation = markStale(project.letters.motivation, hash)
  const recommendation = markStale(project.letters.recommendation, hash)
  if (motivation === project.letters.motivation && recommendation === project.letters.recommendation) return project
  return { ...project, letters: { motivation, recommendation } }
}

function markStale<T extends { text: string; factsHash: string; stale: boolean }>(letter: T, hash: string): T {
  if (!letter.text || !letter.factsHash) return letter
  const stale = letter.factsHash !== hash
  if (letter.stale === stale) return letter
  return { ...letter, stale }
}
