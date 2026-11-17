import { Document, Image, Link, Page, Text, View } from "@react-pdf/renderer"
import { resumeModel } from "../domain/model"
import type { PreviewFormat, Project, TemplateId } from "../domain/types"
import { fullName } from "../domain/text"

const mm = (value: number) => value * 2.834645669

function family(template: TemplateId, role: "name" | "body" | "section"): string {
  if (template === "classic") return "PT Serif"
  if (template === "minimal" && role !== "body") return "Literata"
  if (template === "accent" && role === "name") return "Commissioner"
  return "IBM Plex Sans"
}

function nameSize(template: TemplateId, mobile: boolean): number {
  if (mobile) return 24
  if (template === "accent") return 26
  if (template === "modern") return 20
  return 22
}

export function ResumePdf({ project, format }: { project: Project; format: PreviewFormat }) {
  const model = resumeModel(project)
  const mobile = format === "mobile"
  const template = project.design.template
  const margin = mobile ? mm(8) : template === "modern" ? mm(14) : template === "minimal" ? mm(18) : mm(16)
  const body = mobile ? 12.5 : 11
  const line = mobile ? 1.4 : template === "minimal" ? 1.45 : 1.35
  const modern = template === "modern" && !mobile
  const ink = model.palette.text
  const accent = model.palette.accent

  const sectionTitle = (title: string) => (
    <Text
      minPresenceAhead={28}
      style={{
        fontFamily: family(template, "section"),
        fontSize: mobile ? 14 : 12,
        fontWeight: template === "classic" ? 700 : template === "minimal" ? 500 : 600,
        color: accent,
        marginTop: template === "minimal" ? 16 : 10,
        marginBottom: 4,
        textTransform: template === "modern" ? "uppercase" : "none",
        borderBottomWidth: template === "classic" ? 0.6 : 0,
        borderBottomColor: accent,
        paddingBottom: template === "classic" ? 2 : 0,
      }}
    >
      {title}
    </Text>
  )

  const summary = model.summary ? (
    <View>
      {sectionTitle("Описание")}
      <Text style={{ fontFamily: family(template, "body") }}>{model.summary}</Text>
    </View>
  ) : null

  const strengths = model.strengths.length ? (
    <View>
      {sectionTitle("Сильные стороны")}
      {model.strengths.map((item) => (
        <Text key={item.id} style={{ marginBottom: 3 }}>
          <Text style={{ fontFamily: family(template, "section"), fontWeight: 700 }}>{item.title}. </Text>
          {item.detail}
        </Text>
      ))}
    </View>
  ) : null

  const jobs = model.jobs.length ? (
    <View>
      {sectionTitle("Места работы")}
      {model.jobs.map((job) => (
        <View key={job.id} style={{ marginBottom: 6 }}>
          <Text style={{ fontFamily: family(template, "section"), fontWeight: 700 }}>
            {job.role}
            {job.company ? ` — ${job.company}` : ""}
          </Text>
          <Text style={{ color: accent, fontSize: body - 1 }}>
            {[job.period, job.city].filter(Boolean).join(" · ")}
          </Text>
          {job.paragraph ? <Text style={{ marginTop: 2 }}>{job.paragraph}</Text> : null}
          {job.bullets?.map((line) => (
            <Text key={line} style={{ marginTop: 1 }}>
              — {line}
            </Text>
          ))}
        </View>
      ))}
    </View>
  ) : null

  const education = model.education.length ? (
    <View>
      {sectionTitle("Образование")}
      {model.education.map((item) => (
        <View key={item.id} style={{ marginBottom: 4 }}>
          <Text style={{ fontFamily: family(template, "section"), fontWeight: 700 }}>{item.title}</Text>
          {item.meta ? <Text>{item.meta}</Text> : null}
          {item.note ? <Text>{item.note}</Text> : null}
        </View>
      ))}
    </View>
  ) : null

  const skills = model.skills.length ? (
    <View>
      {sectionTitle("Навыки")}
      {template === "accent" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {model.skills.map((skill) => (
            <Text
              key={skill.label}
              style={{
                backgroundColor: accent,
                color: model.pillInk,
                fontSize: 8.5,
                fontFamily: "IBM Plex Sans",
                paddingTop: 2,
                paddingBottom: 2,
                paddingLeft: 6,
                paddingRight: 6,
                marginRight: 4,
                marginBottom: 4,
              }}
            >
              {skill.label}
              {skill.level ? ` · ${skill.level}` : ""}
            </Text>
          ))}
        </View>
      ) : (
        <Text>
          {model.skills.map((skill) => (skill.level ? `${skill.label} (${skill.level})` : skill.label)).join(template === "classic" ? " · " : ", ")}
        </Text>
      )}
    </View>
  ) : null

  const growth = model.growth?.length ? (
    <View>
      {sectionTitle("Зоны роста")}
      {model.growth.map((item) => (
        <Text key={item.id} style={{ marginBottom: 3 }}>
          {item.limitation}. {item.advice}
        </Text>
      ))}
    </View>
  ) : null

  const contacts = (
    <View>
      {model.contacts.map((contact) => (
        <Link key={contact.id} src={contact.href} style={{ color: modern ? model.headerInk : ink, textDecoration: "none" }}>
          <Text style={{ marginBottom: 2 }}>{contact.label}</Text>
        </Link>
      ))}
    </View>
  )

  const portrait = model.showPortrait ? <Portrait model={model} template={template} mobile={mobile} /> : null

  const identity = (
    <View style={{ marginBottom: 8 }}>
      <Text
        style={{
          fontFamily: family(template, "name"),
          fontSize: nameSize(template, mobile),
          fontWeight: template === "modern" ? 600 : template === "accent" ? 600 : template === "classic" ? 700 : 500,
          color: template === "modern" ? model.headerInk : model.palette.primary,
          textAlign: template === "classic" ? "center" : "left",
          textTransform: template === "modern" ? "uppercase" : "none",
        }}
      >
        {model.nameReady ? model.name : "Фамилия Имя"}
      </Text>
      {model.title ? (
        <Text style={{ textAlign: template === "classic" ? "center" : "left", marginTop: 2, color: template === "modern" ? model.headerInk : ink }}>
          {model.title}
        </Text>
      ) : null}
      {template !== "modern" || mobile ? (
        <Text style={{ textAlign: template === "classic" ? "center" : "left", marginTop: 2 }}>
          {[model.age, model.address].filter(Boolean).join(" · ")}
        </Text>
      ) : null}
    </View>
  )

  const main = (
    <View>
      {summary}
      {strengths}
      {jobs}
      {modern ? null : education}
      {modern ? null : skills}
      {growth}
    </View>
  )

  const side = (
    <View>
      {model.age || model.address ? (
        <Text style={{ marginBottom: 6, color: ink }}>
          {[model.age, model.address].filter(Boolean).join("\n")}
        </Text>
      ) : null}
      {contacts}
      {skills}
      {education}
    </View>
  )

  return (
    <Document title={model.name || "Резюме"}>
      <Page
        size={mobile ? { width: mm(100), height: mm(180) } : "A4"}
        style={{
          backgroundColor: model.palette.background,
          color: ink,
          fontFamily: family(template, "body"),
          fontSize: body,
          lineHeight: line,
          paddingTop: template === "modern" ? 0 : margin,
          paddingBottom: margin + (mobile ? 0 : 8),
          paddingLeft: margin,
          paddingRight: margin,
        }}
      >
        {template === "accent" ? (
          <View fixed style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: mm(mobile ? 3 : 4), backgroundColor: model.palette.primary }} />
        ) : null}
        {template === "modern" ? (
          <View style={{ backgroundColor: model.palette.primary, marginLeft: -margin, marginRight: -margin, paddingHorizontal: margin, paddingVertical: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>{identity}</View>
              {portrait}
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: template === "classic" ? "column" : "row", alignItems: template === "classic" ? "center" : "flex-start" }}>
            {template === "classic" ? portrait : null}
            {template !== "classic" ? portrait : null}
            {identity}
          </View>
        )}
        {template !== "modern" ? <View style={{ marginBottom: 6 }}>{contacts}</View> : null}
        {modern ? (
          <View style={{ flexDirection: "row" }}>
            <View style={{ width: "32%", paddingRight: mm(6) }}>{side}</View>
            <View style={{ width: "68%" }}>{main}</View>
          </View>
        ) : (
          <View>
            {summary}
            {strengths}
            {jobs}
            {education}
            {skills}
            {growth}
          </View>
        )}
        {format === "a4" ? (
          <Text
            fixed
            style={{ position: "absolute", bottom: 16, left: margin, right: margin, fontSize: 9, color: accent }}
            render={({ pageNumber }) => (pageNumber > 1 ? `${model.name}    ${pageNumber}` : "")}
          />
        ) : null}
      </Page>
    </Document>
  )
}

