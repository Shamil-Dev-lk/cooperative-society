import { supabase } from './supabaseClient';
import type { ElectoralDivision } from '@/types';

export const divisionService = {
  async getAll(): Promise<ElectoralDivision[]> {
    const { data, error } = await supabase
      .from('electoral_divisions')
      .select(`
        *,
        member_count:members(count)
      `)
      .order('division_name');

    if (error) throw error;

    return (data || []).map((d: ElectoralDivision & { member_count: { count: number }[] }) => ({
      ...d,
      member_count: d.member_count?.[0]?.count ?? 0,
    }));
  },

  async getById(id: string): Promise<ElectoralDivision> {
    const { data, error } = await supabase
      .from('electoral_divisions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as ElectoralDivision;
  },

  async create(division_name: string): Promise<ElectoralDivision> {
    const { data, error } = await supabase
      .from('electoral_divisions')
      .insert({ division_name })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as ElectoralDivision;
  },

  async update(id: string, division_name: string): Promise<ElectoralDivision> {
    const { data, error } = await supabase
      .from('electoral_divisions')
      .update({ division_name })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ElectoralDivision;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('electoral_divisions').delete().eq('id', id);
    if (error) throw error;
  },
};