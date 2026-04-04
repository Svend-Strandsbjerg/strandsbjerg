"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonStar, SunMedium } from "lucide-react";

import { TopNavItemButton } from "@/components/layout/top-nav-item";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <TopNavItemButton className="w-9 px-0" aria-label="Toggle dark mode">
        <MoonStar className="h-4 w-4" />
      </TopNavItemButton>
    );
  }

  const isDark = theme === "dark";

  return (
    <TopNavItemButton
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-9 px-0"
      aria-label="Toggle dark mode"
    >
      {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
    </TopNavItemButton>
  );
}
