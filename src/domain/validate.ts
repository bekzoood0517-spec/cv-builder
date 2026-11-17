import { thisYear } from "./constants"
import type { Project } from "./types"
import { contactValid, monthIndex, rangesOverlap } from "./text"

export type FieldErrors = Record<string, string>

export type Validation = { errors: FieldErrors; exportOk: boolean }

export function birthBounds(now = thisYear()) {
  return { min: now - 80, max: now - 16 }
}

export function workBounds(now = thisYear()) {
  return { min: now - 70, max: now + 1 }
}

export function canExport(project: Project): boolean {
  return fieldErrors(project).exportOk
}

export function canRecommend(project: Project): boolean {
  const letter = project.letters.recommendation
  return canExport(project) && Boolean(letter.authorName.trim() && letter.authorRole.trim() && letter.relation)
}

export function fieldErrors(project: Project): Validation {
  const errors: FieldErrors = {}
  const year = thisYear()
  const birth = birthBounds(year)
  const work = workBounds(year)
  const profile = project.profile

  if (profile.birthYear != null && (profile.birthYear < birth.min || profile.birthYear > birth.max)) {
    errors.birthYear = "Год вне диапазона"
  }
  profile.contacts.forEach((contact, index) => {
    if (!contact.value.trim()) return
    if (!contactValid(contact)) {
      errors[`contact-${index}`] =
        contact.kind === "phone" ? "Проверьте телефон" : contact.kind === "email" ? "Проверьте почту" : "Проверьте ссылку"
    }
  })

  let datesOk = true
  project.jobs.forEach((job, index) => {
    if (!job.company.trim()) errors[`job-${index}-company`] = "Укажите компанию"
    if (!job.role.trim()) errors[`job-${index}-role`] = "Укажите должность"
    if (job.start.year < work.min || job.start.year > work.max) {
      errors[`job-${index}-start`] = "Год вне диапазона"
      datesOk = false
    }
    if (!job.current && job.end && monthIndex(job.end) < monthIndex(job.start)) {
      errors[`job-${index}-end`] = "Окончание раньше начала"
      datesOk = false
    }
    if (!job.current && !job.end) {
      errors[`job-${index}-end`] = "Укажите окончание или отметку «по настоящее время»"
      datesOk = false
    }
  })

  for (let i = 0; i < project.jobs.length; i += 1) {
    for (let j = i + 1; j < project.jobs.length; j += 1) {
      if (rangesOverlap(project.jobs[i], project.jobs[j])) {
        errors.jobsOverlap = "Периоды мест работы пересекаются"
      }
    }
  }

  project.education.forEach((item, index) => {
    if (!item.institution.trim()) errors[`edu-${index}-institution`] = "Укажите учебное заведение"
    if (item.start && (item.start.year < work.min || item.start.year > work.max)) {
      errors[`edu-${index}-start`] = "Год вне диапазона"
    }
    if (!item.current && item.start && item.end && monthIndex(item.end) < monthIndex(item.start)) {
      errors[`edu-${index}-end`] = "Окончание раньше начала"
    }
  })

  const exportOk =
    Boolean(profile.lastName.trim() && profile.firstName.trim() && profile.title.trim() && profile.contacts.some(contactValid)) &&
    datesOk &&
    !project.jobs.some((job) => !job.company.trim() || !job.role.trim()) &&
    !project.education.some((item) => !item.institution.trim()) &&
    !errors.birthYear

  return { errors, exportOk }
}

export const EXPORT_HINT = "Чтобы скачать, укажите фамилию, имя, должность и хотя бы один контакт."
