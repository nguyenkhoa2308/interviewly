type AuthShellProps = {
    sidebar: React.ReactNode;
    children: React.ReactNode;
};

export function AuthShell({ sidebar, children }: AuthShellProps) {
    return (
        <main className="relative min-h-screen overflow-hidden">
            <div className="grid min-h-screen lg:grid-cols-[38%_62%]">
                <aside className="relative z-10 hidden lg:block">
                    {sidebar}
                </aside>

                <section className="relative z-10 flex items-center justify-center p-0 lg:p-10">
                    {children}
                </section>

                <div
                    aria-hidden="true"
                    className="bg-primary/18 pointer-events-none absolute -bottom-40 left-1/2 -z-10 h-[500px] w-full -translate-x-1/2 rounded-full blur-[120px]"
                />
            </div>
        </main>
    );
}
