import React, { useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, FileText, Database } from 'lucide-react';

function AnalyzerApp() {
  const [savantData, setSavantData] = useState(null);
  const [blastData, setBlastData] = useState(null);

  const handleFileUpload = (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    // PapaParse is fast enough for just reading headers and first few rows if we don't block.
    // For large files, we'll just parse the whole thing since we need the data eventually.
    // Actually, to just show headers quickly and avoid freezing, let's parse fully but with a loading state.
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (type === 'savant') {
          setSavantData({
            filename: file.name,
            headers: results.meta.fields,
            data: results.data
          });
        } else {
          setBlastData({
            filename: file.name,
            headers: results.meta.fields,
            data: results.data
          });
        }
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
        alert("CSVの読み込みに失敗しました。");
      }
    });
  };

  const renderDataView = (dataObj, title) => {
    if (!dataObj) {
      return (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800 text-gray-400">
          <UploadCloud className="w-12 h-12 mb-4" />
          <p>ここに{title}のCSVファイルをアップロードしてください</p>
        </div>
      );
    }

    return (
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="text-blue-400" />
          <h2 className="text-xl font-bold text-white">{dataObj.filename}</h2>
          <span className="bg-blue-600 text-xs px-2 py-1 rounded text-white font-medium">
            {dataObj.data.length} 行
          </span>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center">
            <Database className="w-5 h-5 mr-2" />
            読み込まれた列名（Headers）
          </h3>
          <div className="flex flex-wrap gap-2">
            {dataObj.headers.map((header, idx) => (
              <span key={idx} className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm border border-gray-600">
                {header}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-200 mb-3">データプレビュー (最初の5件)</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-gray-900 border-b border-gray-700">
                <tr>
                  {dataObj.headers.slice(0, 10).map((header, idx) => (
                    <th key={idx} className="px-4 py-3 whitespace-nowrap">{header}</th>
                  ))}
                  {dataObj.headers.length > 10 && <th className="px-4 py-3">...</th>}
                </tr>
              </thead>
              <tbody>
                {dataObj.data.slice(0, 5).map((row, rowIdx) => (
                  <tr key={rowIdx} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700">
                    {dataObj.headers.slice(0, 10).map((header, colIdx) => (
                      <td key={colIdx} className="px-4 py-3 whitespace-nowrap">
                        {String(row[header] !== null && row[header] !== undefined ? row[header] : '-')}
                      </td>
                    ))}
                    {dataObj.headers.length > 10 && <td className="px-4 py-3">...</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
            Baseball Data Analyzer (New)
          </h1>
          <p className="text-gray-400">
            既存のアプリとは完全に独立して動作する新しい分析ツールです。
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Savant Upload Section */}
          <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <span className="bg-blue-500 w-3 h-8 rounded-full mr-3"></span>
                Savant Data
              </h2>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg">
                ファイルを選択
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, 'savant')} 
                />
              </label>
            </div>
            {renderDataView(savantData, 'Savant')}
          </div>

          {/* Blast Upload Section */}
          <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <span className="bg-purple-500 w-3 h-8 rounded-full mr-3"></span>
                Blast Data
              </h2>
              <label className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg">
                ファイルを選択
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, 'blast')} 
                />
              </label>
            </div>
            {renderDataView(blastData, 'Blast')}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyzerApp;
