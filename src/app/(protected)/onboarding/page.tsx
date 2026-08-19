"use client";

import type { CSSProperties } from "react";
import {
  useKeyVerification,
  useOnboardingForm,
  useOnboardingStep,
  useOnboardingSubmit,
  useSceneTint,
} from "@/frontend/hooks/protected/onboarding";
import {
  OnboardingHeader,
  OnboardingNavigation,
  ScenePanel,
  StepHeader,
  StepWorkPreference,
  StepLocation,
  StepFieldSkills,
  StepJobPreferences,
  StepSalary,
  StepApiKey,
  sceneState,
} from "@/frontend/components/protected/onboarding";
import {
  stepKickers,
  stepTitles,
  stepDescriptions,
} from "@/frontend/components/protected/onboarding/data";

/** How far each step travels in, in the direction the user is heading. */
const TRAVEL = 24;

export default function OnboardingPage() {
  const { data, updateData } = useOnboardingForm();
  const {
    step,
    totalSteps,
    direction,
    handleNext,
    handleBack,
    isFirstStep,
    isLastStep,
  } = useOnboardingStep();
  const { isSubmitting, error: submitError, handleSubmit } = useOnboardingSubmit();
  const { statusOf, verify, reset } = useKeyVerification();

  const scene = sceneState(data, step);
  const tint = useSceneTint(scene.countryCode, scene.tintOverride);

  /*
   * Scoped to the providers still selected: verifying a key and then
   * deselecting that provider would otherwise leave the finish button enabled
   * with nothing to submit.
   */
  const hasVerifiedProvider = data.aiProviders.some(
    (provider) => statusOf(provider).status === "valid"
  );

  const travel = {
    ...tint,
    "--step-from": `${direction === "back" ? -TRAVEL : TRAVEL}px`,
  } as CSSProperties;

  return (
    <div style={travel} className="scene relative flex min-h-dvh flex-col bg-(--bg-canvas)">
      {/* Tinted grid and wash across the whole viewport, behind everything. */}
      <div aria-hidden="true" className="scene-field" />

      <OnboardingHeader />

      {/*
        Asymmetric split rather than a centred column: the questions hold the
        left, and the object holds the right at a size it can actually carry.
        On narrow screens the object drops below the questions instead of being
        squeezed into a strip.
      */}
      {/*
        z-20 puts the questions above both rails. The header and footer sit at
        z-10, and an equal z-index would let the footer win on DOM order alone —
        which is exactly what buried the open country list behind the controls.
      */}
      <main className="relative z-20 mx-auto flex w-full max-w-350 flex-1 flex-col-reverse items-center gap-12 px-8 py-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center lg:gap-16 lg:px-14">
        {/* Keyed on step so each move replays the entry animation. */}
        <div key={step} className="w-full max-w-160">
          <div className="step-enter">
            <StepHeader
              step={step}
              totalSteps={totalSteps}
              kicker={stepKickers[step - 1]}
              title={stepTitles[step - 1]}
              description={stepDescriptions[step - 1]}
            />
          </div>

          {/*
            Each .step-enter runs an animation, which makes it its own stacking
            context — so a dropdown's z-index cannot reach past this block. It is
            lifted above the blocks around it, otherwise an open listbox renders
            underneath them.
          */}
          <div className="step-enter relative z-10" style={{ animationDelay: "70ms" }}>
            {step === 1 && (
              <StepWorkPreference
                workPreference={data.workPreference}
                location={data.location}
                onUpdate={updateData}
              />
            )}

            {step === 2 && <StepLocation location={data.location} onUpdate={updateData} />}

            {step === 3 && (
              <StepFieldSkills
                field={data.field}
                skills={data.skills}
                experience={data.experience}
                onUpdate={updateData}
              />
            )}

            {step === 4 && (
              <StepJobPreferences
                jobType={data.jobType}
                jobTitles={data.jobTitles}
                seniority={data.seniority}
                experience={data.experience}
                field={data.field}
                onUpdate={updateData}
              />
            )}

            {step === 5 && <StepSalary salary={data.salary} onUpdate={updateData} />}

            {step === 6 && (
              <StepApiKey
                aiProviders={data.aiProviders}
                aiKeys={data.aiKeys}
                statusOf={statusOf}
                onVerify={verify}
                onResetCheck={reset}
                onUpdate={updateData}
              />
            )}

            {submitError && (
              <div
                role="alert"
                className="mt-6 border-l-2 border-(--status-rose) py-2 pl-4 text-sm text-(--status-rose)"
              >
                {submitError}
              </div>
            )}
          </div>
        </div>

        <ScenePanel scene={scene} step={step} />
      </main>

      <OnboardingNavigation
        step={step}
        totalSteps={totalSteps}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        isSubmitting={isSubmitting}
        canSubmit={hasVerifiedProvider}
        submitHint="Test a key to finish"
        onBack={handleBack}
        onNext={handleNext}
        onSubmit={() => handleSubmit(data)}
      />
    </div>
  );
}
