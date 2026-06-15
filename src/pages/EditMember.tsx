import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { memberService } from '@/services/memberService';
import { divisionService } from '@/services/divisionService';
import { categoryService } from '@/services/categoryService';
import { memberSchema, type MemberFormData } from '@/schemas';
import { FormSkeleton } from '@/components/common/Skeleton';
import toast from 'react-hot-toast';

const EditMemberPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: () => memberService.getMemberById(id!),
    enabled: !!id,
  });

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
    values: member
      ? {
          member_no: member.member_no,
          name: member.name,
          address: member.address,
          email: member.email || '',
          phone: member.phone || '',
          nic: member.nic,
          joined_date: member.joined_date,
          share_amount: member.share_amount,
          electoral_division_id: member.electoral_division_id,
          category_id: member.category_id,
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: (data: MemberFormData) => memberService.updateMember(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Member updated successfully / සාමාජිකයා යාවත්කාලීන කරන ලදී');
      navigate('/members');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update member');
    },
  });

  const fields: { name: keyof MemberFormData; label: string; labelSi: string; type?: string }[] = [
    { name: 'member_no', label: 'Member Number', labelSi: 'සාමාජික අංකය' },
    { name: 'name', label: 'Full Name', labelSi: 'නම' },
    { name: 'email', label: 'Email Address', labelSi: 'විද්‍යුත් තැපෑල' },
    { name: 'phone', label: 'Phone Number', labelSi: 'දුරකථන අංකය' },
    { name: 'nic', label: 'NIC Number', labelSi: 'ජා.හැ.ප. අංකය' },
    { name: 'address', label: 'Address', labelSi: 'ලිපිනය' },
    { name: 'joined_date', label: 'Joined Date', labelSi: 'සාමාජික වූ දිනය', type: 'date' },
    { name: 'share_amount', label: 'Share Amount (Rs.)', labelSi: 'කොටස් මුදල', type: 'number' },
  ];

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/members')}
          className="p-2 rounded-xl border border-gray-200 hover:border-primary hover:text-primary transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-text-dark">Edit Member</h1>
          <p className="text-sm text-gray-400">සාමාජිකයා සංස්කරණය කරන්න</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-surface-dark rounded-2xl shadow-card p-8"
      >
        {memberLoading ? (
          <FormSkeleton />
        ) : !member ? (
          <div className="text-center py-12 text-gray-400">Member not found</div>
        ) : (
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
            {fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {field.label}
                  <span className="text-gray-400 font-normal ml-2 text-xs">/ {field.labelSi}</span>
                </label>
                <input
                  {...register(field.name, { valueAsNumber: field.type === 'number' })}
                  type={field.type || 'text'}
                  className={`w-full px-4 py-3 rounded-xl border text-sm transition-all
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                    dark:bg-gray-800 dark:border-gray-600 dark:text-white
                    ${errors[field.name] ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                />
                {errors[field.name] && (
                  <p className="text-red-500 text-xs mt-1">{errors[field.name]?.message}</p>
                )}
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Electoral Division <span className="text-gray-400 font-normal text-xs">/ ගරු ආසනය</span>
              </label>
              <select
                {...register('electoral_division_id')}
                className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none
                  focus:ring-2 focus:ring-primary/30 focus:border-primary
                  dark:bg-gray-800 dark:border-gray-600 dark:text-white
                  ${errors.electoral_division_id ? 'border-red-400' : 'border-gray-200'}`}
              >
                <option value="">Select Division</option>
                {(divisions || []).map((d) => (
                  <option key={d.id} value={d.id}>{d.division_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Category <span className="text-gray-400 font-normal text-xs">/ කාණ්ඩය</span>
              </label>
              <select
                {...register('category_id')}
                className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none
                  focus:ring-2 focus:ring-primary/30 focus:border-primary
                  dark:bg-gray-800 dark:border-gray-600 dark:text-white
                  ${errors.category_id ? 'border-red-400' : 'border-gray-200'}`}
              >
                <option value="">Select Category</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.category_name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { reset(); navigate('/members'); }}
                className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium
                  text-sm hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover
                  text-white px-6 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-60"
              >
                {mutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : <Save size={16} />}
                {mutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default EditMemberPage;
