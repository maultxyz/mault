export function anchorUrl(id: string) {
  const url = new URL(window.location.href);
  url.hash = id;
  return url.toString();
}
