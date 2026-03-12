import './globals.css';
import { AuthProvider } from '../components/AuthProvider';

export const metadata = {
    title: 'EduFlow - 에듀플로우',
    description: '에듀플로우 - 학급 운영 서비스',
    manifest: '/manifest.json',
    themeColor: '#1a2a4a',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'EduFlow',
    },
    icons: {
        apple: '/icon-192.png',
    },
    other: {
        'mobile-web-app-capable': 'yes',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="ko">
            <head>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400&display=swap" />
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0" />
                <link rel="stylesheet" href="/legacy-style.css" />
            </head>
            <body>
                <AuthProvider>
                    {children}
                </AuthProvider>
                <div id="splash" style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    background: '#062117',
                    transition: 'opacity 0.4s',
                }}>
                    <span style={{
                        fontFamily: "Pretendard, sans-serif",
                        fontSize: '36px',
                        fontWeight: 700,
                        letterSpacing: '6px',
                        color: 'white',
                    }}>에듀플로우</span>
                    <span style={{
                        fontFamily: "Pretendard, sans-serif",
                        fontSize: '13px',
                        fontWeight: 300,
                        color: 'rgba(255,255,255,0.5)',
                        letterSpacing: '2px',
                    }}>학교가는중....</span>
                </div>
            </body>
        </html>
    );
}
