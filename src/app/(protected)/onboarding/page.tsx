"use client";

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

export default function OnboardingPage() {
  const { data, updateData } = useOnboardingForm();
  const { step, totalSteps, progress, handleNext, handleBack, isFirstStep, isLastStep } = useOnboardingStep();
  const { isSubmitting, error: submitError, handleSubmit } = useOnboardingSubmit();

  return (
    <div className="min-h-screen flex flex-col bg-(--bg-canvas)">
      <OnboardingHeader step={step} totalSteps={totalSteps} progress={progress} />

      <main className="flex-1 flex items-center justify-center py-16 px-6">
        <div className="w-full max-w-140">
          <StepHeader
            step={step}
            totalSteps={totalSteps}
            title={stepTitles[step - 1]}
            description={stepDescriptions[step - 1]}
          />

          {/* Step 1: Work Preference */}
          {step === 1 && (
            <StepWorkPreference
              workPreference={data.workPreference}
              onUpdate={updateData}
            />
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <StepLocation
              location={data.location}
              workPreference={data.workPreference}
              onUpdate={updateData}
            />
          )}

          {/* Step 3: Field & Skills */}
          {step === 3 && (
            <StepFieldSkills
              field={data.field}
              skills={data.skills}
              experience={data.experience}
              onUpdate={updateData}
            />
          )}

          {/* Step 4: Job Preferences */}
          {step === 4 && (
            <StepJobPreferences
              jobType={data.jobType}
              seniority={data.seniority}
              onUpdate={updateData}
            />
          )}

          {/* Step 5: Salary */}
          {step === 5 && (
            <StepSalary
              salary={data.salary}
              onUpdate={updateData}
            />
          )}

          {/* Step 6: API Key */}
          {step === 6 && (
            <StepApiKey
              apiKey={data.apiKey}
              onUpdate={updateData}
            />
          )}

          {submitError && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {submitError}
            </div>
          )}

          <OnboardingNavigation
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            isSubmitting={isSubmitting}
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={() => handleSubmit(data)}
          />
        </div>
      </main>
    </div>
  );
}
