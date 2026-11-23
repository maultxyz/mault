export function guestKindLabelKey(isFromAccount: boolean): "guestKind.signedIn" | "guestKind.guest" {
  return isFromAccount ? "guestKind.signedIn" : "guestKind.guest";
}
