import { RELATION_LABEL, uid } from "./constants"
import { buildFacts, knownFactIds, textFailsFacts, type FactIndex } from "./facts"
import { orderedEducation, orderedJobs } from "./project"
import type { GrowthItem, Job, Project, Strength } from "./types"
import { firstSentence, formatSpan, fullName, sentence, wordCount } from "./text"

export type ResumeDraft = {
  summary: string
  summaryShort: boolean
  lengthNote: boolean
  strengths: Strength[]
  growth: GrowthItem[] | null
  growthStatus: "ready" | "insufficient"
  jobBullets: Record<string, string[]>
}

const LOW_EXPERIENCE = 80
const THIN_EXPERIENCE = 40

function rolePhrase(title: string): string {
  const clean = title.trim()
  if (!clean) return "специалист"
  return clean.charAt(0).toLocaleLowerCase("ru") + clean.slice(1)
}

function periodPhrase(job: Job): string {
  return formatSpan(job.start, job.end, job.current)
}

function within(length: number, min: number, max: number): boolean {
  return length >= min * 0.85 && length <= max * 1.15
}

function fitSentences(sentences: string[], min: number, max: number): string {
  const clean = sentences.map(sentence).filter(Boolean)
  const chosen: string[] = []
  for (const item of clean) {
    const next = [...chosen, item].join(" ")
    if (next.length > max && chosen.length) break
    chosen.push(item)
  }
  let text = chosen.join(" ")
  if (text.length > max) {
    const cut = text.lastIndexOf(" ", max)
    text = `${text.slice(0, cut > 40 ? cut : max).replace(/[,:;–—-]\s*$/, "")}.`
  }
  if (text.length < min) {
    for (const item of clean.slice(chosen.length)) {
      if ((text + " " + item).length > max) break
      text = `${text} ${item}`.trim()
    }
  }
  return text
}

function summarySentences(project: Project): string[] {
  const lines: string[] = [`Я ${rolePhrase(project.profile.title)}`]
  if (project.experienceSummary.trim()) lines.push(sentence(project.experienceSummary.trim().slice(0, 500)))
  for (const job of orderedJobs(project)) {
    if (!job.company.trim() && !job.role.trim()) continue
    const place = [job.city.trim() && job.city.trim(), periodPhrase(job)].filter(Boolean).join(", ")
    lines.push(`В компании «${job.company.trim() || "без названия"}» моя роль — ${job.role.trim() || project.profile.title.trim()}${place ? `, ${place}` : ""}`)
    if (job.details.trim()) lines.push(firstSentence(job.details))
  }
  const skills = project.skills.map((skill) => skill.label.trim()).filter(Boolean)
  if (skills.length) lines.push(`В работе опираюсь на ${skills.join(", ")}`)
  for (const item of orderedEducation(project)) {
    if (!item.institution.trim()) continue
    lines.push(`Образование: ${item.institution.trim()}${item.program.trim() ? `, ${item.program.trim()}` : ""}`)
  }
  const title = project.profile.title.trim()
  for (const job of orderedJobs(project)) {
    if (job.company.trim()) lines.push(`Компания из анкеты — «${job.company.trim()}», должность — ${job.role.trim() || title}`)
    if (job.city.trim()) lines.push(`Город работы — ${job.city.trim()}`)
    if (job.details.trim().length > 40) lines.push(sentence(job.details.trim().slice(0, 220)))
  }
  if (project.experienceSummary.trim().length > 80) {
    lines.push(sentence(project.experienceSummary.trim().slice(0, 280)))
  }
  lines.push(`Роль в заголовке резюме — ${title}. Описание собрано из анкеты, без компаний и дат вне неё`)
  return lines
}

