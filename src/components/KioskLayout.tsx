import React from 'react';

interface KioskLayoutProps {
    children: React.ReactNode;
    cart: React.ReactNode;
}

export default function KioskLayout({ children, cart }: KioskLayoutProps) {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {children}
            </main>
            <aside className="w-[30%] min-w-[350px] max-w-[450px] h-full z-10">
                {cart}
            </aside>
        </div>
    );
}
