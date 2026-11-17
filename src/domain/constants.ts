import type { EduLevel, Palette, PaletteId, Relation, SkillLevel, TemplateId } from "./types"

export const MONTHS = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
]

export const PALETTES: Record<PaletteId, Palette> = {
  ink: { id: "ink", name: "Чернила", primary: "#1F2933", accent: "#334E68", background: "#FFFFFF", text: "#102A43" },
  sea: { id: "sea", name: "Морская", primary: "#0F3D4C", accent: "#1A7A8C", background: "#F7FBFC", text: "#102A43" },
  terracotta: { id: "terracotta", name: "Терракота", primary: "#3F2E2A", accent: "#C46B4A", background: "#FBF7F4", text: "#2B211E" },
  forest: { id: "forest", name: "Лес", primary: "#1E3A2F", accent: "#3E7C59", background: "#F6F8F6", text: "#1B2E24" },
  graphite: { id: "graphite", name: "Графит", primary: "#222222", accent: "#555555", background: "#FFFFFF", text: "#1A1A1A" },
}

export const TEMPLATE_COPY: Record<TemplateId, { name: string; line: string }> = {
  classic: { name: "Классика", line: "Книжная. Антиква, линейки, фото в круге" },
  modern: { name: "Современный", line: "Полоса. Гротеск, тёмная шапка, две колонки" },
  minimal: { name: "Минимал", line: "Журнал. Крупное имя, без линеек" },
  accent: { name: "Акцент", line: "Бирка. Боковая полоса, навыки прямоугольниками" },
}

export const EDU_LABEL: Record<Exclude<EduLevel, "">, string> = {
  secondary: "Среднее образование",
  college: "Колледж",
  bachelor: "Бакалавриат",
  master: "Магистратура",
  course: "Курс",
  other: "Другое",
}

export const SKILL_LABEL: Record<Exclude<SkillLevel, "">, string> = {
  basic: "базовый",
  confident: "уверенный",
  advanced: "продвинутый",
}

export const RELATION_LABEL: Record<Exclude<Relation, "">, string> = {
  manager: "руководитель",
  colleague: "коллега",
  teacher: "преподаватель",
  client: "заказчик",
}

export const LINK_LABEL: Record<string, string> = {
  telegram: "Telegram",
  linkedin: "LinkedIn",
  website: "Сайт",
  other: "Ссылка",
}

export const LIMITS = {
  name: 60,
  title: 120,
  address: 160,
  experience: 2000,
  company: 120,
  role: 120,
  city: 80,
  details: 1500,
  institution: 160,
  program: 160,
  note: 300,
  skill: 40,
  jobs: 10,
  education: 5,
  skills: 20,
  contacts: 6,
  reason: 500,
  letterField: 120,
  period: 80,
  motivation: 4000,
  recommendation: 3500,
}

export function uid(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function thisYear(): number {
  return new Date().getFullYear()
}

export function thisMonth(): number {
  return new Date().getMonth() + 1
}
