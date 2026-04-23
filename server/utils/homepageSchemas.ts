import { z } from 'zod'

export const homepageModuleTypeSchema = z.enum(['nav', 'banner', 'category', 'products', 'footer'])
export const homepageVersionStateSchema = z.enum(['draft', 'published'])

const navConfigSchema = z.object({
  show: z.boolean().default(true),
})

const bannerConfigSchema = z.object({
  hero: z.object({
    badge: z.string().trim().min(1).max(60),
    title: z.string().trim().min(1).max(120),
    subtitle: z.string().trim().min(1).max(500),
    primaryCta: z.object({
      label: z.string().trim().min(1).max(40),
      to: z.string().trim().min(1).max(255),
    }),
    secondaryCta: z.object({
      label: z.string().trim().min(1).max(40),
      to: z.string().trim().min(1).max(255),
    }),
  }),
})

const categoryConfigSchema = z.object({
  title: z.string().trim().min(1).max(120),
  categories: z.array(
    z.object({
      id: z.string().trim().min(1).max(80),
      label: z.string().trim().min(1).max(60),
    }),
  ).max(12),
})

const productsConfigSchema = z.object({
  title: z.string().trim().min(1).max(120),
  categories: z.array(
    z.object({
      id: z.string().trim().min(1).max(80),
      label: z.string().trim().min(1).max(60),
    }),
  ).max(12),
  products: z.array(
    z.object({
      id: z.string().trim().min(1).max(80),
      categoryId: z.string().trim().min(1).max(80),
      name: z.string().trim().min(1).max(120),
      slug: z.string().trim().min(1).max(255),
      priceLabel: z.string().trim().min(1).max(40),
      imageUrl: z.string().trim().url(),
    }),
  ).max(60),
})

const footerConfigSchema = z.object({
  text: z.string().trim().min(1).max(200),
})

export const homepageModuleSchema = z.object({
  moduleKey: z.string().trim().min(1).max(64),
  moduleType: homepageModuleTypeSchema,
  sortOrder: z.number().int().min(0).max(1000),
  isEnabled: z.boolean(),
  config: z.record(z.string(), z.unknown()),
}).superRefine((module, ctx) => {
  const result = (() => {
    if (module.moduleType === 'nav') return navConfigSchema.safeParse(module.config)
    if (module.moduleType === 'banner') return bannerConfigSchema.safeParse(module.config)
    if (module.moduleType === 'category') return categoryConfigSchema.safeParse(module.config)
    if (module.moduleType === 'products') return productsConfigSchema.safeParse(module.config)
    return footerConfigSchema.safeParse(module.config)
  })()

  if (!result.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.error.issues[0]?.message ?? `模組 ${module.moduleKey} 設定不正確`,
      path: ['config'],
    })
  }
})

export const homepageModulePutBodySchema = z.object({
  items: z.array(homepageModuleSchema).min(1, '至少需要一個首頁模組'),
})

