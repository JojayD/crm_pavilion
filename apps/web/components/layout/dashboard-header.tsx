"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type DashboardHeaderProps = {
  title: string;
  children?: React.ReactNode;
};

export function DashboardHeader({ title, children }: DashboardHeaderProps) {
  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        {children}
      </div>
    </header>
  );
}
