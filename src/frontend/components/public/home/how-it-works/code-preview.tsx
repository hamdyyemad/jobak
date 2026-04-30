"use client";

interface CodePreviewProps {
  code: string;
  activeStep: number;
}

export function CodePreview({ code, activeStep }: CodePreviewProps) {
  return (
    <div className="lg:sticky lg:top-32 self-start">
      <div className="border border-background/10 overflow-hidden">
        <CodeHeader />
        <CodeContent code={code} activeStep={activeStep} />
        <CodeFooter />
      </div>
    </div>
  );
}

function CodeHeader() {
  return (
    <div className="px-6 py-4 border-b border-background/10 flex items-center justify-between">
      <div className="flex gap-2">
        <div className="w-3 h-3 rounded-full bg-background/20" />
        <div className="w-3 h-3 rounded-full bg-background/20" />
        <div className="w-3 h-3 rounded-full bg-background/20" />
      </div>
      <span className="text-xs font-mono text-background/40">job-search.json</span>
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
      <pre className="text-background/70">
        {lines.map((line, lineIndex) => (
          <CodeLine
            key={`${activeStep}-${lineIndex}`}
            line={line}
            lineNumber={lineIndex + 1}
            lineIndex={lineIndex}
            activeStep={activeStep}
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
  activeStep: number;
}

function CodeLine({ line, lineNumber, lineIndex, activeStep }: CodeLineProps) {
  const chars = line.split("");

  return (
    <div
      className="leading-loose code-line-reveal"
      style={{ animationDelay: `${lineIndex * 80}ms` }}
    >
      <span className="text-background/20 select-none w-8 inline-block">
        {lineNumber}
      </span>
      <span className="inline-flex">
        {chars.map((char, charIndex) => (
          <span
            key={`${activeStep}-${lineIndex}-${charIndex}`}
            className="code-char-reveal"
            style={{ animationDelay: `${lineIndex * 80 + charIndex * 15}ms` }}
          >
            {char === " " ? " " : char}
          </span>
        ))}
      </span>
      <style jsx>{`
        .code-line-reveal {
          opacity: 0;
          transform: translateX(-8px);
          animation: lineReveal 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes lineReveal {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .code-char-reveal {
          opacity: 0;
          filter: blur(8px);
          animation: charReveal 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes charReveal {
          to {
            opacity: 1;
            filter: blur(0);
          }
        }
      `}</style>
    </div>
  );
}

function CodeFooter() {
  return (
    <div className="px-6 py-4 border-t border-background/10 flex items-center gap-3">
      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      <span className="text-xs font-mono text-background/40">Searching...</span>
    </div>
  );
}
