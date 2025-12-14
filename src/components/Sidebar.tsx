import { Upload, Type, Download, FileText, Image as ImageIcon, PenTool, Eraser, Undo, Redo } from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAddText: () => void;
    onAddImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onToggleDraw: () => void;
    onToggleEraser: () => void;
    onDownload: () => void;
    onUndo: () => void;
    onRedo: () => void;
    hasPdf: boolean;
    isSaving: boolean;
    currentTool: 'select' | 'text' | 'draw' | 'eraser';
    canUndo: boolean;
    canRedo: boolean;
    brushColor: string;
    setBrushColor: (color: string) => void;
    brushWidth: number;
    setBrushWidth: (width: number) => void;
}

export function Sidebar({
    onUpload,
    onAddText,
    onAddImage,
    onToggleDraw,
    onToggleEraser,
    onDownload,
    onUndo,
    onRedo,
    hasPdf,
    isSaving,
    currentTool,
    canUndo,
    canRedo,
    brushColor,
    setBrushColor,
    brushWidth,
    setBrushWidth
}: SidebarProps) {
    return (
        <div className="w-20 lg:w-64 bg-slate-900 text-white flex flex-col items-center lg:items-stretch py-6 shrink-0 z-30 transition-all duration-300 shadow-xl">
            <div className="px-0 lg:px-6 mb-8 flex items-center justify-center lg:justify-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <FileText className="text-white fill-white/10" size={24} />
                </div>
                <span className="text-xl font-bold tracking-tight hidden lg:block text-slate-100">Editor PDF</span>
            </div>

            <div className="flex-1 flex flex-col w-full px-3 gap-2">
                <label className="group flex items-center gap-3 px-3 lg:px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer transition-all shadow-lg shadow-blue-900/20 active:scale-95">
                    <Upload size={20} className="shrink-0 transition-transform group-hover:-translate-y-0.5" />
                    <span className="font-semibold hidden lg:block">Subir PDF</span>
                    <input type="file" accept="application/pdf" onChange={onUpload} className="hidden" />
                </label>

                {hasPdf && (
                    <>
                        <div className="h-px bg-slate-700/50 my-2 mx-2" />

                        <div className="flex gap-2 px-1">
                            <button
                                onClick={onUndo}
                                disabled={!canUndo}
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-300 hover:text-white"
                                title="Deshacer (Ctrl+Z)"
                            >
                                <Undo size={18} />
                                <span className="text-xs font-semibold hidden lg:block">Deshacer</span>
                            </button>
                            <button
                                onClick={onRedo}
                                disabled={!canRedo}
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-slate-300 hover:text-white"
                                title="Rehacer (Ctrl+Y)"
                            >
                                <Redo size={18} />
                            </button>
                        </div>

                        <div className="h-px bg-slate-700/50 my-2 mx-2" />

                        <button
                            onClick={onAddText}
                            className={clsx(
                                "group flex items-center gap-3 px-3 lg:px-4 py-3 rounded-xl transition-all",
                                currentTool === 'text' ? "bg-slate-800 text-white" : "text-slate-300 hover:text-white hover:bg-slate-800"
                            )}
                        >
                            <Type size={20} className="shrink-0 group-hover:text-blue-400" />
                            <span className="font-medium hidden lg:block">Agregar Texto</span>
                        </button>

                        <label className={clsx(
                            "group flex items-center gap-3 px-3 lg:px-4 py-3 rounded-xl transition-all cursor-pointer",
                            currentTool === 'select' ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-slate-300 hover:text-white hover:bg-slate-800"
                        )}>
                            <ImageIcon size={20} className="shrink-0 group-hover:text-purple-400" />
                            <span className="font-medium hidden lg:block">Insertar Imagen</span>
                            <input type="file" accept="image/*" onChange={onAddImage} className="hidden" />
                        </label>

                        <button
                            onClick={onToggleDraw}
                            className={clsx(
                                "group flex items-center gap-3 px-3 lg:px-4 py-3 rounded-xl transition-all",
                                currentTool === 'draw' ? "bg-slate-800 text-white shadow-inner shadow-black/20" : "text-slate-300 hover:text-white hover:bg-slate-800"
                            )}
                        >
                            <PenTool size={20} className="shrink-0 group-hover:text-emerald-400" />
                            <span className="font-medium hidden lg:block">Dibujar / Firmar</span>
                        </button>

                        {/* Drawing / Eraser Controls */}
                        {(currentTool === 'draw' || currentTool === 'eraser') && (
                            <div className="px-3 py-2 bg-slate-800/50 rounded-lg mx-2 flex flex-col gap-2">
                                {currentTool === 'draw' && (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-slate-400">Color</span>
                                        <input
                                            type="color"
                                            value={brushColor}
                                            onChange={(e) => setBrushColor(e.target.value)}
                                            className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                                        />
                                    </div>
                                )}
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-slate-400 flex justify-between">
                                        Grosor <span>{brushWidth}px</span>
                                    </span>
                                    <input
                                        type="range"
                                        min="1"
                                        max="50"
                                        value={brushWidth}
                                        onChange={(e) => setBrushWidth(Number(e.target.value))}
                                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={onToggleEraser}
                            className={clsx(
                                "group flex items-center gap-3 px-3 lg:px-4 py-3 rounded-xl transition-all",
                                currentTool === 'eraser' ? "bg-slate-800 text-white shadow-inner shadow-black/20" : "text-slate-300 hover:text-white hover:bg-slate-800"
                            )}
                        >
                            <Eraser size={20} className="shrink-0 group-hover:text-red-400" />
                            <span className="font-medium hidden lg:block">Borrador</span>
                        </button>
                    </>
                )}
            </div>

            {hasPdf && (
                <div className="px-3 pt-4 border-t border-slate-700/50">
                    <button
                        onClick={onDownload}
                        disabled={isSaving}
                        className={clsx(
                            "w-full flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 py-3.5 rounded-xl transition-all shadow-lg",
                            "font-semibold tracking-wide",
                            isSaving
                                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                                : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-900/20 hover:shadow-emerald-900/30 active:scale-95"
                        )}
                    >
                        {isSaving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                <span className="hidden lg:block">Guardando...</span>
                            </>
                        ) : (
                            <>
                                <Download size={20} className="shrink-0" />
                                <span className="hidden lg:block">Descargar</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

