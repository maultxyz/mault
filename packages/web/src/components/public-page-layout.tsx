import { PUBLIC_PAGE_ROOT_CLASS } from "@/lib/constants/public-cards";
import { useLayoutEffect } from "react";
import { Outlet } from "react-router-dom";

export function PublicPageLayout() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add(PUBLIC_PAGE_ROOT_CLASS);
    return () => root.classList.remove(PUBLIC_PAGE_ROOT_CLASS);
  }, []);
  return <Outlet />;
}
