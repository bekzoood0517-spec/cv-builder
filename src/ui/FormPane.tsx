import { useEffect, useState, type FocusEvent } from "react"
import { EDU_LABEL, LIMITS, LINK_LABEL, MONTHS, RELATION_LABEL, SKILL_LABEL, uid } from "../domain/constants"
import { readPhoto } from "../domain/photo"
import { addSkill, moveItem, newEducation, newJob } from "../domain/project"
import type { Contact, EduLevel, LinkLabel, Project, Relation, SkillLevel } from "../domain/types"
import { birthBounds, canExport } from "../domain/validate"

export function FormPane({
  project,
  errors,
  onActive,
  onChange,
  onAssemble,
  busy,
}: {
  project: Project
  errors: Record<string, string>
  onActive: (id: string) => void
  onChange: (project: Project) => void
  onAssemble: () => void
  busy: boolean
}) {
  const document = project.preview.document
  if (document === "motivation") {
    return <MotivationFields project={project} onChange={onChange} busy={busy} onAssemble={onAssemble} />
  }
  if (document === "recommendation") {
    return <RecommendationFields project={project} onChange={onChange} busy={busy} onAssemble={onAssemble} />
  }
  return (
    <ResumeFields
      project={project}
      errors={errors}
      onActive={onActive}
      onChange={onChange}
      onAssemble={onAssemble}
      busy={busy}
    />
  )
}

