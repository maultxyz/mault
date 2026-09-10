import { DEFAULT_BOARD_TYPE, type BoardType } from "@/lib/constants/build";
import { BUILD_BOARD_TYPE_STORAGE_KEY } from "@/lib/constants/storage-keys";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type { BoardType };
export { DEFAULT_BOARD_TYPE };

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
      const raw = localStorage.getItem(BUILD_BOARD_TYPE_STORAGE_KEY);
      if (raw === "uno_r4" || raw === "esp32") {
        setBoardTypeState(raw);
      }
    } catch {}
  }, []);

  const setBoardType = (value: BoardType) => {
    setBoardTypeState(value);
    try {
      localStorage.setItem(BUILD_BOARD_TYPE_STORAGE_KEY, value);
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
