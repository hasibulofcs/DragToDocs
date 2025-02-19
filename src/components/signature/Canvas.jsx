import React, { useState, useRef, useEffect } from 'react';

const SignaturePad = () => {
    const [drawing, setDrawing] = useState(false);
    const [signatureDataUrl, setSignatureDataUrl] = useState(null);
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const mousePosRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = "#222222";  // Stroke color
        ctx.lineWidth = 4;            // Line width for the signature
        ctxRef.current = ctx;

        // Prevent scrolling when touching the canvas
        const preventScroll = (e) => e.preventDefault();
        document.body.addEventListener("touchmove", preventScroll, { passive: false });

        return () => {
            document.body.removeEventListener("touchmove", preventScroll);
        };
    }, []);

    // Handle mouse events
    const handleMouseDown = (e) => {
        setDrawing(true);
        const { x, y } = getMousePos(e);
        lastPosRef.current = { x, y };
    };

    const handleMouseUp = () => {
        setDrawing(false);
    };

    const handleMouseMove = (e) => {
        if (drawing) {
            const { x, y } = getMousePos(e);
            mousePosRef.current = { x, y };
            renderCanvas();
        }
    };

    // Handle touch events
    const handleTouchStart = (e) => {
        e.preventDefault();
        setDrawing(true);
        const { x, y } = getTouchPos(e);
        lastPosRef.current = { x, y };
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        if (drawing) {
            const { x, y } = getTouchPos(e);
            mousePosRef.current = { x, y };
            renderCanvas();
        }
    };

    const handleTouchEnd = () => {
        setDrawing(false);
    };

    // Get mouse position on the canvas
    const getMousePos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    // Get touch position on the canvas
    const getTouchPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    };

    // Render the canvas drawing
    const renderCanvas = () => {
        const ctx = ctxRef.current;
        if (drawing) {
            ctx.beginPath();
            ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
            ctx.lineTo(mousePosRef.current.x, mousePosRef.current.y);
            ctx.stroke();
            lastPosRef.current = { ...mousePosRef.current };
        }
    };

    // Clear the canvas
    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureDataUrl(null);  // Clear the saved signature URL
    };

    // Submit the signature as a Data URL
    const submitSignature = () => {
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL();
        setSignatureDataUrl(dataUrl);  // Save the Data URL of the signature
    };

    return (
        <div>
            <button
                className="bg-blue-500 text-white px-4 py-2 rounded-lg"
                onClick={() => clearCanvas()}
            >
                Clear Signature
            </button>

            <canvas
                ref={canvasRef}
                width="620"
                height="160"
                className="border-2 border-dotted rounded-lg cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                Your browser does not support canvas.
            </canvas>

            <div>
                <button
                    className="bg-green-500 text-white px-4 py-2 rounded-lg"
                    onClick={submitSignature}
                >
                    Submit Signature
                </button>
            </div>

            {/* Show the saved signature */}
            {signatureDataUrl && (
                <div className="mt-4">
                    <img src={signatureDataUrl} alt="Saved signature" className="w-64 border-2 border-gray-300 rounded-lg" />
                </div>
            )}
        </div>
    );
};

export default SignaturePad;
