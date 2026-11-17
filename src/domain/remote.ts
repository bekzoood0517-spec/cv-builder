import { assembleMotivation, assembleRecommendation, assembleResume, type ResumeDraft } from "./generate"
import type { Project } from "./types"

const UNAVAILABLE = "Сервис формулировок сейчас недоступен. Резюме можно собрать и скачать вручную."
const INVALID = "Не удалось собрать текст по этой анкете. Поправьте поля или напишите описание сами."

export type GenerateResult =
  | { ok: true; kind: "resume"; draft: ResumeDraft }
  | { ok: true; kind: "motivation" | "recommendation"; text: string; lengthNote: boolean }
  | { ok: false; error: "unavailable" | "invalid"; message: string }

function payload(project: Project, kind: "resume" | "motivation" | "recommendation") {
  const { photo: _photo, ...profile } = project.profile
  return {
    kind,
    profile,
    experienceSummary: project.experienceSummary,
    jobs: project.jobs,
    education: project.education,
    skills: project.skills,
    generated: {
      summary: project.generated.summary,
      strengths: project.generated.strengths,
      growth: project.generated.growth,
      mentionGrowthInMotivation: project.generated.mentionGrowthInMotivation,
    },
    letterContext: kind === "motivation" ? project.letters.motivation : kind === "recommendation" ? project.letters.recommendation : undefined,
  }
}

export async function generate(project: Project, kind: "resume" | "motivation" | "recommendation"): Promise<GenerateResult> {
  const remote = import.meta.env.VITE_GENERATE_URL
  if (remote) {
    try {
      const response = await fetch(remote, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(project, kind)),
        signal: AbortSignal.timeout(45000),
      })
      if (!response.ok) return { ok: false, error: response.status >= 500 ? "unavailable" : "invalid", message: response.status >= 500 ? UNAVAILABLE : INVALID }
      const data = (await response.json()) as { ok?: boolean; error?: string; summary?: string; strengths?: ResumeDraft["strengths"]; growth?: ResumeDraft["growth"]; growthStatus?: ResumeDraft["growthStatus"]; jobBullets?: ResumeDraft["jobBullets"]; text?: string; summaryShort?: boolean }
      if (!data.ok) return { ok: false, error: data.error === "timeout" || data.error === "unavailable" ? "unavailable" : "invalid", message: data.error === "unavailable" || data.error === "timeout" ? UNAVAILABLE : INVALID }
      if (kind === "resume" && data.summary && data.strengths && data.growthStatus) {
        return {
          ok: true,
          kind,
          draft: {
            summary: data.summary,
            summaryShort: Boolean(data.summaryShort),
            lengthNote: false,
            strengths: data.strengths,
            growth: data.growth ?? null,
            growthStatus: data.growthStatus,
            jobBullets: data.jobBullets ?? {},
          },
        }
      }
      if ((kind === "motivation" || kind === "recommendation") && data.text) {
        return { ok: true, kind, text: data.text, lengthNote: false }
      }
      return { ok: false, error: "invalid", message: INVALID }
    } catch {
      return { ok: false, error: "unavailable", message: UNAVAILABLE }
    }
  }

  if (kind === "resume") {
    const draft = assembleResume(project)
    return draft ? { ok: true, kind, draft } : { ok: false, error: "invalid", message: INVALID }
  }
  const letter = kind === "motivation" ? assembleMotivation(project) : assembleRecommendation(project)
  return letter ? { ok: true, kind, text: letter.text, lengthNote: letter.lengthNote } : { ok: false, error: "invalid", message: INVALID }
}
