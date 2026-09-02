import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type BoardType = "uno_r4" | "esp32" | "esp32_wroom";

export const DEFAULT_BOARD_TYPE: BoardType = "uno_r4";

const BOARD_TYPE_STORAGE_KEY = "magic-vault:build-board-type";

interface BoardTypeContextValue {
  boardType: BoardType;
  setBoardType: (value: BoardType) => void;
}

const BoardTypeContext = createContext<BoardTypeContextValue | null>(null);

export function BoardTypeProvider({ children }: { children: ReactNode }) {
  const [boardType, setBoardTypeState] = useState<BoardType>(
    DEFAULT_BOARD_TYPE,
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOARD_TYPE_STORAGE_KEY);
      if (raw === "uno_r4" || raw === "esp32" || raw === "esp32_wroom") {
        setBoardTypeState(raw);
      }
    } catch {}
  }, []);

  const setBoardType = (value: BoardType) => {
    setBoardTypeState(value);
    try {
      localStorage.setItem(BOARD_TYPE_STORAGE_KEY, value);
    } catch {}
  };

  return (
    <BoardTypeContext value={{ boardType, setBoardType }}>
      {children}
    </BoardTypeContext>
  );
}

export function useBoardType() {
  const context = useContext(BoardTypeContext);
  if (!context) {
    throw new Error("useBoardType must be used within a BoardTypeProvider");
  }
  return context;
}
