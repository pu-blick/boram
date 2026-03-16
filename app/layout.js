import './globals.css';
import { AuthProvider } from '../components/AuthProvider';

export const viewport = {
    themeColor: '#1a2a4a',
};

export const metadata = {
    title: 'EduFlow - 에듀플로우',
    description: '에듀플로우 - 학급 운영 서비스',
    manifest: '/manifest.json',
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
            </body>
        </html>
    );
}
