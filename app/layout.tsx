import type { Metadata } from "next"
import "./styles.css"
import { AppLayout } from "@/app/app-layout"

export const metadata: Metadata = {
  title: "Next Weather Dashboard",
  description: "A simple statically generated next.js Weather dashboard",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}
