import { useCallback, useRef, useState } from "react";

export function useMenuSearch() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleMenuOpenChange = useCallback((open: boolean) => {
    setIsMenuOpen(open);
    if (!open) setSearchQuery("");
  }, []);

  const handleMenuOpenChangeComplete = useCallback((open: boolean) => {
    if (open) searchInputRef.current?.focus();
  }, []);

  const closeMenu = useCallback(
    () => handleMenuOpenChange(false),
    [handleMenuOpenChange],
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesSearch = useCallback(
    (label: string) =>
      !normalizedQuery || label.toLowerCase().includes(normalizedQuery),
    [normalizedQuery],
  );

  return {
    isMenuOpen,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    handleMenuOpenChange,
    handleMenuOpenChangeComplete,
    closeMenu,
    matchesSearch,
  };
}
