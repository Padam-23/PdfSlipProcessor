import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard | PDF Slip Processor",
  description: "Upload and process postal bank slips and deposit installment reports.",
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
