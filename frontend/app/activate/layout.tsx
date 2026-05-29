import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Activate License | PDF Slip Processor",
  description: "Enter your license key to unlock full access to PDF Slip Processor.",
}

export default function ActivateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
