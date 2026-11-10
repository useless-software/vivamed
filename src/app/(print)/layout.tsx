// Pagine pensate per la stampa: niente barra laterale né menu.
export default function PrintLayout({ children }: LayoutProps<"/">) {
  return <main className="mx-auto w-full max-w-5xl bg-white p-6 text-black print:p-0">{children}</main>;
}
