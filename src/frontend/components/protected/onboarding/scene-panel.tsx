"use client";

import type { SceneState } from "./scene-state";

interface ScenePanelProps {
    scene: SceneState;
    step: number;
}

/**
 * The right-hand half of the flow: one object, its caption, and the running
 * answer sheet.
 *
 * This is the part borrowed hardest from hertzwerk.ch — the object is not a
 * decoration beside a form, it is where the answer lands. Choosing a country
 * repaints it in that flag's colours, and because the tint lives on the page
 * root, the grid, the rules and the meter all move with it.
 */
export function ScenePanel({ scene, step }: ScenePanelProps) {
    return (
        <div className="relative flex flex-col justify-center gap-7">
            <div className="scene-stage">
                {/* One orbit per answer — progress you can read as a shape. */}
                {Array.from({ length: scene.rings }, (_, i) => (
                    <span
                        key={i}
                        aria-hidden="true"
                        className="scene-orbit absolute"
                        style={{
                            width: `calc(var(--scene-size) + ${(i + 1) * 24}px)`,
                            height: `calc(var(--scene-size) + ${(i + 1) * 24}px)`,
                            animationDelay: `${i * 70}ms`,
                            /*
                             * The independent `rotate` property, not a transform:
                             * the entry animation ends on `transform: scale(1)
                             * rotate(0)`, which would otherwise reset this and
                             * stack every marker at twelve o'clock.
                             */
                            rotate: `${i * 47}deg`,
                            opacity: 1 - i * 0.11,
                        }}
                    />
                ))}

                {/*
                  Keyed on what was chosen, so every pick replays the swell — the
                  neoconda beat, where the thing you just chose grows to take focus.
                */}
                <div
                    key={`${scene.countryCode ?? "none"}-${scene.tintOverride ?? "base"}-${scene.wireframe}`}
                    aria-hidden="true"
                    className="scene-object scene-swell"
                >
                    <span className="scene-sheen" />
                    {scene.wireframe && <span className="scene-meridians" />}
                </div>
            </div>

            <p
                aria-live="polite"
                className="scene-caption text-center font-mono text-[11px] uppercase tracking-[0.3em]"
            >
                {scene.caption}
            </p>

            {/*
              The answer sheet. Everything already given stays on screen — but only
              where there is a column to put it in. On narrow screens the scene
              stacks above the questions, and six more rows there would push the
              controls off the fold for no benefit.
            */}
            <dl className="mx-auto hidden w-full max-w-76 lg:block">
                {scene.readout.map((row) => (
                    <div key={row.label} className="readout-row" data-active={row.step === step}>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-quaternary">
                            {row.label}
                        </dt>
                        <dd
                            className={`truncate text-[13px] transition-colors duration-300 ${
                                row.step === step ? "text-(--fg-primary)" : "text-(--fg-tertiary)"
                            }`}
                        >
                            {row.value}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
