
interface AnimatedVisualProps {
  type: "ai" | "sources" | "filter" | "security";
}

export function AnimatedVisual({ type }: AnimatedVisualProps) {
  switch (type) {
    case "ai": return <AIVisual />;
    case "sources": return <SourcesVisual />;
    case "filter": return <FilterVisual />;
    case "security": return <SecurityVisual />;
    default: return <AIVisual />;
  }
}

function AIVisual() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <circle cx="100" cy="80" r="12" fill="currentColor">
        <animate attributeName="r" values="12;14;12" dur="2s" repeatCount="indefinite" />
      </circle>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i * 60) * (Math.PI / 180);
        const radius = 50;
        const x = Math.round((100 + Math.cos(angle) * radius) * 100) / 100;
        const y = Math.round((80 + Math.sin(angle) * radius) * 100) / 100;
        return (
          <g key={i}>
            <line
              x1="100" y1="80"
              x2={x}
              y2={y}
              stroke="currentColor" strokeWidth="1" opacity="0.3"
            >
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
            </line>
            <circle
              cx={x}
              cy={y}
              r="6" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <animate attributeName="r" values="6;8;6" dur="2s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
            </circle>
          </g>
        );
      })}
      <circle cx="100" cy="80" r="30" fill="none" stroke="currentColor" strokeWidth="1" opacity="0">
        <animate attributeName="r" values="20;60" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function SourcesVisual() {
  const sources = ["LI", "IN", "RO", "WZ", "GD", "MO"];
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      {sources.map((src, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 35 + col * 55;
        const y = 30 + row * 70;
        return (
          <g key={src}>
            <rect x={x - 18} y={y - 14} width="36" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
            </rect>
            <text x={x} y={y + 5} textAnchor="middle" fontSize="10" fontFamily="monospace" fill="currentColor" opacity="0.8">{src}</text>
            {row === 0 && (
              <line x1={x} y1={y + 14} x2={x} y2={y + 42} stroke="currentColor" strokeWidth="1" opacity="0.3">
                <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.5s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
              </line>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function FilterVisual() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="30" y={25 + i * 32} width="140" height="22" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
          <rect x="30" y={25 + i * 32} width={40 + i * 25} height="22" rx="3" fill="currentColor" opacity="0.15">
            <animate attributeName="width" values={`${40 + i * 25};${60 + i * 20};${40 + i * 25}`} dur="3s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
          </rect>
          <circle cx="178" cy={36 + i * 32} r="5" fill="currentColor" opacity="0.6">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
    </svg>
  );
}

function SecurityVisual() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      <path d="M 100 20 L 150 40 L 150 90 Q 150 130 100 145 Q 50 130 50 90 L 50 40 Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M 100 35 L 135 50 L 135 85 Q 135 115 100 128 Q 65 115 65 85 L 65 50 Z" fill="currentColor" opacity="0.1">
        <animate attributeName="opacity" values="0.1;0.2;0.1" dur="2s" repeatCount="indefinite" />
      </path>
      <rect x="85" y="70" width="30" height="25" rx="3" fill="currentColor" />
      <path d="M 90 70 L 90 60 Q 90 50 100 50 Q 110 50 110 60 L 110 70" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="80" r="4" fill="white" />
      <rect x="98" y="82" width="4" height="8" fill="white" />
      <line x1="60" y1="60" x2="140" y2="60" stroke="currentColor" strokeWidth="1" opacity="0">
        <animate attributeName="y1" values="40;120;40" dur="3s" repeatCount="indefinite" />
        <animate attributeName="y2" values="40;120;40" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;0.5;0" dur="3s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

