import { PALETTES, TEMPLATE_COPY } from "../domain/constants"
import type { ResumeDraft } from "../domain/generate"
import type { PaletteId, Project, TemplateId } from "../domain/types"

export type Proposal =
  | { kind: "resume"; draft: ResumeDraft }
  | { kind: "motivation" | "recommendation"; text: string; lengthNote: boolean }

const SECTION_LABELS: { key: keyof Project["design"]["sections"]; label: string }[] = [
  { key: "photo", label: "Фото" },
  { key: "age", label: "Возраст" },
  { key: "address", label: "Адрес" },
  { key: "summary", label: "Описание" },
  { key: "strengths", label: "Сильные стороны" },
  { key: "jobs", label: "Места работы" },
  { key: "education", label: "Образование" },
  { key: "skills", label: "Навыки" },
]

export function Notes({
  project,
  proposal,
  confirm,
  error,
  busy,
  onChange,
  onApply,
  onDrop,
  onReplace,
  onKeep,
}: {
  project: Project
  proposal: Proposal | null
  confirm: "resume" | "motivation" | "recommendation" | null
  error: string | null
  busy: boolean
  onChange: (project: Project) => void
  onApply: () => void
  onDrop: () => void
  onReplace: () => void
  onKeep: () => void
}) {
  const generated = project.generated
  const letter = project.preview.document === "motivation" ? project.letters.motivation : project.preview.document === "recommendation" ? project.letters.recommendation : null
  const auto = generated.summarySource === "ai" || generated.strengths.some(() => generated.summarySource === "ai") || letter?.source === "ai"

  return (
    <aside className="notes">
      <h2>Не для печати</h2>
      {project.preview.document === "recommendation" ? (
        <p>Черновик. Подписывает и отправляет рекомендатель после своей правки.</p>
      ) : null}
      {letter?.stale ? <p className="warn">Анкета изменилась. Письмо можно собрать заново.</p> : null}
      {confirm ? (
        <div className="proposal">
          <p>Заменить ваш текст новым вариантом?</p>
          <div className="words">
            <button type="button" onClick={onReplace}>
              Заменить
            </button>
            <button type="button" onClick={onKeep}>
              Оставить
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="proposal">
          <p className="err">{error}</p>
          <button type="button" onClick={onDrop}>
            Продолжить без генерации
          </button>
        </div>
      ) : null}
      {busy ? <p>Набор…</p> : null}
      {proposal ? (
        <div className="proposal">
          <h3>Новый вариант</h3>
          {proposal.kind === "resume" ? <p>{proposal.draft.summary}</p> : <p>{proposal.text}</p>}
          {proposal.kind === "resume" && proposal.draft.lengthNote ? <p className="warn">Проверьте длину</p> : null}
          {proposal.kind !== "resume" && proposal.lengthNote ? <p className="warn">Проверьте длину</p> : null}
          {proposal.kind === "resume" && proposal.draft.growthStatus === "insufficient" ? (
            <p>Чтобы назвать зоны роста, добавьте места работы или описание опыта.</p>
          ) : null}
          <div className="words">
            <button type="button" onClick={onApply}>
              В лист
            </button>
            <button type="button" onClick={onDrop}>
              Оставить
            </button>
          </div>
        </div>
      ) : null}
      {auto ? <p>Текст собран автоматически. Проверьте факты до скачивания.</p> : null}

      {project.preview.document === "resume" ? (
        <>
          <h3>Зоны роста</h3>
          {generated.growthStatus === "insufficient" ? <p>Чтобы назвать зоны роста, добавьте места работы или описание опыта.</p> : null}
          {generated.growth.map((item, index) => (
            <div key={item.id} className="growth">
              <textarea
                rows={2}
                value={item.limitation}
                onChange={(event) => editGrowth(project, onChange, index, { limitation: event.target.value })}
              />
              <textarea rows={2} value={item.advice} onChange={(event) => editGrowth(project, onChange, index, { advice: event.target.value })} />
            </div>
          ))}
          <label className="check">
            <input
              type="checkbox"
              checked={generated.showGrowthInResume}
              onChange={(event) => onChange({ ...project, generated: { ...generated, showGrowthInResume: event.target.checked } })}
            />
            Показать зоны роста в резюме
          </label>
          {generated.growthStatus === "ready" ? (
            <label className="check">
              <input
                type="checkbox"
                checked={generated.mentionGrowthInMotivation}
                onChange={(event) => onChange({ ...project, generated: { ...generated, mentionGrowthInMotivation: event.target.checked } })}
              />
              Упомянуть развитие в мотивационном письме
            </label>
          ) : null}
          <h3>На листе</h3>
          {SECTION_LABELS.map((item) => (
            <label key={item.key} className="check">
              <input
                type="checkbox"
                checked={project.design.sections[item.key]}
                onChange={(event) =>
                  onChange({
                    ...project,
                    design: { ...project.design, sections: { ...project.design.sections, [item.key]: event.target.checked } },
                  })
                }
              />
              {item.label}
            </label>
          ))}
        </>
      ) : null}

      <h3>Типография</h3>
      {(Object.keys(TEMPLATE_COPY) as TemplateId[]).map((id) => (
        <button key={id} type="button" className={project.design.template === id ? "choice on" : "choice"} onClick={() => onChange({ ...project, design: { ...project.design, template: id } })}>
          <strong>{TEMPLATE_COPY[id].name}</strong>
          <span>{TEMPLATE_COPY[id].line}</span>
        </button>
      ))}
      <h3>Палитра</h3>
      {(Object.keys(PALETTES) as PaletteId[]).map((id) => (
        <button key={id} type="button" className={project.design.palette === id ? "swatch on" : "swatch"} onClick={() => onChange({ ...project, design: { ...project.design, palette: id } })}>
          <i style={{ background: PALETTES[id].primary }} />
          {PALETTES[id].name}
        </button>
      ))}
    </aside>
  )
}

function editGrowth(project: Project, onChange: (project: Project) => void, index: number, patch: { limitation?: string; advice?: string }) {
  const growth = project.generated.growth.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
  onChange({ ...project, generated: { ...project.generated, growth, growthDirty: true, growthStatus: growth.length ? "ready" : project.generated.growthStatus } })
}
