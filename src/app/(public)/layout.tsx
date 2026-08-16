// Shared Layout
import { Navigation, FooterSection } from "@/frontend/components/public";
import { isSignedIn } from "@/backend/lib/auth/session";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading auth state opts the public pages into dynamic rendering. That is the
  // cost of not showing "Sign in" to someone who is already signed in.
  const authenticated = await isSignedIn();

  return (
  <>
    <Navigation isAuthenticated={authenticated} />
    {children}
    <FooterSection />
  </>);
}
