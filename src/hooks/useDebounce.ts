import { useEffect, useState } from "react";

function useDebounce<T>(value: T, delay: number): T {
    const [delayItem, setDelayItem] = useState(value);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDelayItem(value);
            console.log("debounce");
        }, delay);

        return () => clearTimeout(timeout);
    }, [value]);
    return delayItem;
}

export default useDebounce;
