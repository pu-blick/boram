import './globals.css';
import { AuthProvider } from '../components/AuthProvider';

export const metadata = {
    title: 'BORAM - 보람고등학교 2학년부',
    description: '보람고등학교 2학년부 홈페이지',
};

export default function RootLayout({ children }) {
    return (
        <html lang="ko">
            <body>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
