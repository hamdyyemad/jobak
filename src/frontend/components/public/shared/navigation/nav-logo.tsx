import Link from "next/link";

export function NavLogo({ isScrolled }: { isScrolled: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <div className={`rounded-lg bg-accent flex items-center justify-center font-bold text-background transition-all duration-500 ${isScrolled ? "w-7 h-7 text-sm" : "w-8 h-8 text-base"}`}>
        J
      </div>
      <span className={`font-display tracking-tight transition-all duration-500 ${isScrolled ? "text-xl" : "text-2xl"}`}>
        Jobak
      </span>
    </Link>
  );
}