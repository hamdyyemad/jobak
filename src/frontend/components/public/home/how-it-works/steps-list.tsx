"use client";
import { Step } from "./data";

interface StepsListProps {
  steps: Step[];
  activeStep: number;
  onStepClick: (index: number) => void;
}

export function StepsList({ steps, activeStep, onStepClick }: StepsListProps) {
  return (
    <div className="space-y-0">
      {steps.map((step, index) => (
        <StepButton
          key={step.number}
          step={step}
          index={index}
          isActive={activeStep === index}
          onClick={() => onStepClick(index)}
        />
      ))}
    </div>
  );
}

interface StepButtonProps {
  step: Step;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

function StepButton({ step, isActive, onClick }: StepButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left py-8 border-b border-background/10 transition-all duration-500 group ${
        isActive ? "opacity-100" : "opacity-40 hover:opacity-70"
      }`}
    >
      <div className="flex items-start gap-6">
        <span className="font-display text-3xl text-background/30">{step.number}</span>
        <div className="flex-1">
          <h3 className="text-2xl lg:text-3xl font-display mb-3 group-hover:translate-x-2 transition-transform duration-300">
            {step.title}
          </h3>
          <p className="text-background/60 leading-relaxed">{step.description}</p>
          {isActive && <ProgressBar />}
        </div>
      </div>
    </button>
  );
}

function ProgressBar() {
  return (
    <div className="mt-4 h-px bg-background/20 overflow-hidden">
      <div 
        className="h-full bg-background w-0" 
        style={{ animation: "progress 5s linear forwards" }} 
      />
      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
