import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { memberService } from '@/services/memberService';
import { divisionService } from '@/services/divisionService';
import { categoryService } from '@/services/categoryService';
import { memberSchema, type MemberFormData } from '@/schemas';
import { today } from '@/utils/dateUtils';
import toast from 'react-hot-toast';

const AddMemberPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const { register, handleSubmit, formState: { errors }, reset } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      joined_date: today(),
      share_amount: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: MemberFormData) => memberService.createMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Member added successfully / සාමාජිකයා සාර්ථකව එකතු කරන ලදී');
      navigate('/members');
    },
    onError: (err: Error) => {
      const msg = err.message?.includes('duplicate') || err.message?.includes('unique')
        ? 'Member number already exists'
        : err.message || 'Failed to add member';
      toast.error(msg);
    },
  });

  const onSubmit = (data: MemberFormData) => {
    mutation.mutate(data);
  };

  const fields: { name: keyof MemberFormData; label: string; labelSi: string; type?: string; placeholder?: string }[] = [
    { name: 'member_no', label: 'Member Number', labelSi: 'සාමාජික අංකය', placeholder: 'e.g. M-0001' },
    { name: 'name', label: 'Full Name', labelSi: 'නම', placeholder: 'Full name in Sinhala or English' },
    { name: 'email', label: 'Email Address', labelSi: 'විද්‍යුත් තැපෑල', placeholder: 'e.g. member@email.com' },
    { name: 'phone', label: 'Phone Number', labelSi: 'දුරකථන අංකය', placeholder: 'e.g. 0771234567' },
    { name: 'nic', label: 'NIC Number', labelSi: 'ජා.හැ.ප. අංකය', placeholder: 'e.g. 123456789V or 200012345678' },
    { name: 'address', label: 'Address', labelSi: 'ලිපිනය', placeholder: 'Full address' },
    { name: 'joined_date', label: 'Joined Date', labelSi: 'සාමාජික වූ දිනය', type: 'date' },
    { name: 'share_amount', label: 'Share Amount (Rs.)', labelSi: 'කොටස් මුදල', type: 'number', placeholder: '0.00' },
  ];

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/members')}
          className="p-2 rounded-xl border border-gray-200 hover:border-primary hover:text-primary transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-text-dark">Add New Member</h1>
          <p className="text-sm text-gray-400">නව සාමාජිකයෙකු එක් කරන්න</p>
        </div>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-surface-dark rounded-2xl shadow-card p-8"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Text fields */}
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {field.label}
                <span className="text-gray-400 font-normal ml-2 text-xs">/ {field.labelSi}</span>
              </label>
              <input
                {...register(field.name, {
                  valueAsNumber: field.type === 'number',
                })}
                type={field.type || 'text'}
                placeholder={field.placeholder}
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                  dark:bg-gray-800 dark:border-gray-600 dark:text-white
                  ${errors[field.name] ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
              />
              {errors[field.name] && (
                <p className="text-red-500 text-xs mt-1">{errors[field.name]?.message}</p>
              )}
            </div>
          ))}

          {/* Electoral Division */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Electoral Division
              <span className="text-gray-400 font-normal ml-2 text-xs">/ ගරු ආසනය</span>
            </label>
            <select
              {...register('electoral_division_id')}
              className={`w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                dark:bg-gray-800 dark:border-gray-600 dark:text-white
                ${errors.electoral_division_id ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <option value="">Select Electoral Division / ආසනය තෝරන්න</option>
              {(divisions || []).map((d) => (
                <option key={d.id} value={d.id}>{d.division_name}</option>
              ))}
            </select>
            {errors.electoral_division_id && (
              <p className="text-red-500 text-xs mt-1">{errors.electoral_division_id?.message}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Category
              <span className="text-gray-400 font-normal ml-2 text-xs">/ කාණ්ඩය</span>
            </label>
            <select
              {...register('category_id')}
              className={`w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                dark:bg-gray-800 dark:border-gray-600 dark:text-white
                ${errors.category_id ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <option value="">Select Category / කාණ්ඩය තෝරන්න</option>
              {(categories || []).map((c) => (
                <option key={c.id} value={c.id}>{c.category_name}</option>
              ))}
            </select>
            {errors.category_id && (
              <p className="text-red-500 text-xs mt-1">{errors.category_id?.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate('/members')}
              className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium
                text-sm hover:bg-gray-50 transition-all"
            >
              Cancel / අවලංගු කරන්න
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover
                text-white px-6 py-3 rounded-xl font-medium text-sm transition-all shadow-sm
                hover:shadow-md disabled:opacity-60"
            >
              {mutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : <Save size={16} />}
              {mutation.isPending ? 'Saving...' : 'Add Member / සාමාජිකයා දමන්න'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AddMemberPage;
