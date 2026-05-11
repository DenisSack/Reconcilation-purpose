import { create } from "zustand";

export type MappingKey =
  | "reference"
  | "amount"
  | "date"
  | "status"
  | "description";

export type FileSide = "supplier" | "system";

export type UploadedFileMeta = {
  name: string;
  size: number;
  arrayBuffer: ArrayBuffer;
};

type State = {
  step: 1 | 2 | 3;
  supplierFile: UploadedFileMeta | null;
  systemFile: UploadedFileMeta | null;
  supplierHeaders: string[];
  systemHeaders: string[];
  supplierMapping: Record<MappingKey, string>;
  systemMapping: Record<MappingKey, string>;
  reset: () => void;
  setStep: (s: 1 | 2 | 3) => void;
  setSupplierFile: (f: UploadedFileMeta | null) => void;
  setSystemFile: (f: UploadedFileMeta | null) => void;
  setHeaders: (side: FileSide, headers: string[]) => void;
  setMapping: (side: FileSide, key: MappingKey, column: string) => void;
};

const emptyMapping = (): Record<MappingKey, string> => ({
  reference: "",
  amount: "",
  date: "",
  status: "",
  description: "",
});

export const useReconciliationStore = create<State>((set) => ({
  step: 1,
  supplierFile: null,
  systemFile: null,
  supplierHeaders: [],
  systemHeaders: [],
  supplierMapping: emptyMapping(),
  systemMapping: emptyMapping(),
  reset: () =>
    set({
      step: 1,
      supplierFile: null,
      systemFile: null,
      supplierHeaders: [],
      systemHeaders: [],
      supplierMapping: emptyMapping(),
      systemMapping: emptyMapping(),
    }),
  setStep: (step) => set({ step }),
  setSupplierFile: (supplierFile) => set({ supplierFile }),
  setSystemFile: (systemFile) => set({ systemFile }),
  setHeaders: (side, headers) =>
    set(
      side === "supplier" ? { supplierHeaders: headers } : { systemHeaders: headers },
    ),
  setMapping: (side, key, column) =>
    set((state) => {
      const next =
        side === "supplier"
          ? { ...state.supplierMapping, [key]: column }
          : { ...state.systemMapping, [key]: column };
      return side === "supplier"
        ? { supplierMapping: next }
        : { systemMapping: next };
    }),
}));
