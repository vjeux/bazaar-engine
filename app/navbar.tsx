"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-background text-foreground flex h-16 items-center justify-between border-b px-4">
      <div className="text-lg font-bold">Bazaar Engine</div>
      <div className="flex space-x-4">
        <Link
          href="/"
          className={cn(
            "hover:text-primary text-sm font-medium transition-colors",
            pathname === "/"
              ? "text-primary font-bold"
              : "text-muted-foreground",
          )}
        >
          Home
        </Link>
        <Link
          href="/old"
          className={cn(
            "hover:text-primary text-sm font-medium transition-colors",
            pathname === "/old"
              ? "text-primary font-bold"
              : "text-muted-foreground",
          )}
        >
          Old
        </Link>
      </div>
    </nav>
  );
}
