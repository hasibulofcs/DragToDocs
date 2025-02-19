import React, { useState, useRef, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Document, Page } from 'react-pdf';
import { PDFDocument, rgb } from 'pdf-lib';
import { pdfjs } from 'react-pdf';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

const SignaturePad = ({ onSave, onCancel }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [context, setContext] = useState(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        setContext(ctx);

        // Set white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const startDrawing = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        context.beginPath();
        context.moveTo(
            e.clientX - rect.left,
            e.clientY - rect.top
        );
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const rect = canvasRef.current.getBoundingClientRect();
        context.lineTo(
            e.clientX - rect.left,
            e.clientY - rect.top
        );
        context.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const handleSave = () => {
        const signatureImage = canvasRef.current.toDataURL('image/png');
        onSave(signatureImage);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    return (
        <div className="p-4">
            <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="border border-gray-300 rounded cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
            />
            <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={handleClear}>
                    Clear
                </Button>
                <div className="space-x-2">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
};

const SignatureButton = () => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'SIGNATURE',
        item: { type: 'SIGNATURE' },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div
            ref={drag}
            className={`cursor-move bg-white border border-gray-200 rounded px-3 py-2 text-sm ${isDragging ? 'opacity-50' : ''}`}
        >
            Signature
        </div>
    );
};

const DocumentSigner = () => {
    const [document, setDocument] = useState(null);
    const [signatureField, setSignatureField] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [signatureImage, setSignatureImage] = useState(null);
    const [dropPosition, setDropPosition] = useState(null);
    const pagesRef = useRef([]);

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = (event) => {
                const blob = new Blob([event.target.result], { type: 'application/pdf' });
                setDocument(blob);
                setSignatureField(null);
                setSignatureImage(null);
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const [, drop] = useDrop(() => ({
        accept: 'SIGNATURE',
        drop: (item, monitor) => {
            const offset = monitor.getClientOffset();

            if (!offset) return;

            const { pageNumber, pageTop } = pagesRef.current.reduce((result, page, index) => {
                if (!page) return result;
                const rect = page.getBoundingClientRect();
                if (offset.y >= rect.top && offset.y <= rect.bottom) {
                    return {
                        pageNumber: index + 1,
                        pageTop: rect.top,
                        pageLeft: rect.left
                    };
                }
                return result;
            }, { pageNumber: null, pageTop: 0, pageLeft: 0 });

            if (pageNumber) {
                const exactX = offset.x - pagesRef.current[pageNumber - 1].getBoundingClientRect().left;
                const exactY = offset.y - pageTop;

                setDropPosition({ pageNumber, x: exactX, y: exactY });
                setShowSignatureModal(true);
            }
        },
    }), [numPages]);

    const handleSaveSignature = (signatureImg) => {
        setSignatureImage(signatureImg);
        setSignatureField(dropPosition);
        setShowSignatureModal(false);
    };

    const exportDocument = async () => {
        if (!document || !signatureField || !signatureImage) return;

        try {
            const pdfBytes = await document.arrayBuffer();
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();

            if (signatureField.pageNumber <= pages.length) {
                const page = pages[signatureField.pageNumber - 1];
                const { x, y } = signatureField;

                // Draw signature image
                const img = await pdfDoc.embedPng(signatureImage);
                const imgDims = img.scale(0.5); // Scale the signature to fit

                page.drawImage(img, {
                    x: x,
                    y: page.getHeight() - y - imgDims.height,
                    width: imgDims.width,
                    height: imgDims.height,
                });

                // Add date
                const currentDate = formatDate(new Date());
                page.drawText(currentDate, {
                    x: x + imgDims.width - 70,
                    y: page.getHeight() - y - imgDims.height - 20,
                    size: 10,
                    color: rgb(0, 0, 0),
                });
            }

            const modifiedPdfBytes = await pdfDoc.save();
            const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'signed-document.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error exporting document:', error);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="flex relative">
                <div className="w-72 p-6 border-r border-gray-200 sticky top-0 h-screen">
                    <div className="space-y-6">
                        <h3 className="font-medium mb-4">You Prosper Capital</h3>
                        <SignatureButton />
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                        />
                        {document && (
                            <button
                                onClick={exportDocument}
                                disabled={!signatureField || !signatureImage}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                Export Document
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 relative min-h-screen bg-gray-50">
                    <div ref={drop}>
                        <div className="relative w-full h-full">
                            {document ? (
                                <Document
                                    file={document}
                                    onLoadSuccess={({ numPages }) => {
                                        setNumPages(numPages);
                                        pagesRef.current = new Array(numPages).fill(null);
                                    }}
                                >
                                    {Array.from(new Array(numPages), (el, index) => (
                                        <div
                                            key={index}
                                            className="relative"
                                            ref={el => pagesRef.current[index] = el}
                                        >
                                            <Page pageNumber={index + 1} />
                                            {signatureField &&
                                                signatureField.pageNumber === index + 1 &&
                                                signatureImage && (
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            left: `${signatureField.x}px`,
                                                            top: `${signatureField.y}px`,
                                                        }}
                                                    >
                                                        <img
                                                            src={signatureImage}
                                                            alt="Signature"
                                                            style={{ maxWidth: '200px' }}
                                                        />
                                                        <div className="text-xs text-gray-600 mt-1 text-right">
                                                            {formatDate(new Date())}
                                                        </div>
                                                    </div>
                                                )}
                                        </div>
                                    ))}
                                </Document>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    Upload a document to begin
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={showSignatureModal} onOpenChange={setShowSignatureModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Your signature</DialogTitle>
                    </DialogHeader>
                    <SignaturePad
                        onSave={handleSaveSignature}
                        onCancel={() => setShowSignatureModal(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DocumentSigner;