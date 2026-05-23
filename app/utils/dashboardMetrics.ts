export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null
  }
  return ((current - previous) / previous) * 100
}

export type DashboardAnalytics = {
  currency: string
  generatedAt: string
  today: {
    revenue: string
    orderCount: number
    newCustomers: number
  }
  thisWeek: {
    revenue: string
    orderCount: number
    newCustomers: number
    previousRevenue: string
    previousOrderCount: number
    previousNewCustomers: number
  }
  thisMonth: {
    revenue: string
    orderCount: number
    newCustomers: number
    previousRevenue: string
    previousOrderCount: number
    previousNewCustomers: number
  }
  pendingPaymentOrders: number
  statusCounts: Record<string, number>
  dailyLast30Days: Array<{
    date: string
    revenue: string
    orderCount: number
  }>
  ordersByHour: Array<{ hour: number; orderCount: number }>
  recentOrders: Array<{
    id: string
    invoicePublicId: string
    status: string
    total: string
    currency: string
    customerEmail: string | null
    createdAt: string
  }>
  catalog: {
    products: number
    categories: number
    customers: number
    openMessages: number
  }
}
