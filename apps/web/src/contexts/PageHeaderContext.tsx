import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type PageMeta = { title: string; description?: string };

type Ctx = {
  meta: PageMeta;
  setMeta: (m: PageMeta) => void;
};

const PageHeaderContext = createContext<Ctx | undefined>(undefined);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<PageMeta>({ title: "" });
  return (
    <PageHeaderContext.Provider value={{ meta, setMeta }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) throw new Error("usePageHeader must be used within PageHeaderProvider");
  return ctx;
}

/** Set the topbar title/description for the current page. */
export function usePageMeta(title: string, description?: string) {
  const { setMeta } = usePageHeader();
  useEffect(() => {
    setMeta({ title, description });
    return () => setMeta({ title: "" });
  }, [title, description, setMeta]);
}
