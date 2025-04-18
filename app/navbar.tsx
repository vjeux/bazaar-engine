"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Navbar() {
    const pathname = usePathname();

    return (
        // Use background for the main nav area, border-b for separation
        // Text color defaults to foreground
        <nav className="flex items-center justify-between h-16 px-4 border-b bg-background text-foreground">
            {/* Title uses standard foreground color and styling */}
            <div className="text-lg font-bold">Bazaar Engine</div>
            <div className="flex space-x-4">
                <Link
                    href="/"
                    className={cn(
                        "text-sm font-medium transition-colors hover:text-primary",
                        pathname === "/"
                            ? "text-primary font-bold"
                            : "text-muted-foreground",
                    )}
                >
                    Home
                </Link>
                <Link
                    href="/dragndrop"
                    className={cn(
                        "text-sm font-medium transition-colors hover:text-primary",
                        pathname === "/dragndrop"
                            ? "text-primary font-bold"
                            : "text-muted-foreground",
                    )}
                >
                    Drag and Drop
                </Link>
                <Link
                    href="/old"
                    className={cn(
                        "text-sm font-medium transition-colors hover:text-primary",
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
