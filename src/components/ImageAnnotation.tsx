import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

interface ImageAnnotationProps {
    id: string;
    file: File;
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
    scale: number;
    onUpdate: (id: string, updates: any) => void;
    onDelete: (id: string) => void;
    readOnly?: boolean;
}

export function ImageAnnotation({
    id,
    file,
    x,
    y,
    width,
    height,
    scale,
    onUpdate,
    onDelete,
    readOnly
}: ImageAnnotationProps) {
    const [imageUrl, setImageUrl] = useState<string>('');
    const [isDragging, setIsDragging] = useState(false);
    // const [isResizing, setIsResizing] = useState(false); // Unused state

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setImageUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (readOnly) return;
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = x;
        const startTop = y;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = (moveEvent.clientX - startX) / scale;
            const dy = (moveEvent.clientY - startY) / scale;
            onUpdate(id, { x: startLeft + dx, y: startTop + dy });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        setIsDragging(true);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = width;
        const startHeight = height;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = (moveEvent.clientX - startX) / scale;
            const dy = (moveEvent.clientY - startY) / scale;

            // Maintain aspect ratio if needed, for now free resize but simple
            onUpdate(id, {
                width: Math.max(20, startWidth + dx),
                height: Math.max(20, startHeight + dy)
            });
        };

        const handleMouseUp = () => {
            // setIsResizing(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        // setIsResizing(true);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div
            className={clsx(
                "absolute group",
                !readOnly && (isDragging ? "cursor-grabbing" : "cursor-grab"),
                !readOnly && "hover:outline hover:outline-2 hover:outline-blue-400"
            )}
            style={{
                left: x * scale,
                top: y * scale,
                width: width * scale,
                height: height * scale,
            }}
            onMouseDown={handleMouseDown}
        >
            <img
                src={imageUrl}
                alt="annotation"
                className="w-full h-full object-contain pointer-events-none select-none"
            />

            {/* Controls */}
            {!readOnly && (
                <div className="absolute -top-3 -right-3 hidden group-hover:flex gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                        className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}

            {/* Resize Handle */}
            {!readOnly && (
                <div
                    className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-nwse-resize opacity-0 group-hover:opacity-100 rounded-tl pointer-events-auto"
                    onMouseDown={handleResizeStart}
                />
            )}
        </div>
    );
}
