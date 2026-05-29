import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Signing In | PDF Slip Processor",
  description: "Completing your Google sign-in for PDF Slip Processor.",
}

export default function AuthCallbackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
