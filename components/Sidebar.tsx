import React from 'react';

type View = 'trainer' | 'counting' | 'payout' | 'groove' | 'hit_stand' | 'virginia_rules' | 'dealer_talk' | 'audition';

interface SidebarProps {
    currentView: View;
    setView: (view: View) => void;
    installPromptEvent: any;
    onInstallClick: () => void;
}

const ChallengeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9a9.75 9.75 0 0 1 9 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 16.5c-1.437 1.437-3.375 2.25-5.375 2.25s-3.938-.813-5.375-2.25M12 18.75v-5.25M12 13.5V6A1.5 1.5 0 0 1 13.5 4.5h3A1.5 1.5 0 0 1 18 6v1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75v1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6A1.5 1.5 0 0 0 4.5 4.5h-3A1.5 1.5 0 0 0 0 6v1.5" /></svg>);
const CountingIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.375a6 6 0 0 0 6-6c0-1.544-.57-3.04-1.62-4.22M12 18.375a6 6 0 0 1-6-6c0-1.544.57-3.04 1.62-4.22M12 18.375v-1.5M12 16.875v-1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6a2.25 2.25 0 0 0-2.25 2.25c0 1.242 1.008 2.25 2.25 2.25s2.25-1.008 2.25-2.25A2.25 2.25 0 0 0 12 6Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.375 10.5a9.75 9.75 0 0 1-6.75 0" /><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 10.5c0-1.13.6-2.148 1.5-2.687" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75A9.75 9.75 0 0 1 21.75 12c0 3.162-1.48 6.016-3.863 7.875" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75A9.75 9.75 0 0 0 2.25 12c0 3.162 1.48 6.016 3.863 7.875" /></svg>);
const ChipsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 15.347 16.556 17.25 12 17.25s-8.25-1.903-8.25-4.125V10.125m16.5 0v-3.75" /></svg>);
const GrooveIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-2.25 2.25H15a2.25 2.25 0 0 1-2.25-2.25v-3.75m2.25 3.75V9.75M9 9V4.5a2.25 2.25 0 0 1 2.25-2.25H15a2.25 2.25 0 0 1 2.25 2.25V9" /></svg>);
const HitStandIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.042L15 21a2.25 2.25 0 0 0-2.25-2.25h-1.5a2.25 2.25 0 0 0-2.25 2.25c0 .355.116.684.31.958L10.5 21.042m4.542-.001a4.5 4.5 0 1 0-9.085 0M9 3.75a3 3 0 0 0-3 3v1.5a3 3 0 0 0 3 3v-6Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 3.75a3 3 0 0 0-3 3v1.5a3 3 0 0 0 3 3v-6Z" /></svg>);
const VirginiaIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg>);
const TalkIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.006 3 11.5c0 2.457 1.483 4.633 3.75 6.075V21l3.75-1.5c.625.063 1.27.094 1.921.094Z" /></svg>);
const AuditionIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5a6 6 0 0 0-12 0v1.5a6 6 0 0 0 6 6Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14.25v4.5m0-12.75v-1.5m0 12.75a3 3 0 0 1-3-3v-1.5a3 3 0 0 1 6 0v1.5a3 3 0 0 1-3 3Z" /></svg>);
const InstallIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>);

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
    const baseClasses = "flex items-center w-full px-4 py-3 text-left text-lg rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-400";
    const activeClasses = "bg-slate-700 text-slate-100 font-semibold";
    const inactiveClasses = "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 font-medium";

    return (
        <button onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            <span className="mr-4">{icon}</span>
            <span>{label}</span>
        </button>
    );
};

const navItems: { view: View; label: string; icon: React.ReactNode }[] = [
    { view: 'trainer', label: 'Challenge Mode', icon: <ChallengeIcon /> },
    { view: 'audition', label: 'Audition', icon: <AuditionIcon /> },
    { view: 'hit_stand', label: 'Hit & Stand', icon: <HitStandIcon /> },
    { view: 'counting', label: 'Card Counting', icon: <CountingIcon /> },
    { view: 'payout', label: 'Chip Payouts', icon: <ChipsIcon /> },
    { view: 'dealer_talk', label: 'Dealer Talk', icon: <TalkIcon /> },
    { view: 'groove', label: "Be Pro Sise Groove", icon: <GrooveIcon /> },
    { view: 'virginia_rules', label: 'VA Rules', icon: <VirginiaIcon /> },
];

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, installPromptEvent, onInstallClick }) => {
    return (
        <aside className="w-72 bg-slate-800 p-4 flex-shrink-0 flex flex-col border-r-2 border-slate-700">
            <div className="mb-8 text-center">
                 <h1 className="text-2xl font-bold text-slate-200 tracking-wider">
                    Be Pro Sise Trainer
                </h1>
                <p className="text-slate-500 text-sm">Main Menu</p>
            </div>
            <nav className="flex flex-col space-y-2">
                {navItems.map(item => (
                    <NavItem
                        key={item.view}
                        icon={item.icon}
                        label={item.label}
                        isActive={currentView === item.view}
                        onClick={() => setView(item.view)}
                    />
                ))}
            </nav>
            <div className="mt-auto pt-4">
                {installPromptEvent && (
                    <button
                        onClick={onInstallClick}
                        className="flex items-center w-full px-4 py-3 text-left text-lg rounded-lg transition-colors duration-200 font-medium bg-emerald-600 hover:bg-emerald-500 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-400 animate-fade-in"
                        aria-label="Install application"
                    >
                        <InstallIcon />
                        <span className="ml-4">Install App</span>
                    </button>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
