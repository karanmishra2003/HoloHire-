import React from "react";
import Header from "../_components/Header";

export default function RoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-6 lg:px-8 py-10">{children}</main>
    </div>
  );
}
