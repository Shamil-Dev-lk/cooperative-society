import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, Download, Printer, FileSpreadsheet, Filter } from 'lucide-react';
import { memberService } from '@/services/memberService';
import { divisionService } from '@/services/divisionService';
import { categoryService } from '@/services/categoryService';
import { useSettingsStore } from '@/stores/settingsStore';
import { exportToPDF, exportToExcel, exportToCSV, printReport } from '@/utils/exportUtils';
import { formatDate, formatNumber, formatCurrency } from '@/utils/dateUtils';
import type { MemberFilters, ReportType } from '@/types';
import toast from 'react-hot-toast';

const REPORT_TYPES: { type: ReportType; label: string; labelSi: string; description: string }[] = [
  { type: 'member_list', label: 'Member List Report', labelSi: 'සාමාජිකයන් ලැයිස්තු වාර්තාව', description: 'Complete list of all members with details' },
  { type: 'share_capital', label: 'Share Capital Report', labelSi: 'කොටස් ප්‍රාග්ධන වාර්තාව', description: 'Share capital analysis per member' },
  { type: 'monthly_registration', label: 'Monthly Registration Report', labelSi: 'මාසික ලියාපදිංචිය', description: 'Monthly new member registrations' },
  { type: 'division_wise', label: 'Division Wise Report', labelSi: 'ආසන අනුව වාර්තාව', description: 'Member statistics per electoral division' },
  { type: 'category_wise', label: 'Category Wise Report', labelSi: 'කාණ්ඩ අනුව වාර්තාව', description: 'Member statistics per category' },
  { type: 'annual_summary', label: 'Annual Summary', labelSi: 'වාර්ෂික සාරාංශය', description: 'Annual overview of society performance' },
];

