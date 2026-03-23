import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-headline" });

export const metadata: Metadata = {
  title: "Logling Unit | Tactical Developer RPG",
  description: "Level up your engineering career with AI-powered commit analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(
        "min-h-screen bg-[#131313] text-[#e5e2e1] font-sans antialiased",
        inter.variable,
        spaceGrotesk.variable
      )}>
        {children}
      </body>
    </html>
  );
}
