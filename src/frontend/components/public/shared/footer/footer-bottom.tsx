export function FooterBottom() {
  return (
    <div className="py-8 border-t border-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
      <Copyright />
    </div>
  );
}

function Copyright() {
  return (
    <p className="text-sm text-muted-foreground">
      © {new Date().getFullYear()} Jobak. All rights reserved.
    </p>
  );
}
