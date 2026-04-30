export function FooterBottom() {
  return (
    <div className="py-8 border-t border-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
      <Copyright />
      <SystemStatus />
    </div>
  );
}

function Copyright() {
  return (
    <p className="text-sm text-muted-foreground">
      © 2026 Jobak. All rights reserved.
    </p>
  );
}

function SystemStatus() {
  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        All systems operational
      </span>
    </div>
  );
}
