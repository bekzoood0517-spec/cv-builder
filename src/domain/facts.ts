import type { Project } from "./types"
import { orderedEducation, orderedJobs } from "./project"

export type FactIndex = {
  years: Set<number>
  numbers: Set<string>
  phrases: string[]
}

function absorb(text: string, years: Set<number>, numbers: Set<string>) {
  for (const match of text.matchAll(/(?:19|20)\d{2}/g)) years.add(Number(match[0]))
  for (const match of text.matchAll(/\d{2,}/g)) numbers.add(match[0])
}

export function buildFacts(project: Project): FactIndex {
  const years = new Set<number>()
  const numbers = new Set<string>()
  const phrases: string[] = []
  const now = new Date().getFullYear()

  const take = (value: string) => {
    const text = value.trim()
    if (!text) return
    phrases.push(text.toLocaleLowerCase("ru").replaceAll("ё", "е"))
    absorb(text, years, numbers)
  }

  take(project.profile.lastName)
  take(project.profile.firstName)
  take(project.profile.middleName)
  take(project.profile.title)
  take(project.profile.address)
  take(project.experienceSummary)
  if (project.profile.birthYear) years.add(project.profile.birthYear)
  for (const contact of project.profile.contacts) take(contact.value)
  for (const job of project.jobs) {
    take(job.company)
    take(job.role)
    take(job.city)
    take(job.details)
    years.add(job.start.year)
    if (job.end) years.add(job.end.year)
    if (job.current) years.add(now)
  }
  for (const item of project.education) {
    take(item.institution)
    take(item.program)
    take(item.note)
    if (item.start) years.add(item.start.year)
    if (item.end) years.add(item.end.year)
    if (item.current) years.add(now)
  }
  for (const skill of project.skills) take(skill.label)
  take(project.letters.motivation.company)
  take(project.letters.motivation.vacancy)
  take(project.letters.motivation.reason)
  take(project.letters.recommendation.authorName)
  take(project.letters.recommendation.authorRole)
  take(project.letters.recommendation.period)

  return { years, numbers, phrases }
}

export function unknownYears(text: string, facts: FactIndex): string[] {
  return [...text.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => match[0]).filter((year) => !facts.years.has(Number(year)))
}

export function unknownNumbers(text: string, facts: FactIndex): string[] {
  return [...text.matchAll(/\d{2,}/g)]
    .map((match) => match[0])
    .filter((value) => !/^(?:19|20)\d{2}$/.test(value) && !facts.numbers.has(value))
}

export function textFailsFacts(text: string, facts: FactIndex): boolean {
  return unknownYears(text, facts).length > 0 || unknownNumbers(text, facts).length > 0
}

export function knownFactIds(project: Project): Set<string> {
  const ids = new Set<string>(["experience", "profile"])
  for (const job of orderedJobs(project)) ids.add(job.id)
  for (const item of orderedEducation(project)) ids.add(item.id)
  for (const skill of project.skills) ids.add(skill.id)
  return ids
}
