import { supabase } from '@/lib/supabase'
import type { Todo } from '@/types'
import TasksClient from './TasksClient'

export default async function TasksPage() {
  const { data } = await supabase
    .from('todos')
    .select('*')
    .order('target_date', { ascending: true })
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <TasksClient initialTodos={(data ?? []) as Todo[]} />
    </div>
  )
}
