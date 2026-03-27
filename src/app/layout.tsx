import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-headline" });

export const metadata: Metadata = {
  title: "Logling Unit | Tactical Developer RPG",
  description: "Level up your engineering career with AI-powered commit analysis.",
  keywords: ["developer", "RPG", "github", "commit analysis", "AI", "gamification"],
  openGraph: {
    title: "Logling Unit | Tactical Developer RPG",
    description: "Level up your engineering career with AI-powered commit analysis.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(
        "min-h-screen bg-surface text-foreground font-sans antialiased",
        inter.variable,
        spaceGrotesk.variable
      )}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
