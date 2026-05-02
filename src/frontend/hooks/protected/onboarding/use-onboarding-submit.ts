import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingData } from "@/frontend/types/on-boarding";

export function useOnboardingSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (data: OnboardingData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/webhook/job-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Failed to submit. Please try again.");
        setIsSubmitting(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("An error occurred. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, error, handleSubmit };
}
