import { useEffect, useRef } from "react";

/**
 * Hook to log changes in dependencies for debugging useEffects.
 * @param {Object} deps - The dependencies object to check for changes.
 * @param {string} [componentName="component"] - The name of the component for logging context.
 */
export const useDependencyLogger = (deps, componentName = "component") => {
    const prevDepsRef = useRef();

    useEffect(() => {
        if (!import.meta.env.DEV) return;

        const prev = prevDepsRef.current;
        const curr = deps;

        if (!prev) {
            console.log(`[effect] ${componentName} initial deps:`, curr);
        } else {
            const changed = Object.keys(curr).filter(k => {
                try {
                    return JSON.stringify(prev[k]) !== JSON.stringify(curr[k]);
                } catch {
                    return prev[k] !== curr[k];
                }
            });

            if (changed.length) {
                console.group(`[effect] ${componentName} deps changed: ${changed.join(", ")}`);
                changed.forEach(k => {
                    console.log(k, "prev:", prev[k], "curr:", curr[k]);
                });
                //console.trace();
                console.groupEnd();
            } else {
                console.log(`[effect] ${componentName} ran but no dep change detected (unexpected)`);
            }
        }

        prevDepsRef.current = { ...curr };
    }, [deps, componentName]);
};
