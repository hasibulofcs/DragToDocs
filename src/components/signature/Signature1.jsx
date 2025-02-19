import React, { useState, useRef, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Document, Page } from 'react-pdf';
import { PDFDocument, rgb } from 'pdf-lib';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

const CustomDialog = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return <div />;

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <div className="flex justify-between mb-4">
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <button onClick={onClose} className="text-gray-600 hover:text-gray-800">✖</button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};

const CustomButton = ({ children, onClick }) => (
    <button onClick={onClick} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        {children}
    </button>
);

const SignaturePad = ({ onSave, onCancel }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const startDrawing = (e) => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => setIsDrawing(false);

    const handleSave = () => {
        const signatureImage = canvasRef.current.toDataURL('image/png');
        onSave(signatureImage);
    };

    return (
        <div>
            <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="border"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
            />
            <div className="mt-4 flex justify-between">
                <CustomButton onClick={onCancel}>Cancel</CustomButton>
                <CustomButton onClick={handleSave}>Save</CustomButton>
            </div>
        </div>
    );
};

const SignatureButton = () => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'SIGNATURE',
        item: {},
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div ref={drag} className={`cursor-move p-2 border rounded ${isDragging ? 'opacity-50' : ''}`}>
            Signature
        </div>
    );
};

const Signature1 = () => {
    const [document, setDocument] = useState(null);
    const [signatureField, setSignatureField] = useState(null);
    const [signatureImage, setSignatureImage] = useState(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const pagesRef = useRef([]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = (event) => {
                setDocument(new Blob([event.target.result], { type: 'application/pdf' }));
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const [, drop] = useDrop(() => ({
        accept: 'SIGNATURE',
        drop: (item, monitor) => {
            const offset = monitor.getClientOffset();
            if (!offset) return;
            setSignatureField({ x: offset.x, y: offset.y });
            setShowSignatureModal(true);
        },
    }));

    return (
        <div className="flex">
            <div className="w-72 p-4 border-r">
                <SignatureButton />
                <input type="file" accept=".pdf" onChange={handleFileUpload} className="mt-4" />
            </div>
            <div className="flex-1 relative min-h-screen" ref={drop}>
                {document ? (
                    <Document file={document}>
                        <Page pageNumber={1} />
                        {signatureField && signatureImage && (
                            <img
                                src={signatureImage}
                                alt="Signature"
                                style={{ position: 'absolute', left: signatureField.x, top: signatureField.y }}
                            />
                        )}
                    </Document>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Upload a PDF to begin
                    </div>
                )}
            </div>
            <CustomDialog isOpen={showSignatureModal} onClose={() => setShowSignatureModal(false)} title="Draw Signature">
                <SignaturePad onSave={(img) => { setSignatureImage(img); setShowSignatureModal(false); }} onCancel={() => setShowSignatureModal(false)} />
            </CustomDialog>
        </div>
    );
};

export default Signature1;