function Portrait({
  model,
  template,
  mobile,
}: {
  model: ReturnType<typeof resumeModel>
  template: TemplateId
  mobile: boolean
}) {
  const size = mobile ? (template === "minimal" ? 22 : 24) : template === "minimal" ? 28 : template === "modern" ? 30 : 32
  const round = template === "classic" || template === "minimal"
  const box = {
    width: mm(size),
    height: mm(size),
    borderRadius: round ? mm(size) / 2 : 0,
    marginBottom: 6,
  }
  if (model.photo) return <Image src={model.photo} style={box} />
  if (!model.initials) return null
  return (
    <View style={{ ...box, borderWidth: 0.8, borderColor: model.palette.accent, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 12, color: model.palette.primary }}>{model.initials}</Text>
    </View>
  )
}

export function LetterPdf({
  project,
  kind,
  format,
}: {
  project: Project
  kind: "motivation" | "recommendation"
  format: PreviewFormat
}) {
  const model = resumeModel(project)
  const mobile = format === "mobile"
  const template = project.design.template
  const margin = mobile ? mm(8) : 16 * 2.834645669
  const text = kind === "motivation" ? project.letters.motivation.text : project.letters.recommendation.text
  const title = kind === "motivation" ? "Мотивационное письмо" : "Рекомендательное письмо"
  const author = project.letters.recommendation

  return (
    <Document title={title}>
      <Page
        size={mobile ? { width: mm(100), height: mm(180) } : "A4"}
        style={{
          backgroundColor: model.palette.background,
          color: model.palette.text,
          fontFamily: family(template, "body"),
          fontSize: mobile ? 12.5 : 11,
          lineHeight: mobile ? 1.4 : 1.35,
          padding: margin,
        }}
      >
        <Text
          style={{
            fontFamily: family(template, "name"),
            fontSize: Math.max(18, nameSize(template, mobile) - 4),
            color: model.palette.primary,
            marginBottom: 8,
          }}
        >
          {title}
        </Text>
        <Text style={{ marginBottom: 8 }}>{fullName(project.profile)}</Text>
        {text.split(/\n{2,}/).map((paragraph) => (
          <Text key={paragraph.slice(0, 24)} style={{ marginBottom: 8 }}>
            {paragraph}
          </Text>
        ))}
        {kind === "recommendation" ? (
          <View style={{ marginTop: 12, borderTopWidth: 0.6, borderTopColor: model.palette.accent, paddingTop: 8 }}>
            <Text>Черновик. Подписывает и отправляет рекомендатель после своей правки.</Text>
            <Text style={{ marginTop: 8 }}>{author.authorName}</Text>
            <Text>{author.authorRole}</Text>
            <Text>Телефон: {author.authorPhone.trim() || "____________________"}</Text>
            <Text>Email: {author.authorEmail.trim() || "____________________"}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
