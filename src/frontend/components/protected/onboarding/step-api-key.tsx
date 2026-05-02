import { Lock } from "lucide-react";
import { OnboardingData } from "@/frontend/types/on-boarding";
import { inputClass } from "./styles";

interface StepApiKeyProps {
  apiKey: string;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

export function StepApiKey({ apiKey, onUpdate }: StepApiKeyProps) {
  const handleApiKeyChange = (newApiKey: string) => {
    onUpdate({ apiKey: newApiKey });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-2 text-fg-secondary">Groq API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => handleApiKeyChange(e.target.value)}
          placeholder="gsk_..."
          className={inputClass + " font-mono text-sm"}
        />
        <p className="mt-2 text-xs text-(--fg-tertiary)">
          Don&apos;t have one?{" "}
          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-accent-text hover:underline">
            Get your key at console.groq.com
          </a>
        </p>
      </div>

      <div className="p-4 rounded-xl bg-(--accent-bg) border border-accent flex gap-3">
        <Lock className="w-4 h-4 text-accent-text shrink-0 mt-0.5" />
        <p className="text-sm text-fg-secondary leading-relaxed">
          Your API key is encrypted before storage and never shared with third parties. We use it only to rank job matches on your behalf.
        </p>
      </div>
    </div>
  );
}
