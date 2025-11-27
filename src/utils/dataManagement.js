// This file contains shared utility functions for data management across contexts

/**
 * Generate a unique file ID
 */
export const generateFileId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a file history entry
 */
export const createFileHistoryEntry = (fileName, rowCount, dataType, source = 'upload') => {
    return {
        id: generateFileId(),
        fileName,
        source,
        uploadedAt: new Date().toISOString(),
        rowCount,
        dataType
    };
};

/**
 * Add file ID to data rows
 */
export const addFileIdToRows = (rows, fileId) => {
    return rows.map(row => ({
        ...row,
        _fileId: fileId
    }));
};

/**
 * Remove data by file ID
 */
export const removeDataByFileId = (data, fileId) => {
    return data.filter(row => row._fileId !== fileId);
};

/**
 * Remove file from history
 */
export const removeFileFromHistory = (history, fileId) => {
    return history.filter(file => file.id !== fileId);
};
