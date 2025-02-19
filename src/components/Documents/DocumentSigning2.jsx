import React, { useState, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Document, Page } from 'react-pdf';
import { PDFDocument, rgb } from 'pdf-lib';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

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

const DocumentSigner2 = () => {
    const [document, setDocument] = useState(null);
    const [signatureField, setSignatureField] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const documentRef = useRef(null);
    const pagesRef = useRef([]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = (event) => {
                const blob = new Blob([event.target.result], { type: 'application/pdf' });
                setDocument(blob);
                setSignatureField(null);
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert('Please upload a valid PDF file.');
        }
    };

    const [, drop] = useDrop(() => ({
        accept: 'SIGNATURE',
        drop: (item, monitor) => {
            const offset = monitor.getClientOffset();

            if (!offset) return;

            // Find which page was dropped on and its position
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
                // Calculate position relative to the page
                const exactX = offset.x - pagesRef.current[pageNumber - 1].getBoundingClientRect().left - 100;
                const exactY = offset.y - pageTop - 20;

                setSignatureField({
                    pageNumber,
                    x: exactX,
                    y: exactY
                });
            }
        },
    }), [numPages]);

    const exportDocument = async () => {
        if (!document || !signatureField) return;

        try {
            const pdfBytes = await document.arrayBuffer();
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();

            if (signatureField.pageNumber <= pages.length) {
                const page = pages[signatureField.pageNumber - 1];
                const { x, y } = signatureField;
                const width = 200;
                const height = 40;

                // Convert coordinates to PDF coordinate system
                const pdfY = page.getHeight() - y;

                // Draw dashed border
                const dashLength = 4;
                const gapLength = 2;

                // Draw dashed border
                for (let i = 0; i < width; i += dashLength + gapLength) {
                    // Top and bottom edges
                    page.drawLine({
                        start: { x: x + i, y: pdfY },
                        end: { x: Math.min(x + i + dashLength, x + width), y: pdfY },
                        color: rgb(0, 0, 0),
                        thickness: 1,
                    });
                    page.drawLine({
                        start: { x: x + i, y: pdfY - height },
                        end: { x: Math.min(x + i + dashLength, x + width), y: pdfY - height },
                        color: rgb(0, 0, 0),
                        thickness: 1,
                    });
                }

                for (let i = 0; i < height; i += dashLength + gapLength) {
                    // Left and right edges
                    page.drawLine({
                        start: { x: x, y: pdfY - i },
                        end: { x: x, y: pdfY - Math.min(i + dashLength, height) },
                        color: rgb(0, 0, 0),
                        thickness: 1,
                    });
                    page.drawLine({
                        start: { x: x + width, y: pdfY - i },
                        end: { x: x + width, y: pdfY - Math.min(i + dashLength, height) },
                        color: rgb(0, 0, 0),
                        thickness: 1,
                    });
                }

                // Add signature text
                page.drawText('Signature here', {
                    x: x + 60,
                    y: pdfY - 25,
                    size: 12,
                    color: rgb(0, 0, 0),
                });
            }

            const modifiedPdfBytes = await pdfDoc.save();
            const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
            const link = window.document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'signed-document.pdf';
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);
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
                                disabled={!signatureField}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                Export Document
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 relative min-h-screen bg-gray-50">
                    <div ref={drop}>
                        <div ref={documentRef} className="relative w-full h-full">
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
                                            {signatureField && signatureField.pageNumber === index + 1 && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${signatureField.x}px`,
                                                        top: `${signatureField.y}px`,
                                                        width: '200px',
                                                        height: '40px',
                                                    }}
                                                    className="border-2 border-dashed border-black rounded p-2 bg-white/50"
                                                >
                                                    <span className="block text-gray-500 text-sm text-center">
                                                        Signature here
                                                    </span>
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
        </div>
    );
};

export default DocumentSigner2;