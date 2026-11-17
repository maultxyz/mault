import { useCallback, useSyncExternalStore } from "react";

export function useIsMobile(breakpoint = 767): boolean {
	const query = `(max-width: ${breakpoint}px)`;
	const subscribe = useCallback(
		(onChange: () => void) => {
			const mql = window.matchMedia(query);
			mql.addEventListener("change", onChange);
			return () => mql.removeEventListener("change", onChange);
		},
		[query],
	);
	return useSyncExternalStore(
		subscribe,
		() => window.matchMedia(query).matches,
		() => false,
	);
}
