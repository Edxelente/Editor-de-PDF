import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { pdfjs, Document, Page } from 'react-pdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ImageAnnotation } from './components/ImageAnnotation';
import { DrawingCanvas } from './components/DrawingCanvas';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import clsx from 'clsx';
import { useEffect, useCallback } from 'react';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface Annotation {
    id: string;
    text: string;
    x: number;
    y: number;
    page: number;
    color?: string;
    fontSize?: number;
    font?: string;
    bold?: boolean;
    underline?: boolean;
}

interface ImageAttachment {
    id: string;
    file: File;
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
}

interface PathAttachment {
    id: string;
    path: string;
    color: string;
    width: number;
    page: number;
}

function App() {
    const [pdfFile, setPdfFile] = useState<ArrayBuffer | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [pageDimensions, setPageDimensions] = useState<{ width: number, height: number } | null>(null);
    const [renderedPageSize, setRenderedPageSize] = useState<{ width: number, height: number } | null>(null);

    const [docState, setDocState] = useState({
        annotations: [] as Annotation[],
        images: [] as ImageAttachment[],
        paths: [] as PathAttachment[]
    });

    const [history, setHistory] = useState<{ past: typeof docState[], future: typeof docState[] }>({
        past: [],
        future: []
    });

    const [currentTool, setCurrentTool] = useState<'select' | 'text' | 'draw' | 'eraser'>('select');
    const [isSaving, setIsSaving] = useState(false);

    // Pen Settings
    const [brushColor, setBrushColor] = useState('#000000');
    const [brushWidth, setBrushWidth] = useState(3);

    // History Helpers
    const pushState = (newState: typeof docState) => {
        setHistory(prev => ({
            past: [...prev.past, docState],
            future: []
        }));
        setDocState(newState);
    };

    const undo = useCallback(() => {
        setHistory(prev => {
            if (prev.past.length === 0) return prev;
            const previous = prev.past[prev.past.length - 1];
            const newPast = prev.past.slice(0, -1);

            setDocState(previous);
            return {
                past: newPast,
                future: [docState, ...prev.future]
            };
        });
    }, [docState]);

    const redo = useCallback(() => {
        setHistory(prev => {
            if (prev.future.length === 0) return prev;
            const next = prev.future[0];
            const newFuture = prev.future.slice(1);

            setDocState(next);
            return {
                past: [...prev.past, docState],
                future: newFuture
            };
        });
    }, [docState]);

    // Keyboard shortcuts for Undo/Redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        redo();
                    } else {
                        undo();
                    }
                } else if (e.key === 'y') {
                    e.preventDefault();
                    redo();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    // Revoke Object URL when component unmounts or pdfUrl changes
    useEffect(() => {
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl]);

    // Handling upload
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const arrayBuffer = await file.arrayBuffer();
            setPdfFile(arrayBuffer);

            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
            const url = URL.createObjectURL(file);
            setPdfUrl(url);

            setNumPages(null);
            setPageNumber(1);
            setDocState({
                annotations: [],
                images: [],
                paths: []
            });
            setHistory({ past: [], future: [] });
        }
    };

    const onDocumentLoadSuccess = async ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);

        // Get first page dimensions from the actual PDF
        if (pdfFile) {
            try {
                const pdfDoc = await PDFDocument.load(pdfFile);
                const firstPage = pdfDoc.getPages()[0];
                const { width, height } = firstPage.getSize();
                setPageDimensions({ width, height });
            } catch (e) {
                console.error('Failed to get page dimensions:', e);
                // Fallback to common dimensions
                setPageDimensions({ width: 612, height: 792 }); // US Letter
            }
        }
    };

    const handleAddText = () => {
        setCurrentTool('text');
    };

    const handlePageClick = (e: React.MouseEvent) => {
        if (currentTool === 'text') {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            // Store in unscaled screen/rendered coordinates
            const x = (e.clientX - rect.left) / scale;
            const y = (e.clientY - rect.top) / scale;

            const newAnnotation: Annotation = {
                id: crypto.randomUUID(),
                text: 'Texto',
                x, // Rendered page coordinates (unscaled)
                y, // Rendered page coordinates (unscaled)
                page: pageNumber,
                color: '#000000',
                fontSize: 16,
                font: 'Helvetica'
            };
            pushState({
                ...docState,
                annotations: [...docState.annotations, newAnnotation]
            });
            setCurrentTool('select');
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const newImage: ImageAttachment = {
                id: crypto.randomUUID(),
                file,
                x: 50,
                y: 50,
                width: 200,
                height: 150, // Default size
                page: pageNumber
            };
            pushState({
                ...docState,
                images: [...docState.images, newImage]
            });
        }
    };

    const handleAddPath = (path: { path: string, color: string, width: number }) => {
        if (!pageDimensions) return;

        const newPath: PathAttachment = {
            id: crypto.randomUUID(),
            path: path.path,
            color: path.color,
            width: path.width,
            page: pageNumber
        };

        pushState({
            ...docState,
            paths: [...docState.paths, newPath]
        });
    };

    const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
        pushState({
            ...docState,
            annotations: docState.annotations.map(a => a.id === id ? { ...a, ...updates } : a)
        });
    };

    const deleteAnnotation = (id: string) => {
        pushState({
            ...docState,
            annotations: docState.annotations.filter(a => a.id !== id)
        });
    }

    const updateImage = (id: string, updates: Partial<ImageAttachment>) => {
        pushState({
            ...docState,
            images: docState.images.map(img => img.id === id ? { ...img, ...updates } : img)
        });
    };

    const deleteImage = (id: string) => {
        pushState({
            ...docState,
            images: docState.images.filter(img => img.id !== id)
        });
    };

    // const deletePath = (id: string) => {
    //     pushState({
    //         ...docState,
    //         paths: docState.paths.filter(p => p.id !== id)
    //     });
    // }

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? rgb(
                parseInt(result[1], 16) / 255,
                parseInt(result[2], 16) / 255,
                parseInt(result[3], 16) / 255
            )
            : rgb(0, 0, 0);
    };

    const handleDownload = async () => {
        if (!pdfFile) return;
        setIsSaving(true);

        try {
            // Wait a small tick to let UI update
            await new Promise(resolve => setTimeout(resolve, 100));

            const pdfDoc = await PDFDocument.load(pdfFile);
            const pages = pdfDoc.getPages();

            // Embed font
            // const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

            // Process annotations
            for (const ann of docState.annotations) {
                if (ann.page > pages.length) continue;
                const page = pages[ann.page - 1];
                const { height } = page.getSize();

                // Get the appropriate font
                let font;
                const fontBase = ann.font || 'Helvetica';
                const useBold = ann.bold;

                if (fontBase === 'Times-Roman') {
                    font = await pdfDoc.embedFont(useBold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman);
                } else if (fontBase === 'Courier') {
                    font = await pdfDoc.embedFont(useBold ? StandardFonts.CourierBold : StandardFonts.Courier);
                } else {
                    font = await pdfDoc.embedFont(useBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica);
                }

                // Convert from screen/rendered coordinates to PDF coordinates
                // Annotations are stored in rendered page space for easier preview
                if (!pageDimensions || !renderedPageSize) continue;

                const ratioX = pageDimensions.width / renderedPageSize.width;
                const ratioY = pageDimensions.height / renderedPageSize.height;

                // Convert to PDF coordinates (Y=0 at bottom)
                const pdfX = ann.x * ratioX;
                // For Y: need to flip using the RENDERED page height, not PDF height
                const renderedY = ann.y;
                const pdfY = height - (renderedY * ratioY);
                const fontSize = ann.fontSize || 16;

                // Calculate dimensions for centering
                const textWidth = font.widthOfTextAtSize(ann.text, fontSize);

                // Horizontal: Center text (subtract half width from center x)
                const drawX = pdfX - (textWidth / 2);

                // Vertical: Adjust for baseline
                // CSS centers the text box. We want the text visually centered at pdfY.
                // A good approximation for baseline offset from center is ~1/3 of fontSize for standard fonts
                // (Cap height is ~0.7em, so center is ~0.35em above baseline)
                const drawY = pdfY - (fontSize * 0.35);

                page.drawText(ann.text, {
                    x: drawX,
                    y: drawY,
                    size: fontSize,
                    color: hexToRgb(ann.color || '#000000'),
                    font: font
                });

                // Draw underline if needed
                if (ann.underline) {
                    page.drawLine({
                        start: { x: drawX, y: drawY - 2 },
                        end: { x: drawX + textWidth, y: drawY - 2 },
                        thickness: Math.max(1, fontSize / 16),
                        color: hexToRgb(ann.color || '#000000')
                    });
                }
            }

            // Process Images
            for (const img of docState.images) {
                if (img.page > pages.length) continue;
                const page = pages[img.page - 1];
                const { height: pageHeight } = page.getSize();

                // Embed image
                const imageBytes = await img.file.arrayBuffer();
                let pdfImage;
                if (img.file.type === 'image/png') {
                    pdfImage = await pdfDoc.embedPng(imageBytes);
                } else {
                    pdfImage = await pdfDoc.embedJpg(imageBytes);
                }

                // Image coordinates are in rendered page space
                page.drawImage(pdfImage, {
                    x: img.x,
                    y: pageHeight - img.y - img.height,
                    width: img.width,
                    height: img.height,
                });
            }

            // Process Paths (Drawing)
            for (const p of docState.paths) {
                if (p.page > pages.length) continue;
                const page = pages[p.page - 1];
                const { height: pageHeight } = page.getSize();

                // p.path is "M x y L x y ..."
                // Simple regex parsing for MoveTo and LineTo
                // This is a naive implementation, assuming M then many Ls
                const commands = p.path.split(' ');
                let currentX = 0;
                let currentY = 0;

                for (let i = 0; i < commands.length; i++) {
                    const cmd = commands[i];
                    if (cmd === 'M') {
                        const x = parseFloat(commands[i + 1]);
                        const y = parseFloat(commands[i + 2]);
                        currentX = x;
                        currentY = pageHeight - y;
                        i += 2;
                    } else if (cmd === 'L') {
                        const x = parseFloat(commands[i + 1]);
                        const y = parseFloat(commands[i + 2]);
                        const pdfX = x;
                        const pdfY = pageHeight - y;

                        page.drawLine({
                            start: { x: currentX, y: currentY },
                            end: { x: pdfX, y: pdfY },
                            thickness: (p.width || 2),
                            color: hexToRgb(p.color || '#000000'),
                            opacity: 1,
                        });

                        currentX = pdfX;
                        currentY = pdfY;
                        i += 2;
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            // Try to use File System Access API for save dialog
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await (window as any).showSaveFilePicker({
                        suggestedName: 'documento.pdf',
                        types: [{
                            description: 'PDF Files',
                            accept: { 'application/pdf': ['.pdf'] }
                        }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                } catch (err: any) {
                    if (err.name !== 'AbortError') {
                        console.error('Save failed:', err);
                        // Fallback to download
                        downloadFallback(blob);
                    }
                }
            } else {
                // Fallback: prompt for filename
                const filename = prompt('Nombre del archivo:', 'documento.pdf') || 'documento.pdf';
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename.endsWith('.pdf') ? filename : filename + '.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }

        } catch (e: any) {
            console.error(e);
            alert(`Failed to save PDF: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const downloadFallback = (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'documento.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-screen w-screen bg-gray-50 flex font-sans overflow-hidden">
            <Sidebar
                onUpload={handleUpload}
                onAddText={handleAddText}
                onAddImage={handleImageUpload}
                onToggleDraw={() => setCurrentTool(currentTool === 'draw' ? 'select' : 'draw')}
                onToggleEraser={() => setCurrentTool('eraser')}
                onDownload={handleDownload}
                onUndo={undo}
                onRedo={redo}
                hasPdf={!!pdfFile}
                isSaving={isSaving}
                currentTool={currentTool}
                canUndo={history.past.length > 0}
                canRedo={history.future.length > 0}
                brushColor={brushColor}
                setBrushColor={setBrushColor}
                setBrushWidth={setBrushWidth}
                brushWidth={brushWidth}
            />

            <div className="flex-1 flex flex-col min-w-0 h-full">
                <Header
                    page={pageNumber}
                    numPages={numPages}
                    scale={scale}
                    setPage={setPageNumber}
                    setScale={setScale}
                    hasPdf={!!pdfFile}
                />

                <main className="flex-1 overflow-auto bg-gray-100/50 p-8 flex justify-center relative scrollbar-thin">
                    {!pdfFile ? (
                        <div className="flex flex-col items-center justify-center text-gray-400 h-full pb-20 animate-in fade-in zoom-in duration-500">
                            <div className="bg-white p-16 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center text-center max-w-lg">
                                <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mb-6">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-3">No hay documento cargado</h2>
                                <p className="text-gray-500 mb-8 leading-relaxed">
                                    Sube un documento PDF desde la barra lateral para comenzar a editar, anotar y gestionar tus archivos profesionalmente.
                                </p>
                                <label className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:scale-105 transition-all cursor-pointer">
                                    Explorar Archivos
                                    <input type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div
                            className={clsx(
                                "relative shadow-2xl rounded-sm transition-all duration-300",
                                currentTool === 'text' && "cursor-text",
                                currentTool === 'eraser' && "cursor-cell"
                            )}
                            style={{ width: 'fit-content', height: 'fit-content' }}
                            onClick={handlePageClick}
                        >
                            <Document
                                file={pdfUrl}
                                onLoadSuccess={onDocumentLoadSuccess}
                                loading={
                                    <div className="flex items-center gap-3 p-6 bg-white rounded-xl shadow-lg">
                                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                        <span className="font-medium text-gray-600">Cargando documento...</span>
                                    </div>
                                }
                                error={
                                    <div className="flex items-center gap-3 p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">
                                        <span className="font-medium">Error al cargar PDF</span>
                                    </div>
                                }
                                className="border border-gray-200/50"
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    scale={scale}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    onLoadSuccess={(page) => {
                                        const { width, height } = page;
                                        setRenderedPageSize({ width, height });
                                    }}
                                    className="bg-white"
                                />
                            </Document>

                            {/* Overlay Layers */}
                            <div
                                className="absolute inset-0 overflow-hidden z-20"
                                style={{ pointerEvents: 'none' }}
                            >
                                {docState.images.filter(img => img.page === pageNumber).map(img => (
                                    <div
                                        key={img.id}
                                        className={clsx("pointer-events-auto", currentTool === 'eraser' && "cursor-cell hover:opacity-80")}
                                        onClick={(e) => {
                                            if (currentTool === 'eraser') {
                                                e.stopPropagation();
                                                deleteImage(img.id);
                                            }
                                        }}
                                    >
                                        <ImageAnnotation
                                            {...img}
                                            scale={scale}
                                            onUpdate={updateImage}
                                            onDelete={deleteImage}
                                            readOnly={currentTool === 'eraser'}
                                        />
                                    </div>
                                ))}

                                {docState.annotations.filter(a => a.page === pageNumber).map(ann => (
                                    <DraggableAnnotation
                                        key={ann.id}
                                        annotation={ann}
                                        scale={scale}
                                        onUpdate={updateAnnotation}
                                        onDelete={deleteAnnotation}
                                        isEraserActive={currentTool === 'eraser'}
                                    />
                                ))}
                            </div>

                            {/* Render existing paths always (ON TOP of annotations to allow whiteout) */}
                            {pageDimensions && (
                                <div className="absolute inset-0 pointer-events-none z-30">
                                    <DrawingCanvas
                                        width={pageDimensions.width}
                                        height={pageDimensions.height}
                                        scale={scale}
                                        paths={docState.paths}
                                        isDrawing={false}
                                        isEraser={currentTool === 'eraser'}
                                        onAddPath={() => { }}
                                        page={pageNumber}
                                    />
                                </div>
                            )}

                            {/* Canvas for Drawing (Active) */}
                            {(currentTool === 'draw' || currentTool === 'eraser') && pageDimensions && (
                                <div className="absolute inset-0 z-40 cursor-crosshair">
                                    <DrawingCanvas
                                        width={pageDimensions.width}
                                        height={pageDimensions.height}
                                        scale={scale}
                                        paths={docState.paths}
                                        isDrawing={currentTool === 'draw' || currentTool === 'eraser'}
                                        isEraser={currentTool === 'eraser'}
                                        onAddPath={handleAddPath}
                                        page={pageNumber}
                                        currentColor={currentTool === 'eraser' ? '#FFFFFF' : brushColor}
                                        currentWidth={brushWidth}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

// Helper component for clearer code
function DraggableAnnotation({ annotation, scale, onUpdate, onDelete, isEraserActive }: {
    annotation: Annotation,
    scale: number,
    onUpdate: (id: string, update: Partial<Annotation>) => void,
    onDelete: (id: string) => void,
    isEraserActive: boolean
}) {
    const handleDragStart = (e: React.MouseEvent) => {
        if (isEraserActive) return; // Disable drag if eraser
        // Prevent drag when interacting with controls
        if ((e.target as HTMLElement).closest('.controls')) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = annotation.x;
        const startTop = annotation.y;

        const handleMouseMove = (me: MouseEvent) => {
            onUpdate(annotation.id, {
                x: startLeft + (me.clientX - startX) / scale,
                y: startTop + (me.clientY - startY) / scale
            });
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div
            className={clsx(
                "absolute pointer-events-auto group",
                isEraserActive ? "cursor-cell hover:bg-red-500/20 rounded" : ""
            )}
            style={{
                left: annotation.x * scale,
                top: annotation.y * scale,
                transform: 'translate(-50%, -50%)', // Center on coordinate
            }}
            onMouseDown={handleDragStart}
            onClick={(e) => {
                if (isEraserActive) {
                    e.stopPropagation();
                    onDelete(annotation.id);
                }
            }}
        >
            <textarea
                readOnly={isEraserActive}
                value={annotation.text}
                onChange={(e) => onUpdate(annotation.id, { text: e.target.value })}
                className={clsx(
                    "bg-transparent border border-transparent resize-none overflow-hidden outline-none",
                    !isEraserActive && "group-hover:border-blue-400 group-hover:bg-blue-50/20",
                    "rounded text-center font-sans",
                    !isEraserActive && "focus:border-blue-500 focus:bg-white/80"
                )}
                style={{
                    fontSize: `${(annotation.fontSize || 16) * scale}px`,
                    color: annotation.color || '#000000',
                    fontFamily: annotation.font || 'Helvetica',
                    fontWeight: annotation.bold ? 'bold' : 'normal',
                    textDecoration: annotation.underline ? 'underline' : 'none',
                    minWidth: `${100 * scale}px`,
                    width: `${Math.max(100, annotation.text.length * (annotation.fontSize || 16) * 0.6) * scale}px`,
                    height: `${(annotation.fontSize || 16) * 1.5 * scale}px`,
                    lineHeight: 1
                }}
            />

            {/* Controls */}
            {!isEraserActive && (
                <div className="controls absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1 bg-white shadow-md rounded-lg p-1 border border-gray-200 z-50">
                    <select
                        value={annotation.font || 'Helvetica'}
                        onChange={(e) => onUpdate(annotation.id, { font: e.target.value })}
                        className="text-xs border border-gray-300 rounded px-1 h-6"
                    >
                        <option value="Helvetica">Helvetica</option>
                        <option value="Arial">Arial</option>
                        <option value="Times-Roman">Times</option>
                        <option value="Courier">Courier</option>
                    </select>
                    <button
                        onClick={() => onUpdate(annotation.id, { bold: !annotation.bold })}
                        className={clsx(
                            "px-2 h-6 text-xs border border-gray-300 rounded font-bold",
                            annotation.bold ? "bg-blue-500 text-white" : "bg-white"
                        )}
                        title="Negrita"
                    >
                        B
                    </button>
                    <button
                        onClick={() => onUpdate(annotation.id, { underline: !annotation.underline })}
                        className={clsx(
                            "px-2 h-6 text-xs border border-gray-300 rounded underline",
                            annotation.underline ? "bg-blue-500 text-white" : "bg-white"
                        )}
                        title="Subrayado"
                    >
                        U
                    </button>
                    <input
                        type="color"
                        value={annotation.color || '#000000'}
                        onChange={(e) => onUpdate(annotation.id, { color: e.target.value })}
                        className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                    />
                    <input
                        type="number"
                        value={annotation.fontSize || 16}
                        onChange={(e) => onUpdate(annotation.id, { fontSize: parseInt(e.target.value) })}
                        className="w-12 h-6 text-xs border border-gray-300 rounded px-1"
                        min="8"
                        max="72"
                    />
                    <button
                        onClick={() => onDelete(annotation.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        title="Eliminar"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}

            {/* Drag Handle */}
            {!isEraserActive && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 w-8 h-1 rounded-full opacity-0 group-hover:opacity-100 cursor-move transition-opacity" />
            )}
        </div>
    );
}

export default App;
