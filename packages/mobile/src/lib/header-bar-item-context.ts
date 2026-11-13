import { createContext, useContext } from "react";

export const HeaderBarItemContext = createContext(false);

export function useIsInHeaderBar(): boolean {
  return useContext(HeaderBarItemContext);
}
