import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e17]">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#0f1419] border border-white/10 shadow-2xl",
            headerTitle: "text-white",
            headerSubtitle: "text-gray-400",
            socialButtonsBlockButton:
              "bg-white/5 border border-white/10 text-white hover:bg-white/10",
            socialButtonsBlockButtonText: "text-white font-medium",
            dividerLine: "bg-white/10",
            dividerText: "text-gray-500",
            formFieldLabel: "text-gray-300",
            formFieldInput:
              "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20",
            formButtonPrimary:
              "bg-cyan-500 hover:bg-cyan-400 text-white font-medium",
            footerActionLink: "text-cyan-400 hover:text-cyan-300",
            identityPreviewEditButton: "text-cyan-400 hover:text-cyan-300",
          },
        }}
      />
    </div>
  );
}
