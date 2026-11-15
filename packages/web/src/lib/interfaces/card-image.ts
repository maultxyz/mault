export interface CardImageProps {
  src: string | undefined;
  placeholderSrc?: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}
