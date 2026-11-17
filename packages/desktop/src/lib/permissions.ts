import type { Session } from "electron";
import { isAppOrigin } from "./app-url";
import { ALLOWED_PERMISSIONS } from "./constants/desktop";
import { serialDeviceAllowed } from "./devices";

export function registerPermissionHandlers(session: Session) {
  session.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details) =>
    ALLOWED_PERMISSIONS.has(permission) &&
    isAppOrigin(details.securityOrigin ?? requestingOrigin),
  );
  session.setPermissionRequestHandler((webContents, permission, callback, details) => {
    callback(
      ALLOWED_PERMISSIONS.has(permission) &&
        isAppOrigin(details.requestingUrl || webContents.getURL()),
    );
  });
  session.setDevicePermissionHandler(serialDeviceAllowed);
}
