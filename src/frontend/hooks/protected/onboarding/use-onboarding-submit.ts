import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingData } from "@/frontend/types/on-boarding";
import { seniorityFromExperience } from "@/frontend/components/protected/onboarding/data";

export function useOnboardingSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (data: OnboardingData) => {
    setIsSubmitting(true);
    setError(null);

    /*
     * Resolve the two values the UI leaves implicit, so the API never has to
     * guess: seniority falls back to what the years imply, and only the keys for
     * providers the user actually kept selected are sent.
     */
    const payload = {
      ...data,
      seniority: data.seniority ?? seniorityFromExperience(data.experience),
      aiKeys: Object.fromEntries(
        data.aiProviders
          .map((provider) => [provider, data.aiKeys[provider]?.trim()])
          .filter(([, key]) => Boolean(key))
      ),
    };

    try {
      const response = await fetch("/api/v1/webhook/job-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
