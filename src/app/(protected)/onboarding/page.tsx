"use client";

import type { CSSProperties } from "react";
import { useOnboardingForm, useOnboardingStep, useOnboardingSubmit } from "@/frontend/hooks/protected/onboarding";
import {
  OnboardingHeader,
  OnboardingNavigation,
  StepHeader,
  StepWorkPreference,
  StepLocation,
  StepFieldSkills,
  StepJobPreferences,
  StepSalary,
  StepApiKey,
} from "@/frontend/components/protected/onboarding";
import { stepTitles, stepDescriptions } from "@/frontend/components/protected/onboarding/data";

/** How far each step travels in, in the direction the user is heading. */
const TRAVEL = 24;

export default function OnboardingPage() {
  const { data, updateData } = useOnboardingForm();
  const {
    step,
    totalSteps,
    progress,
    direction,
    handleNext,
    handleBack,
    isFirstStep,
    isLastStep,
  } = useOnboardingStep();
  const { isSubmitting, error: submitError, handleSubmit } = useOnboardingSubmit();

  const travel = {
    "--step-from": `${direction === "back" ? -TRAVEL : TRAVEL}px`,
  } as CSSProperties;

  return (
    <div className="min-h-dvh flex flex-col bg-(--bg-canvas)">
      <OnboardingHeader step={step} totalSteps={totalSteps} progress={progress} />

      <main className="flex-1 flex items-center justify-center py-16 px-6">
        {/*
          Keyed on step so each move remounts the pane and replays the entry
          animation. The three blocks are staggered, so the heading arrives
          first and the controls settle last.
        */}
        <div key={step} style={travel} className="w-full max-w-140">
          <div className="step-enter">
            <StepHeader
              step={step}
              totalSteps={totalSteps}
              title={stepTitles[step - 1]}
              description={stepDescriptions[step - 1]}
            />
          </div>

          <div className="step-enter" style={{ animationDelay: "70ms" }}>
            {step === 1 && (
              <StepWorkPreference
                workPreference={data.workPreference}
                onUpdate={updateData}
              />
            )}

            {step === 2 && (
              <StepLocation
                location={data.location}
                workPreference={data.workPreference}
                onUpdate={updateData}
              />
            )}

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
                seniority={data.seniority}
                onUpdate={updateData}
              />
            )}

            {step === 5 && (
              <StepSalary salary={data.salary} onUpdate={updateData} />
            )}

            {step === 6 && (
              <StepApiKey apiKey={data.apiKey} onUpdate={updateData} />
            )}

            {submitError && (
              <div
                role="alert"
                className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400"
              >
                {submitError}
              </div>
            )}
          </div>

          <div className="step-enter" style={{ animationDelay: "140ms" }}>
            <OnboardingNavigation
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
              isSubmitting={isSubmitting}
              onBack={handleBack}
              onNext={handleNext}
              onSubmit={() => handleSubmit(data)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
