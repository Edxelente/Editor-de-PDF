import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface HeaderProps {
    page: number;
    numPages: number | null;
    scale: number;
    setPage: (p: number) => void;
    setScale: (s: number) => void;
    hasPdf: boolean;
}

export function Header({
    page,
    numPages,
    scale,
    setPage,
    setScale,
    hasPdf
}: HeaderProps) {
    if (!hasPdf) return <div className="h-16 w-full bg-white border-b border-gray-200" />;

    return (
        <div className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20 transition-all duration-200">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-lg border border-gray-200/50 shadow-sm">
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="p-1.5 hover:bg-white hover:shadow-sm rounded-md disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all text-gray-600"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm font-semibold w-20 text-center text-gray-700 font-mono">
                        {page} / {numPages || '-'}
                    </span>
                    <button
                        onClick={() => setPage(Math.min(numPages || 1, page + 1))}
                        disabled={page >= (numPages || 1)}
                        className="p-1.5 hover:bg-white hover:shadow-sm rounded-md disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all text-gray-600"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-lg border border-gray-200/50 shadow-sm">
                    <button
                        onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                        className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"
                    >
                        <ZoomOut size={18} />
                    </button>
                    <span className="text-sm font-semibold w-16 text-center text-gray-700 font-mono">{Math.round(scale * 100)}%</span>
                    <button
                        onClick={() => setScale(Math.min(3, scale + 0.1))}
                        className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"
                    >
                        <ZoomIn size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
