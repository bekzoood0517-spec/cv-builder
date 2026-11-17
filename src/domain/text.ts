import { MONTHS } from "./constants"
import type { Contact, Job, Profile, Project, YearMonth } from "./types"

export function clip(value: string, max: number): string {
  return value.slice(0, max)
}

export function fullName(profile: Profile): string {
  return [profile.lastName, profile.firstName, profile.middleName].map((p) => p.trim()).filter(Boolean).join(" ")
}

export function initials(profile: Profile): string {
  const a = profile.firstName.trim().charAt(0)
  const b = profile.lastName.trim().charAt(0)
  return (a + b).toLocaleUpperCase("ru")
}

export function ageLabel(birthYear: number, now = thisYearSafe()): string {
  const n = now - birthYear
  const n100 = n % 100
  const n10 = n % 10
  let word = "лет"
  if (n100 < 11 || n100 > 14) {
    if (n10 === 1) word = "год"
    else if (n10 >= 2 && n10 <= 4) word = "года"
  }
  return `${n} ${word}`
}

function thisYearSafe(): number {
  return new Date().getFullYear()
}

export function formatMonth(value: YearMonth): string {
  return `${MONTHS[value.month - 1]} ${value.year}`
}

export function formatSpan(start: YearMonth | null, end: YearMonth | null, current: boolean): string {
  const left = start ? formatMonth(start) : ""
  const right = current ? "по настоящее время" : end ? formatMonth(end) : ""
  if (left && right) return `${left} — ${right}`
  return left || right
}

export function monthIndex(value: YearMonth): number {
  return value.year * 12 + value.month
}

export function jobEndIndex(job: Job, now = new Date()): number {
  if (job.current || !job.end) return now.getFullYear() * 12 + now.getMonth() + 1
  return monthIndex(job.end)
}

export function rangesOverlap(a: Job, b: Job): boolean {
  return monthIndex(a.start) <= jobEndIndex(b) && monthIndex(b.start) <= jobEndIndex(a)
}

export function phoneDigits(value: string): string {
  const trimmed = value.trim()
  const plus = trimmed.startsWith("+")
  const digits = trimmed.replace(/\D/g, "")
  return plus ? `+${digits}` : digits
}

export function validPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "")
  return digits.length >= 10 && digits.length <= 15 && /^\+?[\d\s()\-]+$/.test(value.trim())
}

export function validEmail(value: string): boolean {
  const v = value.trim()
  const at = v.indexOf("@")
  if (at <= 0 || at !== v.lastIndexOf("@")) return false
  const domain = v.slice(at + 1)
  return domain.length > 0 && domain.includes(".") && !domain.startsWith(".") && !domain.endsWith(".")
}

export function linkHref(value: string): string {
  const v = value.trim()
  if (/^https?:\/\//i.test(v)) return v
  return `https://${v}`
}

export function validLink(value: string): boolean {
  const href = linkHref(value)
  try {
    const url = new URL(href)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function contactHref(contact: Contact): string {
  if (contact.kind === "phone") return `tel:${phoneDigits(contact.value)}`
  if (contact.kind === "email") return `mailto:${contact.value.trim()}`
  return linkHref(contact.value)
}

export function contactValid(contact: Contact): boolean {
  if (!contact.value.trim()) return false
  if (contact.kind === "phone") return validPhone(contact.value)
  if (contact.kind === "email") return validEmail(contact.value)
  return validLink(contact.value)
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function fileToken(value: string): string {
  return value.trim().replace(/\s+/g, "_").replace(/[\\/:*?"<>|]/g, "")
}

export function personFilePrefix(project: Project): string {
  const last = fileToken(project.profile.lastName)
  const first = fileToken(project.profile.firstName)
  if (!last) return "resume"
  return first ? `${last}_${first}` : last
}

export function pdfName(project: Project, doc: "resume" | "motivation" | "recommendation", format: "a4" | "mobile"): string {
  const prefix = personFilePrefix(project)
  const kind = doc === "resume" ? "резюме" : doc === "motivation" ? "мотивационное" : "рекомендация"
  const tail = format === "a4" ? "A4" : "mobile"
  return `${prefix}_${kind}_${tail}.pdf`
}

export function zipName(project: Project): string {
  return `${personFilePrefix(project)}_документы.zip`
}

export function projectFileName(project: Project): string {
  return `${personFilePrefix(project)}_проект.json`
}

export function sentence(value: string): string {
  const text = value.trim().replace(/\s+/g, " ")
  if (!text) return ""
  return /[.!?…]$/.test(text) ? text : `${text}.`
}

export function firstSentence(value: string): string {
  const text = value.trim()
  if (!text) return ""
  const match = text.match(/^.*?[.!?…](\s|$)/)
  return sentence(match ? match[0] : text.slice(0, 180))
}

export function luminance(hex: string): number {
  const raw = hex.replace("#", "")
  const channels = [0, 2, 4].map((index) => {
    const value = parseInt(raw.slice(index, index + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

export function contrast(a: string, b: string): number {
  const left = luminance(a)
  const right = luminance(b)
  const [hi, lo] = left > right ? [left, right] : [right, left]
  return (hi + 0.05) / (lo + 0.05)
}

export function inkOn(background: string, paper: string): string {
  return contrast("#FFFFFF", background) >= 4.5 ? "#FFFFFF" : paper
}
