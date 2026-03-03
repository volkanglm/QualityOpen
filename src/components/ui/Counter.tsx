import { useEffect, useState } from "react";
import { animate } from "framer-motion";

interface CounterProps {
    value: number;
    duration?: number;
    className?: string;
    decimals?: number;
}

export function Counter({ value, duration = 1.5, className = "", decimals = 0 }: CounterProps) {
    const [displayValue, setDisplayValue] = useState("0");

    useEffect(() => {
        const controls = animate(0, value, {
            duration: duration,
            ease: [0.2, 0, 0, 1], // easeOut
            onUpdate(current) {
                if (decimals > 0) {
                    setDisplayValue(current.toFixed(decimals));
                } else {
                    setDisplayValue(Math.round(current).toString());
                }
            },
        });

        return controls.stop;
    }, [value, duration, decimals]);

    return <span className={className}>{displayValue}</span>;
}
