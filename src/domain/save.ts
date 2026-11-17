import { projectFileName } from "./text"
import type { Project } from "./types"

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function saveProjectFile(project: Project) {
  saveBlob(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), projectFileName(project))
}
