import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingData, MarketingAnswers } from "@/frontend/types/on-boarding";
import { seniorityFromExperience } from "@/frontend/components/protected/onboarding/data";

export function useOnboardingSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  /**
   * Saves the profile and queues the first search.
   *
   * The endpoint answers as soon as the request is recorded rather than waiting
   * for the collector, so this resolves in about as long as the round trip
   * takes. Returns whether the flow may advance — the caller moves to the
   * marketing step on true, and leaves the user on the credentials step with an
   * error on false.
   */
  const handleSubmit = async (data: OnboardingData): Promise<boolean> => {
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
      apifyKey: data.apifyKey.trim(),
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
        return false;
      }

      setIsSubmitting(false);
      return true;
    } catch {
      setError("An error occurred. Please check your connection and try again.");
      setIsSubmitting(false);
      return false;
    }
  };

  /**
   * Ends the flow.
   *
   * The marketing answers are saved on the way out, and a failure there is
   * swallowed on purpose: the user has finished onboarding and their search is
   * running, so nothing about a missing attribution answer should keep them off
   * their dashboard.
   */
  const handleFinish = async (answers: MarketingAnswers | null) => {
    const answered =
      answers &&
      (answers.heardFrom || answers.goal || answers.searchStatus || answers.heardDetail);

    if (answered) {
      try {
        await fetch("/api/v1/marketing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(answers),
        });
      } catch {
        // Intentionally ignored — see above.
      }
    }

    router.push("/dashboard");
  };

  return { isSubmitting, error, handleSubmit, handleFinish };
}
