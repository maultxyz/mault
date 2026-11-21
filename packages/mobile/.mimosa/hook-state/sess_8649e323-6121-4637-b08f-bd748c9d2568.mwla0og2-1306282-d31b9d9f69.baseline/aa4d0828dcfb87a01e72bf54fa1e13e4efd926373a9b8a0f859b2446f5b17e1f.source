import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PLATFORM_ADMIN_ROLE, PLATFORM_MODERATOR_ROLE, QUERY_MIN_LENGTH } from "@magic-vault/shared";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Pill } from "@/components/ui/pill";
import { SearchInput } from "@/components/ui/search-input";
import { adminUsersSearchQueryOptions } from "@/features/admin/api/users-impersonation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";

export function UserSearchPanel() {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const isSearchReady = debouncedSearch.length >= QUERY_MIN_LENGTH;
  const usersQuery = useQuery(adminUsersSearchQueryOptions(debouncedSearch, isSearchReady));
  const users = usersQuery.data ?? [];

  return (
    <>
      <Callout tone="info" title={t("admin.users.viewAsUserOnWebTitle")} description={t("admin.users.viewAsUserOnWebDescription")} />
      <SearchInput
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder={t("admin.users.searchPlaceholder")}
        accessibilityLabel={t("admin.users.searchPlaceholder")}
      />
      {!isSearchReady ? (
        <EmptyState icon="search" title={t("admin.users.startTyping")} />
      ) : usersQuery.isPending ? (
        <ListSkeleton />
      ) : usersQuery.isError ? (
        <Callout tone="destructive" title={t("admin.users.searchFailed")} />
      ) : users.length === 0 ? (
        <EmptyState icon="users" title={t("admin.users.empty")} />
      ) : (
        <ListGroup>
          {users.map((user) => (
            <ListRow
              key={user.id}
              title={user.name || user.email}
              subtitle={[
                user.email,
                user.orgs.length > 0 ? user.orgs.map((org) => org.name).join(", ") : t("admin.users.noOrgs"),
              ].join(" · ")}
              subtitleNumberOfLines={3}
              right={
                user.role === PLATFORM_ADMIN_ROLE ? (
                  <Pill label={t("admin.users.adminBadge")} />
                ) : user.role === PLATFORM_MODERATOR_ROLE ? (
                  <Pill label={t("admin.users.moderatorBadge")} />
                ) : undefined
              }
            />
          ))}
        </ListGroup>
      )}
    </>
  );
}
