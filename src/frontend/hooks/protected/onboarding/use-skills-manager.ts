import { useState } from "react";

export function useSkillsManager(initialSkills: string[], onSkillsChange: (skills: string[]) => void) {
    const [skillInput, setSkillInput] = useState("");

    const addSkill = () => {
        const trimmed = skillInput.trim();
        if (trimmed && !initialSkills.includes(trimmed)) {
            onSkillsChange([...initialSkills, trimmed]);
            setSkillInput("");
        }
    };

    const removeSkill = (skill: string) => {
        onSkillsChange(initialSkills.filter((s) => s !== skill));
    };

    return {
        skillInput,
        setSkillInput,
        addSkill,
        removeSkill,
    };
}
