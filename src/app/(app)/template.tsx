// Un template (a differenza del layout) viene ricreato a ogni navigazione:
// così ogni pagina entra con una breve animazione.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
