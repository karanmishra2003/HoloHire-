import { ReactNode } from "react";

export default function DashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#f5f7fb]">
            <div className="mx-auto max-w-5xl px-6 py-10 md:px-8 md:py-14">
                {children}
            </div>
        </div>
    );
}
