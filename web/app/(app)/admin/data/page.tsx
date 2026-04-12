import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import DataClient from './DataClient'

export default async function DataManagementPage() {
  const session = await getSession()
  if (!session || session.role !== 'Admin') redirect('/')
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <DataClient />
    </div>
  )
}
