import React, { useState } from 'react';
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import { useData } from '../context/DataContext';
import { useRapsodo } from '../context/RapsodoContext';
import { useBlast } from '../context/BlastContext';

const Upload = () => {
    const [format, setFormat] = useState('rapsodo'); // 'rapsodo' or 'savant'
    const [fileType, setFileType] = useState('pitching'); // 'pitching' or 'batting' (for Rapsodo)
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [status, setStatus] = useState({ type: '', message: '' }); // 'success', 'error', ''
    const [isDragging, setIsDragging] = useState(false);

    const { uploadSavantData } = useData();
    const { uploadRapsodoData } = useRapsodo();
    const { uploadBlastData } = useBlast();

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === 'text/csv') {
            setFile(droppedFile);
            parseFile(droppedFile);
        } else {
            setStatus({ type: 'error', message: 'Please upload a CSV file.' });
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = (file) => {
        setStatus({ type: '', message: '' });

        // For Blast format, skip first 8 rows before preview
        if (format === 'blast') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const lines = text.split('\n');
                const dataLines = lines.slice(8); // Skip metadata
                const csvText = dataLines.join('\n');

                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: true,
                    preview: 10,
                    complete: (results) => {
                        setPreview(results.data);
                    },
                    error: (error) => {
                        setStatus({ type: 'error', message: `Failed to parse CSV: ${error.message}` });
                    }
                });
            };
            reader.readAsText(file, 'Shift_JIS'); // Read as Shift-JIS encoding
        } else {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                preview: 10, // Only parse first 10 rows for preview
                complete: (results) => {
                    setPreview(results.data);
                },
                error: (error) => {
                    setStatus({ type: 'error', message: `Failed to parse CSV: ${error.message}` });
                }
            });
        }
    };

    const handleUpload = () => {
        if (!file) {
            setStatus({ type: 'error', message: 'Please select a file first.' });
            return;
        }

        setStatus({ type: '', message: '' });

        // For Blast format, we need to find the header row dynamically
        if (format === 'blast') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const lines = text.split('\n');

                // Find the header row (contains "Date" or "日付" or "Bat Speed")
                let headerIndex = 0;
                for (let i = 0; i < Math.min(lines.length, 20); i++) {
                    const line = lines[i];
                    if ((line.includes('Date') || line.includes('日付')) &&
                        (line.includes('Bat Speed') || line.includes('スイング') || line.includes('バットスピード'))) {
                        headerIndex = i;
                        break;
                    }
                }

                console.log(`Blast Header found at index: ${headerIndex}`);

                const dataLines = lines.slice(headerIndex);
                const csvText = dataLines.join('\n');

                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: true,
                    complete: (results) => {
                        try {
                            uploadBlastData(results.data, file.name);
                            setStatus({
                                type: 'success',
                                message: `Successfully uploaded ${results.data.length} rows of Blast data!`
                            });
                        } catch (error) {
                            setStatus({ type: 'error', message: error.message });
                        }
                    },
                    error: (error) => {
                        setStatus({ type: 'error', message: `Failed to parse CSV: ${error.message}` });
                    }
                });
            };
            reader.readAsText(file, 'Shift_JIS'); // Read as Shift-JIS encoding
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            worker: true, // Enable worker for large files
            complete: (results) => {
                try {
                    if (format === 'rapsodo') {
                        uploadRapsodoData(results.data, fileType, file.name);
                        setStatus({
                            type: 'success',
                            message: `Successfully uploaded ${results.data.length} rows of Rapsodo ${fileType} data!`
                        });
                    } else if (format === 'blast') {
                        uploadBlastData(results.data, file.name);
                        setStatus({
                            type: 'success',
                            message: `Successfully uploaded ${results.data.length} rows of Blast data!`
                        });
                    } else {
                        uploadSavantData(results.data, file.name);
                        setStatus({
                            type: 'success',
                            message: `Successfully uploaded ${results.data.length} rows of Savant data!`
                        });
                    }
                } catch (error) {
                    setStatus({ type: 'error', message: error.message });
                }
            },
            error: (error) => {
                setStatus({ type: 'error', message: `Failed to parse CSV: ${error.message}` });
            }
        });
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight">Upload Data</h2>

            {/* Format Selection */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Select Data Format</h3>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="format"
                            value="rapsodo"
                            checked={format === 'rapsodo'}
                            onChange={(e) => setFormat(e.target.value)}
                            className="w-4 h-4 text-primary"
                        />
                        <span className="font-medium">Rapsodo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="format"
                            value="savant"
                            checked={format === 'savant'}
                            onChange={(e) => setFormat(e.target.value)}
                            className="w-4 h-4 text-primary"
                        />
                        <span className="font-medium">Baseball Savant</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="format"
                            value="blast"
                            checked={format === 'blast'}
                            onChange={(e) => setFormat(e.target.value)}
                            className="w-4 h-4 text-primary"
                        />
                        <span className="font-medium">Blast Motion</span>
                    </label>
                </div>

                {/* File Type Selection (Rapsodo only) */}
                {format === 'rapsodo' && (
                    <div className="mt-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">File Type</h4>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="fileType"
                                    value="pitching"
                                    checked={fileType === 'pitching'}
                                    onChange={(e) => setFileType(e.target.value)}
                                    className="w-4 h-4 text-primary"
                                />
                                <span>Pitching</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="fileType"
                                    value="batting"
                                    checked={fileType === 'batting'}
                                    onChange={(e) => setFileType(e.target.value)}
                                    className="w-4 h-4 text-primary"
                                />
                                <span>Batting</span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* File Upload Area */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Upload CSV File</h3>

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                        }`}
                >
                    <UploadIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">
                        {file ? file.name : 'Drag and drop your CSV file here'}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">or</p>
                    <label className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 transition-colors">
                        Browse Files
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>
                </div>

                {file && (
                    <button
                        onClick={handleUpload}
                        className="mt-4 w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                    >
                        Upload Data
                    </button>
                )}
            </div>

            {/* Status Messages */}
            {status.message && (
                <div className={`rounded-xl border p-4 flex items-start gap-3 ${status.type === 'success'
                    ? 'border-green-500/50 bg-green-500/10 text-green-500'
                    : 'border-red-500/50 bg-red-500/10 text-red-500'
                    }`}>
                    {status.type === 'success' ? (
                        <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="font-medium">{status.message}</p>
                </div>
            )}

            {/* Preview */}
            {preview && preview.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Data Preview (First 10 Rows)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    {Object.keys(preview[0]).map((key) => (
                                        <th key={key} className="px-4 py-2 text-left font-medium">
                                            {key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((row, idx) => (
                                    <tr key={idx} className="border-t border-border">
                                        {Object.values(row).map((value, i) => (
                                            <td key={i} className="px-4 py-2">
                                                {value !== null && value !== undefined ? String(value) : '-'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Upload History */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Upload History</h3>

                <UploadHistory />
            </div>
        </div>
    );
};

// Upload History Component
const UploadHistory = () => {
    const { fileHistory: blastHistory, deleteFile: deleteBlastFile } = useBlast();
    const { fileHistory: rapsodoHistory, deleteFile: deleteRapsodoFile } = useRapsodo();
    const { fileHistory: savantHistory, deleteFile: deleteSavantFile } = useData();
    const [activeTab, setActiveTab] = useState('blast');

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getHistoryForTab = () => {
        switch (activeTab) {
            case 'blast':
                return { history: blastHistory || [], deleteFunc: deleteBlastFile };
            case 'rapsodo':
                return { history: rapsodoHistory || [], deleteFunc: deleteRapsodoFile };
            case 'savant':
                return { history: savantHistory || [], deleteFunc: deleteSavantFile };
            default:
                return { history: [], deleteFunc: () => { } };
        }
    };

    const { history, deleteFunc } = getHistoryForTab();

    return (
        <div>
            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b border-border">
                <button
                    onClick={() => setActiveTab('blast')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'blast'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Blast ({blastHistory?.length || 0})
                </button>
                <button
                    onClick={() => setActiveTab('rapsodo')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'rapsodo'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Rapsodo ({rapsodoHistory?.length || 0})
                </button>
                <button
                    onClick={() => setActiveTab('savant')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'savant'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Savant ({savantHistory?.length || 0})
                </button>
            </div>

            {/* File List */}
            {history.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                    No files uploaded yet
                </p>
            ) : (
                <div className="space-y-2">
                    {history.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{file.fileName}</span>
                                    {file.source === 'initial' && (
                                        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-500">
                                            Initial
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                                    <span>{formatDate(file.uploadedAt)}</span>
                                    <span>•</span>
                                    <span>{file.rowCount} rows</span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (window.confirm(`Delete "${file.fileName}"?`)) {
                                        deleteFunc(file.id);
                                    }
                                }}
                                className="px-3 py-1 text-sm text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Upload;
