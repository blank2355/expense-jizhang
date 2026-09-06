import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/components/auth-provider';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: '记一笔 - 快速记账',
  description: '出差与日常快速记账，AI 智能识别支付截图',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '记一笔',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FFFFFF',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-[#F5F5F7] text-[#1D1D1F]">
        <AuthProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
