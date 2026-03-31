export interface Guest {
  id: string
  date: string | null
  room: number
  check_in: string
  check_out: string
  guest_name: string
  guest_count: number
  amount_thb_day: number | null
  amount_thb_stay: number | null
  paid: string | null
  payment: number
  invoice: string | null
  notes: string | null
  email: string | null
  phone: string | null
  tm30: boolean
  created_at: string
}

export interface Expense {
  id: string
  audit: string | null
  lawyers: string | null
  sent: string | null
  to_verify: string | null
  payment_date: string | null
  transaction_number: string | null
  document_number: string | null
  category: string | null
  subcategory: string | null
  supplier: string | null
  amount: number | null
  currency: string
  method: string | null
  paid_by: string | null
  internal_document: string | null
  document_page: string | null
  type: string | null
  description: string | null
  is_legal: boolean
  created_at: string
}

export interface Revenue {
  id: string
  date: string
  type: string | null
  supplier: string | null
  amount_thb: number | null
  notes: string | null
  created_at: string
}

export interface FoundingContribution {
  id: string
  date: string
  method: string | null
  shareholder: string
  amount_thb: number | null
  amount_eur: number | null
  notes: string | null
  created_at: string
}

export interface Shareholder {
  id: string
  name: string
  share_percentage: number | null
  amount_to_found_thb: number | null
}

export interface ShareholderWork {
  id: string
  month: string
  shareholder: string
  hours: number
  hour_rate: number
  created_at: string
}

export interface Todo {
  id: string
  project: string | null
  department: string | null
  topic: string
  responsible_person: string | null
  status_notes: string | null
  target_date: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface BudgetRevenue {
  id: string
  year: number
  month: number
  room_name: string
  amount_thb: number
  season: string | null
}

export interface BudgetExpense {
  id: string
  year: number
  month: number
  category: string
  subcategory: string | null
  item_name: string
  amount_thb: number
  expense_type: string
}

export interface BudgetRent {
  id: string
  year_number: number
  year_label: string | null
  rent_thb: number
  vat_amount: number | null
}

export interface BankBalance {
  id: string
  label: string
  amount: number
  recorded_date: string
  status: string | null
  notes: string | null
}

export const SHAREHOLDERS = ['Lorenzo PAGNAN', 'Stella MAROZZI', 'Bruce MIFSUD', 'Hanna PARSONSON']

export const EXPENSE_CATEGORIES = ['Rent', 'Legal', 'Staff', 'Utilities', 'Maintenance', 'Marketing', 'Operations', 'Other']

export const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Revolute', 'Wise', 'Card', 'Other']

export const TODO_STATUSES = ['Pending', 'Ongoing', 'Complete', 'Blocked']

export const DEPARTMENTS = ['Legal', 'Finance', 'Operations', 'Renovation', 'HR', 'Marketing']

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const ROOMS = Array.from({ length: 10 }, (_, i) => i + 1)

export function formatTHB(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
