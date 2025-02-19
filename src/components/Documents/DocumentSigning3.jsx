import React, { useState, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Document, Page } from 'react-pdf';
import { PDFDocument, rgb } from 'pdf-lib';
import { pdfjs } from 'react-pdf';
import { Resizable } from 're-resizable';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

const DroppedSignature = ({ field, onResize, onRemove }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'DROPPED_SIGNATURE',
        item: { id: field.id, type: 'DROPPED_SIGNATURE', ...field },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div
            ref={drag} // Make the outer div draggable
            style={{
                position: 'absolute',
                left: `${field.x}px`,
                top: `${field.y}px`,
                opacity: isDragging ? 0.5 : 1,
                cursor: 'move',
                zIndex: 10
            }}
        >
            <Resizable
                size={{ width: field.width, height: field.height }}
                minWidth={100}
                minHeight={40}
                maxWidth={400}
                maxHeight={200}
                onResizeStop={(e, direction, ref, d) => {
                    onResize(field.id, {
                        width: field.width + d.width,
                        height: field.height + d.height
                    });
                }}
                enable={{
                    top: false,
                    right: true,
                    bottom: true,
                    left: false,
                    topRight: false,
                    bottomRight: true,
                    bottomLeft: false,
                    topLeft: false
                }}
            >
                <div
                    className="w-full h-full border-2 border-dashed border-black/60 rounded p-2 bg-white/50 relative group cursor-pointer"
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(field.id);
                        }}
                        className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        ×
                    </button>
                </div>
            </Resizable>
        </div>
    );
};


const SignatureButton = () => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'NEW_SIGNATURE',
        item: { type: 'NEW_SIGNATURE' },
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
    const [signatureFields, setSignatureFields] = useState([]);
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
                setSignatureFields([]);
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert('Please upload a valid PDF file.');
        }
    };

    const handleResize = (id, size) => {
        setSignatureFields(fields =>
            fields.map(field =>
                field.id === id
                    ? { ...field, width: size.width, height: size.height }
                    : field
            )
        );
    };

    const handleRemove = (id) => {
        setSignatureFields(fields => fields.filter(field => field.id !== id));
    };

    const [, drop] = useDrop(() => ({
        accept: ['NEW_SIGNATURE', 'DROPPED_SIGNATURE'],
        drop: (item, monitor) => {
            const offset = monitor.getClientOffset();
            if (!offset) return;

            const { pageNumber, pageTop, pageLeft } = pagesRef.current.reduce((result, page, index) => {
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
                const exactX = offset.x - pageLeft;
                const exactY = offset.y - pageTop;

                if (item.type === 'DROPPED_SIGNATURE') {
                    // Update existing signature position
                    setSignatureFields(fields =>
                        fields.map(field =>
                            field.id === item.id
                                ? { ...field, x: exactX, y: exactY, pageNumber }
                                : field
                        )
                    );
                } else {
                    // Add new signature
                    setSignatureFields(fields => [...fields, {
                        id: Date.now(),
                        pageNumber,
                        x: exactX,
                        y: exactY,
                        width: 220,
                        height: 40
                    }]);
                }
            }
        },
    }), [numPages]);

    const exportDocument = async () => {
        if (!document || signatureFields.length === 0) return;

        try {
            const pdfBytes = await document.arrayBuffer();
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();

            for (const field of signatureFields) {
                if (field.pageNumber <= pages.length) {
                    const page = pages[field.pageNumber - 1];
                    const { x, y, width, height } = field;

                    // Convert coordinates to PDF coordinate system
                    const pdfY = page.getHeight() - y;

                    // Draw dashed border with exact dimensions
                    const dashLength = 4;
                    const gapLength = 2;

                    // Draw dashed borders with actual field dimensions
                    for (let i = 0; i < width; i += dashLength + gapLength) {
                        page.drawLine({
                            start: { x: x + i, y: pdfY },
                            end: { x: Math.min(x + i + dashLength, x + width), y: pdfY },
                            color: rgb(0, 0, 0, 0.6),
                            thickness: 1,
                        });
                        page.drawLine({
                            start: { x: x + i, y: pdfY - height },
                            end: { x: Math.min(x + i + dashLength, x + width), y: pdfY - height },
                            color: rgb(0, 0, 0, 0.6),
                            thickness: 1,
                        });
                    }

                    for (let i = 0; i < height; i += dashLength + gapLength) {
                        page.drawLine({
                            start: { x: x, y: pdfY - i },
                            end: { x: x, y: pdfY - Math.min(i + dashLength, height) },
                            color: rgb(0, 0, 0, 0.6),
                            thickness: 1,
                        });
                        page.drawLine({
                            start: { x: x + width, y: pdfY - i },
                            end: { x: x + width, y: pdfY - Math.min(i + dashLength, height) },
                            color: rgb(0, 0, 0, 0.6),
                            thickness: 1,
                        });
                    }

                    page.drawText('Signature here', {
                        x: x + (width / 2) - 30,
                        y: pdfY - (height / 2) - 6,
                        size: 12,
                        color: rgb(0, 0, 0, 0.6),
                    });
                }
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
                                disabled={signatureFields.length === 0}
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
                                            {signatureFields
                                                .filter(field => field.pageNumber === index + 1)
                                                .map(field => (
                                                    <DroppedSignature
                                                        key={field.id}
                                                        field={field}
                                                        onResize={handleResize}
                                                        onRemove={handleRemove}
                                                    />
                                                ))}
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