export function assembleSummary(project: Project, facts = buildFacts(project)): { text: string; short: boolean; lengthNote: boolean } | null {
  const low = project.jobs.length === 0 && project.experienceSummary.trim().length < LOW_EXPERIENCE
  const min = low ? 120 : 400
  const max = low ? 400 : 700
  const pool = low
    ? [
        `Я ${rolePhrase(project.profile.title)}`,
        project.experienceSummary.trim() ? sentence(project.experienceSummary.trim()) : "",
        project.skills.length ? `Из навыков пока указаны ${project.skills.map((skill) => skill.label.trim()).filter(Boolean).join(", ")}` : "",
        "Мест работы в анкете ещё нет, поэтому компании и даты в описание не входят",
        `Ищу задачи по роли «${project.profile.title.trim()}» и дополню опыт, когда появятся факты`,
      ].filter(Boolean)
    : summarySentences(project)
  let text = fitSentences(pool, min, max)
  if (text.length < min) {
    const extra = low
      ? " Текст остаётся коротким, пока в анкете мало фактов."
      : ` В основе текста должность «${project.profile.title.trim()}» и перечисленные в анкете места, учёба и навыки.`
    if ((text + extra).length <= max) text += extra
  }
  if (textFailsFacts(text, facts)) return null
  return { text, short: low, lengthNote: !within(text.length, min, max) }
}

export function assembleStrengths(project: Project, facts = buildFacts(project)): Strength[] {
  const ids = knownFactIds(project)
  const items: Strength[] = []
  for (const job of orderedJobs(project)) {
    if (!job.company.trim() || items.length >= 5) continue
    const title = `Роль в ${job.company.trim()}`.slice(0, 60)
    const detail = sentence(`В компании «${job.company.trim()}» позиция — ${job.role.trim()}`)
    if (textFailsFacts(`${title} ${detail}`, facts)) continue
    items.push({ id: uid(), title, detail, factIds: [job.id] })
  }
  const skillLabels = project.skills.map((skill) => skill.label.trim()).filter(Boolean)
  if (skillLabels.length && items.length < 5) {
    const title = "Навыки из анкеты"
    const detail = sentence(`В анкете указаны ${skillLabels.join(", ")}`)
    if (!textFailsFacts(detail, facts)) {
      items.push({ id: uid(), title, detail, factIds: project.skills.map((skill) => skill.id) })
    }
  }
  for (const item of orderedEducation(project)) {
    if (!item.institution.trim() || items.length >= 5) continue
    const title = item.institution.trim().slice(0, 60)
    const detail = sentence(`В образовании указано ${item.institution.trim()}${item.program.trim() ? `, ${item.program.trim()}` : ""}`)
    if (textFailsFacts(detail, facts)) continue
    items.push({ id: uid(), title, detail, factIds: [item.id] })
  }
  if (project.experienceSummary.trim() && items.length < 3) {
    const detail = firstSentence(project.experienceSummary)
    if (detail && !textFailsFacts(detail, facts)) {
      items.push({ id: uid(), title: "Опыт своими словами", detail, factIds: ["experience"] })
    }
  }
  return items.filter((item) => item.factIds.every((id) => ids.has(id)) && item.title.length <= 60 && item.detail.trim())
}

function monthsBetween(start: number, end: number): number {
  return end - start
}

export function assembleGrowth(project: Project): { growth: GrowthItem[] | null; growthStatus: "ready" | "insufficient" } {
  if (project.jobs.length === 0 && project.experienceSummary.trim().length < THIN_EXPERIENCE) {
    return { growth: null, growthStatus: "insufficient" }
  }
  const items: GrowthItem[] = []
  const push = (limitation: string, advice: string) => {
    if (items.length >= 4) return
    items.push({ id: uid(), limitation, advice })
  }
  const jobs = orderedJobs(project).filter((job) => job.company.trim())
  for (const job of jobs) {
    const start = job.start.year * 12 + job.start.month
    const end = job.current || !job.end ? new Date().getFullYear() * 12 + new Date().getMonth() + 1 : job.end.year * 12 + job.end.month
    if (monthsBetween(start, end) > 0 && monthsBetween(start, end) < 6) {
      push(`Короткий период в ${job.company.trim()}`, "В отклике поясните результат за этот срок и чему он научил.")
    }
  }
  const finished = jobs.filter((job) => !job.current && job.end)
  for (let index = 0; index < finished.length - 1; index += 1) {
    const newer = finished[index]
    const older = finished[index + 1]
    if (!newer.end || !older.end) continue
    const gap = newer.start.year * 12 + newer.start.month - (older.end.year * 12 + older.end.month)
    if (gap > 6) {
      push("Между местами работы есть пауза", "Если это уместно, одной фразой поясните, чем была занята пауза.")
      break
    }
  }
  if (project.skills.filter((skill) => skill.label.trim()).length < 3) {
    push("Навыков в анкете мало", "Добавьте инструменты, которыми пользуетесь, чтобы описание не осталось общим.")
  }
  if (!project.education.some((item) => item.institution.trim())) {
    push("Образование не заполнено", "Если есть учёба или курс, добавьте запись: путь будет читаться цельнее.")
  }
  if (jobs.length === 1) {
    push("Опыт пока собран в одном месте работы", "Добавьте в обязанности два-три результата, чтобы сильные стороны опирались на факты.")
  }
  if (project.skills.some((skill) => skill.label.trim() && !skill.level) && items.length < 2) {
    push("Уровень навыков указан не везде", "Отметьте базовый, уверенный или продвинутый там, где можете это подтвердить задачей.")
  }
  if (!items.length && jobs.length) {
    push("Свободный рассказ об опыте легко сделать общим", "Оставьте в описании только то, что уже есть в карточках работы.")
    push("Сильные стороны держатся на указанных местах работы", "Проверьте, что каждая формулировка совпадает с карточкой, а не с пожеланием.")
  }
  if (!items.length) return { growth: null, growthStatus: "insufficient" }
  return { growth: items.slice(0, 4), growthStatus: "ready" }
}

