import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0e17]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-8 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image src="/logo.svg" alt="HoloHire Logo" width={32} height={32} />
          <span className="text-xl font-semibold text-white tracking-tight">
            HoloHire
          </span>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <SignedOut>
            <SignUpButton mode="redirect">
              <Button
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-400 text-white font-medium px-4 shadow-lg shadow-cyan-500/20"
              >
                Get Started
              </Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-white/5"
              >
                Dashboard
              </Button>
            </Link>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9",
                },
              }}
            />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
