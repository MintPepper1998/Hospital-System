import { Metadata } from 'next'
import { ClientArchitecture } from './client-architecture'

export const metadata: Metadata = {
  title: 'Backend Architecture Analysis | Hospital ERP',
  description: 'Detailed technical analysis of the Next.js and Prisma backend systems.',
}

export default function ArchitecturePage() {
  return <ClientArchitecture />
}
