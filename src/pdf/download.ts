import { pdf } from "@react-pdf/renderer"
import JSZip from "jszip"
import { createElement } from "react"
import { saveBlob } from "../domain/save"
import { pdfName, zipName } from "../domain/text"
import type { PreviewFormat, Project } from "../domain/types"
import { LetterPdf, ResumePdf } from "./documents"
import { registerFonts } from "./fonts"

async function resumeBlob(project: Project, format: PreviewFormat) {
  registerFonts()
  return pdf(createElement(ResumePdf, { project, format }) as never).toBlob()
}

async function letterBlob(project: Project, kind: "motivation" | "recommendation", format: PreviewFormat) {
  registerFonts()
  return pdf(createElement(LetterPdf, { project, kind, format }) as never).toBlob()
}

export async function downloadResume(project: Project, format: PreviewFormat) {
  saveBlob(await resumeBlob(project, format), pdfName(project, "resume", format))
}

export async function downloadLetter(project: Project, kind: "motivation" | "recommendation", format: PreviewFormat) {
  saveBlob(await letterBlob(project, kind, format), pdfName(project, kind, format))
}

export async function downloadZip(project: Project) {
  const zip = new JSZip()
  const resumeA4 = await resumeBlob(project, "a4")
  const resumeMobile = await resumeBlob(project, "mobile")
  zip.file(pdfName(project, "resume", "a4"), resumeA4)
  zip.file(pdfName(project, "resume", "mobile"), resumeMobile)
  if (project.letters.motivation.text.trim()) {
    zip.file(pdfName(project, "motivation", "a4"), await letterBlob(project, "motivation", "a4"))
    zip.file(pdfName(project, "motivation", "mobile"), await letterBlob(project, "motivation", "mobile"))
  }
  if (project.letters.recommendation.text.trim()) {
    zip.file(pdfName(project, "recommendation", "a4"), await letterBlob(project, "recommendation", "a4"))
    zip.file(pdfName(project, "recommendation", "mobile"), await letterBlob(project, "recommendation", "mobile"))
  }
  saveBlob(await zip.generateAsync({ type: "blob" }), zipName(project))
}
