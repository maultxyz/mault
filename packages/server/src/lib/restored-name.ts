import {
  RESTORED_NAME_MAX_ATTEMPTS,
  RESTORED_NAME_SUFFIX,
} from "./constants/deleted-items";

function withRestoredSuffix(name: string, attempt: number, maxLength: number) {
  const suffix =
    attempt === 1
      ? ` (${RESTORED_NAME_SUFFIX})`
      : ` (${RESTORED_NAME_SUFFIX} ${attempt})`;
  return `${name.slice(0, maxLength - suffix.length).trimEnd()}${suffix}`;
}

export async function findRestorableName(
  name: string,
  maxLength: number,
  isNameTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  if (!(await isNameTaken(name))) return name;
  for (let attempt = 1; attempt <= RESTORED_NAME_MAX_ATTEMPTS; attempt++) {
    const candidate = withRestoredSuffix(name, attempt, maxLength);
    if (!(await isNameTaken(candidate))) return candidate;
  }
  throw new Error(`No free name found to restore "${name}".`);
}
