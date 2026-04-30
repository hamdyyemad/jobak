import { useState } from "react";

export function useJobRefresh() {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        // Simulate API call
        setTimeout(() => {
            setIsRefreshing(false);
            // In real app, this would fetch new jobs
        }, 2000);
    };

    return {
        isRefreshing,
        handleRefresh,
    };
}
