import { loadDeckLink } from "@/features/cards/api/deck-links";
import type {
  DeckLinkImport,
  DeckLinkImportFailure,
} from "@magic-vault/shared";
import { useMutation } from "@tanstack/react-query";

export function useDeckLinkImport(onDeckLoaded: (deck: DeckLinkImport) => void) {
  const mutation = useMutation({
    mutationFn: async (url: string): Promise<DeckLinkImportFailure | null> => {
      const result = await loadDeckLink({ url }).catch(() => null);
      if (!result) return "unavailable";
      if (!result.success || !result.data) return result.failure ?? "unavailable";
      onDeckLoaded(result.data);
      return null;
    },
  });

  return {
    loadDeck: mutation.mutate,
    isLoading: mutation.isPending,
    failure: mutation.data ?? null,
    reset: mutation.reset,
  };
}
