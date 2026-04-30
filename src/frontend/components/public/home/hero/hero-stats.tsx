import { stats } from "./data";

export function StatsMarquee() {
  return (
    <div className="absolute bottom-24 left-0 right-0 opacity-100 transition-all duration-700 delay-500">
      <div className="flex gap-16 marquee whitespace-nowrap">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex gap-16">
            {stats.map((stat) => (
              <div key={`${stat.company}-${i}`} className="flex items-baseline gap-4">
                <span className="text-4xl lg:text-5xl font-display">{stat.value}</span>
                <span className="text-sm text-muted-foreground">
                  {stat.label}
                  <span className="block font-mono text-xs mt-1">{stat.company}</span>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}