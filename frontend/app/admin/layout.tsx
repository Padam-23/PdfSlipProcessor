import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Dashboard | PDF Slip Processor",
  description: "Admin panel for managing license keys and users.",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
