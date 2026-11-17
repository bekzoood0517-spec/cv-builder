import { useEffect, useRef, useState, type ReactNode } from "react"
import { resumeModel } from "../domain/model"
import type { PreviewFormat, Project, TemplateId } from "../domain/types"
import { fullName } from "../domain/text"

export function ScaledSheet({ widthMm, watch, children }: { widthMm: number; watch: string; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const parent = outer.current?.parentElement
    const node = inner.current
    if (!parent || !node) return
    const measure = () => {
      const natural = (widthMm / 25.4) * 96
      const next = Math.min(1, Math.max(0.2, (parent.clientWidth - 8) / natural))
      setScale(next)
      setHeight(node.offsetHeight * next)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(parent)
    observer.observe(node)
    measure()
    return () => observer.disconnect()
  }, [widthMm, watch])

  return (
    <div ref={outer} className="scaled" style={{ height }}>
      <div ref={inner} className="scaled-inner" style={{ width: `${widthMm}mm`, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  )
}

export function ResumeSheet({
  project,
  format,
  active,
  onSummary,
}: {
  project: Project
  format: PreviewFormat
  active: string | null
  onSummary: (value: string) => void
}) {
  const model = resumeModel(project)
  const template = project.design.template
  const mark = (id: string) => (active === id ? "block active" : "block")
  const showSummary = project.design.sections.summary && (Boolean(model.summary) || active === "summary")

  const summaryBlock = showSummary ? (
    <section className={mark("summary")} data-block="summary">
      <h3>Описание</h3>
      <textarea
        className="sheet-edit"
        value={project.generated.summary}
        onChange={(event) => onSummary(event.target.value.slice(0, 4000))}
        rows={Math.max(4, Math.ceil(project.generated.summary.length / 90))}
      />
    </section>
  ) : null

  const strengths = model.strengths.length ? (
    <section className={mark("strengths")} data-block="strengths">
      <h3>Сильные стороны</h3>
      {model.strengths.map((item) => (
        <p key={item.id}>
          <strong>{item.title}.</strong> {item.detail}
        </p>
      ))}
    </section>
  ) : null

  const jobs = model.jobs.length ? (
    <section className={mark("jobs")}>
      <h3>Места работы</h3>
      {model.jobs.map((job) => (
        <article key={job.id} className={active === `job:${job.id}` ? "entry active" : "entry"} data-block={`job:${job.id}`}>
          <h4>
            {job.role}
            {job.company ? ` — ${job.company}` : ""}
          </h4>
          <p className="meta">{[job.period, job.city].filter(Boolean).join(" · ")}</p>
          {job.paragraph ? <p>{job.paragraph}</p> : null}
          {job.bullets ? (
            <ul>
              {job.bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </section>
  ) : null

  const education = model.education.length ? (
    <section className={mark("education")} data-block="education">
      <h3>Образование</h3>
      {model.education.map((item) => (
        <article key={item.id} className={active === `education:${item.id}` ? "entry active" : "entry"} data-block={`education:${item.id}`}>
          <h4>{item.title}</h4>
          {item.meta ? <p className="meta">{item.meta}</p> : null}
          {item.note ? <p>{item.note}</p> : null}
        </article>
      ))}
    </section>
  ) : null

  const skills = model.skills.length ? (
    <section className={mark("skills")} data-block="skills">
      <h3>Навыки</h3>
      {template === "accent" ? (
        <div className="tags">
          {model.skills.map((skill) => (
            <span key={skill.label} style={{ background: model.palette.accent, color: model.pillInk }}>
              {skill.label}
              {skill.level ? ` · ${skill.level}` : ""}
            </span>
          ))}
        </div>
      ) : (
        <p>{model.skills.map((skill) => (skill.level ? `${skill.label} (${skill.level})` : skill.label)).join(template === "classic" ? " · " : ", ")}</p>
      )}
    </section>
  ) : null

  const growth = model.growth?.length ? (
    <section className={mark("growth")} data-block="growth">
      <h3>Зоны роста</h3>
      {model.growth.map((item) => (
        <p key={item.id}>
          {item.limitation}. {item.advice}
        </p>
      ))}
    </section>
  ) : null

  const contacts = (
    <div className="contacts">
      {model.contacts.map((contact) => (
        <a key={contact.id} href={contact.href}>
          {contact.label}
        </a>
      ))}
    </div>
  )

  const portrait = model.showPortrait ? (
    <Portrait template={template} photo={model.photo} initials={model.initials} accent={model.palette.accent} />
  ) : null

  const identity = (
    <div className={mark("profile")} data-block="profile">
      <h2 style={{ color: template === "modern" ? model.headerInk : model.palette.primary }}>
        {model.nameReady ? model.name : "Фамилия Имя"}
      </h2>
      <p className={model.title ? "" : "ghost"}>{model.title || "Должность"}</p>
      {template !== "modern" || format === "mobile" ? (
        <p className="meta">{[model.age, model.address].filter(Boolean).join(" · ")}</p>
      ) : null}
    </div>
  )

  const stack = (
    <>
      {summaryBlock}
      {strengths}
      {jobs}
      {education}
      {skills}
      {growth}
    </>
  )

  return (
    <article
      className="page"
      data-template={template}
      data-format={format}
      style={{ background: model.palette.background, color: model.palette.text, ["--accent" as string]: model.palette.accent, ["--primary" as string]: model.palette.primary }}
    >
      {template === "accent" ? <i className="bar" style={{ background: model.palette.primary }} /> : null}
      {template === "modern" ? (
        <header className="banner" style={{ background: model.palette.primary, color: model.headerInk }}>
          {identity}
          {portrait}
        </header>
      ) : (
        <header className="plain-head">
          {portrait}
          {identity}
        </header>
      )}
      {template !== "modern" ? contacts : null}
      {template === "modern" && format === "a4" ? (
        <div className="columns">
          <div>
            {(model.age || model.address) && (
              <p className="meta">
                {[model.age, model.address].filter(Boolean).join(" · ")}
              </p>
            )}
            {contacts}
            {skills}
            {education}
          </div>
          <div>
            {summaryBlock}
            {strengths}
            {jobs}
            {growth}
          </div>
        </div>
      ) : (
        stack
      )}
    </article>
  )
}

function Portrait({
  template,
  photo,
  initials,
  accent,
}: {
  template: TemplateId
  photo: string | null
  initials: string
  accent: string
}) {
  const round = template === "classic" || template === "minimal"
  if (photo) return <img className={round ? "portrait round" : "portrait"} src={photo} alt="" />
  if (!initials) return null
  return (
    <span className={round ? "portrait round mono" : "portrait mono"} style={{ borderColor: accent }}>
      {initials}
    </span>
  )
}

export function LetterSheet({ project, kind }: { project: Project; kind: "motivation" | "recommendation" }) {
  const model = resumeModel(project)
  const template = project.design.template
  const text = kind === "motivation" ? project.letters.motivation.text : project.letters.recommendation.text
  const title = kind === "motivation" ? "Мотивационное письмо" : "Рекомендательное письмо"
  const author = project.letters.recommendation
  return (
    <article
      className="page letter"
      data-template={template}
      data-format={project.preview.format}
      style={{ background: model.palette.background, color: model.palette.text, ["--accent" as string]: model.palette.accent, ["--primary" as string]: model.palette.primary }}
    >
      <h2 style={{ color: model.palette.primary }}>{title}</h2>
      <p>{fullName(project.profile)}</p>
      {text.trim() ? (
        text.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)
      ) : (
        <p className="ghost">Текст письма</p>
      )}
      {kind === "recommendation" ? (
        <footer className="sign">
          <p>Черновик. Подписывает и отправляет рекомендатель после своей правки.</p>
          <p>{author.authorName}</p>
          <p>{author.authorRole}</p>
          <p>Телефон: {author.authorPhone.trim() || "____________________"}</p>
          <p>Email: {author.authorEmail.trim() || "____________________"}</p>
        </footer>
      ) : null}
    </article>
  )
}

export function useActiveScroll(active: string | null) {
  useEffect(() => {
    if (!active) return
    const node = document.querySelector(`.page [data-block="${CSS.escape(active)}"]`)
    node?.scrollIntoView({ block: "nearest" })
  }, [active])
}
