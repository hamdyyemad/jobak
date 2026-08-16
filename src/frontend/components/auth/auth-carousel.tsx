"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Compass, Gauge, KeyRound } from "lucide-react";

/**
 * What actually happens after signing up. Every line is checkable against the
 * product: six onboarding steps, a 0-100 relevance score, a user-supplied Groq
 * key encrypted at rest. No invented metrics, no invented testimonials.
 */
const slides = [
  {
    icon: Compass,
    title: "Six questions, once",
    body: "Work preference, location, skills, job type, seniority and salary range. That profile drives every search you run.",
  },
  {
    icon: Gauge,
    title: "Every match gets a score",
    body: "Listings are ranked 0 to 100 against your profile, so the closest fit is the first thing you read.",
  },
  {
    icon: KeyRound,
    title: "Free, with your own key",
    body: "Connect a Groq API key during onboarding. It is encrypted with AES-256-GCM and only used to rank your matches.",
  },
];

const INTERVAL_MS = 6000;

export function AuthCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const go = useCallback((next: number) => {
    setIndex(((next % slides.length) + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    // Do not auto-advance when paused, hidden, or when motion is unwelcome
    if (paused || reducedMotion.current) return;

    let timer = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS);

    const onVisibility = () => {
      window.clearInterval(timer);
      if (!document.hidden) {
        timer = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [paused]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="What happens after you sign up"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-xl border border-border-standard bg-white/2">
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {slides.map((slide, i) => (
            <Slide key={slide.title} slide={slide} hidden={i !== index} />
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show ${slide.title}`}
            aria-current={i === index}
            className="group py-2 outline-none"
          >
            <span
              className={`block h-0.5 rounded-full transition-all duration-500 ${
                i === index
                  ? "w-8 bg-accent"
                  : "w-4 bg-white/15 group-hover:bg-white/30 group-focus-visible:bg-white/30"
              }`}
            />
          </button>
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        {`Slide ${index + 1} of ${slides.length}: ${slides[index].title}`}
      </p>
    </section>
  );
}

interface SlideProps {
  slide: (typeof slides)[number];
  hidden: boolean;
}

function Slide({ slide, hidden }: SlideProps) {
  const Icon = slide.icon;
  return (
    <div
      className="w-full shrink-0 p-6"
      aria-hidden={hidden}
      // Keeps off-screen slides out of the tab order without unmounting them
      inert={hidden}
    >
      <span className="inline-flex w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 items-center justify-center mb-4">
        <Icon className="w-4 h-4 text-accent-text" strokeWidth={1.5} />
      </span>
      <h3 className="text-base font-medium text-fg-primary mb-2">{slide.title}</h3>
      <p className="text-sm text-fg-tertiary leading-relaxed">{slide.body}</p>
    </div>
  );
}
