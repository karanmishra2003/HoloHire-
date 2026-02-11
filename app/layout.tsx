import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HoloHire - AI Video Interview Prep",
  description: "Video interview prep that feels like a real panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <ConvexClientProvider>
          <body className={`${outfit.variable} antialiased`}>{children}</body>
        </ConvexClientProvider>
      </html>
    </ClerkProvider>
  );
}
