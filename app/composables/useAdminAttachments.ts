import type { ProductMediaItem } from '~/types/productMedia'

/** 後台附件：URL 建立與本機上傳共用回傳形狀 */
export function useAdminAttachments() {
  async function createFromPublicUrl(url: string): Promise<ProductMediaItem> {
    const res = await $fetch<{
      attachment: { id: string; publicUrl: string | null; filename: string }
    }>('/api/admin/attachments', {
      method: 'POST',
      credentials: 'include',
      body: {
        type: 'image',
        mimetype: 'application/octet-stream',
        filename: url.slice(0, 200),
        extension: 'url',
        size: 0,
        publicUrl: url,
      },
    })
    return {
      id: res.attachment.id,
      publicUrl: res.attachment.publicUrl,
      filename: res.attachment.filename,
    }
  }

  async function uploadImageFile(file: File): Promise<ProductMediaItem> {
    const body = new FormData()
    body.append('file', file)
    const res = await $fetch<{
      attachment: { id: string; publicUrl: string | null; filename: string }
    }>('/api/admin/attachments/upload', {
      method: 'POST',
      credentials: 'include',
      body,
    })
    return {
      id: res.attachment.id,
      publicUrl: res.attachment.publicUrl,
      filename: res.attachment.filename,
    }
  }

  return { createFromPublicUrl, uploadImageFile }
}
