// Shared Layout
import { Navigation, FooterSection } from "@/frontend/components/public";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <>
    <Navigation />
    {children}
    <FooterSection />
  </>);
}
