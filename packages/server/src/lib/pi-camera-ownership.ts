const owners = new Map<string, object>();

export function claimPiCamera(cameraId: string, owner: object): boolean {
  const existing = owners.get(cameraId);
  if (existing && existing !== owner) return false;
  owners.set(cameraId, owner);
  return true;
}

export function releasePiCamera(cameraId: string | undefined, owner: object) {
  if (cameraId && owners.get(cameraId) === owner) owners.delete(cameraId);
}
