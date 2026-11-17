export async function readPhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Нужен файл JPG, PNG или WebP.")
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("Файл тяжелее 5 МБ.")
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url)
    const size = 512
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Не удалось прочитать фото.")
    const side = Math.min(image.width, image.height)
    const sx = (image.width - side) / 2
    const sy = (image.height - side) / 2
    context.drawImage(image, sx, sy, side, side, 0, 0, size, size)
    return canvas.toDataURL("image/jpeg", 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Не удалось прочитать фото."))
    image.src = src
  })
}
