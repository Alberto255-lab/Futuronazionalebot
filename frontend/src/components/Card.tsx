// components/Card.tsx
// Contenitore riutilizzabile in stile "card" con bordi arrotondati e ombra

export default function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-navycard rounded-2xl shadow-lg p-5 ${className}`}>
      {children}
    </div>
  );
}
