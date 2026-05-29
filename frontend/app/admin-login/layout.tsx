import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Login | PDF Slip Processor",
  description: "Restricted admin access panel for PDF Slip Processor.",
}

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