export function assembleBullets(job: Job, facts: FactIndex): string[] | null {
  if (!job.details.trim()) return null
  const chunks = job.details
    .split(/\n+|•|;|(?<=[.!?])\s+/)
    .map((part) => part.trim().replace(/^[-–—]\s*/, ""))
    .filter((part) => part.length > 1)
  const unique: string[] = []
  for (const chunk of chunks) {
    const line = chunk.replace(/[.!?…]$/, "").trim()
    if (!line || unique.includes(line)) continue
    if (textFailsFacts(line, facts)) continue
    unique.push(line)
    if (unique.length === 5) break
  }
  if (unique.length < 3) return null
  return unique
}

export function assembleResume(project: Project): ResumeDraft | null {
  const facts = buildFacts(project)
  const summary = assembleSummary(project, facts)
  if (!summary) return null
  const strengths = assembleStrengths(project, facts)
  const growth = assembleGrowth(project)
  const jobBullets: Record<string, string[]> = {}
  for (const job of project.jobs) {
    const bullets = assembleBullets(job, facts)
    if (bullets) jobBullets[job.id] = bullets
  }
  return {
    summary: summary.text,
    summaryShort: summary.short,
    lengthNote: summary.lengthNote,
    strengths,
    growth: growth.growth,
    growthStatus: growth.growthStatus,
    jobBullets,
  }
}

function contactsLine(project: Project): string {
  return project.profile.contacts
    .map((contact) => contact.value.trim())
    .filter(Boolean)
    .join(", ")
}

function fitWords(paragraphs: string[], fillers: string[], min: number, max: number, facts: FactIndex): { text: string; lengthNote: boolean } | null {
  const body: string[] = []
  for (const paragraph of paragraphs) {
    const next = [...body, paragraph].join("\n\n")
    if (wordCount(next) > max && body.length) break
    body.push(paragraph)
  }
  let text = body.join("\n\n").trim()
  for (const filler of fillers) {
    if (wordCount(text) >= min) break
    const next = `${text}\n\n${filler}`.trim()
    if (wordCount(next) > max || textFailsFacts(filler, facts)) continue
    text = next
  }
  if (wordCount(text) > max) {
    const words = text.split(/\s+/)
    text = words.slice(0, max).join(" ")
    if (!/[.!?…]$/.test(text)) text += "."
  }
  if (textFailsFacts(text, facts)) return null
  return { text, lengthNote: wordCount(text) < min || wordCount(text) > max }
}

