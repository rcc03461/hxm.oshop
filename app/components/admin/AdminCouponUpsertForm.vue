<script setup lang="ts">
type Detail = {
  coupon: {
    id: string
    name: string
    code: string
    description: string | null
    startsAt: string
    endsAt: string
    minOrderAmount: string | null
    discountType: string
    discountValue: string
    status: string
  }
  productIds: string[]
}

const props = defineProps<{
  couponId?: string | null
}>()

const emit = defineEmits<{
  saved: [id: string]
  cancelled: []
}>()

const requestFetch = useRequestFetch()
const isEdit = computed(() => Boolean(props.couponId))

const form = reactive({
  name: '',
  code: '',
  description: '',
  startsAtLocal: '',
  endsAtLocal: '',
  minOrderAmount: '',
  discountType: 'fixed' as 'fixed' | 'percent',
  discountValue: '',
  status: 'active' as 'active' | 'inactive',
})

const productIds = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)
const err = ref<string | null>(null)

const startsAtId = useId()
const endsAtId = useId()
const discountTypeId = useId()
const statusId = useId()

function toDateTimeLocalValue(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function resetForm() {
  form.name = ''
  form.code = ''
  form.description = ''
  form.startsAtLocal = ''
  form.endsAtLocal = ''
  form.minOrderAmount = ''
  form.discountType = 'fixed'
  form.discountValue = ''
  form.status = 'active'
  productIds.value = []
}

async function loadDetail() {
  if (!props.couponId) return
  const detail = await requestFetch<Detail>(`/api/admin/coupons/${props.couponId}`, {
    credentials: 'include',
  })
  form.name = detail.coupon.name
  form.code = detail.coupon.code
  form.description = detail.coupon.description ?? ''
  form.startsAtLocal = toDateTimeLocalValue(detail.coupon.startsAt)
  form.endsAtLocal = toDateTimeLocalValue(detail.coupon.endsAt)
  form.minOrderAmount = detail.coupon.minOrderAmount ?? ''
  form.discountType =
    detail.coupon.discountType === 'percent' ? 'percent' : 'fixed'
  form.discountValue = detail.coupon.discountValue
  form.status = detail.coupon.status === 'inactive' ? 'inactive' : 'active'
  productIds.value = [...detail.productIds]
}

async function initForm() {
  loading.value = true
  err.value = null
  try {
    resetForm()
    await loadDetail()
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    err.value = x?.data?.message || x?.message || '載入失敗'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.couponId,
  () => {
    void initForm()
  },
  { immediate: true },
)

function buildPayload() {
  const startsAt = new Date(form.startsAtLocal)
  const endsAt = new Date(form.endsAtLocal)
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error('請填寫有效的優惠期間')
  }
  return {
    name: form.name,
    code: form.code,
    description: form.description || null,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    minOrderAmount: form.minOrderAmount.trim() ? form.minOrderAmount.trim() : null,
    discountType: form.discountType,
    discountValue: form.discountValue.trim(),
    status: form.status,
    productIds: productIds.value,
  }
}

async function submit() {
  saving.value = true
  err.value = null
  try {
    const payload = buildPayload()
    if (props.couponId) {
      await requestFetch(`/api/admin/coupons/${props.couponId}`, {
        method: 'PATCH',
        credentials: 'include',
        body: payload,
      })
      emit('saved', props.couponId)
      return
    }

    const res = await requestFetch<{ coupon: { id: string } }>('/api/admin/coupons', {
      method: 'POST',
      credentials: 'include',
      body: payload,
    })
    emit('saved', res.coupon.id)
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    err.value = x?.data?.message || x?.message || (props.couponId ? '儲存失敗' : '建立失敗')
  } finally {
    saving.value = false
  }
}

const discountValueLabel = computed(() =>
  form.discountType === 'fixed' ? '減免金額' : '折扣百分比（%）',
)
const discountValueHint = computed(() =>
  form.discountType === 'fixed'
    ? '固定減免金額，例如 50 代表減 50 元'
    : '例如 10 代表 9 折（減 10%）',
)
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <p v-if="err" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ err }}
    </p>

    <p v-if="loading" class="text-sm text-neutral-500">
      載入中…
    </p>

    <template v-else>
      <AdminFormTextInput v-model="form.name" label="名稱" required />

      <AdminFormTextInput
        v-model="form.code"
        label="優惠碼代號"
        hint="儲存時會轉為大寫；英數與連字號"
        pattern="[A-Za-z0-9-]+"
        required
        input-class="font-mono uppercase"
      />

      <AdminFormTextarea v-model="form.description" label="描述" :rows="3" />

      <div class="grid gap-4 sm:grid-cols-2">
        <AdminFormField label="優惠開始" :for-id="startsAtId">
          <input
            :id="startsAtId"
            v-model="form.startsAtLocal"
            type="datetime-local"
            required
            class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
          />
        </AdminFormField>
        <AdminFormField label="優惠結束" :for-id="endsAtId">
          <input
            :id="endsAtId"
            v-model="form.endsAtLocal"
            type="datetime-local"
            required
            class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm"
          />
        </AdminFormField>
      </div>

      <AdminFormPriceInput
        v-model="form.minOrderAmount"
        label="最低消費（可留空）"
        hint="留空表示無門檻；有填則訂單符合商品金額須達此金額"
      />

      <AdminFormField label="折扣類型" :for-id="discountTypeId">
        <select
          :id="discountTypeId"
          v-model="form.discountType"
          class="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm"
        >
          <option value="fixed">減固定金額</option>
          <option value="percent">折扣百分比</option>
        </select>
      </AdminFormField>

      <AdminFormPriceInput
        v-model="form.discountValue"
        :label="discountValueLabel"
        :hint="discountValueHint"
        required
      />

      <AdminCouponProductFields v-model="productIds" />

      <AdminFormField label="狀態" :for-id="statusId">
        <select
          :id="statusId"
          v-model="form.status"
          class="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm"
        >
          <option value="active">啟用</option>
          <option value="inactive">停用</option>
        </select>
      </AdminFormField>

      <div class="flex gap-2 pt-2">
        <button
          type="submit"
          class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          :disabled="saving"
        >
          {{ saving ? (isEdit ? '儲存中…' : '建立中…') : (isEdit ? '儲存' : '建立') }}
        </button>
        <button
          type="button"
          class="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
          :disabled="saving"
          @click="emit('cancelled')"
        >
          取消
        </button>
      </div>
    </template>
  </form>
</template>
