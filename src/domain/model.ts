import { EDU_LABEL, LINK_LABEL, PALETTES, SKILL_LABEL } from "./constants"
import { orderedEducation, orderedJobs } from "./project"
import type { Palette, Project } from "./types"
import { ageLabel, contactHref, formatSpan, fullName, initials, inkOn } from "./text"

export type ResumeModel = {
  name: string
  nameReady: boolean
  initials: string
  title: string
  age: string | null
  address: string | null
  contacts: { id: string; label: string; href: string }[]
  photo: string | null
  showPortrait: boolean
  summary: string | null
  strengths: { id: string; title: string; detail: string }[]
  jobs: {
    id: string
    company: string
    role: string
    city: string
    period: string
    paragraph: string | null
    bullets: string[] | null
  }[]
  education: {
    id: string
    title: string
    meta: string
    note: string
  }[]
  skills: { label: string; level: string }[]
  growth: { id: string; limitation: string; advice: string }[] | null
  palette: Palette
  headerInk: string
  pillInk: string
}

export function resumeModel(project: Project): ResumeModel {
  const palette = PALETTES[project.design.palette]
  const sections = project.design.sections
  const profile = project.profile
  const name = fullName(profile)
  const show = (flag: boolean, value: string) => (flag && value.trim() ? value.trim() : null)

  const jobs = sections.jobs
    ? orderedJobs(project)
        .filter((job) => job.company.trim() || job.role.trim())
        .map((job) => {
          const bullets = project.generated.jobBullets[job.id]
          const details = job.details.trim()
          return {
            id: job.id,
            company: job.company.trim(),
            role: job.role.trim(),
            city: job.city.trim(),
            period: formatSpan(job.start, job.end, job.current),
            paragraph: bullets && bullets.length ? null : details || null,
            bullets: bullets && bullets.length ? bullets : null,
          }
        })
    : []

  const education = sections.education
    ? orderedEducation(project)
        .filter((item) => item.institution.trim())
        .map((item) => {
          const level = item.level ? EDU_LABEL[item.level] : ""
          const bits = [item.program.trim(), level, formatSpan(item.start, item.end, item.current)].filter(Boolean)
          return {
            id: item.id,
            title: item.institution.trim(),
            meta: bits.join(" · "),
            note: item.note.trim(),
          }
        })
    : []

  return {
    name,
    nameReady: Boolean(name),
    initials: initials(profile),
    title: profile.title.trim(),
    age: sections.age && profile.birthYear != null ? ageLabel(profile.birthYear) : null,
    address: show(sections.address, profile.address),
    contacts: profile.contacts
      .filter((contact) => contact.value.trim())
      .map((contact) => ({
        id: contact.id,
        label: contact.kind === "link" ? `${LINK_LABEL[contact.label]}: ${contact.value.trim()}` : contact.value.trim(),
        href: contactHref(contact),
      })),
    photo: sections.photo ? profile.photo : null,
    showPortrait: sections.photo,
    summary: sections.summary ? show(true, project.generated.summary) : null,
    strengths: sections.strengths
      ? project.generated.strengths.filter((item) => item.title.trim() || item.detail.trim())
      : [],
    jobs,
    education,
    skills: sections.skills
      ? project.skills
          .filter((skill) => skill.label.trim())
          .map((skill) => ({ label: skill.label.trim(), level: skill.level ? SKILL_LABEL[skill.level] : "" }))
      : [],
    growth:
      project.generated.showGrowthInResume && project.generated.growth.length
        ? project.generated.growth
        : null,
    palette,
    headerInk: inkOn(palette.primary, palette.background),
    pillInk: inkOn(palette.accent, palette.background),
  }
}