export function assembleMotivation(project: Project): { text: string; lengthNote: boolean } | null {
  const facts = buildFacts(project)
  const name = fullName(project.profile)
  const role = project.letters.motivation.vacancy.trim() || project.profile.title.trim()
  const company = project.letters.motivation.company.trim()
  const jobs = orderedJobs(project).filter((job) => job.company.trim())
  const factsLine = jobs
    .slice(0, 2)
    .map((job) => `${job.role.trim()} в компании «${job.company.trim()}»${job.details.trim() ? `: ${firstSentence(job.details)}` : ""}`)
    .join(" ")
  const skills = project.skills.map((skill) => skill.label.trim()).filter(Boolean)
  const education = orderedEducation(project).find((item) => item.institution.trim())
  const growth =
    project.generated.mentionGrowthInMotivation && project.generated.growth[0]
      ? project.generated.growth[0].advice.trim()
      : ""
  const paragraphs = [
    "Здравствуйте.",
    `Меня зовут ${name}. Хочу занять роль «${role}»${company ? ` в «${company}»` : ""}.`,
    factsLine
      ? `Ближе всего к этой роли такой опыт: ${factsLine}`
      : `В анкете пока нет мест работы, поэтому опираюсь на роль «${role}» и то, что уже заполнено.`,
    skills.length ? `В задачах использую ${skills.join(", ")}.` : "",
    education ? `Из образования в резюме указано: ${education.institution.trim()}${education.program.trim() ? `, ${education.program.trim()}` : ""}.` : "",
    project.letters.motivation.reason.trim() ? sentence(project.letters.motivation.reason.trim()) : "",
    project.generated.summary.trim() ? `Кратко о себе так, как это уже собрано в резюме: ${firstSentence(project.generated.summary)}` : "",
    growth ? `Отдельно отмечаю направление развития: ${growth}` : "",
    `Буду рад обсудить задачи. Со мной можно связаться: ${contactsLine(project) || name}.`,
  ].filter(Boolean)
  const fillers = [
    `Роль в письме совпадает с резюме: ${role}.`,
    company ? `Письмо адресовано в ${company}.` : "",
    ...jobs.flatMap((job) => [
      `В резюме есть компания «${job.company.trim()}», должность — ${job.role.trim()}.`,
      job.city.trim() ? `Город для ${job.company.trim()} — ${job.city.trim()}.` : "",
      job.details.trim() ? `Из описания обязанностей: ${sentence(job.details.trim().slice(0, 300))}` : "",
    ]),
    skills.length ? `Навыки, которые уже стоят в резюме: ${skills.join(", ")}.` : "",
    "Прошу читать письмо вместе с резюме: факты в обоих текстах одни и те же.",
  ].filter(Boolean)
  return fitWords(paragraphs, fillers, 180, 260, facts)
}

export function assembleRecommendation(project: Project): { text: string; lengthNote: boolean } | null {
  const letter = project.letters.recommendation
  if (!letter.authorName.trim() || !letter.authorRole.trim() || !letter.relation) return null
  const facts = buildFacts(project)
  const name = fullName(project.profile)
  const jobs = orderedJobs(project).filter((job) => job.company.trim()).slice(0, 2)
  const observations = jobs.map(
    (job) => `В резюме указана позиция ${job.role.trim()} в ${job.company.trim()}${job.details.trim() ? `. Оттуда же: ${firstSentence(job.details)}` : "."}`,
  )
  const skills = project.skills.map((skill) => skill.label.trim()).filter(Boolean)
  const paragraphs = [
    `Меня зовут ${letter.authorName.trim()}, я ${letter.authorRole.trim()}.`,
    `С ${name} меня связывает роль: ${RELATION_LABEL[letter.relation]}${letter.period.trim() ? `, ${letter.period.trim()}` : ""}.`,
    `Рекомендую ${name} на роль ${project.profile.title.trim()}.`,
    observations[0] || `Рекомендация опирается на роль «${project.profile.title.trim()}», как она указана в резюме.`,
    observations[1] || (skills.length ? `Из навыков в резюме отмечены ${skills.join(", ")}.` : "Второе наблюдение беру только из заполненных полей резюме."),
    project.generated.summary.trim() ? `В описании резюме уже сказано: ${firstSentence(project.generated.summary)}` : "",
    "Прошу читать это письмо как черновик: его стоит править перед подписью и отправкой.",
  ].filter(Boolean)
  const fillers = [
    `Рекомендуемая роль — ${project.profile.title.trim()}.`,
    ...jobs.flatMap((job) => [
      `Место из резюме: ${job.company.trim()}, роль — ${job.role.trim()}.`,
      job.details.trim() ? `Там же указано: ${sentence(job.details.trim().slice(0, 280))}` : "",
    ]),
    skills.length ? `Навыки в резюме: ${skills.join(", ")}.` : "",
    `${letter.authorName.trim()} указывает связь «${RELATION_LABEL[letter.relation]}» и не добавляет фактов сверх резюме.`,
  ].filter(Boolean)
  return fitWords(paragraphs, fillers, 150, 230, facts)
}
