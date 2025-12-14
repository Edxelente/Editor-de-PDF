import { useRef } from 'react';
import clsx from 'clsx';

interface DrawingCanvasProps {
    width: number;
    height: number;
    scale: number;
    paths: Array<{ id: string, path: string, color: string, width: number, page: number }>;
    isDrawing: boolean;
    isEraser?: boolean;
    onAddPath: (path: { path: string, color: string, width: number }) => void;
    onDeletePath?: (id: string) => void;
    page: number;
    currentColor?: string;
    currentWidth?: number;
}

export function DrawingCanvas({
    width,
    height,
    scale,
    paths,
    isDrawing,
    isEraser,
    onAddPath,
    onDeletePath,
    page,
    currentColor = '#000000',
    currentWidth = 2
}: DrawingCanvasProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const currentPathRef = useRef<string>('');
    const currentPointsRef = useRef<number[]>([]);

    // Temporary path rendering
    const tempPathRef = useRef<SVGPathElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isDrawing) return;

        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        currentPointsRef.current = [x, y];
        currentPathRef.current = `M ${x} ${y}`;

        if (tempPathRef.current) {
            tempPathRef.current.setAttribute('d', currentPathRef.current);
            tempPathRef.current.style.display = 'block';
        }

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const mx = (moveEvent.clientX - rect.left) / scale;
            const my = (moveEvent.clientY - rect.top) / scale;

            currentPointsRef.current.push(mx, my);
            currentPathRef.current += ` L ${mx} ${my}`; // Simple line connection

            if (tempPathRef.current) {
                tempPathRef.current.setAttribute('d', currentPathRef.current);
            }
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);

            if (currentPathRef.current) {
                onAddPath({
                    path: currentPathRef.current,
                    color: currentColor,
                    width: currentWidth
                });
            }

            if (tempPathRef.current) {
                tempPathRef.current.style.display = 'none';
                tempPathRef.current.setAttribute('d', '');
            }
            currentPointsRef.current = [];
            currentPathRef.current = '';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <svg
            ref={svgRef}
            width={width * scale}
            height={height * scale}
            className={clsx(
                "absolute inset-0 pointer-events-auto",
                isEraser && "cursor-cell" // Eraser cursor
            )}
            style={{
                pointerEvents: isDrawing || isEraser ? 'auto' : 'none', // Allow events for eraser too
                zIndex: isDrawing || isEraser ? 50 : 0
            }}
            onMouseDown={handleMouseDown}
        >
            {paths.filter(p => p.page === page).map(p => (
                <path
                    key={p.id}
                    d={p.path}
                    stroke={p.color}
                    strokeWidth={p.width * scale} // Scale stroke width visually
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    transform={`scale(${scale})`} // SVG transform to handle scaling
                    className={clsx(isEraser && "element-hover-highlight cursor-pointer")} // Highlight on hover?
                    onClick={() => {
                        if (isEraser && onDeletePath) {
                            onDeletePath(p.id);
                        }
                    }}
                    style={{ pointerEvents: isEraser ? 'stroke' : 'none' }} // Only capture clicks on the stroke
                />
            ))}

            {/* Current drawing path */}
            <path
                ref={tempPathRef}
                stroke={currentColor}
                strokeWidth={currentWidth * scale}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                transform={`scale(${scale})`}
                style={{ display: 'none' }}
            />
        </svg>
    );
}
