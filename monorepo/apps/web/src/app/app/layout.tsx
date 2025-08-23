"use client";

import { Providers } from "../providers";
import { Toaster } from "@/components/ui/toaster";

export default function AppAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      {children}
      <Toaster />
    </Providers>
  );
}
