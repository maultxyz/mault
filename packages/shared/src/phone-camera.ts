export function phoneCameraCapturePath(collectionGuid: string, requestId: string): string {
  return `/collections/${encodeURIComponent(collectionGuid)}/phone-camera/captures/${encodeURIComponent(requestId)}`;
}
