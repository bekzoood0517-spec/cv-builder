import { useEffect, useMemo, useRef, useState } from "react"
import { factsHash, factsPayload, stableString, withStale } from "./domain/project"
import { generate } from "./domain/remote"
import { importProject, loadProject, saveProject } from "./domain/storage"
import type { PreviewDocument, PreviewFormat, Project } from "./domain/types"
import { EXPORT_HINT, fieldErrors } from "./domain/validate"
import { saveProjectFile } from "./domain/save"
import { FormPane } from "./ui/FormPane"
import { Notes, type Proposal } from "./ui/Notes"
import { LetterSheet, ResumeSheet, ScaledSheet, useActiveScroll } from "./ui/SheetView"

export function App() {
  const [project, setProject] = useState<Project>(() => loadProject())
  const [active, setActive] = useState<string | null>("profile")
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [confirm, setConfirm] = useState<Proposal["kind"] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState("")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [importError, setImportError] = useState("")
  const hashRef = useRef("")
  const fileRef = useRef<HTMLInputElement>(null)
  const validation = useMemo(() => fieldErrors(project), [project])
  const errors = validation.errors
  const factsKey = useMemo(() => stableString(factsPayload(project)), [project])
  const ready = validation.exportOk
  useActiveScroll(active)

  useEffect(() => {
    const timer = window.setTimeout(() => saveProject(project), 400)
    return () => window.clearTimeout(timer)
  }, [project])

  useEffect(() => {
    let cancel = false
    void factsHash(project).then((hash) => {
      if (cancel) return
      hashRef.current = hash
      setProject((current) => withStale(current, hash))
    })
    return () => {
      cancel = true
    }
  }, [factsKey])

  const change = (next: Project) => setProject({ ...next, updatedAt: new Date().toISOString() })

  async function runGenerate(kind: Proposal["kind"], force = false) {
    const dirty =
      kind === "resume"
        ? project.generated.summaryDirty || project.generated.strengthsDirty || project.generated.growthDirty
        : project.letters[kind].dirty
    if (dirty && !force) {
      setConfirm(kind)
      return
    }
    setConfirm(null)
    setBusy(true)
    setError(null)
    const result = await generate(project, kind)
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    if (result.kind === "resume") setProposal({ kind: "resume", draft: result.draft })
    else setProposal({ kind: result.kind, text: result.text, lengthNote: result.lengthNote })
  }

  function applyProposal() {
    if (!proposal) return
    const hash = hashRef.current
    if (proposal.kind === "resume") {
      const bullets = Object.fromEntries(project.jobs.map((job) => [job.id, proposal.draft.jobBullets[job.id] ?? null]))
      change({
        ...project,
        generated: {
          ...project.generated,
          summary: proposal.draft.summary,
          summarySource: "ai",
          summaryDirty: false,
          strengths: proposal.draft.strengths,
          strengthsDirty: false,
          growth: proposal.draft.growth ?? [],
          growthStatus: proposal.draft.growthStatus,
          growthDirty: false,
          jobBullets: bullets,
        },
      })
    } else {
      change({
        ...project,
        letters: {
          ...project.letters,
          [proposal.kind]: {
            ...project.letters[proposal.kind],
            text: proposal.text,
            source: "ai",
            dirty: false,
            stale: false,
            factsHash: hash,
          },
        },
      })
    }
    setProposal(null)
  }

  async function download(format: PreviewFormat) {
    if (!ready) return
    setPdfError("")
    try {
      const files = await import("./pdf/download")
      if (project.preview.document === "resume") await files.downloadResume(project, format)
      else if (!project.letters[project.preview.document].text.trim()) return
      else await files.downloadLetter(project, project.preview.document, format)
    } catch {
      setPdfError("Не удалось собрать PDF.")
    }
  }

  const letterEmpty = project.preview.document !== "resume" && !project.letters[project.preview.document].text.trim()
  const downloadLocked = !ready || letterEmpty
  const watch = `${project.updatedAt}-${project.preview.document}-${project.preview.format}`

  return (
    <div className={sheetOpen ? "app sheet-open" : "app"}>
      <header className="top">
        <div className="brand">Конструктор</div>
        <nav className="actions">
          <button type="button" onClick={() => saveProjectFile(project)}>
            Проект
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
            Открыть
          </button>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (!file) return
              try {
                const parsed = importProject(JSON.parse(await file.text()) as unknown)
                if (!parsed) {
                  setImportError("Файл проекта не подошёл. Нужен JSON конструктора резюме версии 1.")
                  return
                }
                setImportError("")
                setProposal(null)
                setProject(parsed)
              } catch {
                setImportError("Файл проекта не подошёл. Нужен JSON конструктора резюме версии 1.")
              }
            }}
          />
          <button type="button" disabled={downloadLocked} onClick={() => void download(project.preview.format === "a4" ? "a4" : "mobile")}>
            {project.preview.format === "a4" ? "PDF для ПК" : "PDF для телефона"}
          </button>
          <button type="button" disabled={downloadLocked} onClick={() => void download(project.preview.format === "a4" ? "mobile" : "a4")}>
            {project.preview.format === "a4" ? "Для телефона" : "Для ПК"}
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              setPdfError("")
              void import("./pdf/download")
                .then((files) => files.downloadZip(project))
                .catch(() => setPdfError("Не удалось собрать PDF."))
            }}
          >
            Пакет
          </button>
        </nav>
      </header>
      <div className="stripe" />
      {downloadLocked ? <p className="banner-note">{letterEmpty ? "Сначала соберите письмо." : EXPORT_HINT}</p> : null}
      {pdfError ? <p className="banner-note">{pdfError}</p> : null}
      {importError ? <p className="banner-note">{importError}</p> : null}
      <div className="work">
        <div className="form-col">
          <FormPane
            project={project}
            errors={errors}
            onActive={setActive}
            onChange={change}
            busy={busy}
            onAssemble={() => void runGenerate(project.preview.document === "resume" ? "resume" : project.preview.document)}
          />
        </div>
        <div className="sheet-col">
          <div className="sheet-tools">
            <button type="button" className="back" onClick={() => setSheetOpen(false)}>
              К анкете
            </button>
            <div className="words tabs">
              {(["resume", "motivation", "recommendation"] as PreviewDocument[]).map((document) => (
                <button
                  key={document}
                  type="button"
                  className={project.preview.document === document ? "tab on" : "tab"}
                  onClick={() => change({ ...project, preview: { ...project.preview, document } })}
                >
                  {document === "resume" ? "Резюме" : document === "motivation" ? "Мотивационное" : "Рекомендация"}
                  {document !== "resume" && project.letters[document].stale ? <em> устарело</em> : null}
                </button>
              ))}
            </div>
            <div className="words">
              {(["a4", "mobile"] as PreviewFormat[]).map((format) => (
                <button
                  key={format}
                  type="button"
                  className={project.preview.format === format ? "tab on" : "tab"}
                  onClick={() => change({ ...project, preview: { ...project.preview, format } })}
                >
                  {format === "a4" ? "ПК" : "Телефон"}
                </button>
              ))}
            </div>
          </div>
          <ScaledSheet widthMm={project.preview.format === "a4" ? 210 : 100} watch={watch}>
            {project.preview.document === "resume" ? (
              <ResumeSheet
                project={project}
                format={project.preview.format}
                active={active}
                onSummary={(summary) =>
                  change({
                    ...project,
                    generated: { ...project.generated, summary, summarySource: summary.trim() ? "user" : "empty", summaryDirty: true },
                  })
                }
              />
            ) : (
              <LetterSheet project={project} kind={project.preview.document} />
            )}
          </ScaledSheet>
        </div>
        <Notes
          project={project}
          proposal={proposal}
          confirm={confirm}
          error={error}
          busy={busy}
          onChange={change}
          onApply={applyProposal}
          onDrop={() => {
            setProposal(null)
            setError(null)
          }}
          onReplace={() => {
            const kind = confirm
            if (kind) void runGenerate(kind, true)
          }}
          onKeep={() => setConfirm(null)}
        />
      </div>
      <div className="mobile-bar">
        <button type="button" onClick={() => setSheetOpen(true)}>
          Смотреть резюме
        </button>
      </div>
    </div>
  )
}