const ReportsPage: React.FC = () => {
  const { settings } = useSettingsStore();
  const [selectedType, setSelectedType] = useState<ReportType>('member_list');
  const [filters, setFilters] = useState<MemberFilters>({});
  const [isGenerating, setIsGenerating] = useState(false);

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

  const { data: members, isLoading } = useQuery({
    queryKey: ['report-members', selectedType, filters],
    queryFn: () => memberService.getAllForReport(filters),
    staleTime: 30000,
  });

  const reportTitle = REPORT_TYPES.find((r) => r.type === selectedType)?.label || 'Report';

  const handleExportPDF = async () => {
    if (!members || members.length === 0) { toast.error('No data to export'); return; }
    setIsGenerating(true);
    try {
      exportToPDF(members, { title: reportTitle, settings });
      toast.success('PDF exported successfully');
    } catch { toast.error('PDF export failed'); }
    finally { setIsGenerating(false); }
  };

  const handleExportExcel = () => {
    if (!members || members.length === 0) { toast.error('No data to export'); return; }
    exportToExcel(members, reportTitle);
    toast.success('Excel exported successfully');
  };

  const handleExportCSV = () => {
    if (!members || members.length === 0) { toast.error('No data to export'); return; }
    exportToCSV(members, reportTitle);
    toast.success('CSV exported successfully');
  };

  const handlePrint = () => {
    if (!members || members.length === 0) { toast.error('No data to print'); return; }

    const tableHTML = `
      <table>
        <thead>
          <tr>
            <th>#</th><th>Member No</th><th>Name</th><th>NIC</th>
            <th>Division</th><th>Category</th><th>Joined Date</th><th>Share Amount</th>
          </tr>
        </thead>
        <tbody>
          ${members.map((m, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${m.member_no}</td>
              <td>${m.name}</td>
              <td>${m.nic}</td>
              <td>${m.electoral_division?.division_name || '—'}</td>
              <td>${m.category?.category_name || '—'}</td>
              <td>${formatDate(m.joined_date)}</td>
              <td>Rs. ${formatNumber(m.share_amount || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    printReport(reportTitle, tableHTML, settings.society_name);
  };

  // Division Wise aggregation
  const divisionStats = (divisions || []).map((div) => {
    const divMembers = (members || []).filter((m) => m.electoral_division_id === div.id);
    return {
      division: div.division_name,
      count: divMembers.length,
      shareCapital: divMembers.reduce((s, m) => s + (m.share_amount || 0), 0),
    };
  }).sort((a, b) => b.count - a.count);

  // Category Wise aggregation
  const categoryStats = (categories || []).map((cat) => {
    const catMembers = (members || []).filter((m) => m.category_id === cat.id);
    return {
      category: cat.category_name,
      count: catMembers.length,
      shareCapital: catMembers.reduce((s, m) => s + (m.share_amount || 0), 0),
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text dark:text-text-dark">Reports</h1>
        <p className="text-sm text-gray-400 mt-1">වාර්තා — Generate and export reports</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Report Type Selector */}
        <div className="xl:col-span-1 space-y-2">
          {REPORT_TYPES.map((r) => (
            <button
              key={r.type}
              onClick={() => setSelectedType(r.type)}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-200
                ${selectedType === r.type
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-gray-100 bg-white dark:bg-surface-dark hover:border-gray-200'}`}
            >
              <p className={`text-sm font-semibold ${selectedType === r.type ? 'text-primary' : 'text-text dark:text-text-dark'}`}>
                {r.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{r.labelSi}</p>
            </button>
          ))}
        </div>

        {/* Report Content */}
        <div className="xl:col-span-3 space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={16} className="text-gray-400" />
              <h3 className="font-semibold text-text dark:text-text-dark text-sm">Filters</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <select
                value={filters.division_id || ''}
                onChange={(e) => setFilters((f) => ({ ...f, division_id: e.target.value || undefined }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none
                  focus:ring-2 focus:ring-primary/30 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Divisions</option>
                {(divisions || []).map((d) => (
                  <option key={d.id} value={d.id}>{d.division_name}</option>
                ))}
              </select>

              <select
                value={filters.category_id || ''}
                onChange={(e) => setFilters((f) => ({ ...f, category_id: e.target.value || undefined }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none
                  focus:ring-2 focus:ring-primary/30 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Categories</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.category_name}</option>
                ))}
              </select>

              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value || undefined }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none
                  focus:ring-2 focus:ring-primary/30 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="From Date"
              />

              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value || undefined }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none
                  focus:ring-2 focus:ring-primary/30 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="To Date"
              />
            </div>
          </div>

          {/* Export Actions */}
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-text dark:text-text-dark">{reportTitle}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isLoading ? 'Loading...' : `${formatNumber(members?.length || 0)} records`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportPDF}
                  disabled={isLoading || isGenerating}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2
                    rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                >
                  <FileText size={14} /> PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2
                    rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                >
                  <FileSpreadsheet size={14} /> Excel
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2
                    rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                >
                  <Download size={14} /> CSV
                </button>
                <button
                  onClick={handlePrint}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-800 text-white px-3 py-2
                    rounded-xl text-xs font-medium transition-all disabled:opacity-40"
                >
                  <Printer size={14} /> Print
                </button>
              </div>
            </div>

            {/* Preview Table */}
            {(selectedType === 'member_list' || selectedType === 'share_capital') && (
              <div className="overflow-x-auto max-h-96 rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">#</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Member No</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Name</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">&#x0DBD;&#x0DD2;&#x0DB4;&#x0DD2;&#x0DB1;&#x0DBA;</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">NIC</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Division</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Category</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Joined</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-semibold">Share Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}><td colSpan={9} className="px-3 py-2"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                      ))
                    ) : (members || []).slice(0, 100).map((m, i) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-mono text-gray-500">{m.member_no}</td>
                        <td className="px-3 py-2 font-medium">{m.name}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{m.address || '—'}</td>
                        <td className="px-3 py-2 text-gray-400">{m.nic}</td>
                        <td className="px-3 py-2 text-blue-600">{m.electoral_division?.division_name || '—'}</td>
                        <td className="px-3 py-2 text-purple-600">{m.category?.category_name || '—'}</td>
                        <td className="px-3 py-2 text-gray-400">{formatDate(m.joined_date)}</td>
                        <td className="px-3 py-2 text-right text-emerald-600 font-medium">
                          {formatCurrency(m.share_amount || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {!isLoading && (members?.length || 0) > 0 && (
                    <tfoot className="bg-gray-50 sticky bottom-0">
                      <tr>
                        <td colSpan={8} className="px-3 py-2 font-semibold text-gray-600 text-xs">
                          Total ({formatNumber(members?.length || 0)} members)
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700 text-xs">
                          {formatCurrency((members || []).reduce((s, m) => s + (m.share_amount || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* Division Wise */}
            {selectedType === 'division_wise' && (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Division</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Members</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Share Capital</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {divisionStats.map((d, i) => (
                      <tr key={d.division} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">{d.division}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            {formatNumber(d.count)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                          {formatCurrency(d.shareCapital)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Category Wise */}
            {selectedType === 'category_wise' && (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Members</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Share Capital</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {categoryStats.map((c, i) => (
                      <tr key={c.category} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">{c.category}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-purple-50 text-purple-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            {formatNumber(c.count)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                          {formatCurrency(c.shareCapital)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Annual Summary */}
            {selectedType === 'annual_summary' && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Total Members</p>
                  <p className="text-2xl font-bold text-text">{formatNumber(members?.length || 0)}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Total Share Capital</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {formatCurrency((members || []).reduce((s, m) => s + (m.share_amount || 0), 0))}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Total Divisions</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber((divisions || []).length)}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Total Categories</p>
                  <p className="text-2xl font-bold text-purple-600">{formatNumber((categories || []).length)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
