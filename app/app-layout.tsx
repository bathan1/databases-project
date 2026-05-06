"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"

const navItems = [
  {
    label: "Temperature",
    href: "/",
  },
  {
    label: "Wind",
    href: "/wind",
  },
  {
    label: "Precipitation",
    href: "/precipitation",
  },
  {
    label: "Alerts",
    href: "/alerts",
  },
]

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-sm font-semibold">
            Weather Dashboard
          </Link>

          <NavigationMenu>
            <NavigationMenuList>
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href)

                return (
                  <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink render={(
                      <Link
                        href={item.href}
                        className={[
                          "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {item.label}
                      </Link>
                    )} />
                  </NavigationMenuItem>
                )
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </header>

      {children}
    </div>
  )
}
