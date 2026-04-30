"use client";
import { useAutoRotate } from "@/frontend/hooks/ui/use-auto-rotate";
import { steps } from "./data";
import { StepsList } from "./steps-list";
import { CodePreview } from "./code-preview";

export function InteractiveSteps() {
  const { activeIndex: activeStep, setActiveIndex: setActiveStep } = useAutoRotate(steps.length, 5000);

  return (
    <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
      <StepsList 
        steps={steps} 
        activeStep={activeStep} 
        onStepClick={setActiveStep} 
      />
      <CodePreview 
        code={steps[activeStep].code} 
        activeStep={activeStep} 
      />
    </div>
  );
}
