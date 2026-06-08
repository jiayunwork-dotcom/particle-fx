export async function exportSpriteSheet(
  renderer: any,
  width: number,
  height: number,
  fps: number,
  duration: number
): Promise<Blob> {
  const totalFrames = Math.ceil(fps * duration)
  const cols = Math.ceil(Math.sqrt(totalFrames))
  const rows = Math.ceil(totalFrames / cols)

  const canvas = document.createElement('canvas')
  canvas.width = cols * width
  canvas.height = rows * height
  const ctx = canvas.getContext('2d')!

  const frameCanvas = document.createElement('canvas')
  frameCanvas.width = width
  frameCanvas.height = height
  const frameCtx = frameCanvas.getContext('2d')!

  const frameInterval = 1 / fps

  for (let i = 0; i < totalFrames; i++) {
    const time = i * frameInterval
    renderer.render(time)

    const gl = renderer.renderer.getContext()
    const pixels = new Uint8Array(width * height * 4)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

    const imageData = frameCtx.createImageData(width, height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = ((height - y - 1) * width + x) * 4
        const dstIdx = (y * width + x) * 4
        imageData.data[dstIdx] = pixels[srcIdx]
        imageData.data[dstIdx + 1] = pixels[srcIdx + 1]
        imageData.data[dstIdx + 2] = pixels[srcIdx + 2]
        imageData.data[dstIdx + 3] = pixels[srcIdx + 3]
      }
    }
    frameCtx.putImageData(imageData, 0, 0)

    const col = i % cols
    const row = Math.floor(i / cols)
    ctx.drawImage(frameCanvas, col * width, row * height)

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Failed to create sprite sheet blob'))
      }
    }, 'image/png')
  })
}
