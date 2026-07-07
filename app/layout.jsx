import './globals.css';

export const metadata = {
  title: 'Saldos de Órdenes de Compra · Compras y Contrataciones',
  description: 'Sistema de seguimiento de saldos de órdenes de compra (Infraestructura y Planificación / Educación, Producción y Trabajo)',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
