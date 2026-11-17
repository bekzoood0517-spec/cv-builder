import { parseProject } from "./schema"
import { emptyProject } from "./project"
import type { Project } from "./types"

const KEY = "cv-builder.project.v1"
const BAK = "cv-builder.project.v1.bak"

export function loadProject(): Project {
  const raw = localStorage.getItem(KEY)
  if (!raw) return emptyProject()
  try {
    const parsed = parseProject(JSON.parse(raw) as unknown)
    if (!parsed) throw new Error("bad")
    return parsed
  } catch {
    localStorage.setItem(BAK, raw)
    return emptyProject()
  }
}

export function saveProject(project: Project) {
  localStorage.setItem(KEY, JSON.stringify(project))
}

export function importProject(raw: unknown): Project | null {
  return parseProject(raw)
}