function ResumeFields({
  project,
  errors,
  onActive,
  onChange,
  onAssemble,
  busy,
}: {
  project: Project
  errors: Record<string, string>
  onActive: (id: string) => void
  onChange: (project: Project) => void
  onAssemble: () => void
  busy: boolean
}) {
  const profile = project.profile
  const [photoError, setPhotoError] = useState("")
  const [skill, setSkill] = useState("")
  const [level, setLevel] = useState<SkillLevel>("")
  const bounds = birthBounds()

  const setProfile = (patch: Partial<typeof profile>) => onChange({ ...project, profile: { ...profile, ...patch } })

  return (
    <div className="form" onFocusCapture={(event) => trackFocus(event, onActive)}>
      <section data-focus="profile">
        <h2>Личные данные</h2>
        <div className="photo-row">
          <div className="photo-box">{profile.photo ? <img src={profile.photo} alt="" /> : <span>Фото</span>}</div>
          <div className="words">
            <label className="file">
              Выбрать файл
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ""
                  if (!file) return
                  try {
                    setPhotoError("")
                    setProfile({ photo: await readPhoto(file) })
                  } catch (error) {
                    setPhotoError(error instanceof Error ? error.message : "Не удалось прочитать фото.")
                  }
                }}
              />
            </label>
            {profile.photo ? (
              <button type="button" onClick={() => setProfile({ photo: null })}>
                Убрать
              </button>
            ) : null}
            {photoError ? <small className="err">{photoError}</small> : null}
          </div>
        </div>
        <Field label="Фамилия" need value={profile.lastName} max={LIMITS.name} onFocus={() => onActive("profile")} onChange={(lastName) => setProfile({ lastName })} error={!profile.lastName.trim() ? undefined : undefined} />
        <Field label="Имя" need value={profile.firstName} max={LIMITS.name} onChange={(firstName) => setProfile({ firstName })} />
        <Field label="Отчество" value={profile.middleName} max={LIMITS.name} onChange={(middleName) => setProfile({ middleName })} />
        <YearField label="Год рождения" hint={`${bounds.min}–${bounds.max}`} value={profile.birthYear} error={errors.birthYear} onChange={(birthYear) => setProfile({ birthYear })} />
        <Field label="Адрес" value={profile.address} max={LIMITS.address} onChange={(address) => setProfile({ address })} />
        <Field label="Желаемая должность" need value={profile.title} max={LIMITS.title} onChange={(title) => setProfile({ title })} />
        <div className="contacts-edit">
          <span className="label">Контакты <i>нужно</i></span>
          {profile.contacts.map((contact, index) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              error={errors[`contact-${index}`]}
              onChange={(next) => setProfile({ contacts: profile.contacts.map((item) => (item.id === contact.id ? next : item)) })}
              onRemove={() => setProfile({ contacts: profile.contacts.filter((item) => item.id !== contact.id) })}
            />
          ))}
          {profile.contacts.length < LIMITS.contacts ? (
            <div className="words">
              <button type="button" onClick={() => setProfile({ contacts: [...profile.contacts, { id: uid(), kind: "phone", value: "" }] })}>
                Телефон
              </button>
              <button type="button" onClick={() => setProfile({ contacts: [...profile.contacts, { id: uid(), kind: "email", value: "" }] })}>
                Почта
              </button>
              <button type="button" onClick={() => setProfile({ contacts: [...profile.contacts, { id: uid(), kind: "link", label: "telegram", value: "" }] })}>
                Ссылка
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section data-focus="summary">
        <h2>Опыт</h2>
        <Area label="Своими словами" value={project.experienceSummary} max={LIMITS.experience} onFocus={() => onActive("summary")} onChange={(experienceSummary) => onChange({ ...project, experienceSummary })} />
        <Area
          label="Описание для листа"
          value={project.generated.summary}
          max={4000}
          onFocus={() => onActive("summary")}
          onChange={(summary) =>
            onChange({
              ...project,
              generated: {
                ...project.generated,
                summary,
                summarySource: summary.trim() ? "user" : "empty",
                summaryDirty: true,
              },
            })
          }
        />
      </section>

      <section>
        <h2>Места работы</h2>
        {errors.jobsOverlap ? <small className="warn">{errors.jobsOverlap}</small> : null}
        {project.jobs.map((job, index) => (
          <fieldset key={job.id} data-focus={`job:${job.id}`} onFocusCapture={() => onActive(`job:${job.id}`)}>
            <legend>{String(index + 1).padStart(2, "0")}</legend>
            <Field label="Компания" value={job.company} max={LIMITS.company} error={errors[`job-${index}-company`]} onChange={(company) => updateJob(project, onChange, job.id, { company })} />
            <Field label="Должность" value={job.role} max={LIMITS.role} error={errors[`job-${index}-role`]} onChange={(role) => updateJob(project, onChange, job.id, { role })} />
            <Field label="Город" value={job.city} max={LIMITS.city} onChange={(city) => updateJob(project, onChange, job.id, { city })} />
            <MonthYear label="Начало" value={job.start} error={errors[`job-${index}-start`]} onChange={(start) => { if (start) updateJob(project, onChange, job.id, { start }) }} />
            <label className="check">
              <input
                type="checkbox"
                checked={job.current}
                onChange={(event) => updateJob(project, onChange, job.id, { current: event.target.checked, end: event.target.checked ? null : job.end })}
              />
              по настоящее время
            </label>
            {job.current ? null : <MonthYear label="Окончание" value={job.end} error={errors[`job-${index}-end`]} onChange={(end) => updateJob(project, onChange, job.id, { end })} />}
            <Area label="Обязанности и результаты" value={job.details} max={LIMITS.details} onChange={(details) => updateJob(project, onChange, job.id, { details })} />
            <div className="words">
              <button type="button" onClick={() => onChange({ ...project, jobs: moveItem(project.jobs, index, -1), jobsManual: true })}>
                Выше
              </button>
              <button type="button" onClick={() => onChange({ ...project, jobs: moveItem(project.jobs, index, 1), jobsManual: true })}>
                Ниже
              </button>
              <button type="button" onClick={() => onChange({ ...project, jobs: project.jobs.filter((item) => item.id !== job.id), jobsManual: true })}>
                Удалить
              </button>
            </div>
          </fieldset>
        ))}
        {project.jobsManual ? (
          <button type="button" onClick={() => onChange({ ...project, jobsManual: false })}>
            Сортировать по дате
          </button>
        ) : null}
        {project.jobs.length < LIMITS.jobs ? (
          <button type="button" onClick={() => onChange({ ...project, jobs: [...project.jobs, newJob()] })}>
            Добавить место работы
          </button>
        ) : null}
      </section>

      <section>
        <h2>Образование</h2>
        {project.education.map((item, index) => (
          <fieldset key={item.id} onFocusCapture={() => onActive(`education:${item.id}`)}>
            <legend>{String(index + 1).padStart(2, "0")}</legend>
            <Field label="Учебное заведение" value={item.institution} max={LIMITS.institution} error={errors[`edu-${index}-institution`]} onChange={(institution) => updateEducation(project, onChange, item.id, { institution })} />
            <Field label="Специальность" value={item.program} max={LIMITS.program} onChange={(program) => updateEducation(project, onChange, item.id, { program })} />
            <label>
              <span>Уровень</span>
              <select value={item.level} onChange={(event) => updateEducation(project, onChange, item.id, { level: event.target.value as EduLevel })}>
                <option value="">Не указан</option>
                {Object.entries(EDU_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <MonthYear label="Начало" value={item.start} allowEmpty error={errors[`edu-${index}-start`]} onChange={(start) => updateEducation(project, onChange, item.id, { start })} />
            <label className="check">
              <input type="checkbox" checked={item.current} onChange={(event) => updateEducation(project, onChange, item.id, { current: event.target.checked, end: event.target.checked ? null : item.end })} />
              по настоящее время
            </label>
            {item.current ? null : <MonthYear label="Окончание" value={item.end} allowEmpty error={errors[`edu-${index}-end`]} onChange={(end) => updateEducation(project, onChange, item.id, { end })} />}
            <Field label="Дополнительно" value={item.note} max={LIMITS.note} onChange={(note) => updateEducation(project, onChange, item.id, { note })} />
            <div className="words">
              <button type="button" onClick={() => onChange({ ...project, education: moveItem(project.education, index, -1), educationManual: true })}>
                Выше
              </button>
              <button type="button" onClick={() => onChange({ ...project, education: moveItem(project.education, index, 1), educationManual: true })}>
                Ниже
              </button>
              <button type="button" onClick={() => onChange({ ...project, education: project.education.filter((entry) => entry.id !== item.id), educationManual: true })}>
                Удалить
              </button>
            </div>
          </fieldset>
        ))}
        {project.educationManual ? (
          <button type="button" onClick={() => onChange({ ...project, educationManual: false })}>
            Сортировать по дате
          </button>
        ) : null}
        {project.education.length < LIMITS.education ? (
          <button type="button" onClick={() => onChange({ ...project, education: [...project.education, newEducation()] })}>
            Добавить учёбу
          </button>
        ) : null}
      </section>

      <section data-focus="skills" onFocusCapture={() => onActive("skills")}>
        <h2>Навыки</h2>
        <ul className="skill-list">
          {project.skills.map((item) => (
            <li key={item.id}>
              <span>
                {item.label}
                {item.level ? ` · ${SKILL_LABEL[item.level]}` : ""}
              </span>
              <button type="button" onClick={() => onChange({ ...project, skills: project.skills.filter((skill) => skill.id !== item.id) })}>
                Удалить
              </button>
            </li>
          ))}
        </ul>
        {project.skills.length < LIMITS.skills ? (
          <div className="skill-add">
            <input
              value={skill}
              maxLength={LIMITS.skill}
              placeholder="Навык"
              onChange={(event) => setSkill(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  onChange({ ...project, skills: addSkill(project.skills, skill, level) })
                  setSkill("")
                }
              }}
            />
            <select value={level} onChange={(event) => setLevel(event.target.value as SkillLevel)}>
              <option value="">Без уровня</option>
              {Object.entries(SKILL_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                onChange({ ...project, skills: addSkill(project.skills, skill, level) })
                setSkill("")
              }}
            >
              Добавить
            </button>
          </div>
        ) : null}
      </section>

      <button type="button" className="solid" disabled={busy || !canExport(project)} onClick={onAssemble}>
        {busy ? "Набор…" : "Собрать текст"}
      </button>
    </div>
  )
}

function MotivationFields({
  project,
  onChange,
  onAssemble,
  busy,
}: {
  project: Project
  onChange: (project: Project) => void
  onAssemble: () => void
  busy: boolean
}) {
  const letter = project.letters.motivation
  const set = (patch: Partial<typeof letter>) =>
    onChange({
      ...project,
      letters: { ...project.letters, motivation: { ...letter, ...patch, dirty: patch.text != null ? true : letter.dirty, source: patch.text != null ? "user" : letter.source } },
    })
  return (
    <div className="form">
      <section>
        <h2>Мотивационное письмо</h2>
        <p className="quiet">
          {project.profile.lastName} {project.profile.firstName} · {project.profile.title}
        </p>
        <Field label="Компания" value={letter.company} max={LIMITS.letterField} onChange={(company) => set({ company })} />
        <Field label="Вакансия" value={letter.vacancy} max={LIMITS.letterField} onChange={(vacancy) => set({ vacancy })} />
        <Area label="Почему этот отклик" value={letter.reason} max={LIMITS.reason} onChange={(reason) => set({ reason })} />
        <Area label="Текст письма" value={letter.text} max={LIMITS.motivation} onChange={(text) => set({ text })} />
        <button type="button" className="solid" disabled={busy || !canExport(project)} onClick={onAssemble}>
          {busy ? "Набор…" : "Собрать письмо"}
        </button>
      </section>
    </div>
  )
}

function RecommendationFields({
  project,
  onChange,
  onAssemble,
  busy,
}: {
  project: Project
  onChange: (project: Project) => void
  onAssemble: () => void
  busy: boolean
}) {
  const letter = project.letters.recommendation
  const ready = Boolean(letter.authorName.trim() && letter.authorRole.trim() && letter.relation)
  const set = (patch: Partial<typeof letter>) =>
    onChange({
      ...project,
      letters: {
        ...project.letters,
        recommendation: { ...letter, ...patch, dirty: patch.text != null ? true : letter.dirty, source: patch.text != null ? "user" : letter.source },
      },
    })
  return (
    <div className="form">
      <section>
        <h2>Рекомендательное письмо</h2>
        <p className="quiet">Черновик. Подписывает и отправляет рекомендатель после своей правки.</p>
        <Field label="Имя рекомендателя" need value={letter.authorName} max={LIMITS.letterField} onChange={(authorName) => set({ authorName })} />
        <Field label="Должность и организация" need value={letter.authorRole} max={LIMITS.letterField} onChange={(authorRole) => set({ authorRole })} />
        <label>
          <span>
            Связь <i>нужно</i>
          </span>
          <select value={letter.relation} onChange={(event) => set({ relation: event.target.value as Relation })}>
            <option value="">Выберите</option>
            {Object.entries(RELATION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Field label="Период совместной работы" value={letter.period} max={LIMITS.period} onChange={(period) => set({ period })} />
        <Field label="Телефон рекомендателя" value={letter.authorPhone} max={40} onChange={(authorPhone) => set({ authorPhone })} />
        <Field label="Почта рекомендателя" value={letter.authorEmail} max={80} onChange={(authorEmail) => set({ authorEmail })} />
        <Area label="Текст письма" value={letter.text} max={LIMITS.recommendation} onChange={(text) => set({ text })} />
        <button type="button" className="solid" disabled={busy || !ready || !canExport(project)} onClick={onAssemble}>
          {busy ? "Набор…" : "Собрать письмо"}
        </button>
        {ready ? null : <small>Нужны имя, роль и связь рекомендателя.</small>}
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  max,
  need,
  error,
  onFocus,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  max: number
  need?: boolean
  error?: string
  onFocus?: () => void
}) {
  const id = `f-${label}`
  return (
    <label>
      <span>
        {label} {need ? <i>нужно</i> : null}
      </span>
      <input id={id} value={value} maxLength={max} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} onFocus={onFocus} onChange={(event) => onChange(event.target.value)} />
      {error ? (
        <small id={`${id}-err`} className="err">
          {error}
        </small>
      ) : null}
    </label>
  )
}

function Area({
  label,
  value,
  onChange,
  max,
  onFocus,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  max: number
  onFocus?: () => void
}) {
  return (
    <label>
      <span>
        {label} <i className="count">{value.length}/{max}</i>
      </span>
      <textarea value={value} maxLength={max} rows={4} onFocus={onFocus} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function YearField({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  error?: string
  hint: string
}) {
  const [text, setText] = useState(value?.toString() ?? "")
  useEffect(() => {
    if (value == null) {
      if (text.length === 4) setText("")
      return
    }
    if (text !== String(value) && document.activeElement?.tagName !== "INPUT") setText(String(value))
  }, [value, text])
  return (
    <label>
      <span>
        {label} <i>{hint}</i>
      </span>
      <input
        inputMode="numeric"
        value={text}
        aria-invalid={Boolean(error)}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, "").slice(0, 4)
          setText(next)
          if (!next) onChange(null)
          else if (next.length === 4) onChange(Number(next))
        }}
      />
      {error ? <small className="err">{error}</small> : null}
    </label>
  )
}

function MonthYear({
  label,
  value,
  onChange,
  error,
  allowEmpty,
}: {
  label: string
  value: { year: number; month: number } | null
  onChange: (value: { year: number; month: number } | null) => void
  error?: string
  allowEmpty?: boolean
}) {
  const year = value?.year ?? new Date().getFullYear()
  const month = value?.month ?? new Date().getMonth() + 1
  return (
    <label>
      <span>{label}</span>
      <span className="date-pair">
        <select
          value={value ? month : ""}
          onChange={(event) => {
            if (!event.target.value) onChange(null)
            else onChange({ year, month: Number(event.target.value) })
          }}
        >
          {allowEmpty ? <option value="">—</option> : null}
          {MONTHS.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
        <input
          inputMode="numeric"
          value={value ? String(year) : ""}
          onChange={(event) => {
            const next = event.target.value.replace(/\D/g, "").slice(0, 4)
            if (next.length === 4) onChange({ month, year: Number(next) })
          }}
        />
      </span>
      {error ? <small className="err">{error}</small> : null}
    </label>
  )
}

function ContactRow({
  contact,
  onChange,
  onRemove,
  error,
}: {
  contact: Contact
  onChange: (contact: Contact) => void
  onRemove: () => void
  error?: string
}) {
  return (
    <div className="contact-row">
      {contact.kind === "link" ? (
        <select value={contact.label} onChange={(event) => onChange({ ...contact, label: event.target.value as LinkLabel })}>
          {Object.entries(LINK_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      ) : (
        <span className="kind">{contact.kind === "phone" ? "Телефон" : "Почта"}</span>
      )}
      <input value={contact.value} onChange={(event) => onChange({ ...contact, value: event.target.value })} />
      <button type="button" onClick={onRemove}>
        Удалить
      </button>
      {error ? <small className="err">{error}</small> : null}
    </div>
  )
}

function updateJob(project: Project, onChange: (project: Project) => void, id: string, patch: Partial<Project["jobs"][number]>) {
  onChange({ ...project, jobs: project.jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)) })
}

function updateEducation(project: Project, onChange: (project: Project) => void, id: string, patch: Partial<Project["education"][number]>) {
  onChange({ ...project, education: project.education.map((item) => (item.id === id ? { ...item, ...patch } : item)) })
}

function trackFocus(event: FocusEvent, onActive: (id: string) => void) {
  const node = event.target instanceof HTMLElement ? event.target.closest("[data-focus]") : null
  const id = node?.getAttribute("data-focus")
  if (id) onActive(id)
}
