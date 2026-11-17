export interface CardListFile {
  text: string;
  fileName: string;
}

export interface CardListFileButtonProps {
  onFileRead: (file: CardListFile) => void;
}
