import { GITHUB_STARS_STALE_MS } from "@/lib/constants/billing";
import { REPO_API_URL } from "@/lib/constants/links";
import type { GithubRepoResponse } from "@/lib/interfaces/billing";
import { queryOptions } from "@tanstack/react-query";

async function getGithubStars(): Promise<number> {
  const res = await fetch(REPO_API_URL, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);
  const repo: GithubRepoResponse = await res.json();
  return repo.stargazers_count;
}

export function githubStarsQueryOptions(enabled: boolean) {
  return queryOptions({
    queryKey: ["github-stars"],
    queryFn: getGithubStars,
    enabled,
    staleTime: GITHUB_STARS_STALE_MS,
    retry: false,
  });
}
