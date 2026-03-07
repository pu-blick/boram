import './globals.css';
import { AuthProvider } from '../components/AuthProvider';

export const metadata = {
    title: 'BORAM - 보람고등학교 2학년부',
    description: '보람고등학교 2학년부 홈페이지',
    manifest: '/manifest.json',
    themeColor: '#1a2a4a',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: '보람고',
    },
    icons: {
        apple: '/icon.jpeg',
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
            </head>
            <body>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
