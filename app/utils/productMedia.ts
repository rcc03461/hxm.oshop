import type { ProductMediaItem } from '~/types/productMedia'

type AttachmentLike = {
  id: string
  publicUrl: string | null
  filename: string
}

export function toProductMediaItem(a: AttachmentLike): ProductMediaItem {
  return {
    id: a.id,
    publicUrl: a.publicUrl,
    filename: a.filename,
  }
}

/** 合併封面與圖庫連結，封面固定在最前（相容舊資料：封面僅存於 cover_attachment_id） */
export function buildProductGalleryItems(
  coverAttachmentId: string | null,
  cover: AttachmentLike | null | undefined,
  gallery: AttachmentLike[],
): ProductMediaItem[] {
  const fromGallery = gallery.map(toProductMediaItem)
  if (!coverAttachmentId) return fromGallery

  const withoutCover = fromGallery.filter((i) => i.id !== coverAttachmentId)
  const coverInGallery = fromGallery.find((i) => i.id === coverAttachmentId)
  const coverItem = coverInGallery ?? (cover ? toProductMediaItem(cover) : null)
  if (!coverItem) return fromGallery

  return [coverItem, ...withoutCover]
}
