// Simple patterned avatar-style data URL for placeholders
export function patternDataUrl(text = 'Item', size = 40) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  // background gradient
  const g = ctx.createLinearGradient(0, 0, size, size)
  g.addColorStop(0, '#0ea5e9')
  g.addColorStop(1, '#3b82f6')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  // initials
  const initials = String(text).trim().slice(0,2).toUpperCase()
  ctx.fillStyle = 'rgba(255,255,255,.9)'
  ctx.font = `${Math.floor(size*0.4)}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials, size/2, size/2)
  return canvas.toDataURL('image/png')
}
