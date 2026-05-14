import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileText, CheckCircle, AlertCircle, X,
  Download, Database, RefreshCw, Info, Eye, Trash2
} from 'lucide-react';
import { importFile, loadBatches, deleteBatch } from '../services/clientImport';
import { loadProviders } from '../services/clientScraper';
import { useToast } from '../components/ui/index';

function DropZone({ onFiles, dragActive, setDragActive, uploading }) {
  const fileRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    onFiles(files);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !uploading && fileRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
        uploading ? 'border-blue-300 bg-blue-50/50 cursor-wait' :
        dragActive ? 'border-blue-500 bg-blue-50 cursor-copy scale-[1.01]' :
        'border-slate-200 hover:border-blue-300 hover:bg-slate-50 cursor-pointer'
      }`}
    >
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".csv,.xlsx,.xls,.json"
        multiple
        onChange={e => onFiles(Array.from(e.target.files || []))}
      />
      {uploading ? (
        <>
          <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{borderWidth:'3px'}}/>
          <p className="text-sm font-semibold text-blue-700">Processing files...</p>
          <p className="text-xs text-blue-500 mt-1">Parsing and importing records</p>
        </>
      ) : (
        <>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors ${
            dragActive ? 'bg-blue-100' : 'bg-slate-100'
          }`}>
            <Upload size={26} className={dragActive ? 'text-blue-600' : 'text-slate-400'}/>
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            {dragActive ? 'Drop files here to import' : 'Drag & drop files, or click to browse'}
          </h3>
          <p className="text-xs text-slate-400 mb-2">Supports CSV, XLSX, and JSON — up to 50MB per file</p>
          <div className="flex justify-center gap-2">
            {['CSV','XLSX','JSON'].map(f => (
              <span key={f} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono font-semibold">.{f.toLowerCase()}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BatchCard({ batch, onDelete, onPreview }) {
  return (
    <div className={`bg-white rounded-xl border-2 p-4 transition-all hover:shadow-sm ${
      batch.status === 'completed' ? 'border-green-200' :
      batch.status === 'failed'    ? 'border-red-200'   : 'border-slate-200'
    }`}>
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          batch.status === 'completed' ? 'bg-green-100' :
          batch.status === 'failed'    ? 'bg-red-100'   :
          batch.status === 'processing'? 'bg-blue-100'  : 'bg-slate-100'
        }`}>
          {batch.status === 'completed' ? <CheckCircle size={16} className="text-green-600"/> :
           batch.status === 'failed'    ? <AlertCircle size={16} className="text-red-500"/> :
           batch.status === 'processing'? <RefreshCw size={16} className="text-blue-600 animate-spin"/> :
                                          <FileText size={16} className="text-slate-400"/>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold text-slate-800 truncate">{batch.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              batch.status === 'completed' ? 'bg-green-100 text-green-700' :
              batch.status === 'failed'    ? 'bg-red-100 text-red-700'     :
              batch.status === 'processing'? 'bg-blue-100 text-blue-700'   : 'bg-slate-100 text-slate-600'
            }`}>{batch.status}</span>
          </div>
          <div className="text-xs text-slate-400">{batch.source} · {batch.date}</div>
          {batch.status === 'completed' && (
            <div className="flex gap-3 mt-1.5 text-xs">
              <span className="text-green-600 font-medium">✓ {batch.imported} imported</span>
              {batch.duplicates > 0 && <span className="text-amber-600">{batch.duplicates} duplicates skipped</span>}
              {batch.health !== undefined && (
                <span className={batch.health >= 80 ? 'text-green-600' : batch.health >= 60 ? 'text-amber-600' : 'text-red-600'}>
                  {batch.health}% data quality
                </span>
              )}
            </div>
          )}
          {batch.fields_detected && (
            <div className="text-[10px] text-slate-400 mt-1 truncate">
              Fields: <span className="font-mono">{batch.fields_detected}</span>
            </div>
          )}
          {batch.error && <div className="text-xs text-red-500 mt-1">{batch.error}</div>}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {batch.records > 0 && (
            <div className="text-center">
              <div className="text-lg font-bold text-slate-900">{batch.records.toLocaleString()}</div>
              <div className="text-[10px] text-slate-400">records</div>
            </div>
          )}
          <div className="flex gap-1">
            <button onClick={() => onDelete(batch.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-400 transition-colors">
              <Trash2 size={12}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BulkImport() {
  const toast = useToast();
  const [batches, setBatches] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [providerCount, setProviderCount] = useState(0);

  useEffect(() => {
    setBatches(loadBatches());
    setProviderCount(loadProviders().length);
  }, []);

  const handleFiles = useCallback(async (files) => {
    if (!files.length) return;

    const validExts = ['csv','xlsx','xls','json'];
    const valid = files.filter(f => validExts.some(ext => f.name.toLowerCase().endsWith(`.${ext}`)));

    if (!valid.length) {
      toast.error('Please upload CSV, XLSX, XLS, or JSON files only');
      return;
    }

    setUploading(true);

    for (const file of valid) {
      // Optimistic batch for UI
      const tempId = 'batch_temp_' + Date.now() + '_' + file.name;
      const tempBatch = {
        id: tempId, name: file.name,
        source: file.name.split('.').pop().toUpperCase() + ' Upload',
        date: new Date().toLocaleDateString(),
        status: 'processing', records: 0,
      };
      setBatches(prev => [tempBatch, ...prev]);

      try {
        const result = await importFile(file, (progress) => {
          // Update processing message
          setBatches(prev => prev.map(b =>
            b.id === tempId ? { ...b, step: progress.message } : b
          ));
        });

        setBatches(prev => prev.map(b => b.id === tempId ? result : b));
        setProviderCount(loadProviders().length);

        if (result.imported > 0) {
          toast.success(`✓ Imported ${result.imported} providers from ${file.name}`);
        } else if (result.duplicates > 0) {
          toast.info(`All ${result.duplicates} records already exist — no new entries`);
        } else {
          toast.info(`File parsed but no valid records found in ${file.name}`);
        }
      } catch (err) {
        const failedBatch = {
          id: tempId, name: file.name,
          source: file.name.split('.').pop().toUpperCase() + ' Upload',
          date: new Date().toLocaleDateString(),
          status: 'failed', records: 0,
          error: err.message,
        };
        setBatches(prev => prev.map(b => b.id === tempId ? failedBatch : b));
        toast.error(`Failed: ${err.message}`);
      }
    }
    setUploading(false);
  }, [toast]);

  const handleDelete = (id) => {
    deleteBatch(id);
    setBatches(prev => prev.filter(b => b.id !== id));
    toast.info('Batch removed from history');
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bulk Import</h1>
          <p className="text-sm text-slate-500 mt-0.5">Upload CSV, XLSX, or JSON files to import funeral provider data.</p>
        </div>
        {providerCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl">
            <Database size={13} className="text-green-600"/>
            <span className="text-xs font-semibold text-green-700">{providerCount.toLocaleString()} providers in database</span>
          </div>
        )}
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <Info size={15} className="text-blue-600 flex-shrink-0 mt-0.5"/>
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>Client-side parsing</strong> — files are processed entirely in your browser. No data is sent to a server. Duplicate records are automatically detected and skipped. Imported providers appear immediately in the Marketplace.
        </p>
      </div>

      {/* Drop zone */}
      <DropZone
        onFiles={handleFiles}
        dragActive={dragActive}
        setDragActive={setDragActive}
        uploading={uploading}
      />

      {/* Import history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Import History</h2>
          <span className="text-xs text-slate-400">{batches.length} batch{batches.length !== 1 ? 'es' : ''}</span>
        </div>

        {batches.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
            <Database size={28} className="text-slate-300 mx-auto mb-3"/>
            <h3 className="text-sm font-semibold text-slate-500 mb-1">No imports yet</h3>
            <p className="text-xs text-slate-400">Upload a file above to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map(batch => (
              <BatchCard key={batch.id} batch={batch} onDelete={handleDelete}/>
            ))}
          </div>
        )}
      </div>

      {/* Format guide */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Info size={14} className="text-blue-600"/> Expected File Format
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <div className="font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-green-100 text-green-700 rounded font-mono text-[10px] flex items-center justify-center font-bold">CSV</span>
              CSV / XLSX Columns
            </div>
            <div className="space-y-1 font-mono text-slate-500 bg-slate-50 rounded-lg p-3">
              {['name *', 'city', 'state', 'phone', 'email', 'website', 'address', 'services', 'rating', 'description'].map(col => (
                <div key={col} className={`flex items-center gap-1 ${col.includes('*') ? 'text-blue-600 font-semibold' : ''}`}>
                  <span className="text-slate-300">›</span> {col}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded font-mono text-[10px] flex items-center justify-center font-bold">{'{}'}</span>
              JSON Structure
            </div>
            <pre className="text-slate-500 text-[10px] leading-relaxed bg-slate-50 rounded-lg p-3 overflow-auto">{`[
  {
    "name": "Smith Funeral",
    "city": "Austin",
    "state": "TX",
    "phone": "512-555-0100",
    "email": "info@smith.com",
    "website": "https://...",
    "services": "Cremation, Burial"
  }
]`}</pre>
          </div>
          <div>
            <div className="font-semibold text-slate-700 mb-2">Tips</div>
            <ul className="text-slate-500 space-y-1.5">
              {[
                'Row 1 must be column headers',
                'Column names are case-insensitive',
                'Services can be comma-separated',
                'Duplicates are auto-detected by name & website',
                'Max 50,000 rows per file',
                'Multiple files can be uploaded at once',
                'Imported data goes to Marketplace instantly',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle size={10} className="text-green-500 flex-shrink-0 mt-0.5"/>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
