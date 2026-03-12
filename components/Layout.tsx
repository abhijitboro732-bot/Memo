import Navbar from './Navbar';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-[100dvh] bg-gradient-to-r from-sky-200 via-white to-pink-200 pb-[72px] md:pb-0 md:pt-16 overflow-hidden">
            <Navbar />
            <main className="w-full h-full min-h-[calc(100dvh-72px)] md:min-h-[calc(100vh-64px)] relative">
                {children}
            </main>
        </div>
    );
}
