import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileText, CheckCircle2, AlertTriangle, ChevronRight,
  ChevronLeft, Loader2, XCircle, File
} from 'lucide-react';
import { divisionService } from '@/services/divisionService';
import { categoryService } from '@/services/categoryService';
import { memberService } from '@/services/memberService';
import { parseFile, applyDuplicateDetection, downloadImportTemplate } from '@/services/importEngine';
import type { ImportRow, ImportStep, ImportSummary } from '@/types';
import { formatNumber } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

const STEPS: { key: ImportStep; label: string; labelSi: string }[] = [
  { key: 'upload', label: 'Upload File', labelSi: 'ගොනුව උඩුගත කරන්න' },
  { key: 'select', label: 'Select Division & Category', labelSi: 'ආසනය හා කාණ්ඩය' },
  { key: 'preview', label: 'Preview Data', labelSi: 'දත්ත පෙරදසුන' },
  { key: 'validate', label: 'Validate', labelSi: 'සත්‍යාපනය' },
  { key: 'import', label: 'Import', labelSi: 'ආනයනය' },
  { key: 'summary', label: 'Summary', labelSi: 'සාරාංශය' },
];

const ImportMembersPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [divisionId, setDivisionId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [importMode, setImportMode] = useState<'insert' | 'update'>('insert');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressCount, setProgressCount] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const { data: divisions } = useQuery({
    queryKey: ['divisions'],
    queryFn: () => divisionService.getAll(),
    staleTime: 300000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
    staleTime: 300000,
  });

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    onDrop: useCallback((accepted: File[]) => {
      if (accepted.length > 0) setFile(accepted[0]);
    }, []),
  });

  const goToStep = (s: ImportStep) => setStep(s);

  // STEP 2 → 3: Parse & detect duplicates
  const handleParse = async () => {
    if (!file || !divisionId || !categoryId) {
      toast.error('Please select Division and Category');
      return;
    }
    setIsParsing(true);
    try {
      const parsed = await parseFile(file, divisionId, categoryId);
      const existingNos = await memberService.getAllMemberNos();
      const withDuplicates = applyDuplicateDetection(parsed, existingNos);
      setRows(withDuplicates);
      setStep('preview');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to parse file';
      toast.error(message);
    } finally {
      setIsParsing(false);
    }
  };

  // STEP 4 → 5: Import
  const handleImport = async (includeSkipped = false) => {
    // UPDATE MODE: update share amounts for existing members
    if (importMode === 'update') {
      const allRows = rows.filter((r) => r.parsed?.member_no && r.parsed?.share_amount !== undefined);
      if (allRows.length === 0) { toast.error('No valid rows to update'); return; }
      setIsImporting(true);
      setProgress(0);
      setStep('import');
      const start = Date.now();
      const members = allRows.map((r) => r.parsed!);
      const { updated, failed } = await memberService.batchUpsert(
        members, 200,
        (done, total) => { setProgress(Math.round((done / total) * 100)); setProgressCount({ done, total }); }
      );
      setSummary({ totalRows: rows.length, imported: updated, duplicates: 0, failed, durationMs: Date.now() - start });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsImporting(false);
      setStep('summary');
      toast.success(`Updated ${updated} members' share amounts!`);
      return;
    }

    // INSERT MODE
    let rowsToImport = rows.filter((r) => r.status === 'valid' && r.parsed);

    if (includeSkipped) {
      // Also import duplicate rows — rename their member_no to avoid conflicts
      const dupRows = rows.filter((r) => r.status === 'duplicate' && r.parsed);
      const usedNos = new Set(rowsToImport.map((r) => r.parsed!.member_no));
      let suffix = 1;
      for (const row of dupRows) {
        let newNo = row.parsed!.member_no;
        while (usedNos.has(newNo)) {
          newNo = `${row.parsed!.member_no}-${suffix++}`;
        }
        usedNos.add(newNo);
        rowsToImport.push({ ...row, parsed: { ...row.parsed!, member_no: newNo } });
      }
    }

    if (rowsToImport.length === 0) {
      toast.error('No rows to import');
      return;
    }

    setIsImporting(true);
    setProgress(0);
    const start = Date.now();
    const members = rowsToImport.map((r) => r.parsed!);
    setStep('import');

    const { imported, failed } = await memberService.batchInsert(
      members,
      1000,
      (done, total) => {
        setProgress(Math.round((done / total) * 100));
        setProgressCount({ done, total });
      }
    );

    const durationMs = Date.now() - start;
    const duplicates = rows.filter((r) => r.status === 'duplicate').length;
    const invalid = rows.filter((r) => r.status === 'invalid').length;

    setSummary({
      totalRows: rows.length,
      imported,
      duplicates: includeSkipped ? 0 : duplicates,
      failed: failed + invalid,
      durationMs,
    });

    queryClient.invalidateQueries({ queryKey: ['members'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

    setIsImporting(false);
    setStep('summary');
    toast.success(`Imported ${imported} members successfully!`);
  };


  const handleReset = () => {
    setFile(null);
    setDivisionId('');
    setCategoryId('');
    setRows([]);
    setSummary(null);
    setProgress(0);
    setStep('upload');
  };

  const validCount = rows.filter((r) => r.status === 'valid').length;
  const dupCount = rows.filter((r) => r.status === 'duplicate').length;
  const invalidCount = rows.filter((r) => r.status === 'invalid').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text dark:text-text-dark">Import Members</h1>
        <p className="text-sm text-gray-400 mt-1">සාමාජිකයන් ආනයනය කරන්න — CSV, XLS, XLSX supported</p>
      </div>

      {/* Step indicator */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card p-6">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold
                  transition-all duration-300
                  ${i < stepIndex ? 'bg-emerald-500 text-white'
                    : i === stepIndex ? 'bg-primary text-white ring-4 ring-primary/20'
                    : 'bg-gray-100 text-gray-400'}`}
                >
                  {i < stepIndex ? <CheckCircle2 size={16} /> : i + 1}
                </div>
                <span className={`text-xs mt-1.5 font-medium hidden sm:block transition-colors
                  ${i === stepIndex ? 'text-primary' : i < stepIndex ? 'text-emerald-500' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-all duration-300
                  ${i < stepIndex ? 'bg-emerald-400' : 'bg-gray-100'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="bg-white dark:bg-surface-dark rounded-2xl shadow-card p-6"
        >
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div>
              <h2 className="text-lg font-semibold text-text dark:text-text-dark mb-2">Upload File</h2>
              <p className="text-sm text-gray-400 mb-5">
                Supports <strong>CSV, XLS, XLSX</strong> — up to <strong>5,000 members</strong> per import.
              </p>

              {/* Mode Selector */}
              <div className="mb-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setImportMode('insert')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    importMode === 'insert'
                      ? 'border-primary bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm font-bold mb-1 ${importMode === 'insert' ? 'text-primary' : 'text-gray-700'}`}>
                    ➕ Add New Members
                  </p>
                  <p className="text-xs text-gray-500">Import new members from Excel into the database</p>
                </button>
                <button
                  onClick={() => setImportMode('update')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    importMode === 'update'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm font-bold mb-1 ${importMode === 'update' ? 'text-amber-600' : 'text-gray-700'}`}>
                    🔄 Update Share Amounts
                  </p>
                  <p className="text-xs text-gray-500">Fix share amounts for existing members — no data deleted</p>
                </button>
              </div>

              {/* Template Download */}
              <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">📥 Download Template</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    Use this Excel template — fill in your data and upload below
                  </p>
                </div>
                <button
                  onClick={downloadImportTemplate}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors"
                >
                  <FileText size={15} /> Get Template
                </button>
              </div>

              {/* Column guide */}
              <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Required columns in your file:</p>
                <div className="flex flex-wrap gap-2">
                  {['member_no', 'name', 'address', 'nic', 'joined_date', 'share_amount', 'email', 'phone'].map((col) => (
                    <span key={col} className={`px-2 py-0.5 rounded text-xs font-mono
                      ${ ['member_no','name'].includes(col)
                        ? 'bg-red-100 text-red-700 font-bold'
                        : 'bg-gray-200 text-gray-600' }`}>
                      {col}{['member_no','name'].includes(col) ? ' *' : ''}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">* Required. Others are optional (will use defaults if missing).</p>
              </div>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
                  ${isDragActive ? 'border-primary bg-red-50' : 'border-gray-200 hover:border-primary hover:bg-red-50/30'}`}
              >
                <input {...getInputProps()} />
                <Upload size={48} className={`mx-auto mb-4 ${isDragActive ? 'text-primary' : 'text-gray-300'}`} />
                {file ? (
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <File size={20} className="text-primary" />
                      <p className="font-semibold text-text dark:text-text-dark">{file.name}</p>
                    </div>
                    <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-gray-600 mb-1">
                      {isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-sm text-gray-400">CSV, XLS, XLSX — Max 50MB</p>
                  </div>
                )}
              </div>

              {file && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                  <FileText size={18} className="text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">File ready: <strong>{file.name}</strong></p>
                    <p className="text-xs text-blue-600 mt-1">
                      {file.name.endsWith('.csv')
                        ? 'CSV: Automatically detects headers and parses data / CSV: තීරු ශීර්ෂ ස්වයංක්‍රීයව හඳුනාගෙන දත්ත ලබා ගනී'
                        : 'Excel: Automatically detects header row (scans first 15 rows) and parses data / Excel: තීරු ශීර්ෂ පේළිය ස්වයංක්‍රීයව හඳුනාගෙන (පළමු පේළි 15 පරිලෝකනය කරයි) දත්ත ලබා ගනී'}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  disabled={!file}
                  onClick={() => goToStep('select')}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white
                    px-6 py-3 rounded-xl font-medium text-sm disabled:opacity-40 transition-all"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Select Division & Category */}
          {step === 'select' && (
            <div>
              <h2 className="text-lg font-semibold text-text dark:text-text-dark mb-2">Select Division & Category</h2>
              <p className="text-sm text-gray-400 mb-5">
                All imported members will be assigned these values. / ආනයනය කරන සාමාජිකයන් සියල්ලටම මෙම අගයන් ලැබේ.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Electoral Division <span className="text-red-500">*</span>
                    <span className="font-normal text-gray-400 ml-1">/ ගරු ආසනය</span>
                  </label>
                  <select
                    value={divisionId}
                    onChange={(e) => setDivisionId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none
                      focus:ring-2 focus:ring-primary/30 focus:border-primary
                      dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select Electoral Division</option>
                    {(divisions || []).map((d) => (
                      <option key={d.id} value={d.id}>{d.division_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                    <span className="font-normal text-gray-400 ml-1">/ කාණ්ඩය</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none
                      focus:ring-2 focus:ring-primary/30 focus:border-primary
                      dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select Category</option>
                    {(categories || []).map((c) => (
                      <option key={c.id} value={c.id}>{c.category_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {divisionId && categoryId && (
                <div className="mt-5 p-4 bg-emerald-50 rounded-xl flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <p className="text-sm text-emerald-700">
                    Ready to parse <strong>{file?.name}</strong> — will assign to{' '}
                    <strong>{divisions?.find((d) => d.id === divisionId)?.division_name}</strong> /
                    <strong> {categories?.find((c) => c.id === categoryId)?.category_name}</strong>
                  </p>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => goToStep('upload')}
                  className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5
                    rounded-xl text-sm hover:bg-gray-50 transition-all"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  disabled={!divisionId || !categoryId || isParsing}
                  onClick={handleParse}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white
                    px-6 py-3 rounded-xl font-medium text-sm disabled:opacity-40 transition-all"
                >
                  {isParsing ? (
                    <><Loader2 size={16} className="animate-spin" /> Parsing...</>
                  ) : (
                    <>Parse File <ChevronRight size={16} /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview */}
          {step === 'preview' && (
            <div>
              <h2 className="text-lg font-semibold text-text dark:text-text-dark mb-2">Preview Data</h2>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{formatNumber(validCount)}</p>
                  <p className="text-xs text-emerald-600 mt-1">Valid / වලංගු</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{formatNumber(dupCount)}</p>
                  <p className="text-xs text-amber-600 mt-1">Duplicates / නැවත දත්ත</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{formatNumber(invalidCount)}</p>
                  <p className="text-xs text-red-600 mt-1">Invalid / අවලංගු</p>
                </div>
              </div>

              {/* Table Preview */}
              <div className="overflow-x-auto max-h-96 rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Row</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Status</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Member No</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Name</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">NIC</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Joined Date</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Share Amount</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.slice(0, 200).map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={
                          row.status === 'valid' ? 'bg-white hover:bg-gray-50' :
                          row.status === 'duplicate' ? 'bg-amber-50' : 'bg-red-50'
                        }
                      >
                        <td className="px-3 py-2 text-gray-400">{row.rowIndex}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                            ${row.status === 'valid' ? 'bg-emerald-100 text-emerald-700' :
                              row.status === 'duplicate' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono">{row.parsed?.member_no || '—'}</td>
                        <td className="px-3 py-2">{row.parsed?.name || '—'}</td>
                        <td className="px-3 py-2">{row.parsed?.nic || '—'}</td>
                        <td className="px-3 py-2">{row.parsed?.joined_date || '—'}</td>
                        <td className="px-3 py-2">{row.parsed?.share_amount?.toLocaleString() || '—'}</td>
                        <td className="px-3 py-2 text-red-500">{row.errors.join(', ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 200 && (
                  <p className="text-center py-2 text-xs text-gray-400">
                    Showing first 200 of {formatNumber(rows.length)} rows
                  </p>
                )}
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => goToStep('select')}
                  className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5
                    rounded-xl text-sm hover:bg-gray-50 transition-all"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  disabled={validCount === 0}
                  onClick={() => goToStep('validate')}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white
                    px-6 py-3 rounded-xl font-medium text-sm disabled:opacity-40 transition-all"
                >
                  Validate {formatNumber(validCount)} Rows <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Validate */}
          {step === 'validate' && (
            <div>
              <h2 className="text-lg font-semibold text-text dark:text-text-dark mb-2">Validation Summary</h2>
              <p className="text-sm text-gray-400 mb-6">Review before final import. / ආනයනයට පෙර සමාලෝචනය කරන්න.</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">Total Rows</span>
                  <span className="font-bold text-text">{formatNumber(rows.length)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-sm text-emerald-700">Ready to Import</span>
                  </div>
                  <span className="font-bold text-emerald-600">{formatNumber(validCount)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <span className="text-sm text-amber-700">Duplicates (will be skipped)</span>
                  </div>
                  <span className="font-bold text-amber-600">{formatNumber(dupCount)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <XCircle size={16} className="text-red-500" />
                    <span className="text-sm text-red-700">Invalid (will be skipped)</span>
                  </div>
                  <span className="font-bold text-red-600">{formatNumber(invalidCount)}</span>
                </div>
              </div>

              {validCount === 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  No valid rows found. Please check your file format and column mappings.
                </div>
              )}

              {/* Duplicate warning with Force Import option */}
              {dupCount > 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm font-semibold text-amber-800 mb-1">
                    ⚠️ {formatNumber(dupCount)} rows detected as duplicates
                  </p>
                  <p className="text-xs text-amber-700 mb-3">
                    These may be members that already exist in the database, or have duplicate member numbers within the file.
                    You can either skip them (default) or <strong>Force Import All</strong> — duplicates will get a new unique member number automatically.
                  </p>
                  <button
                    onClick={() => handleImport(true)}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white
                      px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                  >
                    ⚡ Force Import All {formatNumber(validCount + dupCount)} Records
                  </button>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => goToStep('preview')}
                  className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5
                    rounded-xl text-sm hover:bg-gray-50 transition-all"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  disabled={validCount === 0}
                  onClick={() => handleImport(false)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white
                    px-6 py-3 rounded-xl font-medium text-sm disabled:opacity-40 transition-all"
                >
                  Import {formatNumber(validCount)} Valid Records <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}


          {/* STEP 5: Importing */}
          {step === 'import' && (
            <div className="text-center py-8">
              <h2 className="text-lg font-semibold text-text dark:text-text-dark mb-6">Importing Members...</h2>
              <Loader2 size={48} className="text-primary animate-spin mx-auto mb-6" />

              <div className="max-w-sm mx-auto">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Progress</span>
                  <span className="font-semibold">
                    {progressCount.total > 0
                      ? `${progressCount.done.toLocaleString()} / ${progressCount.total.toLocaleString()} records`
                      : `${progress}%`}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <motion.div
                    className="h-4 rounded-full bg-gradient-to-r from-red-400 to-primary"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Importing {formatNumber(progressCount.total)} members in batches of 1,000 — please wait...
                </p>
              </div>
            </div>
          )}

          {/* STEP 6: Summary */}
          {step === 'summary' && summary && (
            <div>
              <div className="text-center mb-6">
                <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-text dark:text-text-dark">Import Complete!</h2>
                <p className="text-sm text-gray-400 mt-1">ආනයනය සාර්ථකව සම්පූර්ණ විය</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-text">{formatNumber(summary.totalRows)}</p>
                  <p className="text-xs text-gray-400 mt-1">Total Rows</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{formatNumber(summary.imported)}</p>
                  <p className="text-xs text-emerald-600 mt-1">Imported</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{formatNumber(summary.duplicates)}</p>
                  <p className="text-xs text-amber-600 mt-1">Duplicates</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{formatNumber(summary.failed)}</p>
                  <p className="text-xs text-red-600 mt-1">Failed</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
                  <p className="text-2xl font-bold text-blue-600">
                    {(summary.durationMs / 1000).toFixed(1)}s
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Duration</p>
                </div>
              </div>

              {/* Progress bar showing success rate */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Success Rate</span>
                  <span>{summary.totalRows > 0 ? Math.round((summary.imported / summary.totalRows) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-emerald-500 transition-all duration-1000"
                    style={{ width: `${summary.totalRows > 0 ? (summary.imported / summary.totalRows) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 border border-gray-200 text-gray-600 px-5 py-3 rounded-xl text-sm
                    font-medium hover:bg-gray-50 transition-all"
                >
                  Import Another File
                </button>
                <a
                  href="/cooperative-society/members"
                  className="flex-1 bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-xl
                    text-sm font-medium text-center transition-all"
                >
                  View Members
                </a>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ImportMembersPage;
