"use client";

interface CodePreviewProps {
  code: string;
  activeStep: number;
}

export function CodePreview({ code, activeStep }: CodePreviewProps) {
  return (
    <div className="lg:sticky lg:top-32 self-start">
      <div className="border border-foreground/10 overflow-hidden">
        <CodeHeader />
        <CodeContent code={code} activeStep={activeStep} />
        <CodeFooter />
      </div>
    </div>
  );
}

function CodeHeader() {
  return (
    <div className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
      <div className="flex gap-2">
        <div className="w-3 h-3 rounded-full bg-foreground/20" />
        <div className="w-3 h-3 rounded-full bg-foreground/20" />
        <div className="w-3 h-3 rounded-full bg-foreground/20" />
      </div>
      <span className="text-xs font-mono text-foreground/40">job-search.json</span>
    </div>
  );
}

interface CodeContentProps {
  code: string;
  activeStep: number;
}

function CodeContent({ code, activeStep }: CodeContentProps) {
  const lines = code.split("\n");

  return (
    <div className="p-8 font-mono text-sm min-h-70">
      <pre className="text-foreground/70">
        {lines.map((line, lineIndex) => (
          <CodeLine
            key={`${activeStep}-${lineIndex}`}
            line={line}
            lineNumber={lineIndex + 1}
            lineIndex={lineIndex}
          />
        ))}
      </pre>
    </div>
  );
}

interface CodeLineProps {
  line: string;
  lineNumber: number;
  lineIndex: number;
}

function CodeLine({ line, lineNumber, lineIndex }: CodeLineProps) {
  return (
    <div
      className="leading-loose code-line-reveal"
      style={{ animationDelay: `${lineIndex * 80}ms` }}
    >
      <span className="text-foreground/20 select-none w-8 inline-block">
        {lineNumber}
      </span>
      <span>{line}</span>
    </div>
  );
}

function CodeFooter() {
  return (
    <div className="px-6 py-4 border-t border-foreground/10 flex items-center gap-3">
      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      <span className="text-xs font-mono text-foreground/40">Searching...</span>
    </div>
  );
}
