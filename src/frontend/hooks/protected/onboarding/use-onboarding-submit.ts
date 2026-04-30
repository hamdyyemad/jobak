import { useState } from "react";
import { OnboardingData } from "@/frontend/types/on-boarding";

export function useOnboardingSubmit() {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (data: OnboardingData) => {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/v1/webhook/job-search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                window.location.href = "/dashboard";
            } else {
                alert("Failed to submit. Please try again.");
                setIsSubmitting(false);
            }
        } catch {
            alert("An error occurred. Please try again.");
            setIsSubmitting(false);
        }
    };

    return { isSubmitting, handleSubmit };
}
