import "react";

declare module "react" {
  interface IframeHTMLAttributes<T> extends HTMLAttributes<T> {
    credentialless?: "";
  }
}
