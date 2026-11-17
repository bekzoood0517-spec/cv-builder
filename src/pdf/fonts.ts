import { Font } from "@react-pdf/renderer"
import commissioner from "../assets/fonts/Commissioner-SemiBold.ttf?url"
import plexMedium from "../assets/fonts/IBMPlexSans-Medium.ttf?url"
import plexRegular from "../assets/fonts/IBMPlexSans-Regular.ttf?url"
import plexSemi from "../assets/fonts/IBMPlexSans-SemiBold.ttf?url"
import literata from "../assets/fonts/Literata-Medium.ttf?url"
import ptBold from "../assets/fonts/PTSerif-Bold.ttf?url"
import ptRegular from "../assets/fonts/PTSerif-Regular.ttf?url"

let registered = false

function absolute(url: string): string {
  return new URL(url, window.location.origin).href
}

export function registerFonts() {
  if (registered) return
  Font.register({
    family: "PT Serif",
    fonts: [
      { src: absolute(ptRegular), fontWeight: 400 },
      { src: absolute(ptBold), fontWeight: 700 },
    ],
  })
  Font.register({
    family: "IBM Plex Sans",
    fonts: [
      { src: absolute(plexRegular), fontWeight: 400 },
      { src: absolute(plexMedium), fontWeight: 500 },
      { src: absolute(plexSemi), fontWeight: 600 },
    ],
  })
  Font.register({ family: "Literata", src: absolute(literata), fontWeight: 500 })
  Font.register({ family: "Commissioner", src: absolute(commissioner), fontWeight: 600 })
  Font.registerHyphenationCallback((word) => [word])
  registered = true
}
