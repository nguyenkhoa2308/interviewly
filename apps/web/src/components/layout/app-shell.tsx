'use client';

import { useState, type ReactNode } from 'react';

import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';

export function AppShell({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-[100dvh] bg-[#f8f8fc] text-slate-950">
            <AppSidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            <div className="min-w-0 2xl:pl-64">
                <AppHeader onOpenSidebar={() => setSidebarOpen(true)} />
                <main className="min-h-[calc(100dvh-4rem)] min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
